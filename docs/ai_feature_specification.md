# AI音声入力機能 - 技術仕様書

## 1. 概要

### 機能名
**AI音声入力機能（ミエルボード AI Voice Input）**

### 目的
現場での直感的なスケジュール入力を実現し、「明日の10時から会議」などの自然言語でスケジュール登録を可能にする。

### 対応範囲
- **AIコア機能**:
  - 音声認識（OpenAI Whisper API）
  - 自然言語処理（スケジュール情報抽出）
  - リアルタイム音声入力UI
  - 現場騒音対応
- **AI拡張機能**:
  - AIスケジュール最適化（過去データ学習）
  - AIリマインド機能（適切タイミング通知）
  - AI会議室最適化（利用パターン分析）

---

## 2. 技術仕様

### 使用API
- **OpenAI Whisper API**
  - エンドポイント: `https://api.openai.com/v1/audio/transcriptions`
  - モデル: `whisper-1`
  - 対応言語: 日本語
  - 音声形式: MP3, WAV, M4A（最大25MB）

### フロントエンド技術
```typescript
// 必要なパッケージ
{
  "dependencies": {
    "openai": "^4.0.0",
    "@types/web-audio-api": "^0.0.0"
  }
}
```

### バックエンドAPI設計
```typescript
// server/api/ai/voice-to-schedule.post.ts
interface VoiceToScheduleRequest {
  audioFile: File
  userId: string
  organizationId: string
}

interface VoiceToScheduleResponse {
  success: boolean
  transcription: string
  extractedSchedule?: {
    title: string
    startTime: Date
    endTime: Date
    attendees?: string[]
  }
  confidence: number
}
```

---

## 3. 音声認識フロー

### Step 1: 音声収録
```typescript
// composables/useVoiceRecording.ts
export const useVoiceRecording = () => {
  const mediaRecorder = ref<MediaRecorder | null>(null)
  const audioChunks = ref<Blob[]>([])
  const isRecording = ref(false)

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    })
    
    mediaRecorder.value = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus'
    })
    
    mediaRecorder.value.ondataavailable = (event) => {
      audioChunks.value.push(event.data)
    }
    
    mediaRecorder.value.start()
    isRecording.value = true
  }

  const stopRecording = (): Promise<Blob> => {
    return new Promise((resolve) => {
      mediaRecorder.value?.addEventListener('stop', () => {
        const audioBlob = new Blob(audioChunks.value, { 
          type: 'audio/webm' 
        })
        audioChunks.value = []
        isRecording.value = false
        resolve(audioBlob)
      })
      
      mediaRecorder.value?.stop()
    })
  }

  return {
    startRecording,
    stopRecording,
    isRecording: readonly(isRecording)
  }
}
```

### Step 2: OpenAI Whisper API呼び出し
```typescript
// server/api/ai/transcribe.post.ts
export default defineEventHandler(async (event) => {
  const formData = await readMultipartFormData(event)
  const audioFile = formData?.find(item => item.name === 'audio')

  if (!audioFile) {
    throw createError({
      statusCode: 400,
      statusMessage: '音声ファイルが必要です'
    })
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  })

  try {
    const transcription = await openai.audio.transcriptions.create({
      file: new File([audioFile.data], 'audio.webm', {
        type: 'audio/webm'
      }),
      model: 'whisper-1',
      language: 'ja',
      prompt: 'スケジュール登録のための音声入力です。日時、タイトル、参加者を認識してください。'
    })

    return {
      success: true,
      transcription: transcription.text
    }
  } catch (error) {
    console.error('Whisper API エラー:', error)
    throw createError({
      statusCode: 500,
      statusMessage: '音声認識に失敗しました'
    })
  }
})
```

### Step 3: 自然言語処理（スケジュール抽出）
```typescript
// server/api/ai/extract-schedule.post.ts
interface ScheduleExtraction {
  title: string
  startTime: Date
  endTime: Date
  attendees: string[]
  confidence: number
}

export default defineEventHandler(async (event) => {
  const { transcription } = await readBody(event)

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  })

  const prompt = `
以下の音声認識結果からスケジュール情報を抽出してください。
JSON形式で回答してください。

音声認識結果: "${transcription}"

抽出形式:
{
  "title": "会議のタイトル",
  "startTime": "2025-07-03T10:00:00Z",
  "endTime": "2025-07-03T11:00:00Z", 
  "attendees": ["参加者名"],
  "confidence": 0.8
}

