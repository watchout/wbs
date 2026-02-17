<template>
  <div class="ai-chat-widget">
    <!-- チャットボタン -->
    <button 
      v-if="!isOpen" 
      @click="openChat" 
      class="chat-button"
      :class="{ 'has-notification': hasNotification }"
    >
      <span class="button-icon">💬</span>
      <span class="button-label">質問する</span>
    </button>

    <!-- チャットパネル -->
    <div v-if="isOpen" class="chat-panel">
      <div class="chat-header">
        <div class="header-info">
          <span class="ai-avatar">🤖</span>
          <div>
            <div class="ai-name">ミエルAI</div>
            <div class="ai-status">
              <span class="status-dot"></span>
              オンライン
            </div>
          </div>
        </div>
        <button @click="closeChat" class="close-button">✕</button>
      </div>

      <div class="chat-messages" ref="messagesContainer">
        <div 
          v-for="(msg, index) in messages" 
          :key="index" 
          class="message"
          :class="msg.type"
        >
          <span v-if="msg.type === 'ai'" class="msg-avatar">🤖</span>
          <div class="msg-content">
            <div class="msg-bubble" v-html="sanitizedContent(msg.content)"></div>
            <div class="msg-time">{{ msg.time }}</div>
          </div>
        </div>

        <!-- タイピングインジケーター -->
        <div v-if="isTyping" class="message ai">
          <span class="msg-avatar">🤖</span>
          <div class="msg-content">
            <div class="msg-bubble typing">
              <span></span><span></span><span></span>
            </div>
          </div>
        </div>
      </div>

      <!-- クイックアクション -->
      <div v-if="showQuickActions" class="quick-actions">
        <button 
          v-for="action in quickActions" 
          :key="action.id"
          @click="sendQuickAction(action)"
          class="quick-action-btn"
        >
          {{ action.icon }} {{ action.label }}
        </button>
      </div>

      <!-- 入力エリア -->
      <div class="chat-input">
        <input 
          v-model="inputMessage"
          @keyup.enter="sendMessage"
          placeholder="質問を入力..."
          :disabled="isTyping"
        />
        <button @click="sendMessage" :disabled="!inputMessage.trim() || isTyping">
          送信
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted } from 'vue'
import { sanitizeHtml } from '~/utils/sanitize'

// XSS対策: v-html に渡す前にサニタイズ（SEC-006）
function sanitizedContent(content: string): string {
  return sanitizeHtml(content)
}

interface Message {
  type: 'user' | 'ai'
  content: string
  time: string
}

interface QuickAction {
  id: string
  icon: string
  label: string
  query: string
}

const isOpen = ref(false)
const hasNotification = ref(true)
const isTyping = ref(false)
const showQuickActions = ref(true)
const inputMessage = ref('')
const messages = ref<Message[]>([])
const messagesContainer = ref<HTMLElement | null>(null)

const quickActions: QuickAction[] = [
  { id: 'price', icon: '💰', label: '料金プラン', query: '料金プランを教えてください' },
  { id: 'ai', icon: '🤖', label: 'AIについて', query: 'AIコンシェルジュについて教えてください' },
  { id: 'trial', icon: '🎁', label: '無料トライアル', query: '無料トライアルの始め方を教えてください' },
  { id: 'feature', icon: '⭐', label: '機能', query: 'ミエルボードでできることを教えてください' },
]

