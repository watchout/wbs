# Stripe 決済統合 [DETAIL]

> 機能ID: BILLING-001
> ステータス: Implemented
> 最終更新: 2026-02-07
> 関連: SSOT-0 PRD, SSOT_PRICING.md
> 種別: 技術仕様（12セクション形式）

---

## 1. 概要 (Overview)

Stripe を利用したサブスクリプション課金・AI クレジット管理機能。
組織（Organization）単位でプラン契約し、AI 機能をクレジット制で提供する。
料金体系・コホート割引・クレジットパックの設定は DB マスターで管理し、
プラットフォーム管理画面から変更可能。

---

## 2. ユーザーストーリー (User Stories)

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

## 3. 画面仕様 (UI Specification)

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

## 4. API 仕様 (API Specification)

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

## 5. データモデル (Data Model)

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

## 6. ビジネスロジック (Business Logic)

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

## 7. エラーハンドリング (Error Handling)

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

## 12. 未決事項 (Open Issues)

| ID | 内容 | 優先度 |
|----|------|--------|
| OPEN-1 | Stripe Product/Price の自動同期（scripts/stripe-setup.ts の本番実行フロー） | 中 |
| OPEN-2 | クレジット消費量の AI 機能別差別化（現在は一律1クレジット） | 低 |
| OPEN-3 | Webhook の冪等性保証（同一イベントの重複処理防止） | 中 |
| OPEN-4 | プランダウングレード時のユーザー数超過ハンドリング | 中 |
| OPEN-5 | Stripe Customer Portal のブランディングカスタマイズ | 低 |
