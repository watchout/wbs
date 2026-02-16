# SSOT: AI日程調整機能 [DETAIL]

> 機能ID: FEAT-MTG-001
> ステータス: Implemented
> 最終更新: 2026-02-05
> 関連: SSOT-1 #MTG-001〜006

**プロジェクト**: ミエルボード for 現場
**モジュール**: AI日程調整（ミーティングスケジューラー）
**バージョン**: v1.0
**層**: DETAIL（Freeze 4） - 止まらないルール適用

---

## 12セクション形式マッピング

| # | セクション | 対応する既存セクション |
|---|-----------|----------------------|
| 1 | 概要 | §1 機能概要 |
| 2 | ユーザーストーリー | §1-1 ユースケース, §1-2 機能要件 |
| 3 | 画面仕様 | §5 UI構成 |
| 4 | API仕様 | §3 API仕様 |
| 5 | データモデル | §2 データモデル |
| 6 | ビジネスロジック | §4 空き時間検索ロジック |
| 7 | エラーハンドリング | §3 API仕様（エラーレスポンス） |
| 8 | セキュリティ | §6 権限モデル |
| 9 | パフォーマンス | §4 空き時間検索ロジック（パフォーマンス考慮） |
| 10 | テストケース | §8 テスト要件 |
| 11 | 実装メモ | §7 マイグレーション |
| 12 | 未決事項 | §9 今後の拡張予定 |

---

## 1. 概要 (Overview)

このドキュメントは **AI日程調整機能の設計における唯一の正（Single Source of Truth）** です。

複数人の空き時間を自動検索し、最適な会議日程を提案・確定する機能を定義します。

---

## 1. 機能概要

### 1-1. ユースケース

```
┌─────────────────────────────────────────────────────────┐
│ 配車担当（LEADER）                                       │
│   「来週、田中・佐藤・鈴木の3人で打ち合わせしたい」       │
│   「全員の空いてる時間を自動で探して」                   │
└─────────────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────────────┐
│ AI日程調整                                              │
│   1. 参加者全員のスケジュールを取得                      │
│   2. 共通の空き時間を検索                               │
│   3. 候補日時を提案（スコア順）                          │
│   4. 参加者に回答を依頼                                 │
│   5. 日程確定 → 全員のスケジュールに自動登録            │
└─────────────────────────────────────────────────────────┘
```

### 1-2. 機能要件

| 要件ID | 内容 | ステータス |
|--------|------|----------|
| MTG-001 | 日程調整リクエスト作成（LEADER以上） | ✅ 実装済み |
| MTG-002 | 参加者の空き時間自動検索 | ✅ 実装済み |
| MTG-003 | AI候補日時提案（スコア順） | ✅ 実装済み |
| MTG-004 | 招待者への回答依頼 | ✅ 実装済み |
| MTG-005 | 回答の集計・可視化 | ✅ 実装済み |
| MTG-006 | 日程確定（主催者のみ） | ✅ 実装済み |
| MTG-007 | 確定時に全員のスケジュール自動作成 | ✅ 実装済み |
| MTG-008 | 日程調整一覧・詳細表示 | ✅ 実装済み |

---

## 2. データモデル

### 2-1. MeetingRequest（日程調整リクエスト）

```prisma
enum MeetingRequestStatus {
  DRAFT         // 下書き
  OPEN          // 回答受付中
  CONFIRMED     // 日程確定
  CANCELLED     // キャンセル
}

model MeetingRequest {
  id             String   @id @default(uuid())
  organization   Organization @relation(...)
  organizationId String

  organizer      User     @relation("meetingOrganizer", ...)
  organizerId    String

  title          String
  description    String?
  duration       Int      // ミーティング時間（分）
  
  dateRangeStart DateTime // 候補期間の開始
  dateRangeEnd   DateTime // 候補期間の終了
  
  status         MeetingRequestStatus @default(DRAFT)
  
  confirmedStart DateTime? // 確定した開始日時
  confirmedEnd   DateTime? // 確定した終了日時
  
  candidates     MeetingCandidate[]
  invitees       MeetingInvitee[]

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  deletedAt      DateTime?
}
```

### 2-2. MeetingCandidate（候補日時）

```prisma
model MeetingCandidate {
  id               String   @id @default(uuid())
  meetingRequest   MeetingRequest @relation(...)
  meetingRequestId String

  start            DateTime
  end              DateTime
  
  isAiSuggested    Boolean  @default(false) // AI提案か手動追加か
  responseCount    Int      @default(0)     // この候補を選択した人数

  createdAt        DateTime @default(now())
}
```

### 2-3. MeetingInvitee（招待者）