// AI応答データベース
const aiResponses: Record<string, string> = {
  // 料金関連
  '料金': `<strong>料金プラン（AIコンシェルジュ標準搭載!）</strong><br><br>
📌 <strong>スターター</strong>: ¥9,800/月<br>
　・10名まで / 🤖AI 100回/月<br><br>
📌 <strong>ビジネス</strong>: ¥19,800/月<br>
　・30名まで / 🤖AI 500回/月<br><br>
📌 <strong>プロフェッショナル</strong>: ¥39,800/月 ⭐人気<br>
　・100名まで / 🤖AI 2,000回/月<br><br>
📌 <strong>エンタープライズ</strong>: 要相談<br>
　・無制限 / 🤖AI無制限<br><br>
🎁 今なら<strong>初月50%OFF</strong> + 14日間無料トライアル（AI 2,000回付き）！`,

  // 無料トライアル
  'トライアル': `<strong>無料トライアルの始め方</strong><br><br>
1️⃣ 上部の「無料で試す」ボタンをクリック<br>
2️⃣ メールアドレスを入力<br>
3️⃣ 担当者から2営業日以内にご連絡<br>
4️⃣ 14日間すべての機能をお試しいただけます<br><br>
✓ クレジットカード不要<br>
✓ 自動課金なし<br>
✓ いつでもキャンセル可能<br><br>
🤖 <strong>トライアル特典:</strong> AIコンシェルジュ 2,000回分プレゼント！`,

  // 機能
  '機能': `<strong>ミエルプラスでできること</strong><br><br>
📆 <strong>ミエルボード</strong>（利用可能）<br>
・週間スケジュールをサイネージ表示<br>
・「誰がどこにいるか」を一目で把握<br>
・Googleカレンダー連携<br><br>
📦 <strong>ミエルストック</strong>（Coming Soon）<br>
・在庫・資材管理<br><br>
🚗 <strong>ミエルドライブ</strong>（Coming Soon）<br>
・車両管理・アルコールチェック<br><br>
🤖 <strong>AIコンシェルジュ</strong>（全プラン標準搭載）<br>
・「田中さん今どこ？」と聞くだけで即座に回答！`,

  // AI関連
  'AI': `<strong>🤖 AIコンシェルジュについて</strong><br><br>
<strong>全プランに標準搭載！</strong>これが他社との最大の違いです。<br><br>
💬 使い方は簡単：<br>
・「田中さん今どこ？」<br>
・「工事部の今週の予定は？」<br>
・「◯◯現場に入ってる人教えて」<br><br>
📊 月間クレジット：<br>
・スターター: 100回/月<br>
・ビジネス: 500回/月<br>
・プロ: 2,000回/月<br>
・エンタープライズ: 無制限<br><br>
🎁 トライアルでは2,000回分を無料でお試しいただけます！`,

  // 導入サポート
  'サポート': `<strong>導入サポート</strong><br><br>
ミエルボードでは、スムーズな導入をサポートします：<br><br>
✓ <strong>初期設定サポート</strong>（無料）<br>
✓ <strong>オンライン説明会</strong>（随時開催）<br>
✓ <strong>操作マニュアル</strong>完備<br>
✓ <strong>チャット・メールサポート</strong><br><br>
プロプラン以上は<strong>専任担当</strong>がつきます！`,

  // カレンダー連携
  'カレンダー': `<strong>カレンダー連携</strong><br><br>
対応カレンダー：<br>
✓ Googleカレンダー<br>
✓ Outlookカレンダー（ビジネス以上）<br><br>
既存のカレンダー予定が自動的に週間ボードに反映されます。手動入力も可能です。`,

  // セキュリティ
  'セキュリティ': `<strong>セキュリティ対策</strong><br><br>
✓ SSL/TLS暗号化通信<br>
✓ データは国内サーバーで管理<br>
✓ マルチテナント（組織間完全分離）<br>
✓ 定期的なセキュリティ監査<br>
✓ SOC2対応（エンタープライズ）`,

  // デフォルト
  'default': `ご質問ありがとうございます！<br><br>
申し訳ありませんが、詳しい回答は担当者からご案内させていただきます。<br><br>
📧 <strong>お問い合わせ</strong><br>
・ページ下部のフォームからメールアドレスを送信<br>
・2営業日以内に担当者からご連絡いたします<br><br>
他にご質問があればお気軽にどうぞ！`
}

function getCurrentTime(): string {
  const now = new Date()
  return `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`
}

