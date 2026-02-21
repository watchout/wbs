<template>
  <div class="assistant-chat">
    <!-- フローティングボタン（アイコン + ラベル） -->
    <button
      v-if="!isOpen"
      class="chat-fab"
      @click="isOpen = true"
      aria-label="AIアシスタントを開く"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2a8 8 0 0 1 8 8c0 3.4-2.1 6.3-5 7.5V20a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-2.5C6.1 16.3 4 13.4 4 10a8 8 0 0 1 8-8z"/>
        <circle cx="10" cy="10" r="1"/>
        <circle cx="14" cy="10" r="1"/>
      </svg>
      <span class="chat-fab-label">AIアシスタント</span>
    </button>

    <!-- チャットパネル（右側上下いっぱい） -->
    <div v-if="isOpen" class="chat-panel">
      <!-- ヘッダー -->
      <div class="chat-header">
        <div class="chat-header-info">
          <span class="chat-header-title">AIアシスタント</span>
          <span v-if="creditsRemaining !== null" class="chat-header-credits">
            {{ creditsRemaining === -1 ? '無制限' : `残 ${creditsRemaining} クレジット` }}
          </span>
        </div>
        <button class="chat-close" @click="isOpen = false" aria-label="閉じる">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <!-- メッセージ一覧 -->
      <div ref="messagesContainer" class="chat-messages">
        <div
          v-if="messages.length === 0"
          class="chat-empty"
        >
          <p>こんにちは！ミエルボードのAIアシスタントです。</p>
          <p class="chat-empty-sub">スケジュールの検索や使い方についてお気軽にご質問ください。</p>
        </div>
        <div
          v-for="(msg, i) in messages"
          :key="i"
          :class="['chat-message', `chat-message--${msg.role}`]"
        >
          <div class="chat-message-content">{{ msg.content }}</div>
        </div>
        <div v-if="isLoading" class="chat-message chat-message--assistant">
          <div class="chat-typing">
            <span></span><span></span><span></span>
          </div>
        </div>
      </div>

      <!-- 入力エリア -->
      <div class="chat-input-area">
        <textarea
          v-model="inputMessage"
          class="chat-input"
          placeholder="メッセージを入力..."
          rows="1"
          :disabled="isLoading"
          @keydown.enter.exact="handleEnter"
          @compositionstart="isComposing = true"
          @compositionend="isComposing = false"
          @input="autoResize"
        />
        <button
          class="chat-send"
          :disabled="!inputMessage.trim() || isLoading"
          @click="sendMessage"
          aria-label="送信"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>

      <!-- エラー表示 -->
      <div v-if="errorMessage" class="chat-error">
        {{ errorMessage }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import { useCsrf } from '~/composables/useCsrf'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

const { csrfFetch } = useCsrf()

const isOpen = ref(false)
const isLoading = ref(false)
const inputMessage = ref('')
const errorMessage = ref('')
const creditsRemaining = ref<number | null>(null)
const messages = ref<ChatMessage[]>([])
const messagesContainer = ref<HTMLDivElement | null>(null)

// IME変換中フラグ（日本語入力のEnter誤送信防止）
const isComposing = ref(false)

// 会話ID（セッション中は固定）
const conversationId = ref(crypto.randomUUID())

/**
 * Enter キー押下ハンドラー
 * IME変換中（composing）の場合はスキップし、変換確定のEnterを無視する
 */
function handleEnter(event: KeyboardEvent) {
  if (isComposing.value) return
  event.preventDefault()
  sendMessage()
}

async function sendMessage() {
  const text = inputMessage.value.trim()
  if (!text || isLoading.value) return

  errorMessage.value = ''
  messages.value = [...messages.value, { role: 'user', content: text }]
  inputMessage.value = ''
  isLoading.value = true

  await scrollToBottom()

  try {
    const response = await csrfFetch<{
      success: boolean
      reply: string
      creditsRemaining: number
      provider: string
      error?: string
    }>('/api/ai/chat', {
      method: 'POST',
      body: {
        message: text,
        conversationId: conversationId.value,
      },
    })

    if (response.success) {
      messages.value = [
        ...messages.value,
        { role: 'assistant', content: response.reply },
      ]
      creditsRemaining.value = response.creditsRemaining
    } else {
      errorMessage.value = response.error ?? 'エラーが発生しました'
    }
  } catch (err: unknown) {
    const fetchError = err as { data?: { message?: string }; statusCode?: number }
    if (fetchError?.statusCode === 402) {
      errorMessage.value = 'AIクレジットが不足しています。'
    } else if (fetchError?.statusCode === 401) {
      errorMessage.value = 'ログインが必要です。'
    } else {
      errorMessage.value = fetchError?.data?.message ?? 'AIサービスに接続できませんでした。'
    }
  } finally {
    isLoading.value = false
    await scrollToBottom()
  }
}

async function scrollToBottom() {
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

function autoResize(event: Event) {
  const target = event.target as HTMLTextAreaElement
  target.style.height = 'auto'
  target.style.height = Math.min(target.scrollHeight, 120) + 'px'
}

// パネル開閉時にスクロール
watch(isOpen, async (val) => {
  if (val) {
    await scrollToBottom()
  }
})
</script>

<style scoped>
/* フローティングボタン（テキスト付き） */
.chat-fab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border-radius: 28px;
  background: #3b82f6;
  color: white;
  border: none;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
  transition: transform 0.2s, box-shadow 0.2s;
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
}

.chat-fab:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 16px rgba(59, 130, 246, 0.5);
}

