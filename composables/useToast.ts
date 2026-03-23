// composables/useToast.ts
// Sprint 6: トースト通知 composable（NOTIF-002）

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  type: ToastType
  message: string
  duration: number // ms, 0 = manual close only
}

const MAX_TOASTS = 5

const toasts = () => useState<Toast[]>('toasts', () => [])

export function useToast() {
  const list = toasts()

  function add(type: ToastType, message: string, duration?: number) {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(7)}`
    const defaultDuration = type === 'error' ? 0 : 5000

    const toast: Toast = { id, type, message, duration: duration ?? defaultDuration }

    // 最大数を超えたら古いものから除去
    if (list.value.length >= MAX_TOASTS) {
      list.value = list.value.slice(list.value.length - MAX_TOASTS + 1)
    }

    list.value = [...list.value, toast]

    // 自動消去
    if (toast.duration > 0) {
      setTimeout(() => remove(id), toast.duration)
    }
  }

  function remove(id: string) {
    list.value = list.value.filter((t) => t.id !== id)
  }

  return {
    toasts: list,
    success: (message: string, duration?: number) => add('success', message, duration),
    error: (message: string, duration?: number) => add('error', message, duration ?? 0),
    warning: (message: string, duration?: number) => add('warning', message, duration),
    info: (message: string, duration?: number) => add('info', message, duration),
    remove,
  }
}
