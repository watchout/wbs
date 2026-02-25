# SSOT-2: 画面・状態台帳（UI Flow + State Machine） [CONTRACT]

> wbs プロジェクト固有の画面一覧・認証状態・遷移を定義
> ソース: SSOT_UI_NAVIGATION.md, UI_ROUTING_MAP.md, pages/
> 層: CONTRACT（Freeze 3） - 変更にはテックリード承認必須

---

## 1. 画面一覧（Screen List）

### 1.1 Public（認証不要）

| Screen ID | 画面名 | パス | 説明 | 関連機能ID |
|-----------|-------|------|------|-----------|
| SCR-LANDING | ランディング | `/` | 製品紹介・LP | - |
| SCR-LOGIN | ログイン | `/login` | メール/パスワード認証 | AUTH-001 |
| SCR-ORG-LOGIN | 組織別ログイン | `/org/[slug]/login` | 組織スラッグ付きログイン | AUTH-001 |
| SCR-DEVICE-LOGIN | デバイスログイン | `/org/[slug]/device-login` | サイネージ用認証 | AUTH-004 |
| SCR-PRODUCT-BOARD | 製品LP（ボード） | `/products/board` | ミエルボード紹介ページ | - |
| SCR-SETUP | パスワード設定 | `/setup` | 初回パスワード設定・パスワードリセット | AUTH-007, AUTH-006 |

```
フロー: 管理者がユーザー追加 → setupURL発行 → 社員がURL開く → /setup でパスワード設定 → /login へリダイレクト
パラメータ: /setup?email={email}&token={setupToken}
バリデーション: token有効期限（24h）超過 → エラー表示 + 管理者への再発行依頼メッセージ
パスワード既設定済み（リセット）: token有効であれば既存パスワードを上書き可能
```

### 1.2 Protected（認証必要・一般ユーザー）

| Screen ID | 画面名 | パス | 説明 | 関連機能ID | 必要ロール |
|-----------|-------|------|------|-----------|----------|
| SCR-DASHBOARD | ダッシュボード | `/` (認証後) | ログイン後のホーム画面 | - | MEMBER+ |
| SCR-WEEKLY-BOARD | 週間ボード | `/org/[slug]/weekly-board` | 週間スケジュール表示・編集 | WBS-001 | MEMBER+ |
| SCR-MEETINGS | 会議一覧 | `/meetings` | AI日程調整一覧 | WBS-004 | MEMBER+ |
| SCR-MEETING-NEW | 会議作成 | `/meetings/new` | 新規会議作成 | WBS-004 | LEADER+ |
| SCR-MEETING-DETAIL | 会議詳細 | `/meetings/[id]` | 回答・確定操作 | WBS-004 | MEMBER+ |
| SCR-SETTINGS | 設定トップ | `/settings` | 設定メニュー | NAV-002 | MEMBER+ |
| SCR-PROFILE | プロフィール | `/settings/profile` | プロフィール表示・編集 | ACCT-002, ACCT-003 | MEMBER+ |
| SCR-PASSWORD | パスワード変更 | `/settings/password` | パスワード変更 | ACCT-005 | MEMBER+ |
| SCR-CALENDAR | カレンダー設定 | `/settings/calendar` | Google連携管理 | WBS-003 | MEMBER+ |

### 1.3 Signage（デバイス専用）

| Screen ID | 画面名 | パス | 説明 | 関連機能ID | 必要ロール |
|-----------|-------|------|------|-----------|----------|
| SCR-SIGNAGE | サイネージ表示 | `/org/[slug]/signage` | 大画面表示（43"+） | WBS-002 | DEVICE |
| SCR-DISPLAY | ディスプレイ | `/org/[slug]/display` | 別形式の表示 | WBS-002 | DEVICE |

### 1.4 Admin（管理者専用）

