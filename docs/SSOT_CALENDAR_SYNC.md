---
doc_id: SSOT-CALENDAR-001
title: "Googleカレンダー連携 [DETAIL]"
version: 1.1.0
status: implemented
owner: "開発チーム"
created_at: 2026-01-23
updated_at: 2026-02-16
risk_level: medium
tags: ["ssot", "calendar", "google", "integration", "detail"]
layer: "DETAIL（Freeze 4） - 止まらないルール適用"

hard_gate: true

scope:
  product: "ミエルボード for 現場"
  components: ["frontend", "backend", "db"]
  environments: ["dev", "stg", "prod"]

related_ssot:
  - "docs/SSOT_GENBA_WEEK.md"
  - "docs/SSOT_PRICING.md"
related_docs:
  - "docs/TEST_STRATEGY.md"
  - "docs/phase0_architecture.md"
tickets: ["WBS-8"]

hard_gate_rules:
  enabled: true
  block_if:
    - has_undecided_decisions
    - has_open_questions
    - pii_is_unknown
    - error_spec_incomplete
    - test_strategy_incomplete
    - rollout_plan_incomplete
    - tenancy_rules_incomplete
    - migration_required_but_missing
---

# SSOT: Googleカレンダー連携

## 0. One-Minute Summary（1分要約）
- **目的**: ユーザーのGoogleカレンダーの予定をミエルボードと双方向同期し、スケジュール入力の手間を削減
- **対象**: 全ユーザー（Freeプラン以上）
- **非目的**: Outlook等の他カレンダー連携（本SSOTスコープ外）、カレンダー編集UI（既存UI使用）
- **Doneの定義**: ACを全て満たし、OAuth認証・Webhook受信・双方向同期が動作し、監視/ロールアウト/運用手順が確定している
- **横断参照**:
  - See SSOT-2 (UI/State) for calendar sync UI states
  - See SSOT-3 (API Contract) for calendar API specifications
  - See SSOT-4 (Data Model) for UserCalendarConnection schema
  - See SSOT-5 (Cross-Cutting) for OAuth and error handling

---

## §1. Decision Required（要判断：未解決が1つでもあれば実装禁止）

| id | topic | options | chosen | owner | due | status |
|---|---|---|---|---|---|---|
| DEC-01 | 連携対象カレンダー | Googleのみ / Google+Outlook / 全カレンダー | **Googleのみ** | user | 2026-01-23 | decided |
| DEC-02 | 同期方向 | 取得のみ / 双方向 | **双方向同期** | user | 2026-01-23 | decided |
| DEC-03 | 同期対象 | 個人連携 / 組織連携 / 両方 | **両方対応** | user | 2026-01-23 | decided |
| DEC-04 | 同期頻度 | 手動 / 定期 / リアルタイム | **リアルタイム(Webhook)** | user | 2026-01-23 | decided |
| DEC-05 | 連携権限 | 全ユーザー / LEADER以上 / ADMINのみ | **全ユーザー** | user | 2026-01-23 | decided |
| DEC-06 | 料金プラン | Free / Standard / Pro | **Freeから** | user | 2026-01-23 | decided |

**Hard Gate 条件**: ✅ 全て decided

---

## §2. Background / Problem
- 現状: スケジュールは手動でミエルボードに入力、または個別にGoogleカレンダーで管理
- 課題: 二重入力の手間、Googleカレンダーとの情報不整合、現場での入力漏れ
- なぜ今: サクシード社試験運用で「既存カレンダーとの連携」要望あり
- 期待効果: スケジュール入力時間50%削減、情報の一元化

---

## §3. Scope（境界）
### 3.1 In Scope
- Google OAuth 2.0 認証フロー
- Googleカレンダーからの予定取得
- ミエルボードからGoogleカレンダーへの予定反映
- Webhookによるリアルタイム同期
- 個人連携（各ユーザーが自分のGoogleアカウントで認証）
- 組織連携（Google Workspace管理者が一括設定）

### 3.2 Out of Scope
- Outlook / iCloud / その他カレンダー連携
- カレンダーの直接編集UI（既存のスケジュール編集UIを使用）
- 複数カレンダーの選択UI（プライマリカレンダーのみ）

### 3.3 Constraints（制約）
- 法務/契約: Google API利用規約に準拠、OAuth同意画面の審査が必要
- 技術: Google Calendar API v3使用、Webhook受信用の公開エンドポイント必要
- 運用: Webhookは有効期限があり定期的な再登録が必要
- 予算/期限: Google Cloud無料枠内で運用可能

---

## §4. Definitions（用語）
| term | definition |
|---|---|
| 個人連携 | 各ユーザーが自分のGoogleアカウントでOAuth認証し、自分のカレンダーを連携 |
| 組織連携 | 管理者がGoogle Workspaceのドメイン全体で一括連携（Service Account使用） |
| プライマリカレンダー | Googleアカウントのメインカレンダー（calendarId: 'primary'） |
| Webhook | Googleカレンダーの変更をリアルタイムで通知する仕組み（Push Notification） |
| externalId | Googleカレンダーのイベントを識別するID（重複防止用） |

---

