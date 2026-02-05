---
doc_id: SSOT-CALENDAR-001
title: "Googleカレンダー連携 [DETAIL]"
version: 1.0.0
status: implemented
owner: "開発チーム"
created_at: 2026-01-23
updated_at: 2026-01-23
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

---

## 1. Decision Required（要判断：未解決が1つでもあれば実装禁止）

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

## 2. Background / Problem
- 現状: スケジュールは手動でミエルボードに入力、または個別にGoogleカレンダーで管理
- 課題: 二重入力の手間、Googleカレンダーとの情報不整合、現場での入力漏れ
- なぜ今: サクシード社試験運用で「既存カレンダーとの連携」要望あり
- 期待効果: スケジュール入力時間50%削減、情報の一元化

---

## 3. Scope（境界）
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

## 4. Definitions（用語）
| term | definition |
|---|---|
| 個人連携 | 各ユーザーが自分のGoogleアカウントでOAuth認証し、自分のカレンダーを連携 |
| 組織連携 | 管理者がGoogle Workspaceのドメイン全体で一括連携（Service Account使用） |
| プライマリカレンダー | Googleアカウントのメインカレンダー（calendarId: 'primary'） |
| Webhook | Googleカレンダーの変更をリアルタイムで通知する仕組み（Push Notification） |
| externalId | Googleカレンダーのイベントを識別するID（重複防止用） |

---

## 5. Use Cases
- UC-01: ユーザーがGoogleカレンダー連携を開始し、既存予定がミエルボードに表示される
- UC-02: Googleカレンダーで予定を追加すると、リアルタイムでミエルボードに反映される
- UC-03: ミエルボードでスケジュールを追加すると、Googleカレンダーに反映される
- UC-04: 管理者がGoogle Workspace連携を設定し、組織全員のカレンダーが一括連携される
- NUC-01（障害時）: Google APIがダウンしても、ミエルボード内のスケジュールは正常動作
- NUC-02（権限不足）: OAuth認証が失敗した場合、エラーメッセージを表示し連携状態を更新

---

## 6. Requirements
### 6.1 CRITICAL（絶対）
- CRIT-01: OAuth 2.0によるセキュアな認証（トークンは暗号化保存）
- CRIT-02: マルチテナント境界を維持（他組織のカレンダーにアクセス不可）
- CRIT-03: 双方向同期で無限ループを防止（externalId/updatedAtで判定）
- CRIT-04: リフレッシュトークンによる自動再認証
- CRIT-05: Webhookチャンネルの有効期限管理と自動再登録

### 6.2 SHOULD
- SHOULD-01: 同期対象期間を設定可能（デフォルト: 過去1週間〜未来4週間）
- SHOULD-02: 同期エラー時のリトライ機構
- SHOULD-03: 連携解除機能

### 6.3 NICE
- NICE-01: 複数カレンダーの選択対応（将来）
- NICE-02: 同期履歴の表示

---

## 7. Acceptance Criteria（必須：テスト可能に）

- AC-01: Given 未連携ユーザー When 「Googleカレンダー連携」ボタンを押す Then Google OAuth画面が表示される（covers: [CRIT-01]）
- AC-02: Given OAuth認証成功 When カレンダーAPIを呼び出す Then 過去1週間〜未来4週間の予定がScheduleに保存される（covers: [CRIT-01, SHOULD-01]）
- AC-03: Given 連携済みユーザー When Googleカレンダーで予定を追加 Then 1分以内にミエルボードに反映される（covers: [CRIT-05]）
- AC-04: Given 連携済みユーザー When ミエルボードでスケジュール追加 Then Googleカレンダーに反映される（covers: [CRIT-03]）
- AC-05: Given orgAのユーザー When orgBのカレンダーにアクセス試行 Then 403エラーが返る（covers: [CRIT-02]）
- AC-06: Given アクセストークン期限切れ When API呼び出し Then リフレッシュトークンで自動更新（covers: [CRIT-04]）
- AC-07: Given 連携済みユーザー When 「連携解除」ボタンを押す Then トークンが削除され連携状態が解除（covers: [SHOULD-03]）

---

## 8. Tenancy（必須：マルチテナント境界）

- boundary: tenant = `organizationId`
- auth: **全APIで `requireAuth(event)` を使用**（例外: Webhookエンドポイントは署名検証で認証）
- db_filter: **全DBクエリで `organizationId` フィルタ**（例外なし）
- forbidden:
  - organizationId なしのクエリ
  - `organizationId ?? 'default'` のようなフォールバック
  - 他テナントのデータにアクセス可能な実装
  - 他ユーザーのOAuthトークンへのアクセス
- tests:
  - 境界テスト: required（orgAでorgBのカレンダー連携情報が見えないこと）

---

## 9. Data Model / Migration（該当するなら必須）

- schema_changes: yes
- prisma_models_changed: ["UserCalendarConnection", "Schedule"]
- migration_required: yes
- migration_name: "add_calendar_connection"
- migration_files:
  - "prisma/migrations/<timestamp>_add_calendar_connection/migration.sql"

### 新規モデル

