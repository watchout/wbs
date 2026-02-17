# SSOT_AI_ASSISTANT.md — AIアシスタント機能仕様 v1.0

> **ステータス**: 設計完了 → 実装待ち
> **対象**: ミエルボード for 現場 — AIアシスタント
> **作成日**: 2025-02-17

---

## 1. 概要

### 1-1. 目的

ミエルボードの業務画面およびLPに、AI対話型アシスタントを提供する。
管理者が Claude / ChatGPT / Gemini から使用するLLMプロバイダーを選択でき、
コスト・品質のバランスを自社で制御可能にする。

### 1-2. スコープ

**含む:**
- 業務画面AIアシスタント（認証済みユーザー向け）
- LP向けFAQチャットボット（LLM版、未認証）
- マルチLLMプロバイダー抽象化レイヤー（Claude / ChatGPT / Gemini）
- 管理者によるプロバイダー切替設定UI
- AIクレジット消費連携（既存 aiCredits.ts を利用）
- ツール呼び出し（スケジュール検索、ユーザー検索）

**含まない（Phase 2以降）:**
- AI音声入力（voice_input）
- AI日程調整の自動実行（schedule_ai）
- AI予定要約（summary）
- ストリーミングレスポンス
- 会話履歴のDB永続化

---

## 2. アーキテクチャ

### 2-1. マルチLLMプロバイダー構成

```
┌─────────────────────────────────────┐
│         server/utils/llm/           │
│                                     │
│  ┌───────────┐                      │
│  │ provider   │ ← LlmProvider      │
│  │  .ts       │   interface         │
│  └─────┬─────┘                      │
│        │                            │
│  ┌─────┴──────────────────────┐     │
│  │         │         │        │     │
│  ▼         ▼         ▼        │     │
│ claude  openai    gemini      │     │
│  .ts     .ts       .ts       │     │
│                               │     │
│  ┌───────────┐                │     │
│  │ factory.ts │ ← 組織設定で  │     │
│  │            │   プロバイダ   │     │
│  └────────────┘   を選択      │     │
└─────────────────────────────────────┘
```

### 2-2. プロバイダーインターフェース

```typescript
// server/utils/llm/provider.ts

export type LlmProviderType = 'claude' | 'openai' | 'gemini'

export interface LlmMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface LlmToolDefinition {
  name: string
  description: string
  parameters: Record<string, unknown> // JSON Schema
}

export interface LlmToolCall {
  name: string
  arguments: Record<string, unknown>
}

export interface LlmResponse {
  content: string
  toolCalls?: LlmToolCall[]
  usage: {
    inputTokens: number
    outputTokens: number
  }
}

export interface LlmProvider {
  readonly type: LlmProviderType

  chat(
    messages: LlmMessage[],
    options?: {
      systemPrompt?: string
      tools?: LlmToolDefinition[]
      maxTokens?: number
      temperature?: number
    }
  ): Promise<LlmResponse>
}
```

### 2-3. 各プロバイダー実装

| プロバイダー | SDK | モデル | 環境変数 |
|-------------|-----|--------|---------|
| Claude | `@anthropic-ai/sdk` | claude-sonnet-4-20250514 | `ANTHROPIC_API_KEY` |
| OpenAI | `openai` | gpt-4o-mini | `OPENAI_API_KEY` |
| Gemini | `@google/generative-ai` | gemini-2.0-flash | `GOOGLE_AI_API_KEY` |

### 2-4. ファクトリー

```typescript
// server/utils/llm/factory.ts

export async function createLlmProvider(
  organizationId: string
): Promise<LlmProvider> {
  // 1. DB から組織の LLM 設定を取得
  // 2. 設定なし or デフォルト → openai（コスト効率最良）
  // 3. 環境変数でAPIキーがあるか確認
  // 4. プロバイダーインスタンスを返す
}
```

---

## 3. データモデル

### 3-1. 組織LLM設定（Organization拡張）

Organizationモデルにフィールドを追加:

```prisma
model Organization {
  // ... 既存フィールド

  // AI アシスタント設定
  llmProvider     String   @default("openai")  // "claude" | "openai" | "gemini"
  llmModel        String?  // カスタムモデル名（null=デフォルト）
}
```