| Screen ID | 画面名 | パス | 説明 | 関連機能ID | 必要ロール |
|-----------|-------|------|------|-----------|----------|
| SCR-ADMIN-USERS | ユーザー管理 | `/admin/users` | ユーザーCRUD | OPS-002 | ADMIN |
| SCR-ADMIN-DEPTS | 部門管理 | `/admin/departments` | 部門CRUD | WBS-005 | ADMIN |
| SCR-ADMIN-BILLING | 課金管理 | `/admin/billing` | サブスクリプション管理 | BILLING-001 | ADMIN |
| SCR-ADMIN-AI | AI設定 | `/admin/ai-settings` | LLMプロバイダー設定 | AI-001 | ADMIN |

### 1.5 Platform Admin（プラットフォーム管理者専用）

| Screen ID | 画面名 | パス | 説明 | 関連機能ID | 必要ロール |
|-----------|-------|------|------|-----------|----------|
| SCR-PLATFORM-DASH | プラットフォームダッシュボード | `/platform` | 全テナント概要 | PLATFORM-001 | PlatformAdmin |
| SCR-PLATFORM-ORGS | 組織一覧 | `/platform/organizations` | 全組織管理 | PLATFORM-001 | PlatformAdmin |
| SCR-PLATFORM-PLANS | プラン設定 | `/platform/plans` | プラン設定管理 | PLATFORM-002 | PlatformAdmin |
| SCR-PLATFORM-CREDITS | クレジット設定 | `/platform/credits` | パック設定管理 | PLATFORM-003 | PlatformAdmin |
| SCR-PLATFORM-COHORTS | コーホート設定 | `/platform/cohorts` | コーホート管理 | PLATFORM-004 | PlatformAdmin |

### 1.6 Phase 1: 現場配置（新規追加予定）

> SSOT参照: [SSOT_SITE_ALLOCATION.md](../SSOT_SITE_ALLOCATION.md) §11

| Screen ID | 画面名 | パス / 位置 | 説明 | 関連機能ID | 必要ロール | Sprint |
|-----------|-------|------------|------|-----------|----------|--------|
| SCR-SITE-BOARD | 現場ビュー（タブ） | `/org/[slug]/weekly-board`（タブ追加） | 現場×曜日ピボット表示 | SITE-003 | MEMBER+ | 1 |
| SCR-SITE-MANAGE | 現場管理 | `/org/[slug]/admin/sites` | 現場マスタCRUD | SITE-001 | ADMIN | 2 |
| SCR-SHORTAGE-LIST | 不足一覧 | `/org/[slug]/shortages` | 今週/来週の不足現場一覧 | SITE-002 | MEMBER+ | 2 |
| SCR-PLANNING-UPLOAD | 工程表管理 | `/org/[slug]/admin/planning-documents` | 工程表アップロード・一覧 | AISITE-003 | ADMIN | 4 |
| SCR-PLANNING-REVIEW | 工程表確認 | `/org/[slug]/admin/planning-documents/[id]/review` | AI抽出結果確認・修正 | AISITE-005 | ADMIN | 4 |

### 1.7 Phase 1: 共通コンポーネント（新規追加予定）

| Component ID | 名称 | 位置 | 説明 | 関連機能ID | Sprint |
|-------------|------|------|------|-----------|--------|
| CMP-AI-COMMAND-BAR | AIコマンドバー | AppHeader 内 | Cmd+K でフォーカス、自然言語コマンド | AISITE-001, AISITE-002 | 3 |
| CMP-AI-PREVIEW-MODAL | AI変更プレビュー | モーダル | 配置変更のbefore/after表示 | AISITE-002 | 3 |
| CMP-SITE-DEMAND-EDITOR | 需要インライン編集 | 現場ビュー上 | セルクリックで必要人数編集 | SITE-002 | 2 |
| CMP-ALLOCATION-PROPOSAL | AI配置提案パネル | 不足セル内 | 候補者スコア表示、ワンタップ仮配置 | AISITE-006 | 5 |

### 1.8 エラー画面

| Screen ID | 画面名 | パス | 説明 | 関連機能ID |
|-----------|-------|------|------|-----------|
| SCR-404 | Not Found | `error.vue` | 存在しないページ | ERR-001 |
| SCR-500 | Server Error | `error.vue` | サーバーエラー | ERR-003 |

---

## 2. 認証状態（Authentication States）

### 2.1 状態定義