```prisma
model UserCalendarConnection {
  id             String   @id @default(uuid())
  user           User     @relation(fields: [userId], references: [id])
  userId         String
  organization   Organization @relation(fields: [organizationId], references: [id])
  organizationId String
  
  provider       String   // "google"
  accessToken    String   // 暗号化保存
  refreshToken   String   // 暗号化保存
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

### Scheduleモデル変更

```prisma
model Schedule {
  // 既存フィールド...
  externalId     String?  // Googleカレンダーのevent.id
  externalSource String?  // "google"
  externalUpdatedAt DateTime? // 外部での最終更新日時（ループ防止用）
  
  @@index([externalId, externalSource])
}
```

**ルール（必須）**
- 既存 `prisma/migrations/**/migration.sql` の編集禁止
- schema変更時は `npx prisma migrate dev --name add_calendar_connection` で **新規migration追加**
- Prisma以外のDDL/DML（`$queryRaw` / `$executeRaw`）での変更は禁止

---

## 10. Contract（必須：I/O / 状態 / 互換 / エラー）

### 10.1 API Contract（HTTP）

#### (A) OAuth開始
- endpoint: `GET /api/calendar/google/connect`
- auth: requireAuth
- request: なし
- response: `{ redirectUrl: string }`
- validation: なし
- side effects: なし（リダイレクトURLを返すのみ）

#### (B) OAuthコールバック
- endpoint: `GET /api/calendar/google/callback`
- auth: Cookie（state検証）
- request: `{ code: string, state: string }`
- response: リダイレクト to `/settings/calendar`
- validation: state検証、code検証
- side effects: UserCalendarConnection作成、初回同期実行

#### (C) 手動同期
- endpoint: `POST /api/calendar/sync`
- auth: requireAuth
- request: `{ direction?: 'import' | 'export' | 'both' }`
- response: `{ success: boolean, imported: number, exported: number }`
- validation: 連携済みかチェック
- side effects: Schedule upsert、Googleカレンダー更新

#### (D) Webhook受信
- endpoint: `POST /api/calendar/webhook`
- auth: X-Goog-Channel-Token検証
- request: Google Push Notification
- response: 200 OK
- validation: チャンネルID検証
- side effects: 対象ユーザーの同期をキュー追加

#### (E) 連携解除
- endpoint: `DELETE /api/calendar/connection`
- auth: requireAuth
- request: なし
- response: `{ success: boolean }`
- validation: なし
- side effects: トークン削除、Webhookチャンネル停止

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

### 10.3 Error Spec（必須）
| error_code | condition | user_message | retry | logging |
|---|---|---|---|---|
| GCAL_AUTH_FAILED | OAuth認証失敗 | Googleアカウントの認証に失敗しました | yes | warn |
| GCAL_TOKEN_EXPIRED | リフレッシュ失敗 | 再認証が必要です | no | error |
| GCAL_API_ERROR | Google API エラー | カレンダー同期に失敗しました。しばらく後にお試しください | yes | error |
| GCAL_RATE_LIMIT | APIレート制限 | リクエストが多すぎます。しばらくお待ちください | yes(exponential) | warn |
| GCAL_WEBHOOK_INVALID | Webhook検証失敗 | - | no | warn |
| GCAL_NOT_CONNECTED | 未連携でAPI呼び出し | Googleカレンダーが連携されていません | no | info |

### 10.4 Compatibility（必須）
- 既存仕様との互換: Scheduleテーブルに新規フィールド追加のみ、既存機能への影響なし
- 破壊的変更: no
- versioning: N/A

---

## 11. Security & Privacy（必須：unknown禁止）
- authn: Google OAuth 2.0、アプリ内はセッションCookie
- authz: 自分のカレンダー連携のみ操作可能
- validation: OAuth state検証、Webhook署名検証
- secrets: 
  - GOOGLE_CLIENT_ID（環境変数）
  - GOOGLE_CLIENT_SECRET（環境変数）
  - トークンはDB保存時に暗号化（AES-256-GCM）
- pii: present（Googleアカウントのメールアドレス、カレンダー内容）
- audit_log: required（連携開始/解除、同期エラーをログ）
- retention_delete: 連携解除時にトークン物理削除

---

## 12. Config（必須：Config First）
| category | key | type | default | scope | change_risk | description |
|---|---|---|---|---|---|---|
| env | GOOGLE_CLIENT_ID | string | - | global | high | Google OAuth クライアントID |
| env | GOOGLE_CLIENT_SECRET | string | - | global | high | Google OAuth クライアントシークレット |
| env | GOOGLE_REDIRECT_URI | string | - | env | medium | OAuthリダイレクトURI |
| env | CALENDAR_ENCRYPTION_KEY | string | - | global | high | トークン暗号化キー（32byte） |
| config | SYNC_RANGE_PAST_DAYS | number | 7 | global | low | 同期対象の過去日数 |
| config | SYNC_RANGE_FUTURE_DAYS | number | 28 | global | low | 同期対象の未来日数 |
| config | WEBHOOK_RENEWAL_DAYS | number | 7 | global | low | Webhook再登録間隔 |

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

## 18. Change Log
| date | version | author | change |
|---|---|---|---|
| 2026-01-23 | 1.0.0 | AI | 初版作成 |
