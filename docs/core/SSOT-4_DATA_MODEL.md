# SSOT-4: データ台帳（Data Model） [CONTRACT]

> wbs プロジェクトのエンティティ、制約、参照整合性、論理削除方針を定義
> ソース: prisma/schema.prisma
> 層: CONTRACT（Freeze 3） - 変更にはテックリード承認必須

---

## 1. データベース設計方針

### 1.1 基本ルール

| 項目 | 方針 | レベル |
|------|------|--------|
| DBMS | PostgreSQL | MUST |
| ORM | Prisma ORM v6.0.0（rawSQL 禁止） | MUST |
| 主キー | UUID（`@default(uuid())`）※ PlanConfig/CreditPackConfig/CohortConfig は `cuid()` | MUST |
| 命名規則 | camelCase（Prisma標準） | MUST |
| タイムスタンプ | UTC、`@default(now())` / `@updatedAt` | MUST |
| 論理削除 | `deletedAt DateTime?` カラム（対象テーブルのみ） | MUST |
| マルチテナント | Organization以外の全データテーブルに `organizationId` 必須 | MUST |

```
MUST: 全テーブルの主キーは UUID を使用（プラットフォーム設定テーブルは cuid() 許容）
MUST: 新規テーブル作成時は organizationId FK を含める（Organization / プラットフォーム設定テーブルを除く）
MUST NOT: $queryRaw / $executeRaw でのDDL/DML実行
MUST NOT: 既存マイグレーションファイルの手動編集
SHOULD: 論理削除対象テーブルのクエリに deletedAt: null 条件を含める
```

### 1.2 共通カラム

全テーブルに以下を含める:

| カラム | 型 | 必須 | 説明 |
|--------|-----|------|------|
| id | String (UUID/CUID) | Yes | 主キー |
| createdAt | DateTime | Yes | 作成日時 |
| updatedAt | DateTime | Yes | 更新日時（一部テーブルは省略） |

### 1.3 マルチテナントカラム

Organization / プラットフォーム設定テーブル以外の全テーブル:

| カラム | 型 | 必須 | 説明 |
|--------|-----|------|------|
| organizationId | String | Yes | テナント識別子（FK → Organization.id） |

### 1.4 論理削除カラム（対象テーブルのみ）

| カラム | 型 | 必須 | 説明 |
|--------|-----|------|------|
| deletedAt | DateTime? | No | NULL=有効、値あり=削除済み |

対象: User, Department, Schedule, MeetingRequest, Site

---

## 2. ER図（概要）

```
Organization ─┬── User ─────── CalendarOAuth（レガシー）
              │    │             UserCalendarConnection
              │    ├── Schedule ── ScheduleVersion
              │    │      └── Site（FK: siteId, nullable）
              │    ├── MeetingRequest ── MeetingCandidate
              │    │       └── MeetingInvitee
              │    └── AuditLog
              ├── Department ── User
              ├── Device
              ├── Site ─┬── SiteDemand ── PlanningDocument
              │         └── Schedule（逆引き）
              ├── PlanningDocument ── PlanningParseReview
              ├── AssignmentChangeLog
              ├── Subscription（1:1）
              ├── AiCreditBalance（1:1）
              └── AiCreditTransaction

プラットフォーム設定（Organization非依存）:
  PlanConfig, CreditPackConfig, CohortConfig, OtpToken
```

### ER関係: 現場配置モデル

```
Site（現場マスタ）
  ├── SiteDemand（必要人員）    [1:N]  Site : SiteDemand
  │     └── PlanningDocument     [N:1]  SiteDemand : PlanningDocument
  ├── PlanningDocument（工程表） [1:N]  Site : PlanningDocument
  │     └── PlanningParseReview  [1:N]  PlanningDocument : PlanningParseReview
  └── Schedule（実配置）         [1:N]  Site : Schedule

責任分離:
  Schedule  = 人の配置記録（人が主語: 「田中は品川に行く」）
  SiteDemand = 現場の需要定義（現場が主語: 「品川は3人必要」）
  → 同日同現場の Schedule.count vs SiteDemand.requiredCount で充足率を算出
```

---

## 3. エンティティ定義（既存テーブル）

### 3.1 Organization（組織/テナント）

| カラム | 型 | NULL | デフォルト | 説明 |
|--------|-----|------|----------|------|
| id | String (UUID) | NO | uuid() | 主キー |
| name | String | NO | - | 組織名 |
| slug | String | NO | - | URL用スラッグ（UNIQUE、ASCII小文字+数字+ハイフン） |
| timezone | String | NO | "Asia/Tokyo" | タイムゾーン |
| stripeCustomerId | String? | YES | - | Stripe 顧客ID（UNIQUE） |
| isSystemOrg | Boolean | NO | false | プラットフォーム管理: システム組織フラグ |
| llmProvider | String | NO | "openai" | AI LLM プロバイダ（"openai" / "claude" / "gemini"） |
| llmModel | String? | YES | - | カスタムモデル名（null=デフォルト） |
| createdAt | DateTime | NO | now() | 作成日時 |
| updatedAt | DateTime | NO | auto | 更新日時 |

