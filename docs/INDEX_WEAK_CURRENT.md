# ミエルプラス - ドキュメント索引

**最終更新**: 2026-01-03

---

## 📋 目的

このドキュメントは、**「ミエルボード for 現場」プロジェクトのすべてのドキュメント** を体系的に整理し、読む順序を明確にします。

---

## 🎯 ドキュメント全体構造

```
docs/
├── 0. プロダクトビジョン ⭐️ 最初に読む
│   └── PRODUCT_VISION.md 🎯 全体像・ミッション・ロードマップ
│
├── 1. SSOT（設計の唯一の正）
│   ├── SSOT_GENBA_WEEK.md ⭐️ ミエルボード詳細仕様
│   ├── SSOT_MVP_EXTEND.md 🔧 MVP拡張機能（ソフトデリート/LEADER権限/サイネージ/モバイル）
│   ├── SSOT_MEETING_SCHEDULER.md 📅 AI日程調整機能
│   ├── SSOT_APP_HEADER.md 🎨 共通ヘッダー・設定メニュー
│   ├── SSOT_CALENDAR_SYNC.md 📅 Googleカレンダー連携
│   ├── SSOT_PRICING.md 💰 統一料金体系
│   ├── SSOT_MARKETING.md 📈 マーケティング戦略
│   ├── SSOT_BRAND.md 🎨 ブランドガイドライン
│   ├── SSOT_EXIT_STRATEGY.md 🚀 EXIT戦略・M&A（ANDPAD/freeeデュアルターゲット）
│   └── SSOT_MIEL_FILE.md 📁 ミエルファイル詳細仕様（変更検知・履歴特化）
│
├── 2. Phase 0 詳細仕様
│   ├── phase0_weak_current_spec.md
│   ├── phase0_architecture.md
│   └── UI_ROUTING_MAP.md 🗺️ UI・ルーティング設計
│
├── 3. 品質管理・開発ルール
│   ├── QUALITY_MANAGEMENT_OVERVIEW.md
│   ├── TEST_STRATEGY.md
│   ├── BRANCH_AND_RELEASE.md
│   ├── DONE_DEFINITION.md
│   ├── GITHUB_SETUP_GUIDE.md
│
├── 4. AI役割分担システム 🤖 （NEW）
│   └── AI_ROLES/STRATEGIC_CONTEXT_PROMPT.md - 戦略コンテキスト（初回共有）
│
├── 5. セットアップ・完了レポート
│   └── DEVELOPMENT_RULES_PACK_COMPLETE.md
│
└── 6. 索引（本ドキュメント）
    └── INDEX_WEAK_CURRENT.md
```

---

## 📚 カテゴリ別ドキュメント一覧

### 1️⃣ SSOT（Single Source of Truth）

#### ⭐️ `SSOT_GENBA_WEEK.md` - **最優先**

**対象**: 設計AI、実装AI、開発者全員

**内容**:
- プロジェクトのゴール・ターゲット
- ミエルボード の機能スコープ
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

#### 🗺️ `UI_ROUTING_MAP.md` - UI・ルーティング設計 **（v3.1）**

**対象**: フロントエンド開発者、実装AI

**内容**:
- 全ページのURL一覧・役割・アクセス権限
- ページ遷移図（Mermaid）
- UI構成要素マップ（コンポーネント階層）
- 画面実装優先順位
- API エンドポイント対応表

**読むタイミング**: フロントエンド実装開始前

**⚠️ 重要**: このドキュメントは **Nuxt 3 UIの設計書** です。  
現在は `pages/`, `components/`, `nuxt.config.ts` は存在しますが、設計書の内容と実装はズレ得るため、実装時は差分を都度レビューしてください。

**特徴**:
- SSOT と仕様書から抽出した「作るべき画面」の全体像
- ページ間の遷移関係を可視化
- 実装状況トラッキング機能

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

#### `GITHUB_OPERATIONS_GUIDE.md` - GitHub操作ガイド（NEW）

**対象**: 管理AI、開発者全員

**内容**:
- GitHub CLI (`gh`) の使い方
- PRマージ操作（Squash/Merge/Rebase）
- PRレビュー操作（承認/差し戻し/コメント）
- ブランチ操作
- リリースタグ作成
- 管理AIの制約と対処方法

**読むタイミング**: PRマージ時、GitHub操作が必要な時

---

### 4️⃣ AI役割分担システム 🤖

#### 🚀 `AI_ROLES/STRATEGIC_CONTEXT_PROMPT.md` - 戦略コンテキスト（NEW）

**対象**: 設計AI・管理AI

**内容**:
- M&A EXIT戦略（3年10億円、ANDPAD/freeeデュアルターゲット）
- ブランド体系（ミエルシリーズ、USP）
- 開発優先順位（デュアルターゲット最適化）
- 料金体系・ターゲット顧客・パートナー制度
- 設計判断の優先順位・チェックリスト
- 3年間のマイルストーン

**使い方**: 設計AI・管理AIチャットで、役割プロンプトの次に読み込ませる

