<template>
  <div class="ai-command-bar" :class="{ 'is-open': isOpen }">
    <!-- トリガーボタン（常駐） -->
    <button
      class="ai-trigger"
      :class="{ 'is-active': isOpen }"
      @click="toggleOpen"
      :title="isOpen ? '閉じる (Esc)' : 'AIコマンドバー (Cmd+K)'"
    >
      <span class="ai-trigger-icon">✨</span>
      <span class="ai-trigger-text">AIに聞く</span>
      <span class="ai-trigger-hint">{{ isMac ? '⌘K' : 'Ctrl+K' }}</span>
    </button>

    <!-- コマンドパネル -->
    <Transition name="command-panel">
      <div v-if="isOpen" class="ai-panel" ref="panelRef">
        <!-- ヘッダー -->
        <div class="ai-panel-header">
          <span class="ai-panel-title">✨ AIコマンドバー</span>
          <button class="ai-panel-close" @click="close">✕</button>
        </div>

        <!-- 会話履歴 -->
        <div class="ai-messages" ref="messagesRef">
          <div v-if="messages.length === 0" class="ai-empty">
            <p class="ai-empty-title">現場配置をAIに相談</p>
            <div class="ai-suggestions">
              <button
                v-for="s in suggestions"
                :key="s"
                class="ai-suggestion"
                @click="sendSuggestion(s)"
              >{{ s }}</button>
            </div>
          </div>

          <template v-for="(msg, i) in messages" :key="i">
            <!-- ユーザーメッセージ -->
            <div v-if="msg.role === 'user'" class="ai-message ai-message-user">
              <span class="ai-message-text">{{ msg.content }}</span>
            </div>

            <!-- AIレスポンス -->
            <div v-else class="ai-message ai-message-ai">
              <span class="ai-message-icon">✨</span>
              <div class="ai-message-body">
                <div class="ai-message-text" v-html="formatMessage(msg.content)"></div>

                <!-- プレビューカード -->
                <div v-if="msg.preview" class="ai-preview">
                  <div class="ai-preview-header">
                    <span>📋 配置変更プレビュー</span>
                    <span class="ai-preview-count">{{ msg.preview.length }}件</span>
                  </div>
                  <div class="ai-preview-items">
                    <div
                      v-for="(item, j) in msg.preview"
                      :key="j"
                      class="ai-preview-item"
                    >
                      <span class="preview-worker">{{ item.userName }}</span>
                      <span class="preview-arrow">→</span>
                      <span class="preview-site">{{ item.siteName }}</span>
                      <span class="preview-date">{{ item.date }}</span>
                    </div>
                  </div>
                  <div class="ai-preview-actions">
                    <button
                      class="btn-confirm"
                      :disabled="confirming"
                      @click="confirmAssignment(msg.preview, i)"
                    >
                      {{ confirming ? '処理中...' : '✓ 確定する' }}
                    </button>
                    <button class="btn-cancel" @click="cancelPreview(i)">キャンセル</button>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <!-- ローディング -->
          <div v-if="loading" class="ai-message ai-message-ai">
            <span class="ai-message-icon">✨</span>
            <div class="ai-loading">
              <span class="dot"></span><span class="dot"></span><span class="dot"></span>
            </div>
          </div>
        </div>

        <!-- 入力フォーム -->
        <div class="ai-input-area">
          <div v-if="credits !== null" class="ai-credits">
            残りクレジット: {{ credits }}
          </div>
          <div class="ai-input-row">
            <input
              ref="inputRef"
              v-model="inputText"
              class="ai-input"
              type="text"
              :placeholder="currentPlaceholder"
              :disabled="loading || confirming"
              @keydown.enter.prevent="send"
              @keydown.esc.prevent="close"
              maxlength="500"
            />
            <button
              class="ai-send"
              :disabled="!inputText.trim() || loading || confirming"
              @click="send"
            >送信</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- オーバーレイ -->
    <div v-if="isOpen" class="ai-overlay" @click="close"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRoute } from 'vue-router'

interface PreviewItem {
  userId: string
  userName: string
  siteName: string
  date: string
  action: string
}

interface Message {
  role: 'user' | 'ai'
  content: string
  preview?: PreviewItem[]
  confirmed?: boolean
}

