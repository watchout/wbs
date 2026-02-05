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
| LEADER+ | ADMIN, LEADER |
| Any | 認証済み全ロール（ADMIN, LEADER, MEMBER, DEVICE） |

### 1.5 APIハンドラ必須ルール

```
MUST: 全APIハンドラの先頭で requireAuth() または requireLeader()/requireAdmin() を呼び出す
MUST: データクエリに user.organizationId を WHERE 条件として含める
MUST: 入力値のバリデーションを実施（必須項目、型、文字列長）
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
出力: { id, email, name, role, organizationId }
エラー: 401 Unauthorized（無効/期限切れトークン）
```

### 2.2 認証不要エンドポイント

| エンドポイント | 理由 |
|-------------|------|
| POST /api/auth/login | ログイン |
| POST /api/auth/device-login | デバイス認証 |
| GET /api/health | ヘルスチェック |
| POST /api/contact | 問い合わせ |
| GET /api/calendar/google/callback | OAuth2コールバック |

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
| POST | /api/auth/set-password | 初回パスワード設定 | No | - | AUTH-005 |
| POST | /api/auth/create-setup-token | セットアップトークン発行 | Yes | ADMIN | AUTH-005 |

### 3.2 ユーザー（USERS）

| メソッド | パス | 説明 | 認証 | ロール | 機能ID |
|---------|------|------|------|-------|--------|
| GET | /api/users | ユーザー一覧 | Yes | ADMIN | ACCT-001 |
| POST | /api/users | ユーザー作成 | Yes | ADMIN | ACCT-001 |
| PATCH | /api/users/[id] | ユーザー更新 | Yes | ADMIN | ACCT-001 |
| DELETE | /api/users/[id] | ユーザー削除（ソフト） | Yes | ADMIN | ACCT-001 |
| PATCH | /api/users/me | 自分のプロフィール更新 | Yes | Any | ACCT-002 |

### 3.3 スケジュール（SCHEDULES）

| メソッド | パス | 説明 | 認証 | ロール | 機能ID |
|---------|------|------|------|-------|--------|
| GET | /api/schedules/weekly-board | 週間ボードデータ取得 | Yes | Any | WBS-001 |
| POST | /api/schedules | スケジュール作成 | Yes | LEADER+ | WBS-001 |
| PATCH | /api/schedules/[id] | スケジュール更新 | Yes | LEADER+ | WBS-001 |
| DELETE | /api/schedules/[id] | スケジュール削除（ソフト） | Yes | LEADER+ | WBS-001 |

### 3.4 部門（DEPARTMENTS）

| メソッド | パス | 説明 | 認証 | ロール | 機能ID |
|---------|------|------|------|-------|--------|
| GET | /api/departments | 部門一覧 | Yes | Any | WBS-005 |
| POST | /api/departments | 部門作成 | Yes | ADMIN | WBS-005 |
| PATCH | /api/departments/[id] | 部門更新 | Yes | ADMIN | WBS-005 |
| DELETE | /api/departments/[id] | 部門削除（ソフト） | Yes | ADMIN | WBS-005 |

### 3.5 会議（MEETINGS）

| メソッド | パス | 説明 | 認証 | ロール | 機能ID |
|---------|------|------|------|-------|--------|
| GET | /api/meetings | 会議一覧 | Yes | Any | WBS-004 |
| POST | /api/meetings | 会議作成 | Yes | LEADER+ | WBS-004 |
| GET | /api/meetings/[id] | 会議詳細 | Yes | Any | WBS-004 |
| POST | /api/meetings/suggest-slots | AIスロット提案 | Yes | LEADER+ | AI-001 |
| POST | /api/meetings/[id]/respond | 招待者回答 | Yes | Any | WBS-004 |
| POST | /api/meetings/[id]/confirm | 日程確定 | Yes | LEADER+ | WBS-004 |

### 3.6 カレンダー（CALENDAR）

| メソッド | パス | 説明 | 認証 | ロール | 機能ID |
|---------|------|------|------|-------|--------|
| GET | /api/calendar/status | 接続状態確認 | Yes | Any | WBS-003 |
| POST | /api/calendar/sync | 手動同期実行 | Yes | Any | WBS-003 |
| DELETE | /api/calendar/connection | 接続解除 | Yes | Any | WBS-003 |
| GET | /api/calendar/google/connect | OAuth2認証開始 | Yes | Any | WBS-003 |
| GET | /api/calendar/google/callback | OAuth2コールバック | No | - | WBS-003 |
| POST | /api/calendar/webhook | Webhook受信 | No | - | WBS-003 |

### 3.7 運用（OPS）

| メソッド | パス | 説明 | 認証 | ロール | 機能ID |
|---------|------|------|------|-------|--------|
| GET | /api/health | ヘルスチェック | No | - | OPS-001 |
| POST | /api/contact | 問い合わせ送信 | No | - | OPS-003 |

---

## 4. レスポンス形式

### 4.1 成功レスポンス

```json
// 単体
{ "id": "...", "title": "...", ... }

// リスト
[ { "id": "...", ... }, { "id": "...", ... } ]
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
| 403 | 権限エラー（ロール不足） |
| 404 | リソース未検出 |
| 409 | 競合（重複データ等） |
| 500 | サーバー内部エラー |

---

## 5. マルチテナント制約

全てのデータ操作APIで以下を強制:

```
MUST: requireAuth() で認証ユーザーを取得
MUST: user.organizationId でクエリをスコープ
MUST NOT: organizationId のフォールバック値を使用
MUST NOT: 他テナントのデータを返却
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

---

## 7. 検証方法

本文書の検証は以下で実施:

| 対象 | 検証方法 |
|------|---------|
| エンドポイント存在 | `ls server/api/` でファイル名がNuxt 3規約と一致することを確認 |
| 認証チェック | 未認証状態で Protected API を呼び出し 401 が返ることを確認 |
| ロールチェック | MEMBER ロールで ADMIN API を呼び出し 403 が返ることを確認 |
| マルチテナント | API レスポンスに他テナントのデータが含まれないことを確認 |
| レスポンス形式 | 各API の成功/エラーレスポンスが §4 の形式に従うことを確認 |
| Socket.IO | schedule:created/updated/deleted イベントが org:{id} Room 内でのみ配信されることを確認 |

---

## 変更履歴

| 日付 | 変更内容 | 変更者 |
|------|---------|-------|
| 2026-02-03 | ai-dev-framework v3.0 準拠で新規作成。openapi.yaml + server/api/ から統合 | AI（Claude Code） |
| 2026-02-03 | 監査指摘修正: ロール表記定義、APIルール（RFC 2119）、機能IDマッピング、検証方法追加 | AI（Claude Code） |