function openChat() {
  isOpen.value = true
  hasNotification.value = false
  
  // 初回メッセージ
  if (messages.value.length === 0) {
    messages.value.push({
      type: 'ai',
      content: `こんにちは！<strong>ミエルAI</strong>です 🤖<br><br>
ミエルボードについてのご質問にお答えします。<br>
下のボタンから選択するか、自由に質問してください！`,
      time: getCurrentTime()
    })
  }
}

function closeChat() {
  isOpen.value = false
}

function sendQuickAction(action: QuickAction) {
  inputMessage.value = action.query
  sendMessage()
  showQuickActions.value = false
}

async function sendMessage() {
  const msg = inputMessage.value.trim()
  if (!msg) return

  // ユーザーメッセージ追加
  messages.value.push({
    type: 'user',
    content: msg,
    time: getCurrentTime()
  })
  
  inputMessage.value = ''
  showQuickActions.value = false
  
  // スクロール
  await nextTick()
  scrollToBottom()
  
  // AI応答
  isTyping.value = true
  
  // 応答を遅延させてリアル感を出す
  setTimeout(async () => {
    const response = getAiResponse(msg)
    messages.value.push({
      type: 'ai',
      content: response,
      time: getCurrentTime()
    })
    isTyping.value = false
    
    await nextTick()
    scrollToBottom()
  }, 1000 + Math.random() * 1000)
}

function getAiResponse(query: string): string {
  const lowerQuery = query.toLowerCase()
  
  // キーワードマッチング
  if (lowerQuery.includes('ai') || lowerQuery.includes('コンシェルジュ') || lowerQuery.includes('クレジット') || lowerQuery.includes('回数')) {
    return aiResponses['AI']
  }
  if (lowerQuery.includes('料金') || lowerQuery.includes('価格') || lowerQuery.includes('プラン') || lowerQuery.includes('いくら')) {
    return aiResponses['料金']
  }
  if (lowerQuery.includes('トライアル') || lowerQuery.includes('無料') || lowerQuery.includes('試') || lowerQuery.includes('始め')) {
    return aiResponses['トライアル']
  }
  if (lowerQuery.includes('機能') || lowerQuery.includes('できる') || lowerQuery.includes('できること') || lowerQuery.includes('何が')) {
    return aiResponses['機能']
  }
  if (lowerQuery.includes('サポート') || lowerQuery.includes('導入') || lowerQuery.includes('説明')) {
    return aiResponses['サポート']
  }
  if (lowerQuery.includes('カレンダー') || lowerQuery.includes('連携') || lowerQuery.includes('google') || lowerQuery.includes('outlook')) {
    return aiResponses['カレンダー']
  }
  if (lowerQuery.includes('セキュリティ') || lowerQuery.includes('安全') || lowerQuery.includes('データ')) {
    return aiResponses['セキュリティ']
  }
  if (lowerQuery.includes('他社') || lowerQuery.includes('違い') || lowerQuery.includes('差別化')) {
    return aiResponses['AI'] // AI標準搭載が差別化ポイント
  }
  
  return aiResponses['default']
}

function scrollToBottom() {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

// 3秒後に通知バッジを表示
onMounted(() => {
  setTimeout(() => {
    hasNotification.value = true
  }, 3000)
})
</script>

<style scoped>
.ai-chat-widget {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 9999;
  font-family: 'Noto Sans JP', sans-serif;
}

/* チャットボタン */
.chat-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.875rem 1.25rem;
  background: linear-gradient(135deg, #0066cc 0%, #004499 100%);
  color: white;
  border: none;
  border-radius: 50px;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(0, 102, 204, 0.4);
  transition: all 0.3s;
  font-size: 0.95rem;
  font-weight: 500;
}

.chat-button:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 25px rgba(0, 102, 204, 0.5);
}

.chat-button.has-notification::after {
  content: '';
  position: absolute;
  top: -4px;
  right: -4px;
  width: 16px;
  height: 16px;
  background: #ff6b35;
  border-radius: 50%;
  border: 3px solid white;
  animation: pulse-notification 2s infinite;
}