**制約**: UNIQUE(slug), UNIQUE(stripeCustomerId)
**インデックス**: `name`
**関連**: users, devices, schedules, auditLogs, departments, meetingRequests, calendarConnections, subscription(1:1), aiCreditBalance(1:1), aiCreditTransactions, sites

```
MUST: slug は組織作成時に自動生成し、永続化する
MUST: slug は UNIQUE かつ不変（組織名変更時も変えない）
MUST: slug はASCII小文字・数字・ハイフンのみ（/^[a-z0-9-]+$/）
MUST: 日本語組織名の場合は org-{短縮UUID} 形式で自動生成
MUST NOT: slug を動的に組織名から毎回生成する
```

---

### 3.2 User（ユーザー）

| カラム | 型 | NULL | デフォルト | 説明 |
|--------|-----|------|----------|------|
| id | String (UUID) | NO | uuid() | 主キー |
| organizationId | String | NO | - | FK → Organization |
| email | String | NO | - | メール（UNIQUE） |
| name | String? | YES | - | 表示名 |
| passwordHash | String? | YES | - | パスワードハッシュ |
| setupToken | String? | YES | - | 初回設定トークン |
| setupTokenExpiry | DateTime? | YES | - | トークン有効期限 |
| role | Role | NO | MEMBER | ADMIN/LEADER/MEMBER/DEVICE |
| isPlatformAdmin | Boolean | NO | false | プラットフォーム横断管理者フラグ |
| loginAttempts | Int | NO | 0 | ログイン失敗回数 |
| lockedUntil | DateTime? | YES | - | アカウントロック解除日時 |
| departmentId | String? | YES | - | FK → Department |
| deletedAt | DateTime? | YES | - | 論理削除 |
| createdAt | DateTime | NO | now() | 作成日時 |
| updatedAt | DateTime | NO | auto | 更新日時 |

**制約**: UNIQUE(email)
**インデックス**: `[organizationId, role]`, `[departmentId]`
**関連機能ID**: AUTH-001（AC5: アカウントロック）, ACCT-001〜005, ROLE-001

---

### 3.3 Department（部門）

| カラム | 型 | NULL | デフォルト | 説明 |
|--------|-----|------|----------|------|
| id | String (UUID) | NO | uuid() | 主キー |
| organizationId | String | NO | - | FK → Organization |
| name | String | NO | - | 部門名 |
| color | String? | YES | - | 表示色（Tailwind key） |
| sortOrder | Int | NO | 0 | 表示順 |
| deletedAt | DateTime? | YES | - | 論理削除 |
| createdAt | DateTime | NO | now() | 作成日時 |
| updatedAt | DateTime | NO | auto | 更新日時 |

**制約**: UNIQUE(organizationId, name)
**インデックス**: `[organizationId]`
**関連機能ID**: WBS-005

---

### 3.4 Schedule（スケジュール / 人員配置）

> **責任**: 人の配置記録（主語=人）。「田中は3/5に品川ホテルで電気工事」
> SiteDemand（現場の需要）とは独立したエンティティ。充足率は集計で算出する。

| カラム | 型 | NULL | デフォルト | 説明 |
|--------|-----|------|----------|------|
| id | String (UUID) | NO | uuid() | 主キー |
| organizationId | String | NO | - | FK → Organization |
| authorId | String? | YES | - | FK → User（作成者） |
| title | String | NO | - | タイトル |
| description | String? | YES | - | 説明（レガシー: JSON文字列でメタデータ格納） |
| start | DateTime | NO | - | 開始日時 |
| end | DateTime | NO | - | 終了日時 |
| color | String? | YES | - | 表示色（Tailwind key） |
| source | Source | NO | INTERNAL | INTERNAL/GOOGLE/CSV |
| externalId | String? | YES | - | 外部カレンダーID |
| externalSource | String? | YES | - | "google" |
| externalUpdatedAt | DateTime? | YES | - | 外部最終更新（ループ防止） |
| siteId | String? | YES | - | FK → Site（nullable: 移行期間は未設定を許容）**[Phase 1 追加]** |
| assignmentStatus | AssignmentStatus? | YES | CONFIRMED | DRAFT/CONFIRMED **[Phase 1 追加]** |
| deletedAt | DateTime? | YES | - | 論理削除 |
| createdAt | DateTime | NO | now() | 作成日時 |
| updatedAt | DateTime | NO | auto | 更新日時 |

**インデックス**: `[organizationId, start]`, `[externalId, externalSource]`, `[organizationId, siteId]` (Phase 1)
**関連機能ID**: WBS-001, WBS-003, SITE-001

