# UI・ルーティング設計作成レポート（現状注記付き）

**作成日**: 2025-12-16  
**作成者**: 設計AI  
**プロジェクト**: ミエルボード for 現場 / 現場WEEK

---

## 📋 作成内容サマリー

### 作成したドキュメント

**`docs/UI_ROUTING_MAP.md`** - UI・ルーティング設計（12,000字以上）

---

## 🎯 ドキュメントの目的

フロントエンド実装の前に、**「何を作るべきか」を明確化**するために作成しました。

### 解決した課題

1. ✅ **全ページのURL・役割が不明確**だった
2. ✅ **ページ間の遷移関係が整理されていなかった**
3. ✅ **実装優先順位が曖昧**だった
4. ✅ **コンポーネント階層が設計されていなかった**

---

## 📊 ドキュメント構成

### 1. URL一覧（Phase 0）

#### 1-1. 公開ページ（未認証）
- `/` - トップページ
- `/org/[slug]/login` - ログイン（設計）
- `/signup` - 新規登録（Phase 1）
- `/org/[slug]/forgot-password` - パスワード再設定（Phase 1・設計）

#### 1-2. 認証済みページ（組織内）

**管理画面（共通レイアウト）**:
- `/org/[slug]/dashboard` - ダッシュボード
- `/org/[slug]/weekly-board` - **週間スケジュールボード**（メイン）
- `/org/[slug]/schedules` - スケジュール一覧
- `/org/[slug]/schedules/new` - スケジュール作成
- `/org/[slug]/schedules/[id]` - スケジュール詳細
- `/org/[slug]/employees` - 社員一覧（Phase 1）
- `/org/[slug]/settings` - 組織設定（Phase 1）
- `/org/[slug]/settings/profile` - プロフィール設定

**サイネージ表示（フルスクリーン）**:
- `/org/[slug]/weekly-board?fullscreen=true` - **週間ボード（サイネージ）**（設計）
- `/org/[slug]/display/daily` - 日次ボード（Phase 1・設計）

**将来の拡張（Phase 1+）**:
- `/org/[slug]/stock` - 在庫管理（現場STOCK）
- `/org/[slug]/alcohol` - アルコールチェック（現場ALCOHOL）
- `/org/[slug]/ai` - AIコンシェルジュ（現場AI）

---

### 2. ページ遷移図（Mermaid）

#### 2-1. Phase 0 の遷移フロー
- トップページ → ログイン → ダッシュボード
- ダッシュボード → 週間ボード → サイネージ表示
- 週間ボード → スケジュール詳細 → 編集

#### 2-2. 詳細遷移フロー（シーケンス図）
- ログイン → 認証 → 週間ボード表示 → データ取得 → レンダリング
- フルスクリーン → サイネージ表示 → リアルタイム更新

---

### 3. UI構成要素マップ

#### 3-1. 週間ボードページ

**コンポーネント階層**:
```
pages/org/[slug]/weekly-board.vue
├── layouts/OrgLayout.vue
└── components/genba/
    ├── WeeklyScheduleBoard.vue
    │   ├── WeekNavigator.vue
    │   ├── DepartmentFilter.vue
    │   └── ScheduleMatrix.vue
    │       └── ScheduleCell.vue
    └── FullscreenButton.vue
```

**データフロー**:
```
composables/useWeeklyBoard.ts
  ├── state: selectedWeek
  ├── state: selectedDepartment
  ├── action: fetchWeeklyBoard()
  └── action: changeWeek()
```

#### 3-2. サイネージ表示ページ

**機能差分**:
| 機能 | 管理画面版 | サイネージ版 |
|-----|----------|------------|
| レイアウト | ヘッダー・サイドバーあり | フルスクリーンのみ |
| 週切り替え | 手動操作 | 自動（表示のみ） |
| 部門フィルタ | 選択可能 | 固定（URL パラメータ） |
| リロード | 手動 | 5分ごと自動 |

---

