# Stripe 決済統合 [DETAIL]

> 機能ID: BILLING-001
> ステータス: Implemented
> 最終更新: 2026-02-07
> 関連: SSOT-0 PRD, SSOT_PRICING.md
> 種別: 技術仕様（12セクション形式）

### 関連 SSOT 参照

- **SSOT-2** (UI/State): 課金画面の状態遷移・UI コンポーネント定義は SSOT-2 を参照
- **SSOT-3** (API Contract): 課金 API のエンドポイント契約・認証パターンは SSOT-3 を参照
- **SSOT-4** (Data Model): Subscription / AiCreditBalance / PlanConfig 等のスキーマ定義は SSOT-4 を参照
- **SSOT-5** (Cross-Cutting): 認証（requireAuth）・エラーハンドリング・ロギングの横断ルールは SSOT-5 を参照

---

## §1. 概要 (Overview)

Stripe を利用したサブスクリプション課金・AI クレジット管理機能。
組織（Organization）単位でプラン契約し、AI 機能をクレジット制で提供する。
料金体系・コホート割引・クレジットパックの設定は DB マスターで管理し、
プラットフォーム管理画面から変更可能。

---

## §2. ユーザーストーリー (User Stories)

### US-1: プラン契約
- As a **組織管理者**, I want **Stripe Checkout でプランに加入** so that **サービスを利用開始できる**
- 受入条件:
  - [x] Starter / Business / Enterprise の3プランから選択可能
  - [x] 14日間の無料トライアル付き
  - [x] ローンチ割引コホートが自動適用される
  - [x] 月額/年額の選択が可能

### US-2: サブスクリプション管理
- As a **組織管理者**, I want **Stripe Customer Portal でカード変更・解約** so that **自分で契約を管理できる**
- 受入条件:
  - [x] カード情報の更新が可能
  - [x] プランのアップグレード/ダウングレードが可能
  - [x] 解約手続きが可能

### US-3: AI クレジット使用
- As a **ユーザー**, I want **AI 機能を使用するとクレジットが消費される** so that **利用量に応じた課金が実現される**
- 受入条件:
  - [x] 月初にプラン上限のクレジットが付与される
  - [x] AI 機能使用ごとに1クレジット消費
  - [x] 残高不足時は 402 エラー
  - [x] Enterprise プランは無制限

### US-4: クレジット追加購入
- As a **組織管理者**, I want **クレジットパックを追加購入** so that **月のクレジットが足りない時に補充できる**
- 受入条件:
  - [x] 買い切り（一回払い）で追加クレジットを購入
  - [x] 購入クレジットは翌月にリセットされない
  - [x] 消費は月次付与分 → パック購入分の順

### US-5: プラットフォーム管理
- As a **プラットフォーム管理者**, I want **料金・クレジットパック・割引設定を管理画面から変更** so that **DB 直接操作なしに運用できる**
- 受入条件:
  - [x] プラン価格・機能・ユーザー上限の編集
  - [x] クレジットパックの追加・編集
  - [x] コホート割引率の変更
  - [x] 全テナントの契約状況を横断閲覧

---

## §3. 画面仕様 (UI Specification)

### 3-1. テナント管理画面（/admin/billing）

| 要素 | 内容 |
|------|------|
| 現在のプラン表示 | プラン名、ステータス、次回更新日 |
| AI クレジット残高 | バー表示 + 数値（残/上限） |
| プラン変更ボタン | Stripe Checkout へ遷移 |
| カード管理ボタン | Stripe Customer Portal へ遷移 |
| クレジット購入セクション | パック一覧 + 購入ボタン |

### 3-2. プラットフォーム管理画面（/platform/*）

| ページ | パス | 内容 |
|--------|------|------|
| ダッシュボード | /platform/ | 契約数サマリー、ローンチ状況 |
| プラン管理 | /platform/plans | インライン編集で価格・機能を変更 |
| クレジットパック | /platform/credit-packs | 追加・編集・有効/無効切替 |
| コホート管理 | /platform/cohorts | 割引率・上限数の変更 |
| テナント一覧 | /platform/organizations | 全組織の契約状況一覧 |
| テナント詳細 | /platform/organizations/:id | 個別組織の詳細情報 |

---

## §4. API 仕様 (API Specification)

### 4-1. テナント向け API

| メソッド | エンドポイント | 認証 | 説明 |
|---------|---------------|------|------|
| GET | /api/billing/subscription | requireAuth | 契約情報+クレジット残高取得 |
| POST | /api/billing/checkout | requireAuth(ADMIN) | Stripe Checkout Session 作成 |
| POST | /api/billing/portal | requireAuth(ADMIN) | Stripe Customer Portal Session 作成 |
| GET | /api/billing/credits | requireAuth | クレジット残高・使用履歴 |
| POST | /api/billing/credits/use | requireAuth | クレジット1消費（内部API） |
| POST | /api/billing/credits/purchase | requireAuth(ADMIN) | パック購入 Checkout Session 作成 |
| GET | /api/billing/plans | 公開 | プラン・パック・コホート情報（60秒キャッシュ） |
| POST | /api/billing/webhook | Stripe署名 | Stripe Webhook 受信 |

### 4-2. プラットフォーム管理 API