## §5. Use Cases
- UC-01: ユーザーがGoogleカレンダー連携を開始し、既存予定がミエルボードに表示される
- UC-02: Googleカレンダーで予定を追加すると、リアルタイムでミエルボードに反映される
- UC-03: ミエルボードでスケジュールを追加すると、Googleカレンダーに反映される
- UC-04: 管理者がGoogle Workspace連携を設定し、組織全員のカレンダーが一括連携される
- NUC-01（障害時）: Google APIがダウンしても、ミエルボード内のスケジュールは正常動作
- NUC-02（権限不足）: OAuth認証が失敗した場合、エラーメッセージを表示し連携状態を更新

---

## §6. Requirements

> RFC 2119 準拠: MUST = 絶対必須（違反時は error）、SHOULD = 強く推奨、MAY = 任意

### 6.1 CRITICAL（MUST、違反時は error）
- CRIT-01: OAuth 2.0 によるセキュアな認証を実装 **MUST**（未認証時は 401 error）。トークンは暗号化保存 **MUST**（平文検出時は error）
- CRIT-02: マルチテナント境界を維持 **MUST**（違反時は 403 error）。他組織のカレンダーにアクセス **MUST NOT**（検出時は 403 error）
- CRIT-03: 双方向同期で無限ループを防止 **MUST**（`externalId` / `externalUpdatedAt` で判定 **MUST**、ループ検出時は error）
- CRIT-04: リフレッシュトークンによる自動再認証を実装 **MUST**（更新失敗時は 401 error）
- CRIT-05: Webhook チャンネルの有効期限管理と自動再登録を実装 **MUST**（期限切れ時は 1 回再登録）

### 6.2 SHOULD
- SHOULD-01: 同期対象期間を設定可能にする **SHOULD**（デフォルト: 過去1週間〜未来4週間）
- SHOULD-02: 同期エラー時のリトライ機構を実装 **SHOULD**（exponential backoff）
- SHOULD-03: 連携解除機能を提供 **SHOULD**（トークン revoke を含む）

### 6.3 NICE（MAY）
- NICE-01: 複数カレンダーの選択対応 **MAY**（将来フェーズ）
- NICE-02: 同期履歴の表示 **MAY**

---

## §7. Acceptance Criteria（必須：テスト可能に）

- AC-01: Given 未連携ユーザー When 「Googleカレンダー連携」ボタンを押す Then Google OAuth画面が表示される（covers: [CRIT-01]）
- AC-02: Given OAuth認証成功 When カレンダーAPIを呼び出す Then 過去1週間〜未来4週間の予定がScheduleに保存される（covers: [CRIT-01, SHOULD-01]）
- AC-03: Given 連携済みユーザー When Googleカレンダーで予定を追加 Then 1分以内にミエルボードに反映される（covers: [CRIT-05]）
- AC-04: Given 連携済みユーザー When ミエルボードでスケジュール追加 Then Googleカレンダーに反映される（covers: [CRIT-03]）
- AC-05: Given orgAのユーザー When orgBのカレンダーにアクセス試行 Then 403エラーが返る（covers: [CRIT-02]）
- AC-06: Given アクセストークン期限切れ When API呼び出し Then リフレッシュトークンで自動更新（covers: [CRIT-04]）
- AC-07: Given 連携済みユーザー When 「連携解除」ボタンを押す Then トークンが削除され連携状態が解除（covers: [SHOULD-03]）

---

## §8. Tenancy（必須：マルチテナント境界）

> RFC 2119 キーワード: MUST（違反時は error） / MUST NOT / SHOULD / MAY を使用

- boundary: tenant = `organizationId`
- auth: 全APIエンドポイントは `requireAuth(event)` を **MUST** 使用する（未認証時は return 401 error）。例外: Webhookエンドポイントは Google 署名検証で認証する **MUST**（不正署名時は return 403 error）
- db_filter: 全DBクエリは `organizationId` フィルタを **MUST** 含める（例外なし、フィルタ欠落時は return 500 error）
- user_scope: 各ユーザーは自身の `UserCalendarConnection` のみ操作 **MUST**（違反時は return 403 error）。`userId` と `organizationId` の 2 フィールドでスコープする **MUST**
- calendar_event_scope: カレンダーイベントは `Schedule` モデルに同期され、`organizationId` を **MUST** 付与する（付与漏れ時は return 500 error）
- cross_tenant: 異なる `organizationId` のカレンダー接続情報・同期済みイベントへのアクセスは **MUST NOT** 許可する（試行時は return 403 error）
- forbidden:
  - `organizationId` なしのクエリ → **MUST NOT**（検出時は return 500 error）
  - `organizationId ?? 'default'` のようなフォールバック → **MUST NOT**（検出時は return error）
  - 他テナントのデータにアクセス可能な実装 → **MUST NOT**（テストで false を確認）
  - 他ユーザーのOAuthトークンへのアクセス → **MUST NOT**（テストで false を確認）
- tests:
  - 境界テスト: **MUST** 実施（orgAでorgBのカレンダー連携情報が見えないこと、結果が 0 件であること）
  - ユーザー境界テスト: **MUST** 実施（同一org内でも他ユーザーのトークンにアクセスできないこと、return 403 error）