```
siteId nullable 方針（DB制約 vs アプリ制約の分離）:
  DB層: siteId は NULL 許容（既存データとの後方互換性確保）
  アプリ層:
    Phase M1-M2: siteId は任意。未設定の Schedule は「未設定」行に集約表示
    Phase M3:    新規作成時は siteId 必須（UIバリデーション。「その他」Site を用意）
    Phase M4:    全 Schedule に siteId 必須化（DBマイグレーションで NOT NULL 化検討）

assignmentStatus:
  DRAFT    = AI仮配置（未確定。破線表示）
  CONFIRMED = 人間確定済み（実線表示。デフォルト）
  既存データは NULL → CONFIRMED として扱う（アプリ層でデフォルト適用）
```

---

### 3.5 ScheduleVersion（スケジュール変更履歴）

| カラム | 型 | NULL | デフォルト | 説明 |
|--------|-----|------|----------|------|
| id | String (UUID) | NO | uuid() | 主キー |
| scheduleId | String | NO | - | FK → Schedule (CASCADE) |
| diffJson | Json | NO | - | before/after の差分 |
| version | Int | NO | 1 | バージョン番号 |
| createdAt | DateTime | NO | now() | 作成日時 |

**制約**: UNIQUE(scheduleId, version)
**関連機能ID**: AUDIT-003

---

### 3.6 Device（デバイス/サイネージ端末）

| カラム | 型 | NULL | デフォルト | 説明 |
|--------|-----|------|----------|------|
| id | String (UUID) | NO | uuid() | 主キー |
| organizationId | String | NO | - | FK → Organization |
| name | String | NO | - | デバイス名 |
| kioskSecret | String | NO | - | 認証シークレット（UNIQUE） |
| language | String | NO | "ja" | 表示言語 |
| lastHeartbeat | DateTime? | YES | - | 最終ハートビート |
| createdAt | DateTime | NO | now() | 作成日時 |
| updatedAt | DateTime | NO | auto | 更新日時 |

**インデックス**: `[organizationId]`
**関連機能ID**: AUTH-004, WBS-002

---

### 3.7 CalendarOAuth（レガシーOAuth認証情報）

> **注**: このモデルはレガシーであり、UserCalendarConnection への移行が推奨される。

| カラム | 型 | NULL | デフォルト | 説明 |
|--------|-----|------|----------|------|
| id | String (UUID) | NO | uuid() | 主キー |
| userId | String | NO | - | FK → User (CASCADE) |
| provider | String | NO | "google" | プロバイダ |
| accessToken | String (VarChar 2048) | NO | - | アクセストークン |
| refreshToken | String (VarChar 2048) | NO | - | リフレッシュトークン |
| expiry | DateTime? | YES | - | トークン有効期限 |
| createdAt | DateTime | NO | now() | 作成日時 |
| updatedAt | DateTime | NO | auto | 更新日時 |

**制約**: UNIQUE(userId, provider)
**関連**: User (CASCADE delete)
**状態**: レガシー（UserCalendarConnection に置換予定）

---

### 3.8 UserCalendarConnection（カレンダー接続）

| カラム | 型 | NULL | デフォルト | 説明 |
|--------|-----|------|----------|------|
| id | String (UUID) | NO | uuid() | 主キー |
| userId | String | NO | - | FK → User (CASCADE) |
| organizationId | String | NO | - | FK → Organization |
| provider | String | NO | "google" | プロバイダ |
| accessToken | String (Text) | NO | - | アクセストークン（暗号化） |
| refreshToken | String (Text) | NO | - | リフレッシュトークン（暗号化） |
| tokenExpiresAt | DateTime | NO | - | トークン有効期限 |
| calendarId | String | NO | "primary" | カレンダーID |
| webhookChannelId | String? | YES | - | Webhook チャネルID |
| webhookToken | String? | YES | - | Webhook 検証トークン |
| webhookExpiration | DateTime? | YES | - | Webhook 有効期限 |
| syncRangeStart | Int | NO | -7 | 同期範囲（過去日数） |
| syncRangeEnd | Int | NO | 28 | 同期範囲（未来日数） |
| lastSyncedAt | DateTime? | YES | - | 最終同期日時 |
| status | String | NO | "active" | active/error/disconnected |
| createdAt | DateTime | NO | now() | 作成日時 |
| updatedAt | DateTime | NO | auto | 更新日時 |

**制約**: UNIQUE(userId, provider)
**インデックス**: `[organizationId]`, `[webhookChannelId]`
**関連機能ID**: WBS-003

---

### 3.9 MeetingRequest（会議リクエスト）

| カラム | 型 | NULL | デフォルト | 説明 |
|--------|-----|------|----------|------|
| id | String (UUID) | NO | uuid() | 主キー |
| organizationId | String | NO | - | FK → Organization |
| organizerId | String | NO | - | FK → User（作成者） |
| title | String | NO | - | 会議タイトル |
| description | String? | YES | - | 説明 |
| duration | Int | NO | - | 時間（分） |
| dateRangeStart | DateTime | NO | - | 候補期間開始 |
| dateRangeEnd | DateTime | NO | - | 候補期間終了 |
| status | MeetingRequestStatus | NO | DRAFT | DRAFT/OPEN/CONFIRMED/CANCELLED |
| confirmedStart | DateTime? | YES | - | 確定開始日時 |
| confirmedEnd | DateTime? | YES | - | 確定終了日時 |
| deletedAt | DateTime? | YES | - | 論理削除 |
| createdAt | DateTime | NO | now() | 作成日時 |
| updatedAt | DateTime | NO | auto | 更新日時 |