### 4. アクセス権限マトリクス

**権限レベル別アクセス可能ページ**:
- Level 1（一般）: 閲覧のみ
- Level 3（リーダー）: 部署内編集
- Level 5（管理者）: 全権限

---

### 5. 共通レイアウト

#### OrgLayout（認証済み管理画面）
- ヘッダー + サイドバー + メインコンテンツ
- ナビゲーション: ダッシュボード / 週間ボード / 予定 / 社員 / 設定

#### EmptyLayout（サイネージ表示）
- メインコンテンツのみ（フルスクリーン）

---

### 6. レスポンシブ対応方針

**デバイス別優先度**:
- PC（1920x1080）: 🎯 最優先（サイネージ）
- タブレット（横）: ✅ 対応（管理者確認用）
- スマホ: ⚠️ 最低限（横スクロール）

---

### 7. 状態管理（Pinia Store）

**Store 構成**:
```typescript
// stores/weeklyBoard.ts
export const useWeeklyBoardStore = defineStore('weeklyBoard', {
  state: () => ({
    selectedWeek: new Date(),
    selectedDepartment: 'all',
    schedules: [],
    loading: false,
    error: null
  }),
  getters: { ... },
  actions: { ... }
});
```

---

### 8. 実装優先順位（Phase 0）

#### Sprint 1 Week 2（フロントエンド開始）
1. 共通レイアウト（`layouts/OrgLayout.vue`）
2. 週間ボードページ（`pages/org/[slug]/weekly-board.vue`）
3. 週間ボードコンポーネント（`components/genba/WeeklyScheduleBoard.vue`）
4. スケジュールセル（`components/genba/ScheduleCell.vue`）
5. 週ナビゲーター（`components/genba/WeekNavigator.vue`）
6. 部門フィルタ（`components/genba/DepartmentFilter.vue`）

#### Sprint 1 Week 3（サイネージ対応）
7. サイネージ表示（`pages/org/[slug]/weekly-board.vue` を `?fullscreen=true` で切替）
8. 自動リロード機能（`composables/useAutoReload.ts`）
9. Socket.IO 統合（`plugins/socket.io.client.ts`）

---

### 9. API エンドポイント対応表

| ページ | 使用API | メソッド |
|-------|---------|---------|
| `/org/[slug]/weekly-board` | `/api/schedules/weekly-board` | GET |
| `/org/[slug]/weekly-board?fullscreen=true` | `/api/schedules/weekly-board` | GET |
| `/org/[slug]/schedules/new` | `/api/schedules` | POST |
| `/org/[slug]/schedules/[id]` | `/api/schedules/:id` | GET, PUT, DELETE |

---

### 10. ページ実装状況トラッキング

**Phase 0 実装進捗**:
| ページ | URL | 実装状況 |
|-------|-----|---------|
| ログイン | `/login` | ⬜️ 未実装 |
| ダッシュボード | `/org/[slug]/dashboard` | ⬜️ 未実装 |
| 週間ボード | `/org/[slug]/weekly-board` | ⬜️ 未実装 |
| スケジュール一覧 | `/org/[slug]/schedules` | ⬜️ 未実装 |
| サイネージ表示 | `/org/[slug]/weekly-board?fullscreen=true` | ⬜️ 未実装（設計） |

---

## 🔗 相互参照の整備

### 更新したドキュメント

1. **`docs/INDEX_WEAK_CURRENT.md`**
   - UI・ルーティング設計を追加
   - セクション「2️⃣ Phase 0 詳細仕様」に追記

2. **`docs/SSOT_GENBA_WEEK.md`**
   - 関連ドキュメントにリンク追加

3. **`docs/phase0_weak_current_spec.md`**
   - 関連ドキュメントにリンク追加

4. **`docs/phase0_architecture.md`**
   - 関連ドキュメントにリンク追加

---

## ✅ 達成したこと

### 1. 全体像の可視化