---

## §9. Data Model / Migration（該当するなら必須）

- schema_changes: yes
- prisma_models_changed: ["UserCalendarConnection", "CalendarOAuth", "Schedule"]
- migration_required: yes（実施済み）
- migration_name: "add_calendar_connection"
- migration_files:
  - "prisma/migrations/<timestamp>_add_calendar_connection/migration.sql"

### 新規モデル: UserCalendarConnection

`accessToken` および `refreshToken` は DB 保存前に暗号化 **MUST**（暗号化失敗時は return 500 error）。平文での保存は **MUST NOT** 許可する（平文検出時は return error）。

```prisma
model UserCalendarConnection {
  id             String   @id @default(uuid())
  user           User     @relation(fields: [userId], references: [id])
  userId         String
  organization   Organization @relation(fields: [organizationId], references: [id])
  organizationId String

  provider       String   // "google"
  accessToken    String   // 暗号化保存 MUST (return error if plain text)
  refreshToken   String   // 暗号化保存 MUST (return error if plain text)
  tokenExpiresAt DateTime

  calendarId     String   @default("primary")
  webhookChannelId  String?
  webhookExpiration DateTime?

  syncRangeStart Int      @default(-7)  // 過去7日
  syncRangeEnd   Int      @default(28)  // 未来28日
  lastSyncedAt   DateTime?

  status         String   @default("active") // active / error / disconnected

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@unique([userId, provider])
  @@index([organizationId])
}
```

### 新規モデル: CalendarOAuth

CSRF 防御用の OAuth state を 1 レコードとして管理する。`state` パラメータは `sessionId + timestamp` から生成し、有効期限は 10 分 **MUST**（期限切れ時は return 400 error）。

```prisma
model CalendarOAuth {
  id        String   @id @default(uuid())
  state     String   @unique   // CSRF state パラメータ（sessionId + timestamp）
  userId    String
  sessionId String
  expiresAt DateTime            // 生成から10分後 MUST（期限切れ時は 400 error）
  createdAt DateTime @default(now())
}
```

### Scheduleモデル変更

外部連携イベントは `externalId` + `externalSource` の 2 フィールド複合で一意識別 **MUST**。`externalUpdatedAt` は同期ループ防止に使用する **MUST**（タイムスタンプ一致時は return せずスキップ）。

```prisma
model Schedule {
  // 既存フィールド...
  externalId        String?   // Googleカレンダーのevent.id
  externalSource    String?   // "google"
  externalUpdatedAt DateTime? // 外部での最終更新日時（ループ防止用）

  @@index([externalId, externalSource])
}
```

**ルール（MUST 遵守、違反時は return error）**
- 既存 `prisma/migrations/**/migration.sql` の編集は **MUST NOT**（CI で検出時は return error）
- schema変更時は `npx prisma migrate dev --name add_calendar_connection` で新規 migration を 1 つ追加 **MUST**（追加数 1 以上）
- Prisma 以外の DDL/DML（`$queryRaw` / `$executeRaw`）での変更は **MUST NOT**（CI で検出時は return error）

---

## §10. Contract（必須：I/O / 状態 / 互換 / エラー）

### 10.1 API Contract（HTTP）

全 6 エンドポイントは RFC 2119 準拠で記述する。認証が必要なエンドポイントは `requireAuth(event)` を **MUST** 使用する（未認証時は return 401 error response）。レスポンスは JSON 形式 **MUST**（リダイレクト 302 応答を除く）。

#### (A) OAuth開始
- endpoint: `GET /api/calendar/google/connect`
- auth: `requireAuth(event)` **MUST**（未認証時は return 401 error response）
- request: なし
- response: `{ redirectUrl: string }`
- validation: 認証済みユーザーである **MUST**（未認証時は return 401 error）
- side effects: `CalendarOAuth` に CSRF state を 1 件保存 **MUST**（sessionId + timestamp、有効期限 10 分）
- error:
  - `401 Unauthorized` — 未認証（**MUST** 返却、return 401 error response）

#### (B) OAuthコールバック
- endpoint: `GET /api/calendar/google/callback`
- auth: Cookie（state 検証 **MUST**、不正時は return 400 error response）
- request: `{ code: string, state: string }` — query parameters
- response: リダイレクト to `/settings/calendar`（302）
- validation: `state` パラメータは `CalendarOAuth` テーブルと照合し、有効期限 10 分以内 **MUST**（期限切れ時は return 400 error）。`code` は Google token endpoint で検証 **MUST**（失敗時は return 500 error）
- side effects: `UserCalendarConnection` を 1 件作成 **MUST**、トークンは暗号化して保存 **MUST**（暗号化失敗時は return 500 error）、初回同期を実行 **SHOULD**
- error:
  - `400 Bad Request` — state 不正または期限切れ（**MUST** 返却、return 400 error response）
  - `500 Internal Server Error` — Google token exchange 失敗