| メソッド | エンドポイント | 認証 | 説明 |
|---------|---------------|------|------|
| GET | /api/platform/plans | requirePlatformAdmin | 全プラン取得 |
| PATCH | /api/platform/plans/:id | requirePlatformAdmin | プラン更新 |
| GET | /api/platform/credit-packs | requirePlatformAdmin | 全パック取得 |
| POST | /api/platform/credit-packs | requirePlatformAdmin | パック新規作成 |
| PATCH | /api/platform/credit-packs/:id | requirePlatformAdmin | パック更新 |
| GET | /api/platform/cohorts | requirePlatformAdmin | 全コホート取得 |
| PATCH | /api/platform/cohorts/:id | requirePlatformAdmin | コホート更新 |
| GET | /api/platform/organizations | requirePlatformAdmin | 全テナント一覧 |
| GET | /api/platform/organizations/:id | requirePlatformAdmin | テナント詳細 |

---

## §5. データモデル (Data Model)

### 5-1. Subscription

| フィールド | 型 | 説明 |
|-----------|------|------|
| organizationId | String (unique) | 組織ID（FK） |
| stripeSubscriptionId | String (unique) | Stripe サブスクリプションID |
| stripePriceId | String | Stripe 価格ID |
| planType | PlanType | STARTER/BUSINESS/ENTERPRISE |
| status | SubscriptionStatus | ACTIVE/TRIALING/PAST_DUE/CANCELED/UNPAID |
| maxUsers | Int | ユーザー上限 |
| monthlyAiCredits | Int | 月次AIクレジット付与数 |
| currentPeriodStart | DateTime | 現在の課金期間開始 |
| currentPeriodEnd | DateTime | 現在の課金期間終了 |
| billingInterval | String | month/year |
| trialEndsAt | DateTime? | トライアル終了日 |
| canceledAt | DateTime? | 解約日 |

### 5-2. AiCreditBalance / AiCreditTransaction

| モデル | 主要フィールド | 説明 |
|--------|---------------|------|
| AiCreditBalance | balance, monthlyGrant, packCredits | 組織ごとのクレジット残高 |
| AiCreditTransaction | type, amount, description | クレジット増減の履歴 |

### 5-3. PlanConfig / CreditPackConfig / CohortConfig

マスターデータテーブル。プラットフォーム管理画面から CRUD 可能。
詳細は `prisma/schema.prisma` を参照。

---

## §6. ビジネスロジック (Business Logic)

### 6-1. サブスクリプション同期フロー

```
Stripe Webhook (invoice.paid)
  → Subscription テーブルを upsert
  → 月次クレジットをリセット（monthlyGrant に戻す）
  → クレジットパック分は維持
```

### 6-2. クレジット消費ルール

```
1. balance > 0 → balance -= 1（消費成功）
2. balance == 0 → 402 エラー（クレジット不足）
3. monthlyGrant == -1 → 無制限（Enterprise プラン）
```

### 6-3. クレジットリセットルール

```
毎月の invoice.paid 時:
  balance = monthlyGrant + packCredits
  （packCredits は月をまたいで維持される）
```

### 6-4. コホート割引判定

```
determineCohort():
  1. アクティブ Subscription 数をカウント
  2. コホート設定を累積比較
  3. 該当コホートの discountPercent と couponId を返す
  4. 全コホート枠を超過 → 割引なし
```

---

## §7. エラーハンドリング (Error Handling)

| コード | 条件 | メッセージ |
|--------|------|-----------|
| 400 | priceId/packPriceId 未指定 | 「priceId は必須です」 |
| 400 | Stripe Customer 未設定でパック購入 | 「まずプランに加入してください」 |
| 400 | Webhook 署名/ボディ欠落 | 「Missing body or signature」 |
| 402 | クレジット不足 | 「クレジット不足」 |
| 403 | ADMIN 以外がチェックアウト | 「管理者のみが課金設定を変更できます」 |
| 403 | isPlatformAdmin でない | 「プラットフォーム管理者権限が必要です」 |
| 403 | システム組織への閲覧試行 | 「この組織の詳細は閲覧できません」 |
| 404 | 組織が見つからない | 「組織が見つかりません」 |
| 404 | プランが見つからない | 「プランが見つかりません」 |
| 500 | STRIPE_WEBHOOK_SECRET 未設定 | 「Webhook not configured」 |

---

## 8. セキュリティ (Security)

### 認証・認可

| API カテゴリ | 認証方式 | 認可条件 |
|-------------|---------|---------|
| テナント課金 API | requireAuth() | ADMIN ロール |
| テナント参照 API | requireAuth() | 全ロール |
| プラットフォーム API | requirePlatformAdmin() | isPlatformAdmin=true |
| Webhook | Stripe 署名検証 | STRIPE_WEBHOOK_SECRET |
| Plans 公開 API | なし | - |

### データ保護

- Stripe API キーは環境変数で管理（`.env`）
- クレジットカード情報はサーバーに保存しない（Stripe に委譲）
- organizationId スコープにより他テナントのデータにアクセス不可
- プラットフォーム管理者のみクロステナント閲覧可能

---

## 9. パフォーマンス (Performance)

| 対象 | 目標 | 手段 |
|------|------|------|
| GET /api/billing/plans | < 100ms | 60秒サーバーサイドキャッシュ |
| PlanConfig DB 読取 | < 50ms | getPlanConfigFromDB() に60秒キャッシュ |
| Webhook 処理 | < 3s | 同期処理（Stripe のタイムアウト内） |

---

## 10. テストケース (Test Cases)

### 正常系

