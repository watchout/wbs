# SSOT-3: 契約台帳（API Contract） [CONTRACT]

> wbs プロジェクトの API 設計方針・エラーコード・認証ルールを定義
> ソース: openapi.yaml, server/api/, server/utils/
> 層: CONTRACT（Freeze 3） - 変更にはテックリード承認必須

---

## 1. API設計方針

### 1.1 基本ルール

| 項目 | 方針 |
|------|------|
| ベースURL | `/api`（Nuxt 3 自動ルーティング） |
| 認証 | JWT Cookie（HttpOnly, SameSite=Lax） |
| CSRF | Double Submit Cookie パターン（X-CSRF-Token ヘッダー） |
| フォーマット | JSON |
| 日時 | ISO 8601（UTC） |
| マルチテナント | 全APIで `organizationId` スコープ必須 |
| ORM | Prisma ORM のみ（rawSQL 禁止） |

### 1.2 ファイル命名規約（Nuxt 3 Server Routes）

```
server/api/
├── [resource]/
│   ├── index.get.ts        → GET    /api/[resource]
│   ├── index.post.ts       → POST   /api/[resource]
│   ├── [id].get.ts         → GET    /api/[resource]/:id
│   ├── [id].patch.ts       → PATCH  /api/[resource]/:id
│   └── [id].delete.ts      → DELETE /api/[resource]/:id
```

### 1.3 HTTPメソッド使い分け

| メソッド | 用途 | 冪等性 |
|---------|------|-------|
| GET | リソース取得 | Yes |
| POST | リソース作成 / アクション実行 | No |
| PATCH | リソース部分更新 | No |
| DELETE | リソース削除（ソフトデリート） | Yes |

### 1.4 ロール表記の定義

| 表記 | 対象ロール |
|------|----------|
| ADMIN | ADMIN のみ |
| LEADER+ | ADMIN, LEADER |
| MEMBER+ | ADMIN, LEADER, MEMBER |
| Any | 認証済み全ロール（ADMIN, LEADER, MEMBER, DEVICE） |
| PlatformAdmin | isPlatformAdmin=true のユーザー（組織横断） |

### 1.5 APIハンドラ必須ルール

```
MUST: 全APIハンドラの先頭で requireAuth() または requireLeader()/requireAdmin() を呼び出す
MUST: データクエリに user.organizationId を WHERE 条件として含める
MUST: 入力値のバリデーションを実施（必須項目、型、文字列長）
MUST: POST/PUT/PATCH/DELETE は CSRF トークン検証を通過する
MUST NOT: 認証不要エンドポイント以外で requireAuth() を省略する
MUST NOT: organizationId をリクエストパラメータから受け取る（常に JWT から取得）
SHOULD: 成功レスポンスに不要な内部情報（passwordHash 等）を含めない
```

---

## 2. 認証ミドルウェア

### 2.1 requireAuth()

全API（public除く）の先頭で呼び出し必須。

```
入力: HTTP Request（JWT Cookie含む）
出力: { id, email, name, role, organizationId, isPlatformAdmin }
エラー: 401 Unauthorized（無効/期限切れトークン）
```

### 2.2 requirePlatformAdmin()

プラットフォーム管理API用。requireAuth() に加え isPlatformAdmin=true を検証。

```
入力: HTTP Request
出力: { id, email, name, role, organizationId, isPlatformAdmin: true }
エラー: 401（未認証）, 403（プラットフォーム管理者でない）
```

### 2.3 CSRF保護

```
ミドルウェア: server/middleware/csrf.ts
方式: Double Submit Cookie パターン
  - GET: csrf_token Cookie を自動セット
  - POST/PUT/PATCH/DELETE: Cookie の csrf_token と X-CSRF-Token ヘッダーを比較
クライアント: composables/useCsrf.ts の csrfFetch() を使用

除外パス（CSRF検証なし）:
  /api/auth/login, /api/auth/device-login, /api/contact,
  /api/ai/lp-chat, /api/calendar/webhook, /api/billing/webhook, /api/health
```

### 2.4 認証不要エンドポイント