**インデックス**: `[organizationId, status]`, `[organizerId]`
**関連機能ID**: WBS-004, AI-001

---

### 3.10 MeetingCandidate（候補日時）

| カラム | 型 | NULL | デフォルト | 説明 |
|--------|-----|------|----------|------|
| id | String (UUID) | NO | uuid() | 主キー |
| meetingRequestId | String | NO | - | FK → MeetingRequest (CASCADE) |
| start | DateTime | NO | - | 開始日時 |
| end | DateTime | NO | - | 終了日時 |
| isAiSuggested | Boolean | NO | false | AI提案フラグ |
| responseCount | Int | NO | 0 | 選択者数キャッシュ |
| createdAt | DateTime | NO | now() | 作成日時 |

**インデックス**: `[meetingRequestId]`

---

### 3.11 MeetingInvitee（招待者）

| カラム | 型 | NULL | デフォルト | 説明 |
|--------|-----|------|----------|------|
| id | String (UUID) | NO | uuid() | 主キー |
| meetingRequestId | String | NO | - | FK → MeetingRequest (CASCADE) |
| userId | String | NO | - | FK → User |
| status | InviteeResponseStatus | NO | PENDING | PENDING/RESPONDED |
| selectedCandidateIds | Json? | YES | - | 選択した候補ID配列 |
| respondedAt | DateTime? | YES | - | 回答日時 |
| createdAt | DateTime | NO | now() | 作成日時 |
| updatedAt | DateTime | NO | auto | 更新日時 |

**制約**: UNIQUE(meetingRequestId, userId)
**インデックス**: `[meetingRequestId]`, `[userId]`

---

### 3.12 AuditLog（監査ログ）

| カラム | 型 | NULL | デフォルト | 説明 |
|--------|-----|------|----------|------|
| id | String (UUID) | NO | uuid() | 主キー |
| organizationId | String | NO | - | FK → Organization |
| userId | String? | YES | - | FK → User |
| action | String | NO | - | 操作種別（例: SCHEDULE_CREATE） |
| targetId | String? | YES | - | 対象エンティティID |
| meta | Json? | YES | - | 追加情報 |
| createdAt | DateTime | NO | now() | 作成日時 |

**インデックス**: `[organizationId, createdAt]`
**関連機能ID**: AUDIT-001

---

### 3.13 Subscription（サブスクリプション）

| カラム | 型 | NULL | デフォルト | 説明 |
|--------|-----|------|----------|------|
| id | String (UUID) | NO | uuid() | 主キー |
| organizationId | String | NO | - | FK → Organization（UNIQUE: 1:1） |
| stripeSubscriptionId | String | NO | - | Stripe サブスクリプションID（UNIQUE） |
| stripePriceId | String | NO | - | 現在の Price ID |
| planType | PlanType | NO | - | STARTER/BUSINESS/ENTERPRISE |
| status | SubscriptionStatus | NO | TRIALING | サブスクリプション状態 |
| maxUsers | Int | NO | - | ユーザー上限数 |
| monthlyAiCredits | Int | NO | - | 月次AIクレジット付与量（-1=無制限） |
| currentPeriodStart | DateTime | NO | - | 現在の請求期間開始 |
| currentPeriodEnd | DateTime | NO | - | 現在の請求期間終了 |
| trialEndsAt | DateTime? | YES | - | トライアル終了日 |
| canceledAt | DateTime? | YES | - | 解約日時 |
| billingInterval | String | NO | "month" | "month" / "year" |
| createdAt | DateTime | NO | now() | 作成日時 |
| updatedAt | DateTime | NO | auto | 更新日時 |

**制約**: UNIQUE(organizationId), UNIQUE(stripeSubscriptionId)
**インデックス**: `[status]`
**関連機能ID**: BILLING-001

---

### 3.14 AiCreditBalance（AIクレジット残高）

| カラム | 型 | NULL | デフォルト | 説明 |
|--------|-----|------|----------|------|
| id | String (UUID) | NO | uuid() | 主キー |
| organizationId | String | NO | - | FK → Organization（UNIQUE: 1:1） |
| balance | Int | NO | 0 | 現在の残高 |
| monthlyGrant | Int | NO | 0 | 月次付与量（プラン付属分） |
| packCredits | Int | NO | 0 | 追加パック分（別管理） |
| lastResetAt | DateTime | NO | now() | 最後のリセット日時 |
| updatedAt | DateTime | NO | auto | 更新日時 |

**制約**: UNIQUE(organizationId)
**関連機能ID**: AI-001

---

### 3.15 AiCreditTransaction（AIクレジット取引）