現在日時: ${new Date().toISOString()}
`

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3
    })

    const extractedData = JSON.parse(completion.choices[0].message.content!)
    
    return {
      success: true,
      extracted: extractedData
    }
  } catch (error) {
    console.error('スケジュール抽出エラー:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'スケジュール抽出に失敗しました'
    })
  }
})
```

---

## 4. AI拡張機能設計

### AIスケジュール最適化
```typescript
// server/api/ai/optimize-schedule.post.ts
interface ScheduleOptimizeRequest {
  targetDate: string
  participants: string[]
  duration: number
  priority: 'high' | 'medium' | 'low'
  constraints?: {
    preferredTimeSlots?: string[]
    avoidTimeSlots?: string[]
    requiredResources?: string[]
  }
}

interface ScheduleOptimizeResponse {
  success: boolean
  recommendations: Array<{
    startTime: string
    endTime: string
    confidence: number
    reasoning: string
    conflicts: Array<{
      type: 'time_conflict' | 'resource_conflict'
      severity: 'low' | 'medium' | 'high'
      description: string
    }>
  }>
}

export default defineEventHandler(async (event) => {
  const request = await readBody<ScheduleOptimizeRequest>(event)
  
  // 過去のスケジュールデータを分析
  const historicalData = await prisma.schedule.findMany({
    where: {
      startTime: {
        gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // 過去90日
      }
    },
    include: {
      attendees: true,
      user: true
    }
  })

  // AI分析処理
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  
  const analysisPrompt = `
過去のスケジュールデータに基づいて最適なスケジュールを提案してください。

リクエスト: ${JSON.stringify(request)}
過去データパターン: ${JSON.stringify(historicalData.slice(0, 50))}

分析要素:
1. 参加者の過去の空き時間パターン
2. 会議の平均時間と効率的な時間帯
3. リソース利用状況
4. 優先度による調整

JSON形式で3つの推奨案を提案してください。
`

  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: analysisPrompt }],
    temperature: 0.3
  })

  return JSON.parse(completion.choices[0].message.content!)
})
```

### AIリマインド機能
```typescript
// server/api/ai/smart-reminder.post.ts
interface SmartReminderRequest {
  scheduleId: string
  userId: string
}

interface SmartReminderResponse {
  success: boolean
  reminders: Array<{
    type: 'preparation' | 'departure' | 'urgent'
    timing: string // ISO datetime
    message: string
    channel: 'email' | 'notification' | 'sms'
    priority: number
  }>
}

export default defineEventHandler(async (event) => {
  const { scheduleId, userId } = await readBody<SmartReminderRequest>(event)
  
  // スケジュール詳細を取得
  const schedule = await prisma.schedule.findUnique({
    where: { id: scheduleId },
    include: {
      user: true,
      attendees: { include: { user: true } },
      board: true
    }
  })

  // ユーザーの過去の行動パターンを分析
  const userPatterns = await analyzeUserBehaviorPatterns(userId)
  
  // AI分析でリマインダーを最適化
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  
  const reminderPrompt = `
ユーザーの行動パターンに基づいて、最適なリマインダータイミングを提案してください。

スケジュール情報: ${JSON.stringify(schedule)}
ユーザーパターン: ${JSON.stringify(userPatterns)}

考慮要素:
1. 移動時間
2. 準備時間
3. 重要度
4. ユーザーの過去の遅刻/早到着パターン
5. 曜日・時間帯による行動変化

最適なリマインダー3つを提案してください。
`

  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: reminderPrompt }],
    temperature: 0.2
  })

  return JSON.parse(completion.choices[0].message.content!)
})

async function analyzeUserBehaviorPatterns(userId: string) {
  // 過去のスケジュール参加実績を分析
  return await prisma.schedule.findMany({
    where: {
      OR: [
        { userId },
        { attendees: { some: { userId } } }
      ],
      startTime: {
        gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) // 過去6ヶ月
      }
    },
    include: {
      attendees: true
    }
  })
}
```