#### (C) 連携解除
- endpoint: `POST /api/calendar/google/disconnect`
- auth: `requireAuth(event)` **MUST**（未認証時は return 401 error response）
- request: なし
- response: `{ success: boolean }`
- validation: 連携済み **MUST** 確認（未連携時は return 400 error）
- side effects: Google OAuth トークン revoke を **MUST** 試行（失敗時は error をログ出力し続行）、`UserCalendarConnection` を 1 件削除 **MUST**、Webhook チャンネル停止 **MUST**（停止失敗時は error をログ出力し続行）
- error:
  - `401 Unauthorized` — 未認証
  - `400 Bad Request` — 未連携

#### (D) 連携ステータス確認
- endpoint: `GET /api/calendar/google/status`
- auth: `requireAuth(event)` **MUST**（未認証時は return 401 error response）
- request: なし
- response: `{ connected: boolean, provider?: string, lastSyncedAt?: string, status?: string }`
- validation: `organizationId` + `userId` の 2 フィールドでフィルタ **MUST**（return 200 response）
- side effects: なし
- error:
  - `401 Unauthorized` — 未認証

#### (E) 手動同期
- endpoint: `POST /api/calendar/google/sync`
- auth: `requireAuth(event)` **MUST**（未認証時は return 401 error response）
- request: `{ direction?: 'import' | 'export' | 'both' }` — direction 省略時は `'both'` **SHOULD**
- response: `{ success: boolean, imported: number, exported: number }`
- validation: 連携済み **MUST** 確認（未連携時は return 400 error）、`direction` は 3 許可値のみ **MUST**（不正値は return 400 error）
- side effects: Schedule upsert **MUST**（`organizationId` 付与 **MUST**、欠落時は return 500 error）、`externalId` / `externalSource` / `externalUpdatedAt` の 3 フィールドを設定 **MUST**
- error:
  - `401 Unauthorized` — 未認証
  - `400 Bad Request` — 未連携または不正パラメータ
  - `500 Internal Server Error` — Google API エラー

#### (F) Webhook受信
- endpoint: `POST /api/calendar/webhook`
- auth: `X-Goog-Channel-Token` ヘッダー検証 **MUST**（不正時は return 403 error response。`requireAuth` は不要）
- request: Google Push Notification body
- response: `200 OK`（即座に応答 **MUST**、return 200 response）
- validation: チャンネル ID が `UserCalendarConnection.webhookChannelId` と一致 **MUST**（不一致時は return 403 error）
- side effects: 対象ユーザーの差分同期を 1 回トリガー **MUST**（失敗時は error ログ出力）
- error:
  - `403 Forbidden` — チャンネルトークン不正（**MUST** 返却、ログ出力 **MUST**、return 403 error response）

### 10.2 State / Flow

```
[未連携] --connect--> [OAuth中] --callback--> [連携済み]
                          |                       |
                          v                       v
                      [エラー] <---error--- [同期エラー]
                                                  |
[連携済み] --disconnect--> [未連携]               |
                                                  v
                                          [自動再試行]
```

状態遷移は `UserCalendarConnection.status` の 3 値で管理 **MUST**（不正値は error）:
- `active`: 正常連携中
- `error`: 同期エラー発生（自動再試行対象）
- `disconnected`: ユーザーが連携解除

### 10.3 Error Spec（必須）
| error_code | http_status | condition | user_message | retry | logging |
|---|---|---|---|---|---|
| GCAL_AUTH_FAILED | 401 | OAuth認証失敗 | Googleアカウントの認証に失敗しました | yes | warn **MUST**（return 401 error） |
| GCAL_TOKEN_EXPIRED | 401 | リフレッシュトークン失効 | 再認証が必要です | no | error **MUST**（return 401 response） |
| GCAL_API_ERROR | 500 | Google API エラー | カレンダー同期に失敗しました。しばらく後にお試しください | yes | error **MUST**（return 500 response） |
| GCAL_RATE_LIMIT | 429 | APIレート制限 | リクエストが多すぎます。しばらくお待ちください | yes(exponential backoff **MUST**、return 429 error) | warn **MUST**（return 429 response） |
| GCAL_WEBHOOK_INVALID | 403 | Webhook検証失敗 | - | no | warn **MUST**（return 403 error） |
| GCAL_NOT_CONNECTED | 400 | 未連携でAPI呼び出し | Googleカレンダーが連携されていません | no | info |
| GCAL_STATE_INVALID | 400 | CSRF state 不正/期限切れ | 認証の有効期限が切れました。もう一度お試しください | no | warn **MUST**（return 400 error） |

### 10.4 Compatibility（必須）
- 既存仕様との互換: Schedule テーブルに新規 nullable フィールド追加のみ。既存機能への影響は **MUST NOT** 発生する（既存テスト全件 pass で確認、failure 時は false）
- 破壊的変更: no
- versioning: N/A
- googleapis: v170.1.0 を **MUST** 使用（`package.json` で固定、バージョン不一致時は return error）

---