| カラム | 型 | NULL | デフォルト | 説明 |
|--------|-----|------|----------|------|
| id | String (UUID) | NO | uuid() | 主キー |
| organizationId | String | NO | - | FK → Organization |
| type | CreditTransactionType | NO | - | 取引種別 |
| amount | Int | NO | - | 正=付与、負=消費 |
| balanceAfter | Int | NO | - | 取引後残高 |
| description | String? | YES | - | 説明（"AI音声入力" / "追加パック購入: スタンダード"等） |
| relatedId | String? | YES | - | 関連するStripe Invoice ID 等 |
| createdAt | DateTime | NO | now() | 作成日時 |

**インデックス**: `[organizationId, createdAt]`
**関連機能ID**: AI-001, BILLING-001

---

### 3.16 OtpToken（ワンタイムパスワード）

| カラム | 型 | NULL | デフォルト | 説明 |
|--------|-----|------|----------|------|
| id | String (UUID) | NO | uuid() | 主キー |
| userId | String | NO | - | ユーザーID |
| code | String | NO | - | 6桁コード（ハッシュ化） |
| purpose | String | NO | - | 用途（"billing" 等） |
| attempts | Int | NO | 0 | 入力試行回数（ブルートフォース対策） |
| expiresAt | DateTime | NO | - | 有効期限 |
| usedAt | DateTime? | YES | - | 使用済みフラグ |
| createdAt | DateTime | NO | now() | 作成日時 |

**インデックス**: `[userId, purpose]`, `[expiresAt]`
**関連機能ID**: BILLING-003（課金操作OTP認証）

> **注**: OtpToken は organizationId を持たない（userId でユーザーを特定）

---

### 3.17 PlanConfig（プラン設定 — プラットフォーム管理）

| カラム | 型 | NULL | デフォルト | 説明 |
|--------|-----|------|----------|------|
| id | String (CUID) | NO | cuid() | 主キー |
| planType | PlanType | NO | - | STARTER/BUSINESS/ENTERPRISE（UNIQUE） |
| name | String | NO | - | プラン表示名 |
| description | String? | YES | - | プラン説明 |
| monthlyPrice | Int | NO | - | 月額料金 |
| annualPrice | Int? | YES | - | 年額料金 |
| maxUsers | Int | NO | - | ユーザー上限 |
| monthlyAiCredits | Int | NO | - | 月次AIクレジット |
| features | String[] | NO | - | 機能キー配列 |
| featureLabels | String[] | NO | - | 機能ラベル配列 |
| isRecommended | Boolean | NO | false | おすすめフラグ |
| sortOrder | Int | NO | 0 | 表示順 |
| isActive | Boolean | NO | true | 有効フラグ |
| stripePriceIdMonthly | String? | YES | - | Stripe月額PriceID |
| stripePriceIdAnnual | String? | YES | - | Stripe年額PriceID |
| createdAt | DateTime | NO | now() | 作成日時 |
| updatedAt | DateTime | NO | auto | 更新日時 |

**制約**: UNIQUE(planType)
**組織非依存**: プラットフォーム全体の設定（organizationId なし）

---

### 3.18 CreditPackConfig（クレジットパック設定 — プラットフォーム管理）

| カラム | 型 | NULL | デフォルト | 説明 |
|--------|-----|------|----------|------|
| id | String (CUID) | NO | cuid() | 主キー |
| name | String | NO | - | パック名 |
| credits | Int | NO | - | クレジット数 |
| price | Int | NO | - | 価格 |
| stripePriceId | String? | YES | - | Stripe PriceID |
| sortOrder | Int | NO | 0 | 表示順 |
| isActive | Boolean | NO | true | 有効フラグ |
| createdAt | DateTime | NO | now() | 作成日時 |
| updatedAt | DateTime | NO | auto | 更新日時 |

**組織非依存**: プラットフォーム全体の設定（organizationId なし）

---

### 3.19 CohortConfig（コーホート設定 — プラットフォーム管理）

| カラム | 型 | NULL | デフォルト | 説明 |
|--------|-----|------|----------|------|
| id | String (CUID) | NO | cuid() | 主キー |
| cohortNumber | Int | NO | - | コーホート番号（UNIQUE） |
| maxOrgs | Int | NO | - | 最大組織数 |
| discountPercent | Int | NO | - | 割引率（%） |
| stripeCouponId | String? | YES | - | Stripe CouponID |
| isActive | Boolean | NO | true | 有効フラグ |
| createdAt | DateTime | NO | now() | 作成日時 |
| updatedAt | DateTime | NO | auto | 更新日時 |

**制約**: UNIQUE(cohortNumber)
**組織非依存**: プラットフォーム全体の設定（organizationId なし）

---

## 3A. 現場配置モデル（Phase 1 新設）

> 以下のテーブルは SSOT_SITE_ALLOCATION.md §9 の要件に基づき Phase 1 で新設する。

### 3A.1 Site（現場マスタ）

