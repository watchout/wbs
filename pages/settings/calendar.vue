<template>
  <div class="settings-page">
    <div class="settings-container">
      <h1 class="page-title">カレンダー連携</h1>

      <div v-if="loading" class="loading">読み込み中...</div>

      <div v-else class="calendar-settings">
        <!-- Success/Error messages from redirect -->
        <div v-if="successMessage" class="alert alert-success">
          {{ successMessage }}
        </div>
        <div v-if="errorMessage" class="alert alert-error">
          {{ errorMessage }}
        </div>

        <!-- Google Calendar Section -->
        <div class="integration-section">
          <div class="integration-header">
            <div class="integration-icon">
              <svg viewBox="0 0 24 24" width="32" height="32" fill="none">
                <path
                  d="M19 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2z"
                  stroke="#4285f4"
                  stroke-width="2"
                />
                <path d="M16 2v4M8 2v4M3 10h18" stroke="#4285f4" stroke-width="2" />
                <circle cx="12" cy="15" r="2" fill="#4285f4" />
              </svg>
            </div>
            <div class="integration-info">
              <h2>Googleカレンダー</h2>
              <p v-if="connection">
                連携中
                <span v-if="connection.lastSyncedAt" class="last-sync">
                  （最終同期: {{ formatDate(connection.lastSyncedAt) }}）
                </span>
              </p>
              <p v-else>連携されていません</p>
            </div>
          </div>

          <!-- Connected State -->
          <div v-if="connection" class="integration-details">
            <div class="status-badge" :class="statusClass">
              {{ statusLabel }}
            </div>

            <div class="sync-options">
              <button
                type="button"
                class="btn btn-secondary"
                :disabled="syncing"
                @click="handleSync"
              >
                {{ syncing ? '同期中...' : '今すぐ同期' }}
              </button>

              <button
                type="button"
                class="btn btn-danger"
                :disabled="disconnecting"
                @click="handleDisconnect"
              >
                {{ disconnecting ? '解除中...' : '連携を解除' }}
              </button>
            </div>

            <div v-if="syncResult" class="sync-result">
              <p>インポート: {{ syncResult.imported }}件</p>
              <p>エクスポート: {{ syncResult.exported }}件</p>
              <p v-if="syncResult.errors && syncResult.errors.length > 0" class="sync-errors">
                エラー: {{ syncResult.errors.length }}件
              </p>
            </div>
          </div>

          <!-- Not Connected State -->
          <div v-else class="integration-actions">
            <button
              type="button"
              class="btn btn-primary"
              :disabled="connecting"
              @click="handleConnect"
            >
              {{ connecting ? '接続中...' : 'Googleカレンダーを連携' }}
            </button>
            <p class="integration-note">
              Googleアカウントで認証し、カレンダーの予定を同期します
            </p>
          </div>
        </div>

        <!-- Sync Settings (when connected) -->
        <div v-if="connection" class="sync-settings">
          <h3>同期設定</h3>

          <div class="form-group">
            <label class="form-label">同期範囲（過去）</label>
            <div class="form-readonly">{{ connection.syncRangeStart }}日前から</div>
          </div>

          <div class="form-group">
            <label class="form-label">同期範囲（未来）</label>
            <div class="form-readonly">{{ connection.syncRangeEnd }}日後まで</div>
          </div>

          <p class="form-hint">
            ※ 同期範囲の変更は今後のアップデートで対応予定です
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'

definePageMeta({
  layout: 'default',
  middleware: 'auth'
})

interface CalendarConnection {
  id: string
  provider: string
  status: string
  lastSyncedAt: string | null
  syncRangeStart: number
  syncRangeEnd: number
}

interface SyncResult {
  success: boolean
  imported: number
  exported: number
  errors?: string[]
}

const router = useRouter()
const route = useRoute()

const loading = ref(true)
const connecting = ref(false)
const syncing = ref(false)
const disconnecting = ref(false)
const successMessage = ref('')
const errorMessage = ref('')
const connection = ref<CalendarConnection | null>(null)
const syncResult = ref<SyncResult | null>(null)

