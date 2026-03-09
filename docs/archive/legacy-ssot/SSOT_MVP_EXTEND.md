# SSOT: MVP機能拡張（Phase 0.5） [DETAIL]

> 機能ID: FEAT-EXT-001〜005
> ステータス: Implemented
> 最終更新: 2026-02-05
> 関連: SSOT-1 全機能

**プロジェクト**: ミエルボード for 現場
**モジュール**: MVP拡張機能群
**バージョン**: v1.0
**層**: DETAIL（Freeze 4） - 止まらないルール適用

---

## 12セクション形式マッピング

| # | セクション | 対応する既存セクション |
|---|-----------|----------------------|
| 1 | 概要 | §1 機能概要 |
| 2 | ユーザーストーリー | §2〜6 各EXT機能 |
| 3 | 画面仕様 | §3 EXT-02, §4 EXT-03, §5 EXT-04, §6 EXT-05 |
| 4 | API仕様 | SSOT-3参照 |
| 5 | データモデル | §2 EXT-01 ソフトデリート |
| 6 | ビジネスロジック | §3 EXT-02 LEADER権限 |
| 7 | エラーハンドリング | SSOT-5参照 |
| 8 | セキュリティ | §3 EXT-02 LEADER権限 |
| 9 | パフォーマンス | TBD |
| 10 | テストケース | §8 テスト要件 |
| 11 | 実装メモ | §7 マイグレーション |
| 12 | 未決事項 | 変更履歴 |  
**最終更新**: 2026-01-28  
**ステータス**: 実装済み

---

## 🎯 このドキュメントの位置づけ

このドキュメントは **MVP機能拡張の設計における唯一の正（Single Source of Truth）** です。

サクシード社での試験運用に向けて、Phase 0 の基本機能に追加された拡張機能群を定義します。

---

## 1. 機能概要

### 1-1. 対象機能一覧

| ID | 機能名 | 概要 | 優先度 |
|----|--------|------|--------|
| EXT-01 | ソフトデリート | データの論理削除（復元可能） | P0 |
| EXT-02 | LEADER権限 | 部署リーダー向け中間権限 | P0 |
| EXT-03 | サイネージUI | 大画面常時表示向けUI | P1 |
| EXT-04 | モバイル対応 | スマートフォン向けレスポンシブ | P1 |
| EXT-05 | 管理画面拡張 | 部署管理・ナビゲーション | P1 |

---

## 2. EXT-01: ソフトデリート

### 2-1. 要件

| 要件ID | 内容 | ステータス |
|--------|------|----------|
| EXT-01-001 | User/Schedule/DepartmentにdeletedAtフィールド追加 | ✅ 実装済み |
| EXT-01-002 | 削除APIはdeletedAtを現在日時に更新（物理削除しない） | ✅ 実装済み |
| EXT-01-003 | 取得APIはdeletedAt: nullでフィルタ | ✅ 実装済み |
| EXT-01-004 | 削除済みデータは管理画面から復元可能（将来対応） | 📋 未実装 |

### 2-2. データモデル変更

```prisma
model User {
  // 既存フィールド...
  deletedAt  DateTime?  // ソフトデリート
}

model Schedule {
  // 既存フィールド...
  deletedAt  DateTime?  // ソフトデリート
}

model Department {
  // 既存フィールド...
  deletedAt  DateTime?  // ソフトデリート
}
```

### 2-3. 対象API

