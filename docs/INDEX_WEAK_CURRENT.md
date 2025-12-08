# ミエルボード for 現場 / 現場WEEK - ドキュメント索引

**最終更新**: 2025-12-07

---

## 📋 目的

このドキュメントは、**「ミエルボード for 現場 / 現場WEEK」プロジェクトのすべてのドキュメント** を体系的に整理し、読む順序を明確にします。

---

## 🎯 ドキュメント全体構造

```
docs/
├── 1. SSOT（設計の唯一の正）
│   └── SSOT_GENBA_WEEK.md ⭐️ 最優先で読む
│
├── 2. Phase 0 詳細仕様
│   ├── phase0_weak_current_spec.md
│   └── phase0_architecture.md
│
├── 3. 品質管理・開発ルール
│   ├── QUALITY_MANAGEMENT_OVERVIEW.md
│   ├── TEST_STRATEGY.md
│   ├── BRANCH_AND_RELEASE.md
│   ├── DONE_DEFINITION.md
│   ├── GITHUB_SETUP_GUIDE.md
│   └── TAG_COMMANDS.md 🏷️ タグ方式コマンド（NEW）
│
├── 4. セットアップ・完了レポート
│   └── DEVELOPMENT_RULES_PACK_COMPLETE.md
│
└── 5. 索引（本ドキュメント）
    └── INDEX_WEAK_CURRENT.md
```

---

## 📚 カテゴリ別ドキュメント一覧

### 1️⃣ SSOT（Single Source of Truth）

#### ⭐️ `SSOT_GENBA_WEEK.md` - **最優先**

**対象**: 設計AI、実装AI、開発者全員

**内容**:
- プロジェクトのゴール・ターゲット
- 現場WEEK の機能スコープ
- アーキテクチャ・技術スタック
- データモデル・API仕様
- 品質管理ルール
- Phase 1 以降の拡張方針

**読むタイミング**: プロジェクトに参加したら最初に読む

---

### 2️⃣ Phase 0 詳細仕様

#### `phase0_weak_current_spec.md` - 詳細仕様書

**対象**: 実装AI、フロントエンド開発者

**内容**:
- 画面レイアウト詳細
- UI/UX仕様
- コンポーネント構成
- API エンドポイント詳細
- データフロー

**読むタイミング**: 実装開始前

---

#### `phase0_architecture.md` - アーキテクチャ設計

**対象**: バックエンド開発者、インフラ担当

**内容**:
- システム構成図
- データフロー図
- セキュリティ設計
- スケーラビリティ設計
- 既存システムとの統合

**読むタイミング**: 設計レビュー時

---

### 3️⃣ 品質管理・開発ルール

#### `QUALITY_MANAGEMENT_OVERVIEW.md` - 品質管理の全体像

**対象**: 開発者全員、PM

**内容**:
- 3層品質ゲート（AI制御 / GitHub / 開発ルール）
- 禁止パターン
- 開発フロー
- 関連ドキュメントへのリンク

**読むタイミング**: プロジェクト開始時

---

#### `TEST_STRATEGY.md` - テスト戦略

**対象**: 開発者全員、QA

**内容**:
- 必ずテストを書く層（認証・マルチテナント・金銭計算）
- ユニット・統合・E2Eテストの方針
- テストファイル配置ルール
- 段階的導入プラン

**読むタイミング**: 実装開始前、テスト作成時

---

#### `BRANCH_AND_RELEASE.md` - ブランチ・リリース戦略

**対象**: 開発者全員、DevOps