@keyframes pulse-notification {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.2); }
}

.button-icon {
  font-size: 1.25rem;
}

/* チャットパネル */
.chat-panel {
  width: 380px;
  height: 520px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ヘッダー */
.chat-header {
  padding: 1rem;
  background: linear-gradient(135deg, #1a1a2e 0%, #2d2d44 100%);
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.ai-avatar {
  font-size: 2rem;
}

.ai-name {
  font-weight: 600;
}

.ai-status {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.75rem;
  opacity: 0.8;
}

.status-dot {
  width: 8px;
  height: 8px;
  background: #4caf50;
  border-radius: 50%;
}

.close-button {
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: white;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 1rem;
}

.close-button:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* メッセージエリア */
.chat-messages {
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
  background: #f8f9fa;
}

.message {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  align-items: flex-start;
}

.message.user {
  flex-direction: row-reverse;
}

.msg-avatar {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  flex-shrink: 0;
}

.msg-content {
  max-width: 80%;
}

.msg-bubble {
  padding: 0.75rem 1rem;
  border-radius: 16px;
  font-size: 0.9rem;
  line-height: 1.5;
}

.message.ai .msg-bubble {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 16px 16px 16px 4px;
}

.message.user .msg-bubble {
  background: #0066cc;
  color: white;
  border-radius: 16px 16px 4px 16px;
}

.msg-time {
  font-size: 0.7rem;
  color: #999;
  margin-top: 0.25rem;
  text-align: right;
}

.message.ai .msg-time {
  text-align: left;
}

/* タイピングインジケーター */
.msg-bubble.typing {
  display: flex;
  gap: 4px;
  padding: 0.75rem 1rem;
}

.msg-bubble.typing span {
  width: 8px;
  height: 8px;
  background: #999;
  border-radius: 50%;
  animation: typing-dot 1.4s infinite;
}

.msg-bubble.typing span:nth-child(2) {
  animation-delay: 0.2s;
}

.msg-bubble.typing span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing-dot {
  0%, 60%, 100% { transform: translateY(0); }
  30% { transform: translateY(-5px); }
}

/* クイックアクション */
.quick-actions {
  padding: 0.75rem;
  background: white;
  border-top: 1px solid #eee;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.quick-action-btn {
  padding: 0.5rem 0.75rem;
  background: #f0f4ff;
  border: 1px solid #d0e0ff;
  border-radius: 20px;
  font-size: 0.8rem;
  color: #0066cc;
  cursor: pointer;
  transition: all 0.2s;
}

.quick-action-btn:hover {
  background: #0066cc;
  color: white;
  border-color: #0066cc;
}

/* 入力エリア */
.chat-input {
  padding: 0.75rem;
  background: white;
  border-top: 1px solid #eee;
  display: flex;
  gap: 0.5rem;
}

.chat-input input {
  flex: 1;
  padding: 0.75rem 1rem;
  border: 1px solid #ddd;
  border-radius: 24px;
  font-size: 0.9rem;
  outline: none;
}

.chat-input input:focus {
  border-color: #0066cc;
}

.chat-input button {
  padding: 0.75rem 1.25rem;
  background: #0066cc;
  color: white;
  border: none;
  border-radius: 24px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background 0.2s;
}

.chat-input button:hover:not(:disabled) {
  background: #0052a3;
}

.chat-input button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

/* レスポンシブ */
@media (max-width: 480px) {
  .ai-chat-widget {
    bottom: 16px;
    right: 16px;
  }
  
  .chat-panel {
    width: calc(100vw - 32px);
    height: calc(100vh - 100px);
    max-height: 600px;
  }
  
  .button-label {
    display: none;
  }
  
  .chat-button {
    width: 56px;
    height: 56px;
    padding: 0;
    justify-content: center;
    border-radius: 50%;
  }
  
  .button-icon {
    font-size: 1.5rem;
  }
}
</style>