| ID | テスト | ファイル |
|----|--------|---------|
| T-1 | サブスクリプション情報取得 | billing.test.ts |
| T-2 | Checkout Session 作成 | billing.test.ts |
| T-3 | Customer Portal Session 作成 | billing.test.ts |
| T-4 | クレジット残高・履歴取得 | billing.test.ts |
| T-5 | クレジット消費 | billing.test.ts / aiCredits.test.ts |
| T-6 | クレジットパック購入 | billing.test.ts |
| T-7 | プラン情報取得 | billing.test.ts |
| T-8 | プラットフォーム管理 CRUD | platform.test.ts |

### 異常系

| ID | テスト | ファイル |
|----|--------|---------|
| T-E1 | 非 ADMIN のチェックアウト → 403 | billing.test.ts |
| T-E2 | クレジット不足 → 402 | billing.test.ts / aiCredits.test.ts |
| T-E3 | Stripe Customer 未設定 → 400/404 | billing.test.ts |
| T-E4 | 非プラットフォーム管理者 → 403 | platform.test.ts |
| T-E5 | システム組織閲覧 → 403 | platform.test.ts |

---

## 11. 実装メモ (Implementation Notes)

### 技術的な注意点

- **Stripe SDK v20+**: `current_period_start`/`current_period_end` は `SubscriptionItem` に移動済み。`Subscription` オブジェクトではなく `subscription.items.data[0]` から取得すること。
- **構造化ロガー**: `server/utils/logger.ts` を使用。`console.log` は使用禁止。
- **キャッシュ**: `plans.get.ts` と `stripe.ts` の `getPlanConfigFromDB()` は 60 秒キャッシュ。プラン更新時は `clearPlanConfigCache()` を呼ぶこと。

### 依存関係

- `stripe` (npm): ^20.3.1
- `@stripe/stripe-js` (npm): クライアントサイド用（未使用）

### マイグレーション

- `20260207000000_add_platform_admin_and_config_tables`: Subscription, AiCreditBalance, AiCreditTransaction, PlanConfig, CreditPackConfig, CohortConfig テーブル追加

---

## v3.4 追加セクション（§8〜§12）

> 以下は ai-dev-framework v3.4 監査準拠のために追加されたセクション。
> 既存セクション 1〜11 の内容は維持し、v3.4 テンプレートで必須とされる
> §8 Tenancy / §9 Data Model・Migration / §10 Contract / §11 Security & Privacy / §12 Config を補完する。
> RFC 2119 キーワード（MUST / MUST NOT / SHOULD / MAY）を使用（5 段階の要求レベル）。

---

### §8. Tenancy（マルチテナント境界）

- **boundary**: tenant = `organizationId`
- **auth**:
  - テナント課金 API（checkout / portal / credits/purchase）は `requireAuth(event)` を使用し、`auth.role === 'ADMIN'` を MUST とする。ADMIN 以外は 403 を返す。
  - テナント参照 API（subscription / credits）は `requireAuth(event)` を MUST とする（未認証時は 401 error を返す）。全ロールがアクセス可能。
  - プラットフォーム管理 API は `requirePlatformAdmin()` を MUST とする（非管理者は 403 error を返す）。
  - Webhook（`POST /api/billing/webhook`）は Stripe 署名検証で認証するため、`requireAuth()` は不要。これが唯一の例外であり、代替防御として `stripe.webhooks.constructEvent()` による署名検証を MUST とする（署名不正時は 400 error を返す）。
  - 公開 API（`GET /api/billing/plans`, `GET /api/billing/launch-status`）は認証不要。マスターデータの読み取り専用であり、テナントデータを含まないため例外とする。
- **otp**: 課金操作（checkout / portal / credits/purchase）は `requireOtpVerified(event)` による OTP 2FA 検証を MUST とする（未検証時は 403 error を返す）。
- **stripe_customer**: 各 Organization に対して 1 つの Stripe Customer を MUST で紐づける（紐付け漏れ時は error）。`Organization.stripeCustomerId` に格納する。Stripe Customer 未作成の場合は checkout 時に自動作成する。
- **db_filter**:
  - `Subscription` クエリは `organizationId` フィルタを MUST とする（フィルタなしクエリは 0 件であること）。
  - `AiCreditBalance` / `AiCreditTransaction` クエリは `organizationId` フィルタを MUST とする（フィルタなしクエリは 0 件であること）。
  - PlanConfig / CreditPackConfig / CohortConfig はグローバルマスターデータであり、`organizationId` フィルタは不要（例外）。
- **forbidden**:
  - `organizationId` なしの Subscription / AiCredit 系クエリは MUST NOT とする（検出時は error を報告）。
  - `organizationId ?? 'default'` のようなフォールバックは MUST NOT とする（検出時は error を報告）。
  - 他テナントの Subscription / AiCreditBalance にアクセス可能な実装は MUST NOT とする（テスト時に他テナントデータが return されないこと）。
- **tests**:
  - 境界テスト: MUST とする（例: orgA の ADMIN が orgB の Subscription を閲覧/変更した場合 403 error を返すこと）
  - OTP 未検証での課金操作が 403 で拒否されることのテスト: SHOULD

---

### §9. Data Model / Migration