### AI会議室最適化
```typescript
// server/api/ai/room-optimization.post.ts
interface RoomOptimizationRequest {
  startTime: string
  endTime: string
  attendeeCount: number
  requirements: {
    projector?: boolean
    whiteBoard?: boolean
    videoConference?: boolean
    capacity?: number
  }
}

export default defineEventHandler(async (event) => {
  const request = await readBody<RoomOptimizationRequest>(event)
  
  // 利用可能な会議室データを取得
  const availableRooms = await prisma.board.findMany({
    where: {
      // 利用可能条件をチェック
    },
    include: {
      schedules: {
        where: {
          AND: [
            { startTime: { lt: request.endTime } },
            { endTime: { gt: request.startTime } }
          ]
        }
      }
    }
  })

  // AI分析で最適な会議室を選定
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  
  const optimizationPrompt = `
利用可能な会議室から最適な選択肢を提案してください。

リクエスト: ${JSON.stringify(request)}
利用可能な会議室: ${JSON.stringify(availableRooms)}

評価基準:
1. 参加者数に対する適切な部屋サイズ
2. 必要設備の完備
3. アクセスの良さ
4. 過去の利用実績
5. エネルギー効率

最適な会議室を3つ、理由とともに提案してください。
`

  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: optimizationPrompt }],
    temperature: 0.3
  })

  return JSON.parse(completion.choices[0].message.content!)
})
```

---

## 5. UI/UX設計

### 音声入力コンポーネント
```vue
<!-- components/VoiceScheduleInput.vue -->
<template>
  <div class="voice-input-container">
    <!-- 音声入力ボタン -->
    <button
      @click="toggleRecording"
      :class="[
        'voice-button',
        { 'recording': isRecording }
      ]"
    >
      <Icon 
        :name="isRecording ? 'material-symbols:stop' : 'material-symbols:mic'" 
        size="24" 
      />
      {{ isRecording ? '録音停止' : '音声入力' }}
    </button>

    <!-- 録音中アニメーション -->
    <div v-if="isRecording" class="recording-animation">
      <div class="wave"></div>
      <div class="wave"></div>
      <div class="wave"></div>
    </div>

    <!-- 認識結果表示 -->
    <div v-if="transcription" class="transcription-result">
      <h3>認識結果</h3>
      <p>{{ transcription }}</p>
      
      <!-- 抽出されたスケジュール情報 -->
      <div v-if="extractedSchedule" class="extracted-schedule">
        <h4>抽出されたスケジュール</h4>
        <div class="schedule-preview">
          <p><strong>タイトル:</strong> {{ extractedSchedule.title }}</p>
          <p><strong>開始時間:</strong> {{ formatDate(extractedSchedule.startTime) }}</p>
          <p><strong>終了時間:</strong> {{ formatDate(extractedSchedule.endTime) }}</p>
        </div>
        
        <div class="action-buttons">
          <button @click="confirmSchedule" class="btn-primary">
            スケジュール登録
          </button>
          <button @click="editSchedule" class="btn-secondary">
            編集
          </button>
        </div>
      </div>
    </div>

    <!-- エラー表示 -->
    <div v-if="error" class="error-message">
      {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
const { startRecording, stopRecording, isRecording } = useVoiceRecording()
const transcription = ref('')
const extractedSchedule = ref(null)
const error = ref('')

const toggleRecording = async () => {
  if (isRecording.value) {
    try {
      const audioBlob = await stopRecording()
      await processAudio(audioBlob)
    } catch (err) {
      error.value = '録音処理に失敗しました'
    }
  } else {
    await startRecording()
  }
}

const processAudio = async (audioBlob: Blob) => {
  const formData = new FormData()
  formData.append('audio', audioBlob)

  try {
    // 音声認識
    const transcribeResponse = await $fetch('/api/ai/transcribe', {
      method: 'POST',
      body: formData
    })
    
    transcription.value = transcribeResponse.transcription

    // スケジュール抽出
    const extractResponse = await $fetch('/api/ai/extract-schedule', {
      method: 'POST',
      body: { transcription: transcription.value }
    })
    
    extractedSchedule.value = extractResponse.extracted
  } catch (err) {
    error.value = '音声処理に失敗しました'
  }
}
</script>

<style scoped>
.voice-button {
  @apply bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-full transition-all duration-300;
}

.voice-button.recording {
  @apply bg-red-500 hover:bg-red-600 animate-pulse;
}

.recording-animation {
  @apply flex justify-center items-center space-x-1 mt-4;
}

.wave {
  @apply w-2 h-8 bg-blue-500 rounded-full animate-pulse;
  animation-delay: 0.1s, 0.2s, 0.3s;
}

.transcription-result {
  @apply mt-6 p-4 bg-gray-50 rounded-lg;
}

.extracted-schedule {
  @apply mt-4 p-4 bg-white border rounded-lg;
}

.schedule-preview {
  @apply space-y-2 mb-4;
}

.action-buttons {
  @apply flex space-x-3;
}

.error-message {
  @apply mt-4 p-3 bg-red-50 text-red-700 rounded-lg;
}
</style>
```