**内容**:
- ブランチ種別（main / develop / feature/* / hotfix/*）
- リリースフロー（Semantic Versioning）
- CI/CD連携（将来）

**読むタイミング**: ブランチ作成時、リリース時

---

#### `DONE_DEFINITION.md` - 完了の定義（DoD）

**対象**: 開発者全員

**内容**:
- 「Done」の8項目基準
- DoDチェックリスト
- 「Done」とみなさない例

**読むタイミング**: PR作成前

---

#### `GITHUB_SETUP_GUIDE.md` - GitHub設定手順

**対象**: PM、DevOps

**内容**:
- 保護ブランチ設定
- 必須ステータスチェック
- 動作確認手順

**読むタイミング**: リポジトリセットアップ時

---

#### 🏷️ `TAG_COMMANDS.md` - タグ方式コマンド（NEW）

**対象**: 設計AI、実装AI、開発者全員

**内容**:
- タグ方式とは何か
- 全6タグの詳細仕様
  - `>> write` - SSOT新規作成
  - `>> impl` - SSOT実装
  - `>> fix` - バグ修正
  - `>> rfv` - SSOT実装検証
  - `>> next` - 次タスク選定
  - `>> prmt` - プロンプト生成
- 運用ルール
- フェーズ別使用例

**読むタイミング**: AI駆動開発を始める前

---

### 4️⃣ セットアップ・完了レポート

#### `DEVELOPMENT_RULES_PACK_COMPLETE.md` - 開発ルールパック完了レポート

**対象**: PM、ステークホルダー

**内容**:
- 実装完了サマリー
- 3層品質ゲートの効果
- 次のステップ
- ファイル構成

**読むタイミング**: プロジェクト完了時、レビュー時

---

### 5️⃣ 索引

#### `INDEX_WEAK_CURRENT.md` - 本ドキュメント

**対象**: 全員

**内容**:
- ドキュメント一覧
- 読む順序
- 対象者別おすすめ

---

## 🎓 役割別おすすめ読む順序

### 🔰 新規参加者（開発者）

1. `SSOT_GENBA_WEEK.md` - **必読**
2. `TAG_COMMANDS.md` - **タグ方式の理解**
3. `QUALITY_MANAGEMENT_OVERVIEW.md`
4. `DONE_DEFINITION.md`
5. `TEST_STRATEGY.md`
6. `BRANCH_AND_RELEASE.md`
7. `phase0_weak_current_spec.md`（実装開始時）

---

### 🎨 フロントエンド開発者

1. `SSOT_GENBA_WEEK.md`
2. `phase0_weak_current_spec.md`
3. `TEST_STRATEGY.md`
4. `DONE_DEFINITION.md`

---

### ⚙️ バックエンド開発者

1. `SSOT_GENBA_WEEK.md`
2. `phase0_architecture.md`
3. `TEST_STRATEGY.md`
4. `DONE_DEFINITION.md`

---

### 🤖 設計AI / 実装AI

1. `SSOT_GENBA_WEEK.md` - **最優先**
2. `.cursorrules` - **タグコマンドを含む**
3. `TAG_COMMANDS.md` - **タグ方式の詳細**
4. `QUALITY_MANAGEMENT_OVERVIEW.md`
5. `DONE_DEFINITION.md`
6. `TEST_STRATEGY.md`
7. 実装対象に応じた詳細仕様

---

### 👔 PM / ステークホルダー

1. `SSOT_GENBA_WEEK.md`
2. `DEVELOPMENT_RULES_PACK_COMPLETE.md`
3. `QUALITY_MANAGEMENT_OVERVIEW.md`

---

## 📖 ドキュメント作成・更新ルール

### 作成ルール

1. **新しいドキュメントを作成したら、この INDEX に追記する**
2. **SSOT と矛盾する内容は書かない**
3. **仕様変更があれば、まず SSOT を更新してから詳細仕様を更新**

---

### 更新ルール

1. **ドキュメントの最終更新日を必ず記載**
2. **変更履歴が重要な場合は、ドキュメント内に記載**
3. **削除した場合は、INDEX から削除（アーカイブする場合はその旨を記載）**

---

## 🔗 外部リンク・関連リソース

### GitHub
- `.cursorrules` - AI駆動開発ルール
- `.github/PULL_REQUEST_TEMPLATE.md` - PRテンプレート
- `.github/workflows/ci.yml` - CI/CD設定

### Plane（プロジェクト管理）
- https://plane.arrowsworks.com/co/projects/WBS

---

## ✅ ドキュメント整備状況

| ドキュメント | 状態 | 最終更新 |
|-------------|------|---------|
| `SSOT_GENBA_WEEK.md` | ✅ 完成 | 2025-12-07 |
| `INDEX_WEAK_CURRENT.md` | ✅ 完成 | 2025-12-07 |
| `QUALITY_MANAGEMENT_OVERVIEW.md` | ✅ 完成 | 2025-12-07 |
| `TEST_STRATEGY.md` | ✅ 完成 | 2025-12-07 |
| `BRANCH_AND_RELEASE.md` | ✅ 完成 | 2025-12-07 |
| `DONE_DEFINITION.md` | ✅ 完成 | 2025-12-07 |
| `GITHUB_SETUP_GUIDE.md` | ✅ 完成 | 2025-12-07 |
| `DEVELOPMENT_RULES_PACK_COMPLETE.md` | ✅ 完成 | 2025-12-07 |
| `TAG_COMMANDS.md` | ✅ 完成 | 2025-12-07 |
| `phase0_weak_current_spec.md` | ✅ 完成 | 2025-12-07 |
| `phase0_architecture.md` | ✅ 完成 | 2025-12-07 |

---

**このINDEXは、プロジェクトの成長とともに更新されます。**