---

**補足（現状）**: `AI_ROLES/` 配下には現在 `STRATEGIC_CONTEXT_PROMPT.md` のみ存在します。  
役割別プロンプト（設計AI/管理AI/実装AI/監査AI）を追加する場合は、必要になったタイミングで作成し、このINDEXに追記します。

---

### 5️⃣ セットアップ・完了レポート

#### `DEVELOPMENT_RULES_PACK_COMPLETE.md` - 開発ルールパック完了レポート

**対象**: PM、ステークホルダー

**内容**:
- 実装完了サマリー
- 3層品質ゲートの効果
- 次のステップ
- ファイル構成

**読むタイミング**: プロジェクト完了時、レビュー時

---

### 6️⃣ 索引

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
2. `QUALITY_MANAGEMENT_OVERVIEW.md`
3. `DONE_DEFINITION.md`
4. `TEST_STRATEGY.md`
5. `BRANCH_AND_RELEASE.md`
6. `phase0_weak_current_spec.md`（実装開始時）

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

### 🎨 設計AI

1. `AI_ROLES/STRATEGIC_CONTEXT_PROMPT.md` - **戦略コンテキスト**
2. `SSOT_GENBA_WEEK.md` - **メインSSOT**
3. `.cursorrules` - **開発ルール**
4. `QUALITY_MANAGEMENT_OVERVIEW.md`
5. `DONE_DEFINITION.md`
6. `TEST_STRATEGY.md`

---

### 🛠️ 実装AI

1. `AI_ROLES/STRATEGIC_CONTEXT_PROMPT.md`（必要なら）
2. 実装対象のSSOT（例: `SSOT_GENBA_WEEK.md`）
3. `.cursorrules` - **開発ルール**
4. `TEST_STRATEGY.md` - **テスト戦略**
5. `DONE_DEFINITION.md`
6. 実装対象に応じた詳細仕様

---

### 👔 管理AI（あなた自身）

1. `AI_ROLES/STRATEGIC_CONTEXT_PROMPT.md`（必要なら）
2. `QUALITY_MANAGEMENT_OVERVIEW.md` - **品質管理の全体像**
3. `DONE_DEFINITION.md` - **完了の定義**
4. `BRANCH_AND_RELEASE.md` - **ブランチ戦略**
5. `.github/PULL_REQUEST_TEMPLATE.md` - **PRテンプレート**

---

### 🔍 監査AI

1. `AI_ROLES/STRATEGIC_CONTEXT_PROMPT.md`（必要なら）
2. `QUALITY_MANAGEMENT_OVERVIEW.md` - **品質管理の全体像**
3. `DONE_DEFINITION.md` - **完了の定義**
4. `.cursorrules` - **禁止事項確認**
5. `TEST_STRATEGY.md` - **テスト戦略**

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
| `SSOT_GENBA_WEEK.md` | ✅ 完成 | 2024-12-07 |
| `SSOT_MVP_EXTEND.md` | ✅ 完成 | 2026-01-28 |
| `SSOT_MEETING_SCHEDULER.md` | ✅ 完成 | 2026-01-28 |
| `SSOT_APP_HEADER.md` | ✅ 実装済み | 2026-01-23 |
| `SSOT_CALENDAR_SYNC.md` | ✅ 実装済み | 2026-01-23 |
| `SSOT_PRICING.md` | ✅ 完成 | 2026-01-02 |
| `SSOT_MARKETING.md` | ✅ 完成 | 2026-01-02 |
| `SSOT_BRAND.md` | ✅ 完成 | 2026-01-02 |
| `SSOT_EXIT_STRATEGY.md` | ✅ 完成 | 2026-01-03 |
| `SSOT_MIEL_FILE.md` | ✅ 完成 | 2026-01-03 |
| `INDEX_WEAK_CURRENT.md` | ✅ 完成 | 2025-12-07 |
| `QUALITY_MANAGEMENT_OVERVIEW.md` | ✅ 完成 | 2025-12-07 |
| `TEST_STRATEGY.md` | ✅ 完成 | 2025-12-07 |
| `BRANCH_AND_RELEASE.md` | ✅ 完成 | 2025-12-07 |
| `DONE_DEFINITION.md` | ✅ 完成 | 2025-12-07 |
| `GITHUB_SETUP_GUIDE.md` | ✅ 完成 | 2025-12-07 |
| `DEVELOPMENT_RULES_PACK_COMPLETE.md` | ✅ 完成 | 2025-12-07 |
| `GITHUB_OPERATIONS_GUIDE.md` | ✅ 完成 | 2025-01-10 |
| `AI_ROLES/STRATEGIC_CONTEXT_PROMPT.md` | ✅ 完成 | 2026-01-03 |
| `phase0_weak_current_spec.md` | ✅ 完成 | 2025-12-07 |
| `phase0_architecture.md` | ✅ 完成 | 2025-12-07 |

---

**このINDEXは、プロジェクトの成長とともに更新されます。**