✅ **Phase 0 で実装すべき全ページを一覧化**
- 公開ページ: 4ページ
- 認証済みページ: 10ページ（管理画面）
- サイネージ表示: 2ページ
- 合計: 16ページ

✅ **ページ間の遷移関係を図示**
- Mermaid 形式でフローチャート作成
- シーケンス図で詳細な遷移を表現

---

### 2. 実装ガイドの提供

✅ **コンポーネント階層を明示**
- 週間ボードの6つのコンポーネント
- サイネージ表示の再利用設計

✅ **実装優先順位を定義**
- Sprint 1 Week 2: 基本UI（6項目）
- Sprint 1 Week 3: サイネージ対応（3項目）

---

### 3. アクセス制御の明確化

✅ **権限レベル別アクセスマトリクス**
- Level 1〜5 の権限を明示
- 各ページの必要権限を定義

---

### 4. 相互参照の整備

✅ **ドキュメント間のリンクを整備**
- SSOT → UI設計
- 詳細仕様 → UI設計
- アーキテクチャ → UI設計
- INDEX → UI設計

---

## 🎯 このドキュメントの使い方

### フロントエンド実装時

1. **まず `UI_ROUTING_MAP.md` を読む**
   - 全体像を把握
   - 実装優先順位を確認

2. **SSOT と詳細仕様を参照**
   - `SSOT_GENBA_WEEK.md` で要件確認
   - `phase0_weak_current_spec.md` で詳細確認

3. **コンポーネント階層に沿って実装**
   - 共通レイアウト → ページ → コンポーネント

4. **実装状況トラッキング表を更新**
   - ⬜️ → 🟨 → ✅ → ✅✅

---

### 設計レビュー時

1. **URL構造の妥当性を確認**
   - マルチテナント境界（`/org/[slug]/`）
   - RESTful な設計

2. **ページ遷移の自然さを確認**
   - ユーザーの動線
   - 不要な遷移がないか

3. **アクセス権限の適切性を確認**
   - 一般ユーザーが見るべきページ
   - 管理者のみのページ

---

## 📈 次のアクション

### 実装AI・フロントエンド開発者へ

1. **`UI_ROUTING_MAP.md` を精読**
2. **Sprint 1 Week 2 の実装開始**
   - `layouts/OrgLayout.vue` から着手
   - `pages/org/[slug]/weekly-board.vue` を実装
3. **実装状況トラッキング表を随時更新**

---

### 設計AI（私）の次のタスク

- ✅ UI・ルーティング設計完成
- ⬜️ コンポーネント仕様書作成（必要に応じて）
- ⬜️ デザインシステム詳細化（Phase 1）

---

## 🔗 関連ドキュメント

### 作成したドキュメント
- **`docs/UI_ROUTING_MAP.md`** - UI・ルーティング設計（本体）

### 参照したドキュメント
- `docs/SSOT_GENBA_WEEK.md` - 設計SSOT
- `docs/phase0_weak_current_spec.md` - 詳細仕様
- `docs/phase0_architecture.md` - アーキテクチャ設計

### 更新したドキュメント
- `docs/INDEX_WEAK_CURRENT.md` - ドキュメント索引
- `docs/SSOT_GENBA_WEEK.md` - 関連リンク追加
- `docs/phase0_weak_current_spec.md` - 関連リンク追加
- `docs/phase0_architecture.md` - 関連リンク追加

---

**設計AIより**: フロントエンド実装の準備が整いました。実装AIまたは開発者は、`UI_ROUTING_MAP.md` を起点に実装を開始してください。

---

## ⚠️ 現状注記（重要）

本リポジトリには `pages/` や `nuxt.config.ts` が存在せず、Nuxtフロントエンド層は未作成です。
したがって本レポートの「ページ/コンポーネント」は **将来のNuxt実装（別ブランチ/別repo想定）の設計**を指します。
詳細は `docs/UI_ROUTING_MAP.md` v3.1 の「重要な前提」を参照してください。