// Computed
const statusClass = computed(() => {
  const status = connection.value?.status
  return {
    'status-active': status === 'active',
    'status-error': status === 'error',
    'status-disconnected': status === 'disconnected'
  }
})

const statusLabel = computed(() => {
  const statusMap: Record<string, string> = {
    active: '正常',
    error: 'エラー',
    disconnected: '切断済み'
  }
  return statusMap[connection.value?.status || ''] || '不明'
})

// Methods
function formatDate(dateString: string | null): string {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

async function fetchConnection() {
  loading.value = true
  try {
    // Check if user is authenticated first
    const meResponse = await $fetch<{ success: boolean; isAuthenticated: boolean }>('/api/auth/me')
    if (!meResponse.isAuthenticated) {
      router.push('/login?redirect=/settings/calendar')
      return
    }

    // Get calendar connection status
    // For now, we'll create a simple endpoint or use the existing data
    // Since we don't have a dedicated GET endpoint yet, we can infer from the sync endpoint
    try {
      const response = await $fetch<{
        connection?: CalendarConnection
      }>('/api/calendar/status')
      connection.value = response.connection || null
    } catch {
      // No connection or endpoint doesn't exist yet
      connection.value = null
    }
  } catch {
    router.push('/login?redirect=/settings/calendar')
  } finally {
    loading.value = false
  }
}

async function handleConnect() {
  connecting.value = true
  errorMessage.value = ''

  try {
    const response = await $fetch<{ redirectUrl: string }>('/api/calendar/google/connect')
    // Redirect to Google OAuth
    window.location.href = response.redirectUrl
  } catch (error: unknown) {
    const errData = error && typeof error === 'object' && 'data' in error ? (error as Record<string, unknown>).data as Record<string, unknown> | undefined : undefined
    errorMessage.value = (errData?.statusMessage as string) || 'カレンダー連携の開始に失敗しました'
    connecting.value = false
  }
}

async function handleSync() {
  syncing.value = true
  syncResult.value = null
  errorMessage.value = ''

  try {
    const response = await $fetch<SyncResult>('/api/calendar/sync', {
      method: 'POST',
      body: { direction: 'both' }
    })

    syncResult.value = response

    if (response.success) {
      successMessage.value = '同期が完了しました'
      setTimeout(() => {
        successMessage.value = ''
      }, 3000)
    } else {
      errorMessage.value = '一部のイベントの同期に失敗しました'
    }

    // Refresh connection data
    await fetchConnection()
  } catch (error: unknown) {
    const errData = error && typeof error === 'object' && 'data' in error ? (error as Record<string, unknown>).data as Record<string, unknown> | undefined : undefined
    errorMessage.value = (errData?.statusMessage as string) || '同期に失敗しました'
  } finally {
    syncing.value = false
  }
}

async function handleDisconnect() {
  if (!confirm('Googleカレンダーとの連携を解除しますか？\n連携を解除してもミエルボード内のスケジュールは削除されません。')) {
    return
  }

  disconnecting.value = true
  errorMessage.value = ''

  try {
    await $fetch('/api/calendar/connection', {
      method: 'DELETE'
    })

    connection.value = null
    successMessage.value = 'カレンダー連携を解除しました'
    setTimeout(() => {
      successMessage.value = ''
    }, 3000)
  } catch (error: unknown) {
    const errData = error && typeof error === 'object' && 'data' in error ? (error as Record<string, unknown>).data as Record<string, unknown> | undefined : undefined
    errorMessage.value = (errData?.statusMessage as string) || '連携の解除に失敗しました'
  } finally {
    disconnecting.value = false
  }
}

function handleQueryParams() {
  // Handle redirect query params from OAuth callback
  const success = route.query.success as string | undefined
  const error = route.query.error as string | undefined

  if (success === 'connected') {
    successMessage.value = 'Googleカレンダーとの連携が完了しました'
    // Remove query params from URL
    router.replace({ query: {} })
  }

  if (error) {
    const errorMessages: Record<string, string> = {
      auth_failed: 'Googleアカウントの認証に失敗しました',
      invalid_request: '無効なリクエストです',
      invalid_state: 'セッションが無効です。もう一度お試しください',
      session_mismatch: 'セッションが一致しません。もう一度お試しください',
      expired: 'リクエストの有効期限が切れました。もう一度お試しください',
      token_failed: 'トークンの取得に失敗しました'
    }
    errorMessage.value = errorMessages[error] || 'エラーが発生しました'
    router.replace({ query: {} })
  }
}

onMounted(() => {
  handleQueryParams()
  fetchConnection()
})

useHead({
  title: 'カレンダー連携'
})
</script>

<style scoped>
.settings-page {
  padding: 2rem;
  max-width: 600px;
  margin: 0 auto;
}

.settings-container {
  background: #fff;
  border-radius: 8px;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.page-title {
  font-size: 1.5rem;
  color: #333;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #eee;
}

.loading {
  text-align: center;
  padding: 2rem;
  color: #666;
}

.calendar-settings {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.integration-section {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1.5rem;
}

.integration-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.integration-icon {
  flex-shrink: 0;
}

.integration-info h2 {
  font-size: 1.1rem;
  margin: 0 0 0.25rem 0;
  color: #333;
}

.integration-info p {
  margin: 0;
  font-size: 0.9rem;
  color: #666;
}

.last-sync {
  font-size: 0.85rem;
  color: #888;
}

.integration-details {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.status-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: 500;
  width: fit-content;
}

.status-active {
  background: #e8f5e9;
  color: #2e7d32;
}

.status-error {
  background: #ffebee;
  color: #c62828;
}

.status-disconnected {
  background: #f5f5f5;
  color: #666;
}

.sync-options {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.sync-result {
  background: #f5f5f5;
  padding: 1rem;
  border-radius: 6px;
  font-size: 0.9rem;
}

.sync-result p {
  margin: 0.25rem 0;
}

.sync-errors {
  color: #d32f2f;
}

.integration-actions {
  text-align: center;
}

.integration-note {
  margin-top: 0.75rem;
  font-size: 0.85rem;
  color: #888;
}

.sync-settings {
  border-top: 1px solid #eee;
  padding-top: 1.5rem;
}

.sync-settings h3 {
  font-size: 1rem;
  color: #333;
  margin: 0 0 1rem 0;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.form-label {
  font-weight: 600;
  color: #333;
  font-size: 0.9rem;
}

.form-readonly {
  padding: 0.75rem 1rem;
  background: #f5f5f5;
  border: 1px solid #eee;
  border-radius: 6px;
  color: #666;
}

.form-hint {
  font-size: 0.8rem;
  color: #888;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s, opacity 0.2s;
}

.btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--color-primary, #1a73e8);
  color: #fff;
}

.btn-primary:hover:not(:disabled) {
  background: #1557b0;
}

.btn-secondary {
  background: #e0e0e0;
  color: #333;
}

.btn-secondary:hover:not(:disabled) {
  background: #d0d0d0;
}

.btn-danger {
  background: #fff;
  color: #d32f2f;
  border: 1px solid #d32f2f;
}

.btn-danger:hover:not(:disabled) {
  background: #ffebee;
}

.alert {
  padding: 0.75rem 1rem;
  border-radius: 6px;
  font-size: 0.9rem;
  margin-bottom: 1rem;
}

.alert-success {
  background: #e8f5e9;
  color: #2e7d32;
  border: 1px solid #c8e6c9;
}

.alert-error {
  background: #ffebee;
  color: #c62828;
  border: 1px solid #ffcdd2;
}

@media (max-width: 640px) {
  .settings-page {
    padding: 1rem;
  }

  .settings-container {
    padding: 1.5rem;
  }

  .sync-options {
    flex-direction: column;
  }

  .btn {
    width: 100%;
  }
}
</style>