const route = useRoute()
const isOpen = ref(false)
const inputText = ref('')
const messages = ref<Message[]>([])
const loading = ref(false)
const confirming = ref(false)
const credits = ref<number | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)
const messagesRef = ref<HTMLElement | null>(null)

const isMac = typeof navigator !== 'undefined' && navigator.platform.includes('Mac')

const suggestions = [
  '来週の不足現場を教えて',
  '品川現場に来週誰がいる？',
  '電気工事できる人で水曜空いてる人',
  '田中を新宿に移して',
]

const placeholders = [
  '「品川現場に来週誰がいる？」',
  '「来週の不足現場を教えて」',
  '「電気工事できる人で水曜空いてる人」',
  '「田中を新宿に移して」',
]
let placeholderIndex = 0
const currentPlaceholder = ref(placeholders[0])

// org slug from route
const orgSlug = computed(() => route.params.slug as string || '')

function toggleOpen() {
  isOpen.value ? close() : open()
}

function open() {
  isOpen.value = true
  nextTick(() => inputRef.value?.focus())
}

function close() {
  isOpen.value = false
  inputText.value = ''
}

async function send() {
  const text = inputText.value.trim()
  if (!text || loading.value) return

  inputText.value = ''
  messages.value.push({ role: 'user', content: text })
  loading.value = true
  scrollToBottom()

  try {
    const res = await $fetch<{
      success: boolean
      type: string
      reply: string
      data: PreviewItem[] | null
      creditsRemaining: number
    }>('/api/ai/command', {
      method: 'POST',
      body: {
        message: text,
        organizationId: orgSlug.value,
        context: { page: route.path },
      },
    })

    credits.value = res.creditsRemaining ?? null
    messages.value.push({
      role: 'ai',
      content: res.reply || '',
      preview: res.data || undefined,
    })
  } catch (err: unknown) {
    const msg = (err as { data?: { statusMessage?: string } })?.data?.statusMessage
      || 'エラーが発生しました。'
    messages.value.push({ role: 'ai', content: `⚠️ ${msg}` })
  } finally {
    loading.value = false
    scrollToBottom()
  }
}

function sendSuggestion(text: string) {
  inputText.value = text
  send()
}

async function confirmAssignment(preview: PreviewItem[], msgIndex: number) {
  confirming.value = true
  try {
    await $fetch('/api/ai/assign', {
      method: 'POST',
      body: { assignments: preview, organizationId: orgSlug.value },
    })
    messages.value[msgIndex] = { ...messages.value[msgIndex], confirmed: true, preview: undefined }
    messages.value.push({ role: 'ai', content: '✅ 配置変更を確定しました。' })
  } catch {
    messages.value.push({ role: 'ai', content: '⚠️ 配置変更に失敗しました。' })
  } finally {
    confirming.value = false
    scrollToBottom()
  }
}

function cancelPreview(msgIndex: number) {
  messages.value[msgIndex] = { ...messages.value[msgIndex], preview: undefined }
  messages.value.push({ role: 'ai', content: 'キャンセルしました。' })
}

function formatMessage(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesRef.value) {
      messagesRef.value.scrollTop = messagesRef.value.scrollHeight
    }
  })
}

// Keyboard shortcut
function handleKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault()
    toggleOpen()
  }
}

// Placeholder rotation
let placeholderTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  placeholderTimer = setInterval(() => {
    placeholderIndex = (placeholderIndex + 1) % placeholders.length
    currentPlaceholder.value = placeholders[placeholderIndex]
  }, 3000)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  if (placeholderTimer) clearInterval(placeholderTimer)
})

watch(messages, () => scrollToBottom(), { deep: true })
</script>