| エンドポイント | 理由 |
|-------------|------|
| POST /api/auth/login | ログイン |
| POST /api/auth/device-login | デバイス認証 |
| POST /api/auth/set-password | パスワード初期設定（トークン認証） |
| GET /api/health | ヘルスチェック |
| POST /api/contact | 問い合わせ |
| POST /api/ai/lp-chat | LPチャット（匿名） |
| GET /api/calendar/google/callback | OAuth2コールバック |
| POST /api/calendar/webhook | Google Calendar Webhook |
| POST /api/billing/webhook | Stripe Webhook |

---

## 3. エンドポイント一覧

### 3.1 認証（AUTH）

| メソッド | パス | 説明 | 認証 | ロール | 機能ID |
|---------|------|------|------|-------|--------|
| POST | /api/auth/login | ログイン | No | - | AUTH-001 |
| POST | /api/auth/logout | ログアウト | Yes | Any | AUTH-002 |
| GET | /api/auth/me | 現在のユーザー情報 | Yes | Any | AUTH-001 |
| POST | /api/auth/device-login | デバイスログイン | No | - | AUTH-004 |
| POST | /api/auth/change-password | パスワード変更 | Yes | Any | ACCT-005 |
| POST | /api/auth/set-password | パスワード設定（初回・リセット兼用） | No | - | AUTH-005, AUTH-006 |
| POST | /api/auth/create-setup-token | セットアップトークン発行 | Yes | ADMIN | AUTH-005 |

```
POST /api/auth/set-password 仕様補足:
- 初回設定: passwordHash=null のユーザーにパスワードを設定
- リセット: passwordHash!=null でも setupToken が有効であれば上書き可能
  （管理者が create-setup-token で forReset=true で発行したトークン）
- setupToken 消費後は setupToken=null, setupTokenExpiry=null に更新

POST /api/users 仕様補足:
- ユーザー作成時に setupToken を自動発行し、レスポンスに setupUrl を含める
- setupUrl 形式: {APP_BASE_URL}/setup?email={email}&token={setupToken}
- 管理者はこのURLをユーザーに直接共有する
```

### 3.2 OTP認証（AUTH/OTP）

| メソッド | パス | 説明 | 認証 | ロール | 機能ID |
|---------|------|------|------|-------|--------|
| POST | /api/auth/otp/send | OTPコード送信（メール） | Yes | ADMIN | BILLING-003 |
| GET | /api/auth/otp/status | OTP認証状態確認 | Yes | ADMIN | BILLING-003 |
| POST | /api/auth/otp/verify | OTPコード検証 | Yes | ADMIN | BILLING-003 |

### 3.3 ユーザー（USERS）

| メソッド | パス | 説明 | 認証 | ロール | 機能ID |
|---------|------|------|------|-------|--------|
| GET | /api/users | ユーザー一覧 | Yes | ADMIN | ACCT-001 |
| POST | /api/users | ユーザー作成 | Yes | ADMIN | ACCT-001 |
| PATCH | /api/users/[id] | ユーザー更新 | Yes | ADMIN | ACCT-001 |
| DELETE | /api/users/[id] | ユーザー削除（ソフト） | Yes | ADMIN | ACCT-001 |
| PATCH | /api/users/me | 自分のプロフィール更新 | Yes | Any | ACCT-002 |

### 3.4 スケジュール（SCHEDULES）

| メソッド | パス | 説明 | 認証 | ロール | 機能ID |
|---------|------|------|------|-------|--------|
| GET | /api/schedules/weekly-board | 週間ボードデータ取得 | Yes | Any | WBS-001 |
| POST | /api/schedules | スケジュール作成 | Yes | LEADER+ | WBS-001 |
| PATCH | /api/schedules/[id] | スケジュール更新 | Yes | LEADER+ | WBS-001 |
| DELETE | /api/schedules/[id] | スケジュール削除（ソフト） | Yes | LEADER+ | WBS-001 |
| GET | /api/schedules/[id]/versions | スケジュール変更履歴 | Yes | LEADER+ | AUDIT-003 |

### 3.5 部門（DEPARTMENTS）

| メソッド | パス | 説明 | 認証 | ロール | 機能ID |
|---------|------|------|------|-------|--------|
| GET | /api/departments | 部門一覧 | Yes | Any | WBS-005 |
| POST | /api/departments | 部門作成 | Yes | ADMIN | WBS-005 |
| PATCH | /api/departments/[id] | 部門更新 | Yes | ADMIN | WBS-005 |
| DELETE | /api/departments/[id] | 部門削除（ソフト） | Yes | ADMIN | WBS-005 |

### 3.6 会議（MEETINGS）