| カラム | 型 | NULL | デフォルト | 説明 |
|--------|-----|------|----------|------|
| id | String (UUID) | NO | uuid() | 主キー |
| organizationId | String | NO | - | FK → Organization |
| name | String | NO | - | 現場名（1-100文字）（例: "品川ホテル新館"） |
| address | String? | YES | - | 住所 |
| clientName | String? | YES | - | 元請/顧客名 |
| status | SiteStatus | NO | ACTIVE | ACTIVE/INACTIVE/COMPLETED |
| startDate | DateTime? | YES | - | 工期開始 |
| endDate | DateTime? | YES | - | 工期終了 |
| note | String? | YES | - | 備考 |
| createdBy | String | NO | - | FK → User（作成者） |
| deletedAt | DateTime? | YES | - | 論理削除 |
| createdAt | DateTime | NO | now() | 作成日時 |
| updatedAt | DateTime | NO | auto | 更新日時 |

**制約**: UNIQUE(organizationId, name)（同組織内で現場名は一意）
**インデックス**: `[organizationId, status]`, `[organizationId, name]`
**関連**: siteDemands(1:N), planningDocuments(1:N), schedules(1:N)
**関連機能ID**: SITE-001〜003

---

### 3A.2 SiteDemand（現場必要人員）

> **責任**: 現場の需要定義（主語=現場）。「品川ホテルは3/5に電気工事3名必要」
> Schedule（人の配置記録）とは独立。充足率は集計で算出する。

| カラム | 型 | NULL | デフォルト | 説明 |
|--------|-----|------|----------|------|
| id | String (UUID) | NO | uuid() | 主キー |
| organizationId | String | NO | - | FK → Organization |
| siteId | String | NO | - | FK → Site |
| date | DateTime | NO | - | 対象日 |
| tradeType | String | NO | - | 工種（例: "電気工事", "配線", "器具付け"） |
| requiredCount | Int | NO | - | 必要人数（0-999） |
| timeSlot | TimeSlot | NO | ALL_DAY | ALL_DAY/AM/PM/NIGHT |
| priority | DemandPriority | NO | MEDIUM | HIGH/MEDIUM/LOW |
| sourceType | DemandSourceType | NO | MANUAL | MANUAL/AI_PARSED/IMPORTED |
| sourceDocumentId | String? | YES | - | FK → PlanningDocument（工程表からの場合） |
| confidence | Float? | YES | - | AI抽出信頼度（0.0-1.0）。手入力はNULL |
| confirmationStatus | ConfirmationStatus | NO | CONFIRMED | UNCONFIRMED/CONFIRMED |
| note | String? | YES | - | 備考 |
| createdBy | String | NO | - | FK → User |
| updatedBy | String? | YES | - | FK → User（最終更新者） |
| createdAt | DateTime | NO | now() | 作成日時 |
| updatedAt | DateTime | NO | auto | 更新日時 |

**制約**: UNIQUE(siteId, date, tradeType, timeSlot)
**インデックス**: `[organizationId, siteId, date]`, `[organizationId, date]`
**関連機能ID**: DEMAND-001〜005

```
ユニーク制約とデータ投入ルール:
  同一 (siteId, date, tradeType, timeSlot) の重複は禁止（DB制約）

  投入経路別のデフォルト:
    手動入力:  sourceType=MANUAL, confirmationStatus=CONFIRMED
    AI解析:   sourceType=AI_PARSED, confirmationStatus=UNCONFIRMED, confidence=0.0-1.0
    インポート: sourceType=IMPORTED, confirmationStatus=CONFIRMED

  重複時の処理ルール:
    手動入力:   既存レコードがあれば UPSERT（上書き更新）
    AI解析:     既存レコードがあれば NEEDS_REVIEW 状態にして確認画面で提示
    インポート: 既存レコードがあれば冪等（同値ならスキップ、異なれば確認要求）
```

---

### 3A.3 PlanningDocument（工程表ドキュメント）

| カラム | 型 | NULL | デフォルト | 説明 |
|--------|-----|------|----------|------|
| id | String (UUID) | NO | uuid() | 主キー |
| organizationId | String | NO | - | FK → Organization |
| siteId | String? | YES | - | FK → Site（不明なら NULL で後から紐付け） |
| fileName | String | NO | - | 元ファイル名 |
| fileType | DocumentFileType | NO | - | PDF/IMAGE |
| storagePath | String | NO | - | ファイル保存パス |
| fileSize | Int | NO | - | バイト数 |
| parseStatus | DocumentParseStatus | NO | PENDING | PENDING/PARSING/PARSED/FAILED/NEEDS_REVIEW |
| parserVersion | String? | YES | - | 使用したAIモデル/バージョン |
| rawExtractJson | Json? | YES | - | AI抽出結果の生データ（**イミュータブル**: 書込後の更新禁止） |
| summaryText | String? | YES | - | 人が読む要約 |
| errorMessage | String? | YES | - | 解析失敗時のエラー |
| uploadedBy | String | NO | - | FK → User |
| uploadedAt | DateTime | NO | now() | アップロード日時 |
| parsedAt | DateTime? | YES | - | 解析完了日時 |