```prisma
enum InviteeResponseStatus {
  PENDING       // 未回答
  RESPONDED     // 回答済み
}

model MeetingInvitee {
  id               String   @id @default(uuid())
  meetingRequest   MeetingRequest @relation(...)
  meetingRequestId String

  user             User     @relation("meetingInvitee", ...)
  userId           String

  status           InviteeResponseStatus @default(PENDING)
  selectedCandidateIds Json?  // 選択した候補日時のID配列
  respondedAt      DateTime?

  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  @@unique([meetingRequestId, userId])
}
```

---

## 3. API仕様

### 3-1. 空き時間候補取得

```
POST /api/meetings/suggest-slots
Authorization: LEADER以上

Request:
{
  "userIds": ["uuid1", "uuid2", "uuid3"],
  "dateRangeStart": "2026-02-01T00:00:00Z",
  "dateRangeEnd": "2026-02-07T23:59:59Z",
  "duration": 60,
  "requireAllAvailable": false
}

Response:
{
  "success": true,
  "candidates": [
    {
      "start": "2026-02-03T10:00:00Z",
      "end": "2026-02-03T11:00:00Z",
      "availableUserIds": ["uuid1", "uuid2", "uuid3"],
      "score": 1.0
    },
    ...
  ]
}
```

### 3-2. 日程調整リクエスト一覧

```
GET /api/meetings
Authorization: 認証済み

Response:
{
  "success": true,
  "meetings": [
    {
      "id": "uuid",
      "title": "週次定例",
      "status": "OPEN",
      "duration": 60,
      "dateRangeStart": "...",
      "dateRangeEnd": "...",
      "organizer": { "id": "...", "name": "..." },
      "inviteeCount": 3,
      "confirmedStart": null,
      "createdAt": "..."
    }
  ]
}
```

### 3-3. 日程調整リクエスト作成

```
POST /api/meetings
Authorization: LEADER以上

Request:
{
  "title": "週次定例",
  "description": "今週の進捗確認",
  "duration": 60,
  "dateRangeStart": "2026-02-01T00:00:00Z",
  "dateRangeEnd": "2026-02-07T23:59:59Z",
  "inviteeUserIds": ["uuid1", "uuid2"],
  "autoSuggestCandidates": true
}

Response:
{
  "success": true,
  "meeting": {
    "id": "uuid",
    "title": "週次定例",
    "status": "OPEN",
    "candidateCount": 10
  }
}
```

### 3-4. 日程調整リクエスト詳細

```
GET /api/meetings/:id
Authorization: 認証済み（関係者のみ）

Response:
{
  "success": true,
  "meeting": { ... },
  "candidates": [ ... ],
  "invitees": [ ... ]
}
```

### 3-5. 回答送信

```
POST /api/meetings/:id/respond
Authorization: 招待者のみ

Request:
{
  "candidateIds": ["uuid1", "uuid2"]
}

Response:
{
  "success": true,
  "message": "回答を送信しました"
}
```

### 3-6. 日程確定

```
POST /api/meetings/:id/confirm
Authorization: 主催者のみ

Request:
{
  "candidateId": "uuid"
}

Response:
{
  "success": true,
  "message": "日程を確定しました",
  "confirmedStart": "...",
  "confirmedEnd": "..."
}
```

---

## 4. 空き時間検索ロジック

### 4-1. アルゴリズム

```typescript
// server/utils/meetingScheduler.ts

interface FindSlotsParams {
  organizationId: string
  userIds: string[]
  dateRangeStart: Date
  dateRangeEnd: Date
  duration: number          // 分
  workingHoursStart?: number // デフォルト 9
  workingHoursEnd?: number   // デフォルト 18
  excludeWeekends?: boolean  // デフォルト true
}

async function findAvailableSlots(params): CandidateSlot[]
```

### 4-2. 検索条件

| 条件 | 説明 |
|------|------|
| 営業時間 | 9:00〜18:00（デフォルト） |
| 週末除外 | 土日は候補から除外（デフォルト） |
| 30分刻み | 30分ごとに候補をチェック |
| 最大20件 | スコア順で上位20件を返却 |

### 4-3. スコア計算

```
スコア = 参加可能人数 / 招待人数

例: 3人中3人が参加可能 → スコア 1.0
    3人中2人が参加可能 → スコア 0.67
```

---

## 5. UI構成

### 5-1. ページ構成

```
pages/meetings/
├── index.vue      # 日程調整一覧
├── new.vue        # 新規作成
└── [id].vue       # 詳細・回答・確定
```