| メソッド | パス | 説明 | 認証 | ロール | 機能ID |
|---------|------|------|------|-------|--------|
| GET | /api/meetings | 会議一覧 | Yes | Any | WBS-004 |
| POST | /api/meetings | 会議作成 | Yes | LEADER+ | WBS-004 |
| GET | /api/meetings/[id] | 会議詳細 | Yes | Any | WBS-004 |
| POST | /api/meetings/suggest-slots | AIスロット提案 | Yes | LEADER+ | AI-001 |
| POST | /api/meetings/[id]/respond | 招待者回答 | Yes | Any | WBS-004 |
| POST | /api/meetings/[id]/confirm | 日程確定 | Yes | LEADER+ | WBS-004 |

### 3.7 カレンダー（CALENDAR）

| メソッド | パス | 説明 | 認証 | ロール | 機能ID |
|---------|------|------|------|-------|--------|
| GET | /api/calendar/status | 接続状態確認 | Yes | Any | WBS-003 |
| POST | /api/calendar/sync | 手動同期実行 | Yes | Any | WBS-003 |
| DELETE | /api/calendar/connection | 接続解除 | Yes | Any | WBS-003 |
| GET | /api/calendar/google/connect | OAuth2認証開始 | Yes | Any | WBS-003 |
| GET | /api/calendar/google/callback | OAuth2コールバック | No | - | WBS-003 |
| POST | /api/calendar/webhook | Webhook受信 | No | - | WBS-003 |

### 3.8 AI（AI ASSISTANT）

| メソッド | パス | 説明 | 認証 | ロール | 機能ID |
|---------|------|------|------|-------|--------|
| POST | /api/ai/chat | AIチャット（ツール呼び出し対応） | Yes | Any | AI-001 |
| POST | /api/ai/lp-chat | LPチャット（匿名、ツールなし） | No | - | AI-002 |

### 3.9 課金（BILLING）

| メソッド | パス | 説明 | 認証 | ロール | 機能ID |
|---------|------|------|------|-------|--------|
| GET | /api/billing/plans | プラン一覧 | Yes | Any | BILLING-001 |
| GET | /api/billing/subscription | サブスクリプション情報 | Yes | ADMIN | BILLING-001 |
| POST | /api/billing/checkout | Stripe Checkout セッション作成 | Yes | ADMIN | BILLING-001 |
| POST | /api/billing/portal | Stripe Customer Portal セッション作成 | Yes | ADMIN | BILLING-001 |
| GET | /api/billing/launch-status | ローンチ状態確認 | Yes | Any | BILLING-002 |
| GET | /api/billing/credits | AIクレジット残高取得 | Yes | ADMIN | BILLING-003 |
| POST | /api/billing/credits/purchase | クレジットパック購入 | Yes | ADMIN | BILLING-003 |
| POST | /api/billing/credits/use | クレジット消費（AI使用時） | Yes | Any | BILLING-003 |
| POST | /api/billing/webhook | Stripe Webhook | No | - | BILLING-001 |

### 3.10 管理（ADMIN）

| メソッド | パス | 説明 | 認証 | ロール | 機能ID |
|---------|------|------|------|-------|--------|
| GET | /api/admin/dashboard | 管理ダッシュボード情報 | Yes | ADMIN | ADMIN-001 |
| GET | /api/admin/audit-logs | 監査ログ一覧 | Yes | ADMIN | AUDIT-001 |
| GET | /api/admin/backups | バックアップ一覧 | Yes | ADMIN | OPS-002 |
| POST | /api/admin/backups | バックアップ作成 | Yes | ADMIN | OPS-002 |
| GET | /api/admin/llm-settings | LLM設定取得 | Yes | ADMIN | AI-001 |
| PATCH | /api/admin/llm-settings | LLM設定更新 | Yes | ADMIN | AI-001 |

### 3.11 プラットフォーム管理（PLATFORM）

> 全APIが requirePlatformAdmin() を使用。組織横断で全テナントのデータにアクセス可能。

