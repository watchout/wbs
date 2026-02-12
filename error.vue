<template>
  <div class="error-page">
    <div class="error-card">
      <div class="error-icon">
        {{ errorIcon }}
      </div>

      <div class="error-code">
        {{ error?.statusCode || 500 }}
      </div>

      <h1 class="error-title">
        {{ errorTitle }}
      </h1>

      <p class="error-description">
        {{ errorDescription }}
      </p>

      <div class="error-actions">
        <button
          v-if="isServerError"
          class="btn btn-secondary"
          @click="handleRetry"
        >
          再試行
        </button>
        <button
          class="btn btn-primary"
          @click="handleGoHome"
        >
          トップページへ戻る
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { NuxtError } from '#app'
import * as Sentry from '@sentry/nuxt'

const props = defineProps<{
  error: NuxtError
}>()

// 500系エラーのみ Sentry に送信（404 はノイズになるため除外）
onMounted(() => {
  const code = props.error?.statusCode || 500
  if (code >= 500) {
    Sentry.captureException(props.error, {
      tags: { statusCode: String(code) },
      extra: { statusMessage: props.error?.statusMessage },
    })
  }
})

const errorType = computed(() => {
  const code = props.error?.statusCode || 500
  if (code === 404) return 'not-found'
  if (code >= 500) return 'server-error'
  return 'unknown'
})

const isServerError = computed(() => {
  return errorType.value === 'server-error'
})

const errorIcon = computed(() => {
  switch (errorType.value) {
    case 'not-found':
      return '🔍'
    case 'server-error':
      return '⚠️'
    default:
      return '❌'
  }
})

const errorTitle = computed(() => {
  switch (errorType.value) {
    case 'not-found':
      return 'ページが見つかりません'
    case 'server-error':
      return 'サーバーエラーが発生しました'
    default:
      return 'エラーが発生しました'
  }
})

const errorDescription = computed(() => {
  switch (errorType.value) {
    case 'not-found':
      return 'お探しのページは存在しないか、移動した可能性があります。'
    case 'server-error':
      return '申し訳ございません。しばらく時間をおいて再度お試しください。'
    default:
      return '問題が発生しました。トップページへお戻りください。'
  }
})

function handleRetry() {
  // ページをリロードして再試行
  window.location.reload()
}

function handleGoHome() {
  // エラーをクリアしてトップへ遷移
  clearError({ redirect: '/login' })
}

useHead({
  title: `${props.error?.statusCode || 'エラー'} - ミエルボード for 現場`
})
</script>

<style scoped>
.error-page {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  padding: 1rem;
}

.error-card {
  background: white;
  border-radius: 16px;
  padding: 3rem 2.5rem;
  width: 100%;
  max-width: 480px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  text-align: center;
}

.error-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  line-height: 1;
}

.error-code {
  font-size: 5rem;
  font-weight: 700;
  color: #1a1a2e;
  line-height: 1;
  margin-bottom: 1rem;
}

.error-title {
  font-size: 1.5rem;
  color: #1a1a2e;
  margin-bottom: 0.75rem;
  font-weight: 600;
}

.error-description {
  color: #666;
  font-size: 1rem;
  line-height: 1.6;
  margin-bottom: 2rem;
}

.error-actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.btn {
  padding: 0.875rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s, transform 0.1s;
}

.btn:active {
  transform: scale(0.98);
}

.btn-primary {
  background: #1a73e8;
  color: white;
}

.btn-primary:hover {
  background: #1557b0;
}

.btn-secondary {
  background: #f5f5f5;
  color: #333;
  border: 1px solid #ddd;
}

.btn-secondary:hover {
  background: #e8e8e8;
}

/* モバイル対応 */
@media (max-width: 480px) {
  .error-card {
    padding: 2rem 1.5rem;
    border-radius: 12px;
    margin: 0.5rem;
  }

  .error-icon {
    font-size: 3rem;
  }

  .error-code {
    font-size: 4rem;
  }

  .error-title {
    font-size: 1.25rem;
  }

  .error-description {
    font-size: 0.9rem;
  }
}
</style>