.chat-fab-label {
  font-size: 14px;
  font-weight: 600;
}

/* チャットパネル（右側上下いっぱい） */
.chat-panel {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 400px;
  background: white;
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
  z-index: 10000;
}

/* ヘッダー */
.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: #3b82f6;
  color: white;
  flex-shrink: 0;
}

.chat-header-title {
  font-weight: 600;
  font-size: 15px;
}

.chat-header-credits {
  font-size: 11px;
  opacity: 0.85;
  display: block;
  margin-top: 2px;
}

.chat-close {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  opacity: 0.8;
}

.chat-close:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.15);
}

/* メッセージ一覧（上下いっぱいに伸びる） */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.chat-empty {
  text-align: center;
  color: #6b7280;
  padding: 40px 16px;
}

.chat-empty p {
  margin: 0;
  font-size: 14px;
}

.chat-empty-sub {
  margin-top: 8px !important;
  font-size: 12px !important;
  color: #9ca3af;
}

/* メッセージバブル */
.chat-message {
  margin-bottom: 12px;
}

.chat-message--user {
  display: flex;
  justify-content: flex-end;
}

.chat-message--user .chat-message-content {
  background: #3b82f6;
  color: white;
  border-radius: 16px 16px 4px 16px;
  padding: 10px 14px;
  max-width: 80%;
  font-size: 14px;
  line-height: 1.5;
  word-break: break-word;
}

.chat-message--assistant .chat-message-content {
  background: #f3f4f6;
  color: #1f2937;
  border-radius: 16px 16px 16px 4px;
  padding: 10px 14px;
  max-width: 80%;
  font-size: 14px;
  line-height: 1.5;
  word-break: break-word;
  white-space: pre-wrap;
}

/* タイピングインジケーター */
.chat-typing {
  display: flex;
  gap: 4px;
  padding: 8px 12px;
}

.chat-typing span {
  width: 8px;
  height: 8px;
  background: #9ca3af;
  border-radius: 50%;
  animation: typing 1.2s infinite;
}

.chat-typing span:nth-child(2) {
  animation-delay: 0.2s;
}

.chat-typing span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
  40% { transform: scale(1); opacity: 1; }
}

/* 入力エリア */
.chat-input-area {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid #e5e7eb;
  flex-shrink: 0;
}

.chat-input {
  flex: 1;
  border: 1px solid #d1d5db;
  border-radius: 12px;
  padding: 10px 14px;
  font-size: 14px;
  resize: none;
  outline: none;
  max-height: 120px;
  line-height: 1.4;
  font-family: inherit;
}

.chat-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.15);
}

.chat-send {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: #3b82f6;
  color: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: opacity 0.2s;
}

.chat-send:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.chat-send:not(:disabled):hover {
  background: #2563eb;
}

/* エラー表示 */
.chat-error {
  padding: 8px 16px;
  background: #fef2f2;
  color: #dc2626;
  font-size: 12px;
  text-align: center;
  flex-shrink: 0;
}

/* モバイル対応 */
@media (max-width: 480px) {
  .chat-panel {
    width: 100vw;
  }
}
</style>