| メソッド | パス | 説明 | 認証 | ロール | 機能ID |
|---------|------|------|------|-------|--------|
| GET | /api/platform/organizations | 全組織一覧 | Yes | PlatformAdmin | PLATFORM-001 |
| GET | /api/platform/organizations/[id] | 組織詳細 | Yes | PlatformAdmin | PLATFORM-001 |
| GET | /api/platform/plans | プラン設定一覧 | Yes | PlatformAdmin | PLATFORM-002 |
| PATCH | /api/platform/plans/[id] | プラン設定更新 | Yes | PlatformAdmin | PLATFORM-002 |
| GET | /api/platform/credit-packs | クレジットパック設定一覧 | Yes | PlatformAdmin | PLATFORM-003 |
| POST | /api/platform/credit-packs | クレジットパック設定作成 | Yes | PlatformAdmin | PLATFORM-003 |
| PATCH | /api/platform/credit-packs/[id] | クレジットパック設定更新 | Yes | PlatformAdmin | PLATFORM-003 |
| GET | /api/platform/cohorts | コーホート設定一覧 | Yes | PlatformAdmin | PLATFORM-004 |
| PATCH | /api/platform/cohorts/[id] | コーホート設定更新 | Yes | PlatformAdmin | PLATFORM-004 |

### 3.12 運用（OPS）

| メソッド | パス | 説明 | 認証 | ロール | 機能ID |
|---------|------|------|------|-------|--------|
| GET | /api/health | ヘルスチェック | No | - | OPS-001 |
| POST | /api/contact | 問い合わせ送信 | No | - | OPS-003 |

---

## 3P. Phase 1 新規エンドポイント（現場配置AIファースト）

> 以下は SSOT_SITE_ALLOCATION.md §10 の要件に基づき Phase 1 で追加する。

### 3P.1 現場（SITES）

> **注**: 機能IDは SSOT-1 の機能カタログ（Feature粒度）に対応する。
> 1つの機能ID に複数のAPIエンドポイントが対応するのが正常（Feature ID ≠ Endpoint 1:1）。

| メソッド | パス | 説明 | 認証 | ロール | 機能ID | Sprint |
|---------|------|------|------|-------|--------|--------|
| GET | /api/sites | 現場一覧（status, search フィルタ） | Yes | MEMBER+ | SITE-001 | 2 |
| POST | /api/sites | 現場作成 | Yes | ADMIN | SITE-001 | 2 |
| GET | /api/sites/[id] | 現場詳細 | Yes | MEMBER+ | SITE-001 | 2 |
| PATCH | /api/sites/[id] | 現場更新 | Yes | ADMIN | SITE-001 | 2 |
| DELETE | /api/sites/[id] | 現場削除（論理削除） | Yes | ADMIN | SITE-001 | 2 |

```
GET /api/sites クエリパラメータ:
  status?: SiteStatus        — ACTIVE/INACTIVE/COMPLETED でフィルタ
  search?: string            — 名前部分一致検索
  page?: number              — ページ番号（デフォルト: 1）
  limit?: number             — 件数（デフォルト: 50, 最大: 100）
```

### 3P.2 現場必要人員（SITE DEMANDS）

| メソッド | パス | 説明 | 認証 | ロール | 機能ID | Sprint |
|---------|------|------|------|-------|--------|--------|
| GET | /api/sites/[siteId]/demands | 需要一覧（date range フィルタ） | Yes | MEMBER+ | DEMAND-001 | 2 |
| POST | /api/sites/[siteId]/demands | 需要登録 | Yes | LEADER+ | DEMAND-001 | 2 |
| PATCH | /api/site-demands/[id] | 需要更新 | Yes | LEADER+ | DEMAND-002 | 2 |
| DELETE | /api/site-demands/[id] | 需要削除 | Yes | ADMIN | DEMAND-003 | 2 |

```
GET /api/sites/:siteId/demands クエリパラメータ:
  startDate?: string (ISO)  — 開始日フィルタ
  endDate?: string (ISO)    — 終了日フィルタ
  tradeType?: string        — 工種フィルタ

POST /api/sites/:siteId/demands リクエスト:
  {
    date: string (ISO),
    tradeType: string,
    requiredCount: number (0-999),
    timeSlot?: TimeSlot (default: ALL_DAY),
    priority?: DemandPriority (default: MEDIUM),
    note?: string
  }

重複時の挙動:
  同一 (siteId, date, tradeType, timeSlot) が既存 → 409 Conflict
  → クライアントは PATCH で更新するか、確認ダイアログで上書きを選択
```

### 3P.3 現場配置サマリー（SITE ALLOCATION）