<style scoped>
.ai-command-bar {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.ai-trigger {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s;
  white-space: nowrap;
}
.ai-trigger:hover { opacity: 0.9; transform: scale(1.02); }
.ai-trigger.is-active { background: linear-gradient(135deg, #4f46e5, #7c3aed); }
.ai-trigger-hint { font-size: 11px; opacity: 0.7; }

.ai-overlay {
  position: fixed;
  inset: 0;
  z-index: 99;
  background: rgba(0,0,0,0.2);
}

.ai-panel {
  position: fixed;
  top: 60px;
  right: 16px;
  width: 420px;
  max-height: calc(100vh - 80px);
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 40px rgba(0,0,0,0.2);
  display: flex;
  flex-direction: column;
  z-index: 100;
  overflow: hidden;
}

.ai-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
  font-weight: 600;
  font-size: 14px;
}
.ai-panel-close {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  font-size: 16px;
  opacity: 0.8;
  padding: 0 4px;
}
.ai-panel-close:hover { opacity: 1; }

.ai-messages {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 200px;
  max-height: 400px;
}

.ai-empty { text-align: center; padding: 20px 0; }
.ai-empty-title { color: #6b7280; font-size: 14px; margin-bottom: 12px; }
.ai-suggestions { display: flex; flex-direction: column; gap: 6px; }
.ai-suggestion {
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 13px;
  color: #374151;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s;
}
.ai-suggestion:hover { background: #e0e7ff; border-color: #a5b4fc; }

.ai-message {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}
.ai-message-user {
  justify-content: flex-end;
}
.ai-message-user .ai-message-text {
  background: #6366f1;
  color: white;
  padding: 8px 12px;
  border-radius: 12px 12px 2px 12px;
  font-size: 13px;
  max-width: 80%;
}
.ai-message-ai { align-items: flex-start; }
.ai-message-icon { font-size: 16px; flex-shrink: 0; margin-top: 2px; }
.ai-message-body { flex: 1; min-width: 0; }
.ai-message-ai .ai-message-text {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  padding: 8px 12px;
  border-radius: 2px 12px 12px 12px;
  font-size: 13px;
  line-height: 1.5;
  color: #1f2937;
}

/* プレビュー */
.ai-preview {
  margin-top: 8px;
  border: 2px solid #6366f1;
  border-radius: 8px;
  overflow: hidden;
}
.ai-preview-header {
  background: #eef2ff;
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 600;
  color: #4338ca;
  display: flex;
  justify-content: space-between;
}
.ai-preview-count { font-weight: normal; }
.ai-preview-items { padding: 8px 12px; display: flex; flex-direction: column; gap: 4px; }
.ai-preview-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #374151;
}
.preview-worker { font-weight: 600; }
.preview-arrow { color: #9ca3af; }
.preview-site { color: #6366f1; font-weight: 500; }
.preview-date { color: #9ca3af; font-size: 12px; margin-left: auto; }
.ai-preview-actions {
  display: flex;
  gap: 8px;
  padding: 8px 12px;
  background: #f9fafb;
  border-top: 1px solid #e5e7eb;
}
.btn-confirm {
  flex: 1;
  background: #6366f1;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}
.btn-confirm:hover:not(:disabled) { background: #4f46e5; }
.btn-confirm:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-cancel {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 13px;
  color: #6b7280;
  cursor: pointer;
}
.btn-cancel:hover { background: #f3f4f6; }

/* ローディング */
.ai-loading { display: flex; gap: 4px; padding: 8px 12px; }
.dot {
  width: 6px;
  height: 6px;
  background: #6366f1;
  border-radius: 50%;
  animation: bounce 1s infinite;
}
.dot:nth-child(2) { animation-delay: 0.15s; }
.dot:nth-child(3) { animation-delay: 0.3s; }
@keyframes bounce {
  0%, 60%, 100% { transform: translateY(0); }
  30% { transform: translateY(-6px); }
}

/* 入力エリア */
.ai-input-area {
  border-top: 1px solid #e5e7eb;
  padding: 10px 12px;
  background: white;
}
.ai-credits { font-size: 11px; color: #9ca3af; margin-bottom: 6px; }
.ai-input-row { display: flex; gap: 8px; }
.ai-input {
  flex: 1;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 13px;
  outline: none;
  transition: border-color 0.15s;
}
.ai-input:focus { border-color: #6366f1; }
.ai-send {
  background: #6366f1;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
  white-space: nowrap;
}
.ai-send:hover:not(:disabled) { background: #4f46e5; }
.ai-send:disabled { opacity: 0.5; cursor: not-allowed; }

/* アニメーション */
.command-panel-enter-active,
.command-panel-leave-active { transition: all 0.2s ease; }
.command-panel-enter-from,
.command-panel-leave-to { opacity: 0; transform: translateY(-8px) scale(0.98); }
</style>