> **設計判断**: 別テーブルではなく Organization に直接追加。
> 理由: 1組織1設定の1:1関係であり、JOIN不要でクエリが効率的。

---

## 4. API設計

### 4-1. 業務画面チャットAPI

```
POST /api/ai/chat
Authorization: required (requireAuth)
Credits: 1 消費 (consult)
```

**Request:**
```typescript
interface AiChatRequest {
  message: string        // ユーザーメッセージ（最大2000文字）
  conversationId?: string // 会話ID（フロント管理、ログ用）
}
```

**Response:**
```typescript
interface AiChatResponse {
  success: boolean
  reply: string           // AIの応答
  creditsRemaining: number // 残クレジット (-1=無制限)
  provider: string        // 使用したプロバイダー
  error?: string
}
```

**エラーケース:**
| ステータス | 理由 |
|-----------|------|
| 401 | 未認証 |
| 400 | メッセージが空 / 2000文字超過 |
| 402 | クレジット不足 |
| 503 | LLMプロバイダー障害 |

### 4-2. LP向けチャットAPI

```
POST /api/ai/lp-chat
Authorization: なし
Credits: 消費なし（LP用、レート制限あり）
```

**Request:**
```typescript
interface LpChatRequest {
  message: string   // 最大500文字
  sessionId: string // ブラウザセッションID
}
```

**Response:**
```typescript
interface LpChatResponse {
  success: boolean
  reply: string
}
```

**レート制限:** IP あたり 10回/分, セッションあたり 50回/時

### 4-3. LLM設定API

```
GET /api/admin/llm-settings
Authorization: required (ADMIN only)
```

```
PATCH /api/admin/llm-settings
Authorization: required (ADMIN only)
```

**Request:**
```typescript
interface LlmSettingsUpdate {
  llmProvider: 'claude' | 'openai' | 'gemini'
  llmModel?: string | null
}
```

---

## 5. AIアシスタントのツール定義

業務画面のAIアシスタントが利用できるツール:

### 5-1. search_schedules

```typescript
{
  name: 'search_schedules',
  description: '指定した条件でスケジュールを検索する',
  parameters: {
    type: 'object',
    properties: {
      startDate: { type: 'string', description: 'YYYY-MM-DD' },
      endDate: { type: 'string', description: 'YYYY-MM-DD' },
      userName: { type: 'string', description: '社員名（部分一致）' },
      keyword: { type: 'string', description: 'タイトル/説明のキーワード' }
    }
  }
}
```

### 5-2. search_users

```typescript
{
  name: 'search_users',
  description: '社員情報を検索する',
  parameters: {
    type: 'object',
    properties: {
      name: { type: 'string', description: '名前（部分一致）' },
      departmentName: { type: 'string', description: '部署名' }
    }
  }
}
```

---

## 6. ファイル構成

```
server/
├── utils/
│   └── llm/
│       ├── provider.ts       # LlmProvider interface + 型定義
│       ├── claude.ts         # Claude プロバイダー
│       ├── openai.ts         # OpenAI プロバイダー
│       ├── gemini.ts         # Gemini プロバイダー
│       ├── factory.ts        # プロバイダーファクトリー
│       └── tools.ts          # ツール定義 + 実行ロジック
├── api/
│   ├── ai/
│   │   ├── chat.post.ts      # 業務画面チャットAPI
│   │   └── lp-chat.post.ts   # LP向けチャットAPI
│   └── admin/
│       └── llm-settings.ts   # LLM設定 GET/PATCH

components/
├── ai/
│   └── AssistantChat.vue     # 業務画面AIチャットUI

pages/
└── org/[slug]/
    └── settings/
        └── ai.vue            # 管理者AI設定画面（既存settingsページに統合可）
```

---

## 7. システムプロンプト

### 7-1. 業務画面用

```
あなたは「ミエルボード」のAIアシスタントです。
建設・設備業の現場管理を支援するSaaSのサポートを行います。

できること:
- スケジュールの検索・確認
- 社員情報の検索
- ミエルボードの使い方の案内
- 一般的な業務相談

できないこと:
- スケジュールの作成・変更・削除（今後対応予定）
- 外部サービスへのアクセス
- 個人情報の保存

回答ルール:
- 日本語で簡潔に回答
- 敬語を使用
- 不明な場合は「わかりません」と正直に伝える
- スケジュールや社員の情報が必要な場合はツールを使用する
```