| メソッド | パス | 説明 | 認証 | ロール | 機能ID | Sprint |
|---------|------|------|------|-------|--------|--------|
| GET | /api/site-allocation/weekly | 現場×週の配置サマリー | Yes | MEMBER+ | VIEW-001 | 1, 2 |
| GET | /api/site-allocation/shortages | 不足一覧 | Yes | MEMBER+ | VIEW-005 | 2 |

```
GET /api/site-allocation/weekly クエリパラメータ:
  weekStart: string (ISO, 必須)  — 週の開始日（月曜日）

レスポンス:
  {
    success: true,
    data: {
      weekStart: string,
      weekEnd: string,
      sites: [
        {
          siteId: string | null,
          siteName: string,
          days: [
            {
              date: string,
              allocated: number,      — 配置人数
              required: number | null, — 必要人数（SiteDemand 未登録なら null）
              gap: number | null,      — 差分（allocated - required）
              workers: [
                { userId: string, name: string, status: AssignmentStatus }
              ]
            }
          ]
        }
      ],
      unassigned: { ... }  — siteId 未設定の Schedule
    }
  }

Sprint 1: siteId=null のため siteName は description.siteName から抽出。required/gap は null
Sprint 2: Site/SiteDemand 導入後に required/gap が有効化
```

### 3P.4 AIコマンド（AI COMMAND）

| メソッド | パス | 説明 | 認証 | ロール | 機能ID | Sprint |
|---------|------|------|------|-------|--------|--------|
| POST | /api/ai/command | AIコマンド実行 | Yes | MEMBER+ | AICMD-001 | 3 |

```
POST /api/ai/command リクエスト:
  {
    message: string (1-2000文字),
    context?: {
      currentView?: "person" | "site",
      weekStart?: string (ISO),
      selectedSiteId?: string
    }
  }

レスポンス:
  {
    success: true,
    type: "search_result" | "preview" | "confirmation" | "error",
    reply: string,           — 表示用テキスト
    data?: object,           — 構造化データ（検索結果、プレビュー内容等）
    previewId?: string,      — type=preview の場合、確定用ID
    creditsRemaining: number — 残クレジット数
  }

権限制約:
  MEMBER: 検索系（search_*）のみ実行可能
  LEADER+: 検索系 + 書き込み系（assign_*, execute_*）実行可能
  書き込み系は type=preview → ユーザー確定 → execute の2ステップ必須
```

### 3P.5 工程表ドキュメント（PLANNING DOCUMENTS）

| メソッド | パス | 説明 | 認証 | ロール | 機能ID | Sprint |
|---------|------|------|------|-------|--------|--------|
| GET | /api/planning-documents | ドキュメント一覧 | Yes | ADMIN | PARSE-001 | 4 |
| POST | /api/planning-documents/upload | 工程表アップロード | Yes | ADMIN | PARSE-001 | 4 |
| GET | /api/planning-documents/[id] | ドキュメント詳細（解析結果含む） | Yes | ADMIN | PARSE-002 | 4 |
| POST | /api/planning-documents/[id]/confirm | 解析結果承認 → SiteDemand 反映 | Yes | ADMIN | PARSE-004 | 4 |

```
POST /api/planning-documents/upload:
  Content-Type: multipart/form-data
  Fields:
    file: File (PDF: max 20MB, IMAGE(JPEG/PNG): max 10MB)
    siteId?: string  — 紐付け現場（任意）

POST /api/planning-documents/:id/confirm リクエスト:
  {
    demands: [
      {
        date: string,
        tradeType: string,
        requiredCount: number,
        timeSlot: TimeSlot,
        approved: boolean  — false の場合はスキップ
      }
    ]
  }
```

### 3P.6 AI配置提案（AI ALLOCATION PROPOSAL）

| メソッド | パス | 説明 | 認証 | ロール | 機能ID | Sprint |
|---------|------|------|------|-------|--------|--------|
| POST | /api/ai/allocation-proposal | 不足セルの候補提案要求 | Yes | LEADER+ | AIPLAN-001 | 5 |
| POST | /api/ai/allocation-proposal/[id]/apply | 提案を仮配置として適用 | Yes | LEADER+ | AIPLAN-003 | 5 |

```
POST /api/ai/allocation-proposal リクエスト:
  {
    siteId: string,
    date: string (ISO),
    tradeType?: string
  }

レスポンス:
  {
    success: true,
    proposalId: string,
    candidates: [
      {
        userId: string,
        name: string,
        score: number (0-100),
        reasons: string[],
        availability: "free" | "partial" | "conflict"
      }
    ]
  }
```

