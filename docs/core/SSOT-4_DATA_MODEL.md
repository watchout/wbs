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
| 主キー | UUID（`@default(uuid())`） | MUST |
| 命名規則 | camelCase（Prisma標準） | MUST |
| タイムスタンプ | UTC、`@default(now())` / `@updatedAt` | MUST |
| 論理削除 | `deletedAt DateTime?` カラム（対象テーブルのみ） | MUST |
| マルチテナント | Organization以外の全データテーブルに `organizationId` 必須 | MUST |

```
MUST: 全テーブルの主キーは UUID を使用
MUST: 新規テーブル作成時は organizationId FK を含める（Organization 自体を除く）
MUST NOT: $queryRaw / $executeRaw でのDDL/DML実行
MUST NOT: 既存マイグレーションファイルの手動編集
SHOULD: 論理削除対象テーブルのクエリに deletedAt: null 条件を含める
```

### 1.2 共通カラム

全テーブルに以下を含める:

| カラム | 型 | 必須 | 説明 |
|--------|-----|------|------|
| id | String (UUID) | Yes | 主キー |
| createdAt | DateTime | Yes | 作成日時 |
| updatedAt | DateTime | Yes | 更新日時 |

### 1.3 マルチテナントカラム

Organization 以外の全テーブル:

| カラム | 型 | 必須 | 説明 |
|--------|-----|------|------|
| organizationId | String | Yes | テナント識別子（FK → Organization.id） |

### 1.4 論理削除カラム（対象テーブルのみ）

| カラム | 型 | 必須 | 説明 |
|--------|-----|------|------|
| deletedAt | DateTime? | No | NULL=有効、値あり=削除済み |

対象: User, Department, Schedule, MeetingRequest

---

## 2. ER図（概要）

```
Organization ─┬── User ─────── CalendarOAuth（レガシー）
              │    │             UserCalendarConnection
              │    ├── Schedule ── ScheduleVersion
              │    ├── MeetingRequest ── MeetingCandidate
              │    │       └── MeetingInvitee
              │    └── AuditLog
              ├── Department ── User
              ├── Device
              └── UserCalendarConnection
```

---

## 3. エンティティ定義

### 3.1 Organization（組織/テナント）

| カラム | 型 | NULL | デフォルト | 説明 |
|--------|-----|------|----------|------|
| id | String (UUID) | NO | uuid() | 主キー |
| name | String | NO | - | 組織名 |
| slug | String | NO | - | URL用スラッグ（UNIQUE、ASCII小文字+数字+ハイフン） |
| timezone | String | NO | "Asia/Tokyo" | タイムゾーン |
| createdAt | DateTime | NO | now() | 作成日時 |
| updatedAt | DateTime | NO | auto | 更新日時 |

**制約**: UNIQUE(slug)
**インデックス**: `name`, `slug`

```
MUST: slug は組織作成時に自動生成し、永続化する
MUST: slug は UNIQUE かつ不変（組織名変更時も変えない）
MUST: slug はASCII小文字・数字・ハイフンのみ（/^[a-z0-9-]+$/）
MUST: 日本語組織名の場合は org-{短縮UUID} 形式で自動生成
MUST NOT: slug を動的に組織名から毎回生成する
```
**関連**: users, devices, schedules, auditLogs, departments, meetingRequests, calendarConnections

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

### 3.4 Schedule（スケジュール）

| カラム | 型 | NULL | デフォルト | 説明 |
|--------|-----|------|----------|------|
| id | String (UUID) | NO | uuid() | 主キー |
| organizationId | String | NO | - | FK → Organization |
| authorId | String? | YES | - | FK → User（作成者） |
| title | String | NO | - | タイトル |
| description | String? | YES | - | 説明 |
| start | DateTime | NO | - | 開始日時 |
| end | DateTime | NO | - | 終了日時 |
| color | String? | YES | - | 表示色（Tailwind key） |
| source | Source | NO | INTERNAL | INTERNAL/GOOGLE/CSV |
| externalId | String? | YES | - | 外部カレンダーID |
| externalSource | String? | YES | - | "google" |
| externalUpdatedAt | DateTime? | YES | - | 外部最終更新（ループ防止） |
| deletedAt | DateTime? | YES | - | 論理削除 |
| createdAt | DateTime | NO | now() | 作成日時 |
| updatedAt | DateTime | NO | auto | 更新日時 |

**インデックス**: `[organizationId, start]`, `[externalId, externalSource]`
**関連機能ID**: WBS-001, WBS-003

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

### 3.8 MeetingRequest（会議リクエスト）

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

## 4. Enum 定義

| Enum | 値 | 説明 |
|------|----|------|
| Role | ADMIN, LEADER, MEMBER, DEVICE | ユーザーロール |
| Source | INTERNAL, GOOGLE, CSV | スケジュールソース |
| MeetingRequestStatus | DRAFT, OPEN, CONFIRMED, CANCELLED | 会議ステータス |
| InviteeResponseStatus | PENDING, RESPONDED | 招待者回答状態 |

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

---

## 6. スキーマ変更ルール

```
MUST: prisma/schema.prisma を編集
MUST: npx prisma migrate dev --name <変更内容> を実行
MUST: 生成されたマイグレーションファイルをコミット
MUST NOT: 既存マイグレーションファイルを手動編集
MUST NOT: $queryRaw / $executeRaw でDDL/DML実行
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
| マルチテナント | Organization 以外の全モデルに organizationId FK が存在することを確認 |

---

## 変更履歴

| 日付 | 変更内容 | 変更者 |
|------|---------|-------|
| 2026-02-03 | ai-dev-framework v3.0 準拠で新規作成。prisma/schema.prisma から構造化 | AI（Claude Code） |
| 2026-02-03 | 監査指摘修正: CalendarOAuth エンティティ追加、RFC 2119ルール追加、検証方法追加 | AI（Claude Code） |
