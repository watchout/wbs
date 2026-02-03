# SSOT-2: 画面・状態台帳（UI Flow + State Machine）

> wbs プロジェクト固有の画面一覧・認証状態・遷移を定義
> ソース: SSOT_UI_NAVIGATION.md, UI_ROUTING_MAP.md, pages/

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

### 1.5 エラー画面

| Screen ID | 画面名 | パス | 説明 | 関連機能ID |
|-----------|-------|------|------|-----------|
| SCR-404 | Not Found | (未実装) | 存在しないページ | ERR-001 |
| SCR-500 | Server Error | (未実装) | サーバーエラー | ERR-003 |

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

| 画面 | ADMIN | LEADER | MEMBER | DEVICE | 未認証 |
|------|-------|--------|--------|--------|--------|
| SCR-LANDING | o | o | o | - | o |
| SCR-LOGIN | o | o | o | - | o |
| SCR-WEEKLY-BOARD | o | o | o | - | x |
| SCR-SIGNAGE | - | - | - | o | x |
| SCR-MEETINGS | o | o | o(閲覧) | - | x |
| SCR-MEETING-NEW | o | o | x | - | x |
| SCR-SETTINGS | o | o | o | - | x |
| SCR-ADMIN-USERS | o | x | x | - | x |
| SCR-ADMIN-DEPTS | o | x | x | - | x |

凡例: `o`=アクセス可, `x`=リダイレクト, `-`=非対象

---

## 4. コンポーネント構造

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

---

## 変更履歴

| 日付 | 変更内容 | 変更者 |
|------|---------|-------|
| 2026-02-03 | ai-dev-framework v3.0 準拠で新規作成。SSOT_UI_NAVIGATION.md + UI_ROUTING_MAP.md + pages/ から統合 | AI（Claude Code） |