**インデックス**: `[organizationId, siteId]`, `[organizationId, parseStatus]`
**関連**: siteDemands(逆引き: sourceDocumentId), planningParseReviews(1:N)
**関連機能ID**: PARSE-001〜006

```
rawExtractJson イミュータブル方針:
  MUST: rawExtractJson は AI が出力した生の抽出結果を保存する
  MUST: 一度書き込んだ rawExtractJson は上書き・更新しない
  MUST: 人間の修正は PlanningParseReview に記録する（原本は保持）
  理由: 再解析や精度検証のために、AI出力の原本を改変なく保持する必要がある
  再解析: 新バージョンのAIで再解析する場合は、新規 PlanningDocument を作成する
```

---

### 3A.4 PlanningParseReview（抽出修正ログ）

| カラム | 型 | NULL | デフォルト | 説明 |
|--------|-----|------|----------|------|
| id | String (UUID) | NO | uuid() | 主キー |
| documentId | String | NO | - | FK → PlanningDocument |
| fieldPath | String | NO | - | 修正箇所（例: "demands[3].requiredCount"） |
| beforeValue | String? | YES | - | 修正前の値 |
| afterValue | String | NO | - | 修正後の値 |
| reviewedBy | String | NO | - | FK → User（修正者） |
| reviewedAt | DateTime | NO | now() | 修正日時 |

**インデックス**: `[documentId]`
**関連機能ID**: PARSE-006

---

### 3A.5 AssignmentChangeLog（配置変更ログ）

> AuditLog とは独立した、配置変更に特化した詳細ログ。
> AuditLog は汎用操作ログ（1行）、AssignmentChangeLog は配置変更の詳細証跡。

| カラム | 型 | NULL | デフォルト | 説明 |
|--------|-----|------|----------|------|
| id | String (UUID) | NO | uuid() | 主キー |
| organizationId | String | NO | - | FK → Organization |
| scheduleId | String | NO | - | FK → Schedule |
| eventType | AssignmentEventType | NO | - | 変更種別（12種） |
| changedBy | String | NO | - | 操作者 User ID |
| changedByType | String | NO | - | "user" / "ai" |
| aiCommandText | String? | YES | - | AI経由の場合のコマンド全文 |
| beforeJson | Json? | YES | - | 変更前のスナップショット |
| afterJson | Json? | YES | - | 変更後のスナップショット |
| reason | String? | YES | - | 変更理由（AI提案理由 or 手動入力メモ） |
| createdAt | DateTime | NO | now() | 作成日時 |

**インデックス**: `[organizationId, scheduleId]`, `[organizationId, createdAt]`
**関連機能ID**: AUDIT-003, AICMD-006

```
AssignmentEventType 一覧（12種）:
  配置ライフサイクル:
    ASSIGNED           — 新規配置作成
    UNASSIGNED         — 配置解除
    REASSIGNED         — 別現場に再配置（移動）
    SITE_CHANGED       — 同一人物の現場変更
    DATE_CHANGED       — 同一人物の日付変更

  仮配置フロー:
    DRAFT_CREATED      — AI仮配置作成
    DRAFT_CONFIRMED    — 仮配置 → 確定
    DRAFT_REJECTED     — 仮配置 → 却下（削除）

  一括操作:
    BULK_ASSIGNED      — 一括配置（工程表確認後など）
    BULK_UNASSIGNED    — 一括解除

  インポート:
    IMPORTED           — 外部インポートによる作成
    MIGRATED           — siteName → siteId 移行
```

---

## 4. Enum 定義

### 4.1 既存 Enum

| Enum | 値 | 説明 |
|------|----|------|
| Role | ADMIN, LEADER, MEMBER, DEVICE | ユーザーロール |
| Source | INTERNAL, GOOGLE, CSV | スケジュールソース |
| MeetingRequestStatus | DRAFT, OPEN, CONFIRMED, CANCELLED | 会議ステータス |
| InviteeResponseStatus | PENDING, RESPONDED | 招待者回答状態 |
| SubscriptionStatus | TRIALING, ACTIVE, PAST_DUE, CANCELED, UNPAID | サブスクリプション状態 |
| PlanType | STARTER, BUSINESS, ENTERPRISE | プラン種別 |
| CreditTransactionType | MONTHLY_GRANT, USAGE, PACK_PURCHASE, ADJUSTMENT, EXPIRE | クレジット取引種別 |

### 4.2 Phase 1 新設 Enum