---

## 5. 環境設定

### 環境変数
```bash
# .env
OPENAI_API_KEY=sk-xxx # OpenAI APIキー
AI_FEATURE_ENABLED=true # AI機能の有効/無効
WHISPER_MAX_FILE_SIZE=25MB # 最大ファイルサイズ
```

### Nuxt設定
```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  runtimeConfig: {
    openaiApiKey: process.env.OPENAI_API_KEY,
    aiFeatureEnabled: process.env.AI_FEATURE_ENABLED === 'true',
    public: {
      aiFeatureEnabled: process.env.AI_FEATURE_ENABLED === 'true'
    }
  }
})
```

---

## 6. 料金プラン別AI機能制限

### エコノミープラン
- **AI音声入力**: 月間100回まで
- **基本転写機能**: ✅
- **スケジュール抽出**: ✅（基本レベル）
- **AI最適化**: ❌
- **AIリマインド**: ❌

### スタンダードプラン  
- **AI音声入力**: 月間500回まで
- **高精度転写**: ✅
- **スケジュール抽出**: ✅（高精度）
- **AI最適化**: ✅（基本レベル）
- **AIリマインド**: ✅（基本レベル）

### プレミアムプラン
- **AI音声入力**: 無制限
- **AI全機能**: ✅（フル機能）
- **高度な最適化**: ✅（機械学習活用）
- **スマートリマインド**: ✅（行動パターン学習）
- **会議室最適化**: ✅

---

## 7. 実装段階

### Phase 1: 基本音声認識（1週間）
1. 音声録音機能の実装
2. OpenAI Whisper API連携
3. 基本的な転写機能

### Phase 2: スケジュール抽出（1週間）
1. 自然言語処理の実装
2. スケジュール情報抽出ロジック
3. 信頼度判定機能

### Phase 3: UI/UX改善（1週間）
1. 音声入力コンポーネントの完成
2. リアルタイムフィードバック
3. エラーハンドリング強化

### Phase 4: 最適化（1週間）
1. 騒音対応の改善
2. レスポンス時間最適化
3. ユーザビリティテスト

---

## 8. テスト仕様

### 音声認識テスト
```typescript
// tests/ai/voice-recognition.test.ts
describe('音声認識機能', () => {
  test('明確な音声の認識', async () => {
    const audioFile = await loadTestAudio('clear-voice.wav')
    const result = await transcribeAudio(audioFile)
    expect(result.confidence).toBeGreaterThan(0.8)
  })

  test('騒音下での音声認識', async () => {
    const audioFile = await loadTestAudio('noisy-voice.wav')
    const result = await transcribeAudio(audioFile)
    expect(result.confidence).toBeGreaterThan(0.6)
  })
})
```

### スケジュール抽出テスト
```typescript
describe('スケジュール抽出', () => {
  test('基本的な日時表現', () => {
    const text = '明日の10時から会議です'
    const extracted = extractSchedule(text)
    expect(extracted.title).toBe('会議')
    expect(extracted.startTime).toBeDefined()
  })

  test('複雑な日時表現', () => {
    const text = '来週の月曜日午後2時から4時まで打ち合わせ'
    const extracted = extractSchedule(text)
    expect(extracted.endTime).toBeDefined()
  })
})
```

---

## 9. 運用・監視

### ログ設計
```typescript
// ログ項目
interface AIUsageLog {
  userId: string
  feature: 'voice_recognition' | 'schedule_extraction'
  inputLength: number
  processingTime: number
  confidence: number
  success: boolean
  errorType?: string
}
```

### 制限事項
- 月間API使用制限: 1,000回/組織
- 音声ファイル最大サイズ: 25MB
- 処理タイムアウト: 30秒

---

*作成日: 2025年7月2日*  
*最終更新: 2025年7月2日* 