## §11. Security & Privacy（必須：unknown禁止）
- authn: Google OAuth 2.0 **MUST**（未認証時は return 401 error）。アプリ内は JWT + セッション Cookie **MUST**（無効時は return 401 error）。Google スコープは `calendar.readonly` + `calendar.events` の 2 スコープに **MUST** 限定する
- authz: ユーザーは自身の `UserCalendarConnection` のみ操作可能 **MUST**（違反時は return 403 error）。他ユーザーの接続情報へのアクセスは **MUST NOT** 許可する（return 403 error response）
- csrf: OAuth `state` パラメータは `sessionId + timestamp` から生成 **MUST**（return error on failure）。有効期限は 10 分 **MUST**。`CalendarOAuth` テーブルで 1 レコードとして管理 **MUST**
- validation:
  - OAuth state 検証 **MUST**（CSRF 防御、不正時は return 400 error）
  - Webhook 署名検証（`X-Goog-Channel-Token`）**MUST**（不正時は return 403 error）
  - OAuth callback の `code` は Google token endpoint で検証 **MUST**（失敗時は return 500 error）
- secrets:
  - `GOOGLE_CLIENT_ID` — 環境変数 **MUST**（未設定時は return error on startup）。コード内ハードコードは **MUST NOT**
  - `GOOGLE_CLIENT_SECRET` — 環境変数 **MUST**（未設定時は return error on startup）。コード内ハードコードは **MUST NOT**
  - `GOOGLE_REDIRECT_URI` — 環境変数 **MUST**（未設定時は return error on startup）
  - OAuth トークン（access / refresh）は DB 保存前に `encrypt()` ユーティリティで暗号化 **MUST**（失敗時は return 500 error）。読み出し時は `decrypt()` で復号 **MUST**（失敗時は return error）
  - 暗号化キーは `JWT_SECRET` から導出 **MUST**（`CALENDAR_ENCRYPTION_KEY` 環境変数として 32 byte で設定）
- token_lifecycle:
  - アクセストークン期限切れ時はリフレッシュトークンで自動更新 **MUST**（更新失敗時は return 401 error）
  - リフレッシュトークン更新時は古いトークンを即座に上書き **MUST**（ローテーション、失敗時は return error）
  - 連携解除時は Google revoke endpoint へトークン失効リクエストを 1 回送信 **MUST**（失敗時は error ログ出力）
  - 連携解除時は `UserCalendarConnection` レコードを 1 件物理削除 **MUST**（削除失敗時は error）
- pii: **present** — Googleアカウントのメールアドレス、カレンダーイベントタイトルの 2 種。ログにメールアドレスを出力 **MUST NOT**（検出時は false）。カレンダーイベントタイトルをログに含める **MUST NOT**（検出時は false）
- audit_log: **required** — 連携開始 / 連携解除 / 同期エラー / トークン更新失敗の 4 イベントをログ出力 **MUST**。ログには `userId` と `organizationId` のみ含め、PII は **MUST NOT** 含める（検出時は false）
- retention_delete: 連携解除時にトークンを物理削除 **MUST**（削除失敗時は return error）。`CalendarOAuth` の期限切れレコードは定期クリーンアップ **SHOULD**

---

## §12. Config（必須：Config First）

全 4 件の `env` カテゴリの項目はデプロイ前に設定 **MUST**。未設定の場合、サーバー起動時に error を出力して終了 **MUST**（return error on startup）。`config` カテゴリの項目はデフォルト値で動作 **MAY** するが、運用環境に合わせて調整 **SHOULD**。

| category | key | type | default | scope | change_risk | description |
|---|---|---|---|---|---|---|
| env | GOOGLE_CLIENT_ID | string | - (MUST 設定) | global | high | Google OAuth クライアント ID。Google Cloud Console で発行 **MUST**（未設定時は return error on startup） |
| env | GOOGLE_CLIENT_SECRET | string | - (MUST 設定) | global | high | Google OAuth クライアントシークレット。コード内ハードコード **MUST NOT**（検出時は return error） |
| env | GOOGLE_REDIRECT_URI | string | - (MUST 設定) | env | medium | OAuth リダイレクト URI。環境ごとに 1 つ設定 **MUST**（dev/stg/prod） |
| env | CALENDAR_ENCRYPTION_KEY | string | - (MUST 設定) | global | high | トークン暗号化キー（32byte）。`JWT_SECRET` から導出 **MUST** |
| config | SYNC_RANGE_PAST_DAYS | number | 7 | global | low | 同期対象の過去日数。変更 **MAY** |
| config | SYNC_RANGE_FUTURE_DAYS | number | 28 | global | low | 同期対象の未来日数。変更 **MAY** |
| config | WEBHOOK_RENEWAL_DAYS | number | 7 | global | low | Webhook 再登録間隔（日数）。Google の最大有効期限以内 **MUST**（超過時は error） |
| feature_flag | ENABLE_GOOGLE_CALENDAR | boolean | false | env | medium | Google カレンダー連携の有効/無効。段階的ロールアウトに使用 **SHOULD** |

---

## 13. Observability（必須：Tracking by Default）
### 13.1 Events
| event | id | when | payload_schema | pii | sink |
|---|---|---|---|---|---|
| calendar_connected | CAL-001 | OAuth成功時 | { userId, provider } | none | analytics |
| calendar_disconnected | CAL-002 | 連携解除時 | { userId, provider } | none | analytics |
| calendar_sync_completed | CAL-003 | 同期完了時 | { userId, imported, exported } | none | analytics |
| calendar_sync_failed | CAL-004 | 同期失敗時 | { userId, error } | none | error_log |