- **schema_changes**: no（既にマイグレーション済み）
- **prisma_models_changed**: `Subscription`, `AiCreditBalance`, `AiCreditTransaction`, `PlanConfig`, `CreditPackConfig`, `CohortConfig`, `OtpToken`
- **migration_required**: no（全モデルは既存マイグレーションで作成済み）
- **migration_files**:
  - `prisma/migrations/20260206000000_add_billing_models/migration.sql` — Subscription, AiCreditBalance, AiCreditTransaction テーブル追加
  - `prisma/migrations/20260207000000_add_platform_admin_and_config_tables/migration.sql` — PlanConfig, CreditPackConfig, CohortConfig テーブル追加 + isPlatformAdmin フラグ
  - `prisma/migrations/20260213001037_add_otp_token/migration.sql` — OtpToken テーブル追加

**ルール（3 項目 MUST、違反時は error）**:
- 既存 `prisma/migrations/**/migration.sql` の編集は MUST NOT とする（変更検出時は error を報告）。
- schema 変更時は `npx prisma migrate dev --name <name>` で新規 migration を追加することを MUST とする（migration ファイル数が 1 以上増加すること）。
- `$queryRaw` / `$executeRaw` による DDL/DML は MUST NOT とする（grep 検出数が 0 であること）。

**モデル関係**:
- `Subscription` → `Organization` (1:1, `organizationId` unique)
- `AiCreditBalance` → `Organization` (1:1, `organizationId` unique)
- `AiCreditTransaction` → `Organization` (N:1)
- `OtpToken` → `User` (N:1, `userId` + `purpose` でインデックス)
- `PlanConfig` — グローバルマスター（`planType` unique）
- `CreditPackConfig` — グローバルマスター
- `CohortConfig` — グローバルマスター（`cohortNumber` unique）

---

### §10. Contract（I/O・状態・互換・エラー）

#### §10.1 API Contract（HTTP）

##### (1) POST /api/billing/checkout
- **auth**: `requireAuth(event)` + ADMIN ロールチェック + `requireOtpVerified(event)` を MUST とする（非 ADMIN は 403 error を返す）
- **request**: `{ priceId: string, billingInterval?: "month" | "year" }`
- **response**: `{ url: string, cohort: { cohortNumber: number | null, discountPercent: number, remainingSlots: number } }`
- **validation**: `priceId` は MUST。未指定時 400。
- **side effects**: Stripe Customer 自動作成（未作成時）、Stripe Checkout Session 作成、コホート割引クーポン自動適用

##### (2) POST /api/billing/portal
- **auth**: `requireAuth(event)` + ADMIN ロールチェック + `requireOtpVerified(event)` を MUST とする（非 ADMIN は 403 error を返す）
- **request**: なし（ボディ不要）
- **response**: `{ url: string }`
- **validation**: `Organization.stripeCustomerId` が存在すること。未設定時 404。
- **side effects**: Stripe Billing Portal Session 作成

##### (3) GET /api/billing/subscription
- **auth**: `requireAuth(event)` を MUST とする（未認証時は 401 error を返す）
- **request**: なし
- **response**: Subscription 情報 + AiCreditBalance
- **validation**: `organizationId` フィルタ MUST（フィルタなしの場合は error を返す）

##### (4) GET /api/billing/credits
- **auth**: `requireAuth(event)` を MUST とする（未認証時は 401 error を返す）
- **request**: なし
- **response**: AiCreditBalance + AiCreditTransaction 履歴
- **validation**: `organizationId` フィルタ MUST（フィルタなしの場合は error を返す）

##### (5) POST /api/billing/credits/use
- **auth**: `requireAuth(event)` を MUST とする（未認証時は 401 error を返す。内部 API）
- **request**: なし（1 クレジット消費）
- **response**: `{ success: boolean, remaining: number }`
- **validation**: balance > 0 であること。不足時 402。Enterprise（monthlyGrant == -1）は無制限。
- **side effects**: AiCreditBalance 更新、AiCreditTransaction 記録

##### (6) POST /api/billing/credits/purchase
- **auth**: `requireAuth(event)` + ADMIN ロールチェック + `requireOtpVerified(event)` を MUST とする（非 ADMIN は 403 error を返す）
- **request**: `{ packPriceId: string }`
- **response**: `{ url: string }`
- **validation**: `packPriceId` MUST。`stripeCustomerId` 存在 MUST（未設定時 400）。
- **side effects**: Stripe Checkout Session 作成（mode: payment）

##### (7) GET /api/billing/plans（公開）
- **auth**: なし（公開 API）
- **request**: なし
- **response**: `{ plans: PlanConfigResponse[], creditPacks: CreditPackConfigResponse[], cohorts: CohortConfigResponse[], launchStatus: LaunchStatus }`
- **validation**: なし
- **side effects**: なし。60 秒サーバーサイドキャッシュ SHOULD 適用。

##### (8) GET /api/billing/launch-status（公開）
- **auth**: なし（公開 API）
- **request**: なし
- **response**: `{ isAvailable: boolean, currentPaidOrgs: number, nextCohort: object | null, cohorts: object[] }`
- **side effects**: なし

##### (9) POST /api/billing/webhook
- **auth**: Stripe 署名検証（`stripe.webhooks.constructEvent()`）を MUST とする（署名不正時は 400 error を返す）
- **request**: Stripe Event（raw body）
- **response**: `{ received: true }`
- **validation**: `stripe-signature` ヘッダーと raw body が MUST。署名不正時 400。
- **side effects**: Subscription upsert、AiCreditBalance リセット/付与、ステータス更新

#### §10.2 State / Flow

