/**
 * CSRF トークン管理 Composable（SEC-001）
 *
 * Double Submit Cookie パターンのクライアントサイド実装
 * Cookie から CSRF トークンを読み取り、リクエストヘッダーに付与
 */

/**
 * Cookie から CSRF トークンを取得
 */
function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null

  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/)
  return match ? decodeURIComponent(match[1]) : null
}

/**
 * CSRF トークン付きの $fetch ラッパー
 *
 * 使い方:
 * ```ts
 * const { csrfFetch } = useCsrf()
 * await csrfFetch('/api/schedules', { method: 'POST', body: { ... } })
 * ```
 */
export function useCsrf() {
  async function csrfFetch<T>(url: string, options: Record<string, unknown> = {}): Promise<T> {
    const token = getCsrfToken()
    const headers = {
      ...(options.headers as Record<string, string> || {}),
      ...(token ? { 'X-CSRF-Token': token } : {}),
    }

    const result = await $fetch(url, {
      ...options,
      headers,
    })
    return result as T
  }

  return { csrfFetch, getCsrfToken }
}