### 13.2 Metrics / Alerts
| metric | purpose | threshold | notify |
|---|---|---|---|
| calendar_sync_error_rate | 同期失敗率 | > 10% in 1h | Slack |
| calendar_webhook_latency | Webhook処理時間 | > 5s avg | Slack |
| calendar_connection_count | 連携ユーザー数 | - | dashboard |

---

## 14. Test Strategy（必須）

- unit:
  - トークン暗号化/復号
  - 同期ループ防止ロジック
  - 日付範囲計算
- integration:
  - OAuth フロー（モックGoogle API）
  - Webhook受信と同期実行
  - マルチテナント境界テスト
- e2e:
  - 連携開始→同期→連携解除のフルフロー
- security:
  - トークン漏洩テスト
  - CSRF対策（state検証）

---

## 15. Rollout / Migration / Ops（必須）
- release_steps:
  1. Google Cloud Consoleでプロジェクト・OAuth設定
  2. 環境変数設定（GOOGLE_CLIENT_ID等）
  3. DBマイグレーション実行
  4. デプロイ
  5. OAuth同意画面の審査申請（本番のみ）
- feature_flag: `ENABLE_GOOGLE_CALENDAR`（初期: false）
- staged_rollout: dev → 社内テスト → サクシード社 → 一般公開
- success_metrics: 連携ユーザー数、同期成功率
- rollback_plan: feature_flag をfalseに戻す
- runbook_min:
  - 同期エラー多発時: Google API ステータス確認、レート制限確認
  - トークンエラー: 該当ユーザーに再認証を依頼

---

## 16. Assumptions（推測禁止：不明は質問へ）
- ASM-01: Google Cloud無料枠で十分な呼び出し回数が確保できる
- ASM-02: OAuth同意画面の審査は1-2週間で完了する
- ASM-03: ユーザーはGoogleアカウントを持っている（建設業でも普及率高い）

---

## 17. Open Questions（1件でも残れば実装禁止）

なし（全て決定済み）

---

## §3-E 入出力例

> 主要APIの具体的なリクエスト/レスポンス例。正常系 2 件 + 異常系 3 件の計 5 件以上を記載する。

### E-1: OAuth開始（正常系）

**Request**
```http
GET /api/calendar/google/connect
Cookie: session=eyJhbG...
```

**Response** (200 OK)
```json
{
  "redirectUrl": "https://accounts.google.com/o/oauth2/v2/auth?client_id=xxxx&redirect_uri=https%3A%2F%2Fapp.mielboard.com%2Fapi%2Fcalendar%2Fgoogle%2Fcallback&response_type=code&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcalendar.readonly+https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcalendar.events&state=abc123&access_type=offline&prompt=consent"
}
```

### E-2: 手動同期（正常系）

**Request**
```http
POST /api/calendar/google/sync
Cookie: session=eyJhbG...
Content-Type: application/json

{
  "direction": "both"
}
```

**Response** (200 OK)
```json
{
  "success": true,
  "imported": 12,
  "exported": 3
}
```

### E-3: OAuth開始 — 未認証（異常系）

**Request**
```http
GET /api/calendar/google/connect
(Cookie なし)
```

**Response** (401 Unauthorized)
```json
{
  "statusCode": 401,
  "statusMessage": "Unauthorized",
  "message": "認証が必要です"
}
```
認証なしの場合 MUST return 401 error。

### E-4: OAuthコールバック — state 期限切れ（異常系）

**Request**
```http
GET /api/calendar/google/callback?code=4/0AXxx&state=expired_state_token
Cookie: session=eyJhbG...
```

**Response** (400 Bad Request)
```json
{
  "statusCode": 400,
  "statusMessage": "Bad Request",
  "message": "認証の有効期限が切れました。もう一度お試しください"
}
```
state が 10 分を超過した場合 MUST return 400 error。

### E-5: Webhook受信 — チャンネルトークン不正（異常系）

**Request**
```http
POST /api/calendar/webhook
X-Goog-Channel-Token: invalid_token_value
X-Goog-Channel-ID: ch-uuid-001
Content-Type: application/json

{}
```

**Response** (403 Forbidden)
```json
{
  "statusCode": 403,
  "statusMessage": "Forbidden",
  "message": "Webhook channel token is invalid"
}
```
チャンネルトークンが不正な場合 MUST return 403 error。

### E-6: 手動同期 — 未連携（異常系）

**Request**
```http
POST /api/calendar/google/sync
Cookie: session=eyJhbG...
Content-Type: application/json

{
  "direction": "import"
}
```

**Response** (400 Bad Request)
```json
{
  "statusCode": 400,
  "statusMessage": "Bad Request",
  "message": "Googleカレンダーが連携されていません"
}
```
連携していないユーザーが同期を試行した場合 MUST return 400 error。

### E-7: 連携ステータス確認 — 連携済み（正常系）

**Request**
```http
GET /api/calendar/google/status
Cookie: session=eyJhbG...
```