- **Subscription states**: `TRIALING` → `ACTIVE` → `PAST_DUE` → `CANCELED` / `UNPAID`
- **transitions**:
  - `checkout.session.completed` → `TRIALING` or `ACTIVE` を作成
  - `customer.subscription.updated` → ステータス同期
  - `invoice.paid` → `ACTIVE` 維持 + クレジットリセット
  - `invoice.payment_failed` → `PAST_DUE`
  - `customer.subscription.deleted` → `CANCELED`
- **exceptions**: Webhook の `organizationId` メタデータ欠損時は DB から `stripeSubscriptionId` で逆引きする SHOULD。

#### §10.3 Error Spec

| error_code | condition | user_message | retry | logging |
|---|---|---|---|---|
| 400 | priceId / packPriceId 未指定 | 「priceId は必須です」/「packPriceId は必須です」 | no | warn |
| 400 | Stripe Customer 未設定でパック購入 | 「まずプランに加入してください」 | no | warn |
| 400 | Webhook 署名/ボディ欠落 | 「Missing body or signature」 | no | error |
| 400 | Webhook 署名検証失敗 | 「Webhook signature verification failed」 | no | error |
| 401 | 未認証 | 「認証が必要です」 | no | warn |
| 402 | クレジット不足 | 「クレジット不足」 | no | info |
| 403 | ADMIN 以外が課金操作 | 「管理者のみが課金設定を変更できます」 | no | warn |
| 403 | OTP 未検証 | 「OTP 検証が必要です」 | no | warn |
| 403 | isPlatformAdmin でない | 「プラットフォーム管理者権限が必要です」 | no | warn |
| 404 | 組織が見つからない | 「組織が見つかりません」 | no | warn |
| 404 | サブスクリプション未設定 | 「サブスクリプションが見つかりません」 | no | warn |
| 500 | STRIPE_WEBHOOK_SECRET 未設定 | 「Webhook not configured」 | no | error |

#### §10.4 Compatibility

- **既存仕様との互換**: Stripe SDK v20+ 対応済み（`current_period_start`/`end` は `SubscriptionItem` から取得）。旧 `PLAN_LIMITS` 定数はフォールバックとして維持。
- **破壊的変更**: no
- **versioning**: API バージョニングなし（v1 のみ）。将来の破壊的変更時は `/api/v2/billing/*` を SHOULD 検討。

---

### §11. Security & Privacy

- **authn**:
  - テナント API: JWT + Cookie 認証（`requireAuth(event)`）を MUST とする（未認証時は 401 error を返す）
  - 課金操作 API: 上記に加え OTP 2FA（`requireOtpVerified(event)`）を MUST とする（未検証時は 403 error を返す）
  - Webhook: Stripe 署名検証（`stripe.webhooks.constructEvent()`）を MUST とする（署名不正時は 400 error を返す）
  - 公開 API: 認証不要（読み取り専用マスターデータのみ）
- **authz**:
  - 課金変更操作（checkout / portal / credits/purchase）は `role === 'ADMIN'` を MUST とする（非 ADMIN は 403 error を返す）
  - 参照操作（subscription / credits）は全ロール許可
  - プラットフォーム管理は `isPlatformAdmin === true` を MUST とする（非管理者は 403 error）
- **otp_2fa**:
  - OTP コードは 6 桁、ハッシュ化して `OtpToken` テーブルに保存する MUST（平文保存は false とする）
  - `expiresAt` による有効期限制御を MUST とする（期限切れ OTP は 403 error を返す）
  - `attempts` フィールドによるブルートフォース対策を MUST とする（5 回上限超過で無効化）
  - `purpose: "billing"` でスコープを限定する MUST（異なる purpose の OTP は false 判定とする）
- **validation**:
  - リクエストボディの `priceId` / `packPriceId` はサーバーサイドで存在チェックする SHOULD
  - Webhook の raw body + `stripe-signature` ヘッダーを検証する MUST（不正署名時は 400 error を返す）
- **secrets**:
  - `STRIPE_SECRET_KEY` — Stripe API 認証キー。環境変数で管理する MUST（ハードコード検出数は 0 であること）。ハードコードは MUST NOT。
  - `STRIPE_WEBHOOK_SECRET` (`whsec_*`) — Webhook 署名検証シークレット。環境変数で管理する MUST（未設定時は 500 error を返す）。
  - `STRIPE_PUBLISHABLE_KEY` — クライアントサイドで使用。公開鍵のため `.env` に格納し MUST フロントエンドに公開可（`runtimeConfig.public` に 1 つ設定）。
- **pii**: present
  - Organization 名と管理者メールアドレスが Stripe Customer に送信される
  - クレジットカード番号・CVC・有効期限はサーバーに保存しない（Stripe が直接処理）。サーバー側でカード情報を扱うことは MUST NOT（DB にカード番号カラムが 0 であること）。
  - Stripe Checkout / Portal のフォームは Stripe のホスト型 UI を使用し、PCI DSS 準拠を Stripe に委譲する
- **audit_log**: SHOULD
  - 課金操作（プラン変更、パック購入、解約）は構造化ログ（`server/utils/logger.ts`）で記録する SHOULD
  - Webhook 受信イベントのタイプと `organizationId` をログに記録する MUST（1 イベントにつき 1 ログエントリ以上）
- **retention_delete**:
  - Subscription レコードは `CANCELED` 後も保持する（履歴参照用）。削除ポリシーは OPEN-6 で検討 MAY。
  - AiCreditTransaction は監査証跡として無期限保持する SHOULD。

