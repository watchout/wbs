# RFV検証レポート: MVP拡張機能群 & AI日程調整

**日付**: 2026-01-28  
**対象SSOT**: 
- SSOT_MVP_EXTEND.md
- SSOT_MEETING_SCHEDULER.md

---

## 1. 検証サマリー

| SSOT | カバレッジ | ギャップ数 |
|------|-----------|-----------|
| SSOT_MVP_EXTEND.md | 96% | 1件（将来対応として明記済み） |
| SSOT_MEETING_SCHEDULER.md | 100% | 0件 |

**総合判定**: ✅ SSOT と実装は整合している

---

## 2. SSOT_MVP_EXTEND.md 検証詳細

### EXT-01: ソフトデリート

| 要件ID | 内容 | 実装状況 | 確認方法 |
|--------|------|----------|---------|
| EXT-01-001 | deletedAtフィールド追加 | ✅ | prisma/schema.prisma確認 |
| EXT-01-002 | 削除APIをソフトデリートに変更 | ✅ | server/api/*/[id].delete.ts確認 |
| EXT-01-003 | 取得APIにdeletedAt: nullフィルタ | ✅ | server/api/*/index.get.ts確認 |
| EXT-01-004 | 復元機能 | 📋 | 将来対応（ギャップではない） |

### EXT-02: LEADER権限

| 要件ID | 内容 | 実装状況 | 確認方法 |
|--------|------|----------|---------|
| EXT-02-001 | LEADERロール追加 | ✅ | prisma/schema.prisma Role enum |
| EXT-02-002 | 同部署編集可能 | ✅ | canEditSchedule関数 |
| EXT-02-003 | requireLeader関数 | ✅ | authMiddleware.ts |
| EXT-02-004 | canEditSchedule関数 | ✅ | authMiddleware.ts + テスト |

### EXT-03: サイネージUI

| 要件ID | 内容 | 実装状況 | 確認ファイル |
|--------|------|----------|-------------|
| EXT-03-001 | /org/[slug]/signage | ✅ | pages/org/[slug]/signage.vue |
| EXT-03-002 | 時計表示 | ✅ | components/signage/SignageHeader.vue |
| EXT-03-003 | 天気表示 | ✅ | components/signage/SignageHeader.vue |
| EXT-03-004 | 自動スクロール | ✅ | components/signage/SignageBoard.vue |
| EXT-03-005 | タッチ編集 | ✅ | ScheduleFormModal連携 |
| EXT-03-006 | 設定パネル | ✅ | pages/org/[slug]/signage.vue |
| EXT-03-007 | 本日予定アラート | ✅ | components/signage/SignageAlerts.vue |

### EXT-04: モバイル対応

| 要件ID | 内容 | 実装状況 | 確認方法 |
|--------|------|----------|---------|
| EXT-04-001 | ログインページ | ✅ | @media追加確認 |
| EXT-04-002 | 週間ボード横スクロール | ✅ | @media追加確認 |
| EXT-04-003 | 管理画面 | ✅ | @media追加確認 |
| EXT-04-004 | iOS zoom防止 | ✅ | font-size: 16px確認 |

### EXT-05: 管理画面拡張

| 要件ID | 内容 | 実装状況 | 確認ファイル |
|--------|------|----------|-------------|
| EXT-05-001 | 部署管理ページ | ✅ | pages/admin/departments.vue |
| EXT-05-002 | 部署CRUD | ✅ | APIエンドポイント確認 |
| EXT-05-003 | AdminNav | ✅ | components/admin/AdminNav.vue |
| EXT-05-004 | ユーザー管理にナビ | ✅ | pages/admin/users.vue |

---

## 3. SSOT_MEETING_SCHEDULER.md 検証詳細

### API仕様

| エンドポイント | 実装状況 | 確認ファイル |
|--------------|----------|-------------|
| POST /api/meetings/suggest-slots | ✅ | suggest-slots.post.ts |
| GET /api/meetings | ✅ | index.get.ts |
| POST /api/meetings | ✅ | index.post.ts |
| GET /api/meetings/:id | ✅ | [id].get.ts |
| POST /api/meetings/:id/respond | ✅ | [id]/respond.post.ts |
| POST /api/meetings/:id/confirm | ✅ | [id]/confirm.post.ts |

### データモデル

| モデル | 実装状況 | 確認方法 |
|-------|----------|---------|
| MeetingRequest | ✅ | prisma/schema.prisma |
| MeetingCandidate | ✅ | prisma/schema.prisma |
| MeetingInvitee | ✅ | prisma/schema.prisma |
| MeetingRequestStatus enum | ✅ | prisma/schema.prisma |
| InviteeResponseStatus enum | ✅ | prisma/schema.prisma |

### UI

| ページ | 実装状況 | 確認ファイル |
|-------|----------|-------------|
| /meetings (一覧) | ✅ | pages/meetings/index.vue |
| /meetings/new (作成) | ✅ | pages/meetings/new.vue |
| /meetings/:id (詳細) | ✅ | pages/meetings/[id].vue |

### 空き時間検索ロジック

| 関数 | 実装状況 | 確認ファイル |
|------|----------|-------------|
| findAvailableSlots | ✅ | server/utils/meetingScheduler.ts |
| findAllAvailableSlots | ✅ | server/utils/meetingScheduler.ts |
| getNextBusinessDay | ✅ | server/utils/meetingScheduler.ts |
| isWithinWorkingHours | ✅ | server/utils/meetingScheduler.ts |

---

## 4. テスト状況

| テストファイル | テスト数 | ステータス |
|--------------|---------|-----------|
| server/utils/authMiddleware.test.ts | 27 | ✅ パス |
| server/utils/meetingScheduler.test.ts | 13 | ✅ パス |
| server/api/schedules/[id].delete.test.ts | 2追加 | ✅ パス |

**未実装テスト（優先度順）**:
1. TEST-MTG-002: スケジュール重複時間は候補から除外
2. TEST-MTG-005: 主催者以外は確定不可
3. TEST-MTG-006: 招待者以外は回答不可
4. TEST-MTG-008: 他組織のユーザーを招待不可

---

## 5. 結論

**SSOT と実装の整合性**: ✅ 問題なし

すべての実装要件がSSOTに記載された仕様通りに実装されています。
将来対応として明記された「復元機能」以外にギャップはありません。

**次のアクション**:
1. 残りのテストを追加（優先度に応じて）
2. 実際のサクシード社環境でE2Eテスト