---

## 4. レスポンス形式

### 4.1 成功レスポンス

```json
// 単体
{ "id": "...", "title": "...", ... }

// リスト
[ { "id": "...", ... }, { "id": "...", ... } ]

// ラップ形式（Phase 1 新規API）
{
  "success": true,
  "data": { ... },
  "meta": { "total": 100, "page": 1, "limit": 50 }
}
```

### 4.2 エラーレスポンス

```json
{
  "statusCode": 400,
  "statusMessage": "Bad Request",
  "message": "Title is required"
}
```

### 4.3 HTTPステータスコード

| コード | 用途 |
|-------|------|
| 200 | 成功（GET, PATCH） |
| 201 | 作成成功（POST） |
| 204 | 削除成功（DELETE） |
| 400 | バリデーションエラー |
| 401 | 認証エラー（未認証/トークン期限切れ） |
| 402 | AIクレジット不足 |
| 403 | 権限エラー（ロール不足 / CSRF不正） |
| 404 | リソース未検出（他テナントのリソースも404で返す） |
| 409 | 競合（重複データ等） |
| 429 | レート制限超過 |
| 500 | サーバー内部エラー |

---

## 5. マルチテナント制約

全てのデータ操作APIで以下を強制:

```
MUST: requireAuth() で認証ユーザーを取得
MUST: user.organizationId でクエリをスコープ
MUST NOT: organizationId のフォールバック値を使用
MUST NOT: 他テナントのデータを返却
MUST: 他テナントのリソースへのアクセスは 404 を返す（403 にしない → 存在推測防止）
```

---

## 6. リアルタイム通信（Socket.IO）

### 6.1 接続

| 項目 | 値 |
|------|-----|
| サーバー | port 3001 |
| 名前空間 | / |
| 認証 | JWT Cookie（接続時に検証） |
| Room | `org:{organizationId}` |

### 6.2 イベント一覧

| イベント名 | 方向 | データ | 用途 |
|----------|------|-------|------|
| schedule:created | Server→Client | Schedule | スケジュール作成通知 |
| schedule:updated | Server→Client | Schedule | スケジュール更新通知 |
| schedule:deleted | Server→Client | { id } | スケジュール削除通知 |
| join-org | Client→Server | { orgId } | Room参加 |

### 6.3 Phase 1 追加イベント（予定）

| イベント名 | 方向 | データ | 用途 |
|----------|------|-------|------|
| site-demand:updated | Server→Client | SiteDemand | 需要更新通知 |
| assignment:changed | Server→Client | AssignmentChangeLog | 配置変更通知 |

---

## 7. 検証方法

本文書の検証は以下で実施:

| 対象 | 検証方法 |
|------|---------|
| エンドポイント存在 | `ls server/api/` でファイル名がNuxt 3規約と一致することを確認 |
| 認証チェック | 未認証状態で Protected API を呼び出し 401 が返ることを確認 |
| ロールチェック | MEMBER ロールで ADMIN API を呼び出し 403 が返ることを確認 |
| マルチテナント | API レスポンスに他テナントのデータが含まれないことを確認 |
| CSRF検証 | CSRFトークンなしの POST で 403 が返ることを確認 |
| レスポンス形式 | 各API の成功/エラーレスポンスが §4 の形式に従うことを確認 |
| Socket.IO | schedule:created/updated/deleted イベントが org:{id} Room 内でのみ配信されることを確認 |
| Phase 1 API | §3P の全エンドポイントが実装されていることを確認 |

---

## 変更履歴

| 日付 | 変更内容 | 変更者 |
|------|---------|-------|
| 2026-02-03 | ai-dev-framework v3.0 準拠で新規作成。openapi.yaml + server/api/ から統合 | AI（Claude Code） |
| 2026-02-03 | 監査指摘修正: ロール表記定義、APIルール（RFC 2119）、機能IDマッピング、検証方法追加 | AI（Claude Code） |
| 2026-02-24 | 大規模更新: 既存未ドキュメントAPI反映（AI, Billing, Admin, Platform, OTP, Schedule versions）+ Phase 1 現場配置API追加 + CSRF/PlatformAdmin仕様追加 | AI（Claude Code） |