---

### §3-E 入出力例

> 主要 API の具体的な入出力例。正常系 2 件 + 異常系 3 件 = 計 5 件以上。

#### E-1. POST /api/billing/checkout（正常系 — 月額 Business プラン）

**リクエスト**:
```json
{
  "priceId": "price_business_monthly_001",
  "billingInterval": "month"
}
```
**レスポンス（200）**:
```json
{
  "url": "https://checkout.stripe.com/c/pay/cs_test_abc123",
  "cohort": {
    "cohortNumber": 1,
    "discountPercent": 50,
    "remainingSlots": 8
  }
}
```
**前提**: 認証済み ADMIN ユーザー、OTP 検証済み、コホート 1 に空きあり。

#### E-2. POST /api/billing/credits/use（正常系 — クレジット消費成功）

**リクエスト**: なし（ボディ不要）

**レスポンス（200）**:
```json
{
  "success": true,
  "remaining": 49
}
```
**前提**: 認証済みユーザー、AiCreditBalance.balance が 50 以上。

#### E-3. POST /api/billing/checkout（異常系 — 非 ADMIN ユーザー）

**リクエスト**:
```json
{
  "priceId": "price_starter_monthly_001",
  "billingInterval": "month"
}
```
**レスポンス（403）**:
```json
{
  "statusCode": 403,
  "message": "管理者のみが課金設定を変更できます"
}
```
**前提**: 認証済みだが role が MEMBER。ADMIN ロールチェックに失敗する。

#### E-4. POST /api/billing/credits/use（異常系 — クレジット不足）

**リクエスト**: なし（ボディ不要）

**レスポンス（402）**:
```json
{
  "statusCode": 402,
  "message": "クレジット不足"
}
```
**前提**: 認証済みユーザー、AiCreditBalance.balance が 0。

#### E-5. POST /api/billing/credits/purchase（異常系 — Stripe Customer 未設定）

**リクエスト**:
```json
{
  "packPriceId": "price_credit_pack_100"
}
```
**レスポンス（400）**:
```json
{
  "statusCode": 400,
  "message": "まずプランに加入してください"
}
```
**前提**: 認証済み ADMIN ユーザー、OTP 検証済みだが Organization.stripeCustomerId が null。

#### E-6. POST /api/billing/portal（異常系 — OTP 未検証）

**リクエスト**: なし（ボディ不要）

**レスポンス（403）**:
```json
{
  "statusCode": 403,
  "message": "OTP 検証が必要です"
}
```
**前提**: 認証済み ADMIN ユーザーだが OTP 2FA が未検証。

---

### §3-F 境界値

> 各データ項目の境界パターン定義。

| データ項目 | 下限 | 上限 | 境界値テストパターン |
|-----------|------|------|-------------------|
| AiCreditBalance.balance | 0 | 999999 | 0（消費不可）、1（消費後 0）、999999（上限付近） |
| AiCreditBalance.monthlyGrant | -1（無制限） | 999999 | -1（Enterprise 無制限）、0（付与なし）、1（最小付与）、999999（上限付近） |
| AiCreditBalance.packCredits | 0 | 999999 | 0（パック未購入）、1（最小パック）、999999（上限付近） |
| CreditPackConfig.credits | 1 | 10000 | 1（最小パック）、100（標準パック）、10000（最大パック） |
| CreditPackConfig.price（円） | 100 | 1000000 | 100（最低価格）、1000000（最高価格） |
| CohortConfig.discountPercent | 0 | 100 | 0（割引なし）、50（標準割引）、100（全額割引） |
| CohortConfig.maxOrganizations | 1 | 10000 | 1（最小枠）、10000（最大枠） |
| Subscription.maxUsers | 1 | 10000 | 1（最小ユーザー数）、5（Starter）、30（Business）、10000（Enterprise 上限） |
| OtpToken.attempts | 0 | 5 | 0（初回試行）、4（最終有効試行）、5（ロックアウト閾値） |
| OtpToken コード桁数 | 6 桁固定 | 6 桁固定 | 5 桁（不正）、6 桁（正常）、7 桁（不正） |
| priceId（文字列） | 1 文字 | 255 文字 | 空文字（400 error）、`price_xxx`（正常）、256 文字超（400 error） |
| billingInterval | — | — | `"month"`（正常）、`"year"`（正常）、`"week"`（無効値 → 400 error） |

**ルール**:
- balance が 0 の場合、クレジット消費 API は MUST 402 error を返す。
- monthlyGrant が -1 の場合、クレジット消費は MUST true（無制限）とする。balance の減算は行わない。
- OTP attempts が 5 以上の場合、OTP 検証は MUST false（無効化）とする。
- priceId が空文字の場合、checkout API は MUST 400 error を返す。
- discountPercent が 0 の場合、コホート割引は MUST 0 円割引を適用する（クーポン適用なし）。

---

### §3-G 例外応答

> 全エラーケースの応答定義。各 API で発生しうる例外を網羅する。