**Response** (200 OK)
```json
{
  "connected": true,
  "provider": "google",
  "lastSyncedAt": "2026-02-16T10:30:00.000Z",
  "status": "active"
}
```

---

## §3-F 境界値

> データ項目ごとの境界値パターン定義。

| データ項目 | 型 | 最小値 | 最大値 | 境界パターン | 備考 |
|---|---|---|---|---|---|
| `accessToken` 長 | string | 1 文字 | 2048 文字 | 空文字は MUST return 500 error | Google OAuth の access_token は通常 100-200 文字 |
| `refreshToken` 長 | string | 1 文字 | 512 文字 | 空文字は MUST return 500 error | Google の refresh_token は通常 40-100 文字 |
| `tokenExpiresAt` | DateTime | 現在時刻 | 現在 +3600 秒 | 期限切れ（過去日時）→ リフレッシュ実行 MUST return true | Google の access_token 有効期限は通常 3600 秒 |
| `CalendarOAuth.state` 有効期限 | DateTime | 生成時刻 | 生成時刻 +10 分 | 10 分 0 秒 → 有効、10 分 1 秒 → MUST return 400 error | CSRF 防御用 |
| `syncRangeStart` | int | -365 | -1 | 0 → MUST return 400 error（過去日数は負数 MUST true） | デフォルト -7 |
| `syncRangeEnd` | int | 1 | 365 | 0 → MUST return 400 error（未来日数は正数 MUST true） | デフォルト 28 |
| `direction` パラメータ | enum | - | - | `'import'` / `'export'` / `'both'` の 3 値のみ MUST return 200 response | それ以外は MUST return 400 error |
| `webhookChannelId` 長 | string | 36 文字 (UUID) | 36 文字 (UUID) | UUID 形式でない場合 MUST return 403 error | UUID v4 形式 |
| `CALENDAR_ENCRYPTION_KEY` 長 | string | 32 byte | 32 byte | 32 byte 未満は MUST return error on startup | AES-256 用 |
| `WEBHOOK_RENEWAL_DAYS` | number | 1 | 30 | 0 以下 → MUST return error on startup | Google 最大有効期限以内 |
| 同期イベント件数（1 回あたり） | number | 0 | 2500 | 2500 件超 → ページネーション MUST return true | Google Calendar API の maxResults 上限 |
| `provider` フィールド | string | - | - | `'google'` のみ MUST return 200 response | 他の値は MUST return 400 error |

---

## §3-G 例外応答

> 全エラーケースの応答定義。各エラーは一意の `error_code` で識別する。

| HTTP Status | error_code | 発生条件 | レスポンス message | 対象API | retry |
|---|---|---|---|---|---|
| 401 | GCAL_AUTH_REQUIRED | セッション Cookie なし / 無効 | 認証が必要です | connect, disconnect, status, sync | MUST return false（再ログイン必要） |
| 401 | GCAL_TOKEN_EXPIRED | リフレッシュトークン失効・取消 | 再認証が必要です。Googleカレンダーを再連携してください | sync | MUST return false（再連携必要） |
| 400 | GCAL_STATE_INVALID | OAuth state パラメータが不正 | 認証の有効期限が切れました。もう一度お試しください | callback | MUST return false |
| 400 | GCAL_STATE_EXPIRED | OAuth state が 10 分超過 | 認証の有効期限が切れました。もう一度お試しください | callback | MUST return false（再開始必要） |
| 400 | GCAL_NOT_CONNECTED | 未連携ユーザーが同期/解除を試行 | Googleカレンダーが連携されていません | disconnect, sync | MUST return false（連携が先） |
| 400 | GCAL_INVALID_DIRECTION | direction に不正値 | direction は import, export, both のいずれかを指定してください | sync | MUST return false |
| 403 | GCAL_FORBIDDEN | 他テナント / 他ユーザーのリソースへのアクセス | アクセス権限がありません | 全 API | MUST return false |
| 403 | GCAL_WEBHOOK_INVALID | Webhook チャンネルトークン不正 | （メッセージなし — 外部向け応答） | webhook | MUST return false |
| 404 | GCAL_CONNECTION_NOT_FOUND | 指定された連携情報が存在しない | カレンダー連携情報が見つかりません | disconnect, sync | MUST return false |
| 429 | GCAL_RATE_LIMITED | Google API レート制限到達 | リクエストが多すぎます。しばらくお待ちください | sync, webhook | MUST return true（exponential backoff） |
| 500 | GCAL_TOKEN_EXCHANGE_FAILED | Google token endpoint からのトークン取得失敗 | カレンダー連携に失敗しました。もう一度お試しください | callback | MUST return true（再試行可能） |
| 500 | GCAL_ENCRYPTION_FAILED | トークン暗号化処理エラー | システムエラーが発生しました | callback | MUST return false（要調査） |
| 500 | GCAL_SYNC_FAILED | Google Calendar API からのイベント取得/更新失敗 | カレンダー同期に失敗しました。しばらく後にお試しください | sync, webhook | MUST return true（再試行可能） |
| 500 | GCAL_ORG_SCOPE_MISSING | organizationId フィルタが欠落（内部エラー） | システムエラーが発生しました | 全 API | MUST return false（バグ — 即時修正） |