```
┌──────────────────────────────────────────────────────────────┐
│                     認証状態マシン                              │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│   ┌──────────┐                         ┌──────────┐         │
│   │    S0    │──── login_success ────→│    S1    │         │
│   │ 未ログイン │←─── logout ───────────│ログイン済み│         │
│   └──────────┘                         └──────────┘         │
│        ↑                                    │               │
│        │                             token_expired          │
│        │                                    ↓               │
│        │                              ┌──────────┐         │
│        └──── session_invalid ────────│    S2    │         │
│                                       │セッション切れ│         │
│                                       └──────────┘         │
│                                                               │
│   ┌──────────┐                         ┌──────────┐         │
│   │    S3    │                         │    S4    │         │
│   │ 権限不足  │                         │ デバイス  │         │
│   └──────────┘                         └──────────┘         │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

| 状態ID | 状態名 | 説明 |
|--------|-------|------|
| **S0** | LOGGED_OUT | 未ログイン。セッションなし。Public画面のみアクセス可 |
| **S1** | LOGGED_IN | ログイン済み。JWT Cookie が有効。ロールに応じた画面にアクセス可 |
| **S2** | SESSION_EXPIRED | JWT 期限切れ。/login へリダイレクト（元URLを保持） |
| **S3** | INSUFFICIENT_ROLE | ログイン済みだが権限不足。/login へリダイレクト |
| **S4** | DEVICE_SESSION | デバイスログイン済み。サイネージ画面のみアクセス可 |

### 2.2 状態遷移

| 遷移 | From | To | トリガー | アクション |
|------|------|----|---------|----------|
| T1 | S0 | S1 | メール/PW認証成功 | JWT Cookie設定、元URLまたは / へ遷移 |
| T2 | S0 | S4 | デバイス認証成功 | JWT Cookie設定（DEVICE role）、サイネージへ遷移 |
| T3 | S1 | S0 | ログアウト | Cookie削除、/login へ遷移 |
| T4 | S1 | S2 | JWT期限切れ | /login へリダイレクト（redirect query付き） |
| T5 | S1 | S3 | ADMIN画面にMEMBERでアクセス | /login へリダイレクト |
| T6 | S2 | S1 | 再ログイン成功 | 保持していた元URLへ遷移 |
| T7 | S4 | S0 | デバイスログアウト | Cookie削除 |

---

## 3. ロール別アクセスマトリクス

| 画面 | ADMIN | LEADER | MEMBER | DEVICE | PlatformAdmin | 未認証 |
|------|-------|--------|--------|--------|---------------|--------|
| SCR-LANDING | o | o | o | - | o | o |
| SCR-LOGIN | o | o | o | - | o | o |
| SCR-WEEKLY-BOARD | o | o | o | - | - | x |
| SCR-SITE-BOARD (Phase 1) | o | o | o | - | - | x |
| SCR-SIGNAGE | - | - | - | o | - | x |
| SCR-MEETINGS | o | o | o(閲覧) | - | - | x |
| SCR-MEETING-NEW | o | o | x | - | - | x |
| SCR-SETTINGS | o | o | o | - | - | x |
| SCR-ADMIN-USERS | o | x | x | - | - | x |
| SCR-ADMIN-DEPTS | o | x | x | - | - | x |
| SCR-ADMIN-BILLING | o | x | x | - | - | x |
| SCR-SITE-MANAGE (Phase 1) | o | x | x | - | - | x |
| SCR-SHORTAGE-LIST (Phase 1) | o | o | o | - | - | x |
| SCR-PLANNING-UPLOAD (Phase 1) | o | x | x | - | - | x |
| SCR-PLATFORM-* | - | - | - | - | o | x |

凡例: `o`=アクセス可, `x`=リダイレクト, `-`=非対象

**ロール表記の定義:**

| 表記 | 対象ロール |
|------|----------|
| MEMBER+ | ADMIN, LEADER, MEMBER |
| LEADER+ | ADMIN, LEADER |
| ADMIN | ADMIN のみ |
| DEVICE | DEVICE のみ |
| Any | 認証済み全ロール（ADMIN, LEADER, MEMBER, DEVICE） |

---

## 4. 画面アクセスルール

```
MUST: 全 Protected 画面はサーバー側 auth middleware で認証チェック
MUST: ロール不足時は /login へリダイレクト（redirect query 付き）
MUST: DEVICE ロールは SCR-SIGNAGE / SCR-DISPLAY 以外にアクセス不可
MUST NOT: Protected 画面をクライアント側チェックのみで保護
SHOULD: セッション切れ時のリダイレクト先は元URL（redirect query保持）
```

---

## 5. 状態遷移ルール

```
MUST: S0→S1 遷移は JWT Cookie 設定を伴う
MUST: S1→S0 遷移は Cookie 削除を伴う
MUST: S2（セッション切れ）検出時は /login?redirect={currentPath} へ遷移
MUST NOT: S4（DEVICE）から S1（LOGGED_IN）へ直接遷移
SHOULD: S1→S2 遷移時にユーザーへ視覚的フィードバックを表示
```

---

## 6. 検証方法

本文書の検証は以下で実施:

| 対象 | 検証方法 |
|------|---------|
| 画面存在 | `ls pages/` で全 Screen ID のパスが存在することを確認 |
| 認証チェック | 未認証状態で Protected 画面にアクセスし、/login へリダイレクトされることを確認 |
| ロール制御 | MEMBER ロールで ADMIN 画面にアクセスし、リダイレクトされることを確認 |
| 状態遷移 S0→S1 | ログイン成功後に JWT Cookie が設定されることを確認 |
| 状態遷移 S1→S2 | JWT 期限切れ後に /login へリダイレクトされることを確認 |
| 状態遷移 S0→S4 | デバイスログイン後にサイネージ画面のみアクセス可能であることを確認 |

---

## 7. コンポーネント構造

### 4.1 共通レイアウト

```
layouts/default.vue
├── AppHeader.vue            ← 全認証画面で表示
│   ├── ブランドロゴ + ナビゲーション
│   ├── ユーザーメニュー（MEMBER+）
│   └── 管理者メニュー（ADMIN）
└── <slot />                 ← ページコンテンツ
```

### 4.2 主要コンポーネント

| コンポーネント | 配置 | 関連画面 |
|-------------|------|---------|
| AppHeader.vue | components/common/ | 全認証画面 |
| AdminNav.vue | components/admin/ | SCR-ADMIN-* |
| WeeklyScheduleBoard.vue | components/genba/ | SCR-WEEKLY-BOARD |
| SignageBoard.vue | components/signage/ | SCR-SIGNAGE |
| ScheduleFormModal.vue | components/ | SCR-WEEKLY-BOARD |
| AiChatWidget.vue | components/ | SCR-MEETINGS |

### 7.3 Phase 1 追加コンポーネント

| コンポーネント | 配置 | 関連画面 |
|-------------|------|---------|
| AiCommandBar.vue | components/ai/ | 全認証画面（AppHeader内） |
| AiPreviewModal.vue | components/ai/ | CMP-AI-PREVIEW-MODAL |
| SiteViewBoard.vue | components/site/ | SCR-SITE-BOARD |
| SiteDemandEditor.vue | components/site/ | CMP-SITE-DEMAND-EDITOR |
| ShortageList.vue | components/site/ | SCR-SHORTAGE-LIST |
| PlanningUpload.vue | components/planning/ | SCR-PLANNING-UPLOAD |
| PlanningReview.vue | components/planning/ | SCR-PLANNING-REVIEW |
| AllocationProposal.vue | components/ai/ | CMP-ALLOCATION-PROPOSAL |

---

## 変更履歴

| 日付 | 変更内容 | 変更者 |
|------|---------|-------|
| 2026-02-03 | ai-dev-framework v3.0 準拠で新規作成。SSOT_UI_NAVIGATION.md + UI_ROUTING_MAP.md + pages/ から統合 | AI（Claude Code） |
| 2026-02-03 | 監査指摘修正: RFC 2119準拠（§4,§5追加）、ロール表記定義、検証方法追加 | AI（Claude Code） |
| 2026-02-24 | Phase 1 画面追加: SITE/AISITE画面5件 + コンポーネント4件 + Platform管理画面5件 + 課金/AI管理画面2件 | AI（Claude Code） |
