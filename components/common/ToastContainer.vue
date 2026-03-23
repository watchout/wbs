<template>
  <div class="toast-container" aria-live="polite">
    <TransitionGroup name="toast">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="toast"
        :class="`toast-${toast.type}`"
        role="alert"
      >
        <span class="toast-icon">{{ iconMap[toast.type] }}</span>
        <span class="toast-message">{{ toast.message }}</span>
        <button class="toast-close" @click="remove(toast.id)" aria-label="閉じる">×</button>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { useToast } from '~/composables/useToast'

const { toasts, remove } = useToast()

const iconMap: Record<string, string> = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
}
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 400px;
}

.toast {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  font-size: 14px;
  line-height: 1.4;
  color: white;
  min-width: 280px;
}

.toast-success { background: #059669; }
.toast-error   { background: #dc2626; }
.toast-warning { background: #d97706; }
.toast-info    { background: #2563eb; }

.toast-icon {
  font-weight: 700;
  font-size: 16px;
  flex-shrink: 0;
  width: 20px;
  text-align: center;
}

.toast-message {
  flex: 1;
  min-width: 0;
}

.toast-close {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  font-size: 18px;
  padding: 0 4px;
  flex-shrink: 0;
}
.toast-close:hover { color: white; }

/* アニメーション */
.toast-enter-active { transition: all 0.3s ease; }
.toast-leave-active { transition: all 0.2s ease; }
.toast-enter-from { opacity: 0; transform: translateX(40px); }
.toast-leave-to { opacity: 0; transform: translateX(40px) scale(0.95); }
.toast-move { transition: transform 0.2s ease; }
</style>