| Enum | 値 | 説明 |
|------|----|------|
| SiteStatus | ACTIVE, INACTIVE, COMPLETED | 現場状態 |
| TimeSlot | ALL_DAY, AM, PM, NIGHT | 時間帯区分 |
| DemandPriority | HIGH, MEDIUM, LOW | 需要優先度 |
| DemandSourceType | MANUAL, AI_PARSED, IMPORTED | 需要データの出所 |
| ConfirmationStatus | UNCONFIRMED, CONFIRMED | 確認状態 |
| DocumentFileType | PDF, IMAGE | ドキュメントファイル形式 |
| DocumentParseStatus | PENDING, PARSING, PARSED, FAILED, NEEDS_REVIEW | 解析状態 |
| AssignmentStatus | DRAFT, CONFIRMED | 配置確定状態 |
| AssignmentEventType | ASSIGNED, UNASSIGNED, REASSIGNED, SITE_CHANGED, DATE_CHANGED, DRAFT_CREATED, DRAFT_CONFIRMED, DRAFT_REJECTED, BULK_ASSIGNED, BULK_UNASSIGNED, IMPORTED, MIGRATED | 配置変更イベント種別 |

---

## 5. マイグレーション履歴

| マイグレーション | 内容 |
|---------------|------|
| 20260103044334_init | 初期スキーマ |
| 20260112000629_add_department_model | 部門モデル追加 |
| 20260116224424_add_metadata_for_marketing | マーケティング用メタデータ |
| 20260128000000_add_user_setup_token_fields | セットアップトークン |
| 20260128100000_add_soft_delete_and_leader_role | ソフトデリート + LEADER ロール |
| 20260128110000_add_meeting_request_models | 会議調整モデル |
| 20260205000000_sync_schema_with_calendar_and_account_lock | カレンダー同期 + アカウントロック |
| 20260206000000_add_billing_models | 課金モデル追加（Subscription, AiCredit*） |
| 20260207000000_add_platform_admin_and_config_tables | プラットフォーム管理（PlanConfig等） |
| 20260209000000_add_organization_slug | Organization.slug 追加 |
| 20260213001037_add_otp_token | OTP トークン追加 |
| 20260217075417_add_llm_provider_to_organization | Organization.llmProvider/llmModel 追加 |
| *(Phase 1)* add_site_allocation_models | Site, SiteDemand, PlanningDocument, PlanningParseReview, AssignmentChangeLog 新設 + Schedule 拡張 |

---

## 6. スキーマ変更ルール

```
MUST: prisma/schema.prisma を編集
MUST: npx prisma migrate dev --name <変更内容> を実行
MUST: 生成されたマイグレーションファイルをコミット
MUST NOT: 既存マイグレーションファイルを手動編集
MUST NOT: $queryRaw / $executeRaw でDDL/DML実行
```

### 6.1 Phase 1 マイグレーション互換性ルール

```
MUST: 既存 Schedule データに影響を与えない（siteId, assignmentStatus は nullable）
MUST: 既存 description JSON 形式を引き続きサポート（後方互換）
MUST: 新テーブル（Site 等）は空で作成可能（必須FKは Organization のみ）
SHOULD: スキーマ変更は1回のマイグレーションで全テーブルを作成可能（分割不要）
```

### 6.2 Sprint別マイグレーション適用タイミング

```
Sprint 1: マイグレーション不要
  - 既存 Schedule.description.siteName から現場名を集計
  - 新テーブル（Site, SiteDemand 等）は使用しない
  - 新規API（/api/site-allocation/weekly）は既存テーブルのみ参照

Sprint 2 開始時: Phase 1 マイグレーション実行
  - 全5テーブル（Site, SiteDemand, PlanningDocument, PlanningParseReview, AssignmentChangeLog）
  - Schedule 拡張（siteId, assignmentStatus カラム追加）
  - 9 Enum 追加
  - 1回のマイグレーションで適用

Sprint 3-5: 追加マイグレーション不要（Sprint 2 で作成済みのテーブルを使用）
```

---

## 7. 検証方法

本文書の検証は以下で実施:

| 対象 | 検証方法 |
|------|---------|
| スキーマ一致 | `prisma/schema.prisma` の全モデルが本文書に記載されていることを確認 |
| カラム型一致 | 各エンティティのカラム定義が Prisma スキーマと一致することを確認 |
| 制約一致 | UNIQUE 制約・インデックスが Prisma スキーマと一致することを確認 |
| マイグレーション | `prisma/migrations/` の履歴が §5 と一致することを確認 |
| マルチテナント | Organization / プラットフォーム設定テーブル以外の全モデルに organizationId FK が存在することを確認 |
| 新テーブル一致 | SSOT_SITE_ALLOCATION.md §9 の要件と §3A の定義が一致することを確認 |

---

## 変更履歴

| 日付 | 変更内容 | 変更者 |
|------|---------|-------|
| 2026-02-03 | ai-dev-framework v3.0 準拠で新規作成。prisma/schema.prisma から構造化 | AI（Claude Code） |
| 2026-02-03 | 監査指摘修正: CalendarOAuth エンティティ追加、RFC 2119ルール追加、検証方法追加 | AI（Claude Code） |
| 2026-02-24 | 大規模更新: schema.prisma 完全同期（19既存モデル）+ Phase 1 現場配置5テーブル追加 + 9新Enum追加 | AI（Claude Code） |