### 5-2. 画面フロー

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  一覧表示   │ ──→ │  新規作成   │ ──→ │  詳細表示   │
│  /meetings  │     │  /meetings  │     │  /meetings  │
│             │     │  /new       │     │  /:id       │
└─────────────┘     └─────────────┘     └─────────────┘
                                              │
                    ┌─────────────────────────┼─────────────────────────┐
                    ↓                         ↓                         ↓
              ┌─────────────┐           ┌─────────────┐           ┌─────────────┐
              │  回答送信   │           │  日程確定   │           │  確定済み   │
              │  (招待者)   │           │  (主催者)   │           │  表示       │
              └─────────────┘           └─────────────┘           └─────────────┘
```

---

## 6. 権限モデル

| 操作 | ADMIN | LEADER | MEMBER |
|------|-------|--------|--------|
| 日程調整作成 | ✅ | ✅ | ❌ |
| 空き時間検索 | ✅ | ✅ | ❌ |
| 日程調整一覧表示 | ✅ | ✅ | ✅（関係者のみ） |
| 回答送信 | ✅ | ✅ | ✅（招待者のみ） |
| 日程確定 | ✅（主催者のみ） | ✅（主催者のみ） | ❌ |

---

## 7. マイグレーション

### 7-1. 適用済みマイグレーション

| 名称 | 内容 |
|------|------|
| 20260128110000_add_meeting_request_models | MeetingRequest/Candidate/Invitee追加 |

---

## 8. テスト要件

### 8-1. 必須テスト

| テストID | 内容 | ステータス |
|---------|------|----------|
| TEST-MTG-001 | 空き時間検索が正しく動作する | 📋 未実装 |
| TEST-MTG-002 | スケジュール重複時間は候補から除外 | 📋 未実装 |
| TEST-MTG-003 | 営業時間外は候補から除外 | ✅ 実装済み |
| TEST-MTG-004 | 週末は候補から除外（デフォルト） | ✅ 実装済み |
| TEST-MTG-005 | 主催者以外は確定不可 | 📋 未実装 |
| TEST-MTG-006 | 招待者以外は回答不可 | 📋 未実装 |
| TEST-MTG-007 | 確定時に全員のスケジュールが作成される | 📋 未実装 |
| TEST-MTG-008 | 他組織のユーザーを招待不可（マルチテナント） | 📋 未実装 |

### 8-2. テストファイル

| ファイル | 内容 |
|---------|------|
| server/utils/meetingScheduler.test.ts | ユーティリティ関数 13テスト |

---

## 9. 今後の拡張予定

### Phase 1 以降

| 機能 | 概要 |
|------|------|
| Googleカレンダー連携 | 外部カレンダーの予定も考慮 |
| 通知機能 | 招待・リマインダーのメール/LINE通知 |
| 繰り返し会議 | 定例会議の自動作成 |
| 会議室予約連携 | 会議室の空き状況も考慮 |

---

### §3-E 入出力例

> 本機能は Phase 1 以降で実装予定のため、具体的な入出力例は実装時に定義する。

| # | 種別 | 説明 | 期待 response |
|---|------|------|---------------|
| E-1 | 正常 | 基本操作 | 200 OK |
| E-2 | 正常 | フィルタ付き操作 | 200 OK |
| E-3 | 異常 | 未認証 | 401 error |
| E-4 | 異常 | 権限不足 | 403 error |
| E-5 | 異常 | 不正パラメータ | 400 error |

### §3-F 境界値

> 本機能は Phase 1 以降で実装予定のため、境界値は実装時に定義する。

| フィールド | 下限 | 上限 | 備考 |
|-----------|------|------|------|
| id | 1 文字 | 255 文字 | UUID 形式 |

### §3-G 例外応答

> 本機能は Phase 1 以降で実装予定のため、例外応答は実装時に定義する。

| HTTP | コード | メッセージ | 条件 |
|------|--------|-----------|------|
| 400 | BAD_REQUEST | 不正なリクエストです | バリデーション error |
| 401 | UNAUTHORIZED | 認証が必要です | 未認証 error |
| 403 | FORBIDDEN | アクセス権限がありません | 権限不足 error |
| 500 | INTERNAL_ERROR | サーバーエラーが発生しました | 内部 error |

### §3-H Gherkin シナリオ

> 本機能は Phase 1 以降で実装予定のため、Gherkin シナリオは実装時に定義する。

Scenario: 未認証ユーザーのアクセス拒否
  Given 未認証のユーザーがいる
  When API にアクセスする
  Then 401 error response が返却される

---

## 変更履歴

| 日付 | バージョン | 変更内容 |
|------|----------|---------|
| 2026-01-28 | v1.0 | 初版作成（実装済み機能の事後ドキュメント化） |