### 7-2. LP用

```
あなたは「ミエルボード for 現場」の案内AIです。
製品の特徴、料金、導入について質問にお答えします。

回答ルール:
- 日本語で簡潔に回答
- 敬語を使用
- 料金の具体的な数字はプランページへ誘導
- 技術的な詳細は問い合わせフォームへ誘導
- 最大3文で回答
```

---

## 8. UI設計

### 8-1. AssistantChat.vue（業務画面）

- 画面右下のフローティングボタン（既存AiChatWidgetと同じ位置）
- クリックでチャットパネルを展開
- メッセージ入力 + 送信ボタン
- AIの応答をマークダウンライクに表示
- クレジット残高表示
- ローディングインジケーター（AIが考え中）

### 8-2. 管理者設定画面

- LLMプロバイダー選択（ラジオボタン / セレクト）
  - OpenAI (GPT-4o mini) — デフォルト、コスト効率最良
  - Claude (Sonnet) — 高品質な日本語
  - Gemini (Flash) — Google連携に強い
- 各プロバイダーのAPIキー設定状態表示（✅ 設定済 / ❌ 未設定）
  - APIキー自体はサーバー環境変数で管理（UIからは変更不可）
- テスト送信ボタン（設定の動作確認用）

---

## 9. クレジット消費

既存の `aiCostConfig.ts` の `consult` タイプを使用:

| 操作 | クレジット消費 | 原価 |
|------|--------------|------|
| 業務チャット1回 | 1 credit | ~1.0円 |
| LPチャット | 0 credit | サービス負担 |

---

## 10. 環境変数

```bash
# .env に追加
ANTHROPIC_API_KEY=sk-ant-...   # Claude用（任意）
OPENAI_API_KEY=sk-...          # OpenAI用（推奨）
GOOGLE_AI_API_KEY=AI...        # Gemini用（任意）
```

少なくとも1つのAPIキーが設定されていればAI機能は動作する。
管理者が選択したプロバイダーのキーが未設定の場合、
利用可能な別プロバイダーに自動フォールバックする。

---

## 11. デフォルトモデル選定理由

| プロバイダー | デフォルトモデル | 選定理由 |
|-------------|----------------|---------|
| OpenAI | gpt-4o-mini | 1Mトークンあたり$0.15/$0.60。日本語品質○、ツール呼び出し安定 |
| Claude | claude-sonnet-4-20250514 | 日本語品質◎、推論力高い。ただし単価はOpenAI比3-5倍 |
| Gemini | gemini-2.0-flash | 無料枠あり、Google連携◎。ツール呼び出しの安定性△ |

**デフォルト: OpenAI** — コストと品質のバランスが最良

---

## 12. テスト計画

### 12-1. ユニットテスト

- `server/utils/llm/factory.test.ts` — ファクトリーがDB設定に基づきプロバイダーを生成
- `server/utils/llm/tools.test.ts` — ツール実行が正しい結果を返す

### 12-2. 統合テスト

- `tests/ai-chat.test.ts` — チャットAPI の認証・クレジット消費・エラーハンドリング
- `tests/llm-settings.test.ts` — LLM設定APIのADMIN権限チェック

### 12-3. テストケース

| # | テスト | 期待結果 |
|---|--------|---------|
| 1 | 認証済みユーザーがチャット送信 | 200 + AI応答 + クレジット-1 |
| 2 | 未認証でチャット送信 | 401 |
| 3 | クレジット0でチャット送信 | 402 + エラーメッセージ |
| 4 | 空メッセージ送信 | 400 |
| 5 | 2001文字のメッセージ | 400 |
| 6 | 無制限プランでチャット | 200 + クレジット消費なし |
| 7 | LLMプロバイダーエラー | 503 + フォールバック試行 |
| 8 | ADMIN以外がLLM設定変更 | 403 |
| 9 | ADMINがプロバイダー変更 | 200 + DB更新 |
| 10 | 未設定プロバイダー選択 | フォールバック発動 |