---

## §3-H Gherkin シナリオ

> 全 MUST return/error 要件に対応するテストシナリオ。Given/When/Then 形式で記述する。

### Scenario 1: OAuth 認証フローの正常完了（CRIT-01）

```gherkin
Feature: Google カレンダー OAuth 連携

  Scenario: 未連携ユーザーが Google カレンダーを連携する
    Given ユーザー "user-A" が organizationId "org-001" に所属している
    And ユーザー "user-A" は Google カレンダー未連携である
    When ユーザー "user-A" が GET /api/calendar/google/connect を呼び出す
    Then レスポンスステータスは 200 である
    And レスポンスに "redirectUrl" が含まれる
    And CalendarOAuth テーブルに state レコードが 1 件作成される
    And state の有効期限は現在時刻から 10 分以内である

  Scenario: OAuth コールバックで連携が完了する
    Given ユーザー "user-A" が有効な OAuth state "valid-state-123" を持つ
    And Google token endpoint が正常にトークンを返す
    When GET /api/calendar/google/callback?code=auth-code-xyz&state=valid-state-123 を呼び出す
    Then UserCalendarConnection テーブルにレコードが 1 件作成される
    And accessToken は暗号化された状態で保存される（平文 MUST return false）
    And refreshToken は暗号化された状態で保存される（平文 MUST return false）
    And レスポンスは /settings/calendar へ 302 リダイレクトである
```

### Scenario 2: マルチテナント境界の保護（CRIT-02）

```gherkin
Feature: マルチテナント境界テスト

  Scenario: 他テナントのカレンダー連携情報にアクセスできない
    Given ユーザー "user-A" が organizationId "org-001" に所属している
    And ユーザー "user-B" が organizationId "org-002" に所属している
    And ユーザー "user-B" は Google カレンダー連携済みである
    When ユーザー "user-A" が GET /api/calendar/google/status を呼び出す
    Then レスポンスの "connected" は false である
    And ユーザー "user-B" の連携情報は MUST return 0 件（表示されない）

  Scenario: 同一組織内でも他ユーザーのトークンにアクセスできない
    Given ユーザー "user-A" が organizationId "org-001" に所属している
    And ユーザー "user-C" が organizationId "org-001" に所属している
    And ユーザー "user-C" は Google カレンダー連携済みである
    When ユーザー "user-A" が POST /api/calendar/google/sync を呼び出す
    Then レスポンスステータスは 400 である（user-A 自身は未連携のため）
    And ユーザー "user-C" の accessToken / refreshToken への参照は MUST return false
```

### Scenario 3: 双方向同期の無限ループ防止（CRIT-03）

```gherkin
Feature: 同期ループ防止

  Scenario: Google から取り込んだイベントを Google に再送信しない
    Given ユーザー "user-A" が Google カレンダー連携済みである
    And Google カレンダーに externalId "gcal-event-001" のイベントが存在する
    And そのイベントの externalUpdatedAt は "2026-02-16T09:00:00Z" である
    When Webhook 通知を受信し差分同期を実行する
    Then Schedule テーブルに externalId "gcal-event-001" のレコードが 1 件 upsert される
    And externalUpdatedAt が "2026-02-16T09:00:00Z" と一致する場合は Google への再送信を MUST return false（スキップ）

  Scenario: ミエルボードで作成したスケジュールは externalId なしで Google に送信する
    Given ユーザー "user-A" が Google カレンダー連携済みである
    When ユーザー "user-A" がミエルボードでスケジュールを 1 件作成する
    And POST /api/calendar/google/sync を direction "export" で呼び出す
    Then Google カレンダーにイベントが 1 件作成される
    And Schedule の externalId に Google から返された eventId が MUST return true（設定される）
    And externalSource は "google" が MUST return true（設定される）
```

### Scenario 4: Webhook 受信の認証とリアルタイム同期（CRIT-05）

```gherkin
Feature: Webhook 受信

  Scenario: 正当な Webhook 通知でリアルタイム同期が実行される
    Given ユーザー "user-A" の webhookChannelId が "ch-uuid-abc" である
    And X-Goog-Channel-Token が正当な値である
    When POST /api/calendar/webhook を X-Goog-Channel-ID "ch-uuid-abc" で受信する
    Then レスポンスステータスは 200 である
    And ユーザー "user-A" の差分同期が 1 回トリガーされる

  Scenario: 不正なチャンネルトークンの Webhook は拒否される
    Given X-Goog-Channel-Token が不正な値 "invalid-token" である
    When POST /api/calendar/webhook を受信する
    Then レスポンスステータスは MUST return 403 error
    And 同期処理は実行されない（トリガー回数 MUST return 0 回）
```

---

## 18. Change Log
| date | version | author | change |
|---|---|---|---|
| 2026-01-23 | 1.0.0 | AI | 初版作成 |
| 2026-02-16 | 1.1.0 | AI | framework v3.4 監査対応: §8-§12 に RFC 2119 キーワード追加、CalendarOAuth モデル追記、API Contract を実エンドポイントパスに更新、http_status 列追加、CSRF state 仕様明記、token lifecycle・PII 保護ルール強化 |