| HTTP Status | error_code | 発生条件 | user_message | API | retry |
|-------------|-----------|---------|--------------|-----|-------|
| 400 | MISSING_PRICE_ID | priceId が未指定または空文字 | 「priceId は必須です」 | POST /api/billing/checkout | false |
| 400 | MISSING_PACK_PRICE_ID | packPriceId が未指定または空文字 | 「packPriceId は必須です」 | POST /api/billing/credits/purchase | false |
| 400 | NO_STRIPE_CUSTOMER | Organization.stripeCustomerId が null でパック購入試行 | 「まずプランに加入してください」 | POST /api/billing/credits/purchase | false |
| 400 | WEBHOOK_MISSING_BODY | Webhook の raw body または stripe-signature ヘッダーが欠落 | 「Missing body or signature」 | POST /api/billing/webhook | false |
| 400 | WEBHOOK_SIGNATURE_INVALID | Stripe 署名検証に失敗 | 「Webhook signature verification failed」 | POST /api/billing/webhook | false |
| 400 | INVALID_BILLING_INTERVAL | billingInterval が month/year 以外の値 | 「billingInterval は month または year を指定してください」 | POST /api/billing/checkout | false |
| 401 | UNAUTHENTICATED | JWT トークンが無効または未送信 | 「認証が必要です」 | 全認証必須 API | false |
| 402 | INSUFFICIENT_CREDITS | AiCreditBalance.balance が 0 で消費試行 | 「クレジット不足」 | POST /api/billing/credits/use | false |
| 403 | NOT_ADMIN | role が ADMIN 以外で課金操作を試行 | 「管理者のみが課金設定を変更できます」 | POST checkout/portal/credits/purchase | false |
| 403 | OTP_NOT_VERIFIED | OTP 2FA 検証が未完了で課金操作を試行 | 「OTP 検証が必要です」 | POST checkout/portal/credits/purchase | false |
| 403 | NOT_PLATFORM_ADMIN | isPlatformAdmin が false でプラットフォーム API にアクセス | 「プラットフォーム管理者権限が必要です」 | 全 /api/platform/* | false |
| 403 | SYSTEM_ORG_ACCESS | システム組織（slug: `__system__`）の詳細閲覧を試行 | 「この組織の詳細は閲覧できません」 | GET /api/platform/organizations/:id | false |
| 404 | ORG_NOT_FOUND | 指定された organizationId の組織が存在しない | 「組織が見つかりません」 | GET /api/platform/organizations/:id | false |
| 404 | SUBSCRIPTION_NOT_FOUND | Organization に紐づく Subscription が存在しない | 「サブスクリプションが見つかりません」 | GET /api/billing/subscription | false |
| 404 | PLAN_NOT_FOUND | 指定された planType の PlanConfig が存在しない | 「プランが見つかりません」 | POST /api/billing/checkout | false |
| 500 | WEBHOOK_NOT_CONFIGURED | STRIPE_WEBHOOK_SECRET 環境変数が未設定 | 「Webhook not configured」 | POST /api/billing/webhook | false |
| 500 | STRIPE_API_ERROR | Stripe API 呼び出しが予期しないエラーを返した | 「決済サービスでエラーが発生しました。しばらくしてからお試しください」 | 全 Stripe 呼び出し API | true |

**ルール**:
- 全認証必須 API で未認証アクセスは MUST 401 error を返す。
- ADMIN 必須 API で非 ADMIN アクセスは MUST 403 error を返す。
- OTP 必須 API で未検証アクセスは MUST 403 error を返す。
- Stripe API エラーはサーバーログに詳細を記録し、ユーザーには汎用メッセージを MUST return する（Stripe 内部エラーの詳細はユーザーに露出しない）。

---

### §3-H Gherkin シナリオ

> MUST 要件を検証する Gherkin シナリオ。

#### Scenario 1: ADMIN ユーザーが Stripe Checkout でプランに加入する

```gherkin
Feature: プラン契約（Checkout）

  Scenario: ADMIN ユーザーが月額 Business プランの Checkout Session を作成する
    Given 認証済みの ADMIN ユーザーが存在する
    And OTP 2FA が検証済みである
    And PlanConfig に "BUSINESS" プランが登録されている
    And CohortConfig にコホート 1（discountPercent: 50, maxOrganizations: 10）が設定されている
    And 現在のアクティブ Subscription 数が 10 未満である
    When POST /api/billing/checkout に以下のリクエストを送信する
      | priceId                      | billingInterval |
      | price_business_monthly_001   | month           |
    Then レスポンスステータスは 200 を返す
    And レスポンスボディに "url" フィールドが含まれる（値は "https://checkout.stripe.com/" で始まる）
    And レスポンスボディの "cohort.discountPercent" は 50 である
    And レスポンスボディの "cohort.remainingSlots" は 1 以上である
```

#### Scenario 2: クレジット不足時に消費が拒否される

```gherkin
Feature: AI クレジット消費

  Scenario: クレジット残高 0 のユーザーがクレジット消費を試行して 402 エラーを受け取る
    Given 認証済みのユーザーが存在する
    And 組織の AiCreditBalance.balance が 0 である
    And 組織の AiCreditBalance.monthlyGrant が 50 である（無制限ではない）
    When POST /api/billing/credits/use にリクエストを送信する
    Then レスポンスステータスは 402 error を返す
    And レスポンスボディの "message" は "クレジット不足" を含む
    And AiCreditBalance.balance は 0 のまま変化しない

  Scenario: Enterprise プラン（monthlyGrant = -1）のユーザーは無制限にクレジットを消費できる
    Given 認証済みのユーザーが存在する
    And 組織の AiCreditBalance.monthlyGrant が -1 である
    When POST /api/billing/credits/use にリクエストを送信する
    Then レスポンスステータスは 200 を返す
    And レスポンスボディの "success" は true を返す
    And レスポンスボディの "remaining" は -1 を返す（無制限を示す）
```

#### Scenario 3: 非 ADMIN ユーザーの課金操作が拒否される

```gherkin
Feature: 課金操作の権限制御

  Scenario: MEMBER ロールのユーザーが Checkout を試行して 403 エラーを受け取る
    Given 認証済みの MEMBER ユーザーが存在する
    When POST /api/billing/checkout に以下のリクエストを送信する
      | priceId                      | billingInterval |
      | price_starter_monthly_001    | month           |
    Then レスポンスステータスは 403 error を返す
    And レスポンスボディの "message" は "管理者のみが課金設定を変更できます" を含む

  Scenario: MEMBER ロールのユーザーが Customer Portal を試行して 403 エラーを受け取る
    Given 認証済みの MEMBER ユーザーが存在する
    When POST /api/billing/portal にリクエストを送信する
    Then レスポンスステータスは 403 error を返す
    And レスポンスボディの "message" は "管理者のみが課金設定を変更できます" を含む

  Scenario: MEMBER ロールのユーザーがクレジットパック購入を試行して 403 エラーを受け取る
    Given 認証済みの MEMBER ユーザーが存在する
    When POST /api/billing/credits/purchase に以下のリクエストを送信する
      | packPriceId          |
      | price_credit_pack_100|
    Then レスポンスステータスは 403 error を返す
    And レスポンスボディの "message" は "管理者のみが課金設定を変更できます" を含む
```

#### Scenario 4: Webhook 署名検証の防御

```gherkin
Feature: Stripe Webhook セキュリティ

  Scenario: 不正な署名の Webhook リクエストが拒否される
    Given STRIPE_WEBHOOK_SECRET が設定されている
    And stripe-signature ヘッダーに不正な署名が含まれている
    When POST /api/billing/webhook にリクエストを送信する
    Then レスポンスステータスは 400 error を返す
    And レスポンスボディの "message" は "Webhook signature verification failed" を含む

  Scenario: stripe-signature ヘッダーが欠落した Webhook リクエストが拒否される
    Given STRIPE_WEBHOOK_SECRET が設定されている
    And stripe-signature ヘッダーが存在しない
    When POST /api/billing/webhook にリクエストを送信する
    Then レスポンスステータスは 400 error を返す
    And レスポンスボディの "message" は "Missing body or signature" を含む
```

---

### §12. Config（環境変数・設定）

| category | key | type | default | scope | change_risk | description |
|---|---|---|---|---|---|---|
| secret | `STRIPE_SECRET_KEY` | string | なし（MUST 設定、未設定時は error） | env | high | Stripe API シークレットキー。未設定時は Stripe 呼び出しが全て失敗する |
| public | `STRIPE_PUBLISHABLE_KEY` | string | なし（MUST 設定、未設定時は error） | env | low | Stripe 公開キー。フロントエンドの Stripe.js 初期化に使用 |
| secret | `STRIPE_WEBHOOK_SECRET` | string | なし（MUST 設定） | env | high | Webhook 署名検証用シークレット（`whsec_*` 形式）。未設定時 500 エラー |
| url | `APP_BASE_URL` | string | `http://localhost:3000` | env | medium | Stripe Checkout / Portal のリダイレクト先 URL。本番では `https://` を MUST 使用（http は false） |
| cache | `PLAN_CONFIG_CACHE_TTL` | number (ms) | `60000` | code | low | PlanConfig / CohortConfig のキャッシュ有効期間。MAY 環境変数化を検討 |
| db_master | `PlanConfig` | table | シードデータ | global | medium | プラン定義。`prisma/seed.ts` + `scripts/stripe-setup.ts` で初期投入 |
| db_master | `CreditPackConfig` | table | シードデータ | global | medium | クレジットパック定義。Stripe Price ID との紐付け MUST（紐付けなしは error） |
| db_master | `CohortConfig` | table | シードデータ | global | medium | コホート割引定義。Stripe Coupon ID との紐付け SHOULD |

**Config ルール**:
- `STRIPE_SECRET_KEY` と `STRIPE_WEBHOOK_SECRET` は `.env` ファイルに記載し、Git にコミットすることは MUST NOT（`.gitignore` に `.env` が含まれていること。コミット検出数は 0）。
- 本番環境では `APP_BASE_URL` に `https://` プロトコルを MUST 使用する（`http://` は本番で false とする）。
- PlanConfig / CreditPackConfig の `stripePriceId*` フィールドには実際の Stripe Price ID を MUST 設定する（`price_placeholder_*` パターンの検出数が 0 であること）。プレースホルダー（`price_placeholder_*`）のまま本番稼働することは MUST NOT。

---

## §12-appendix. 未決事項 (Open Issues)

| ID | 内容 | 優先度 |
|----|------|--------|
| OPEN-1 | Stripe Product/Price の自動同期（scripts/stripe-setup.ts の本番実行フロー） | 中 |
| OPEN-2 | クレジット消費量の AI 機能別差別化（現在は一律1クレジット） | 低 |
| OPEN-3 | Webhook の冪等性保証（同一イベントの重複処理防止） | 中 |
| OPEN-4 | プランダウングレード時のユーザー数超過ハンドリング | 中 |
| OPEN-5 | Stripe Customer Portal のブランディングカスタマイズ | 低 |