| エンドポイント | 変更内容 |
|---------------|---------|
| DELETE /api/users/:id | update({deletedAt: new Date()})に変更 |
| DELETE /api/schedules/:id | update({deletedAt: new Date()})に変更 |
| DELETE /api/departments/:id | update({deletedAt: new Date()})に変更 |
| GET /api/users | where: {deletedAt: null}追加 |
| GET /api/schedules/* | where: {deletedAt: null}追加 |
| GET /api/departments | where: {deletedAt: null}追加 |

---

## 3. EXT-02: LEADER権限

### 3-1. 要件

| 要件ID | 内容 | ステータス |
|--------|------|----------|
| EXT-02-001 | RoleにLEADERを追加 | ✅ 実装済み |
| EXT-02-002 | LEADERは同部署メンバーのスケジュールを編集可能 | ✅ 実装済み |
| EXT-02-003 | requireLeader関数で権限チェック | ✅ 実装済み |
| EXT-02-004 | canEditSchedule関数でスケジュール編集権限判定 | ✅ 実装済み |

### 3-2. 権限モデル

```
┌─────────────────────────────────────────────────────────┐
│ ADMIN                                                    │
│   - 全ユーザーのスケジュール編集可能                      │
│   - ユーザー管理・部署管理可能                           │
│   - 日程調整作成可能                                    │
└─────────────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────────────┐
│ LEADER                                                  │
│   - 自分のスケジュール編集可能                           │
│   - 同部署メンバーのスケジュール編集可能                  │
│   - 日程調整作成可能                                    │
└─────────────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────────────┐
│ MEMBER                                                  │
│   - 自分のスケジュールのみ編集可能                       │
│   - 日程調整への回答可能                                │
└─────────────────────────────────────────────────────────┘
```

### 3-3. 権限チェック関数

```typescript
// server/utils/authMiddleware.ts

export interface ScheduleEditCheckParams {
  authContext: AuthContext
  scheduleAuthorId: string | null
  scheduleAuthorDepartmentId: string | null
  userDepartmentId: string | null
}

export function canEditSchedule(params: ScheduleEditCheckParams): boolean
export function requireScheduleEditPermission(params: ScheduleEditCheckParams): void
export function requireLeader(authContext: AuthContext): void
```

---

## 4. EXT-03: サイネージUI

### 4-1. 要件

| 要件ID | 内容 | ステータス |
|--------|------|----------|
| EXT-03-001 | 大画面向け専用ページ /org/[slug]/signage | ✅ 実装済み |
| EXT-03-002 | リアルタイム時計表示 | ✅ 実装済み |
| EXT-03-003 | 天気情報表示（仮実装） | ✅ 実装済み |
| EXT-03-004 | 自動スクロール（多人数対応） | ✅ 実装済み |
| EXT-03-005 | タッチ編集対応 | ✅ 実装済み |
| EXT-03-006 | 設定パネル（表示行数・スクロール間隔） | ✅ 実装済み |
| EXT-03-007 | 本日の予定アラート表示 | ✅ 実装済み |

### 4-2. コンポーネント構成

```
pages/org/[slug]/signage.vue
├── components/signage/SignageHeader.vue    # 時計・天気・ロゴ
├── components/signage/SignageBoard.vue     # 週間ボード（大画面版）
├── components/signage/SignageAlerts.vue    # 本日の予定アラート
└── components/ScheduleFormModal.vue        # タッチ編集モーダル
```

### 4-3. 設定オプション

| 設定項目 | デフォルト値 | 説明 |
|---------|-------------|------|
| autoScroll | true | 自動スクロール有効 |
| scrollInterval | 10秒 | スクロール間隔 |
| rowsPerPage | 8行 | 1ページの表示行数 |
| selectedDepartment | "" | 部門フィルタ |

---

## 5. EXT-04: モバイル対応

### 5-1. 要件

| 要件ID | 内容 | ステータス |
|--------|------|----------|
| EXT-04-001 | ログインページのモバイル対応 | ✅ 実装済み |
| EXT-04-002 | 週間ボードの横スクロール対応 | ✅ 実装済み |
| EXT-04-003 | 管理画面のモバイル対応 | ✅ 実装済み |
| EXT-04-004 | iOS入力フォームzoom防止（font-size: 16px） | ✅ 実装済み |

### 5-2. ブレークポイント

| ブレークポイント | 対象 |
|-----------------|------|
| max-width: 768px | タブレット・スマートフォン |
| max-width: 480px | スマートフォン（小） |

---

## 6. EXT-05: 管理画面拡張

### 6-1. 要件

| 要件ID | 内容 | ステータス |
|--------|------|----------|
| EXT-05-001 | 部署管理ページ /admin/departments | ✅ 実装済み |
| EXT-05-002 | 部署CRUD（作成・編集・削除） | ✅ 実装済み |
| EXT-05-003 | 共通ナビゲーションコンポーネント | ✅ 実装済み |
| EXT-05-004 | ユーザー管理にナビゲーション追加 | ✅ 実装済み |

### 6-2. ページ構成

```
pages/admin/
├── users.vue           # ユーザー管理
└── departments.vue     # 部署管理

components/admin/
└── AdminNav.vue        # 共通ナビゲーション
```

---

## 7. マイグレーション

### 7-1. 適用済みマイグレーション

| 名称 | 内容 |
|------|------|
| 20260128100000_add_soft_delete_and_leader_role | deletedAt追加、LEADERロール追加 |

---

## 8. テスト要件

### 8-1. 必須テスト

| テストID | 内容 | ステータス |
|---------|------|----------|
| TEST-EXT-001 | ソフトデリート後もDBにレコードが残る | ✅ 実装済み |
| TEST-EXT-002 | 削除済みデータがAPI取得結果に含まれない | 📋 未実装 |
| TEST-EXT-003 | LEADERが同部署メンバーのスケジュールを編集可能 | ✅ 実装済み |
| TEST-EXT-004 | LEADERが他部署メンバーのスケジュールを編集不可 | ✅ 実装済み |
| TEST-EXT-005 | MEMBERが他人のスケジュールを編集不可 | ✅ 実装済み |

### 8-2. テストファイル

| ファイル | 内容 |
|---------|------|
| server/utils/authMiddleware.test.ts | canEditSchedule 13テスト |
| server/api/schedules/[id].delete.test.ts | ソフトデリート 2テスト |

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
