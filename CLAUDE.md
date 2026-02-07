# CLAUDE.md - プロジェクト指示書（v3.3）

> Claude Code CLI / Web が自動で読み込むプロジェクト指示書です。
> プロジェクトの全仕様書は docs/ にあります。
> 開発ツールチェーン定義: docs/standards/09_TOOLCHAIN.md

---

## ツール体制（4ツール）

本プロジェクトでは以下の4ツールを併用する。
「Claude Code」単独表記は禁止し、必ず修飾子をつけること。

| ツール | 用途 | 制約 |
|--------|------|------|
| **Claude.ai** | 思考・設計・壁打ち。コード実行不可 | claude.ai |
| **Claude Code CLI** | 対話型の実装・デバッグ・環境構築 | ターミナル閉じると停止 |
| **Claude Code Web** | 仕様確定済みタスクの非同期実行 | PCを閉じても継続、完了時に自動PR作成 |
| **Cursor** | IDE補助（コード編集、Lint確認、ブラウザ確認） | エディタ上の操作 |

### セッション移動

```
CLI → Web: & タスク内容  または  claude --remote "タスク内容"
Web → CLI: /teleport  または  claude --teleport
```

### ツール使い分け

| 場面 | Claude.ai | Claude Code CLI | Claude Code Web | Cursor |
|------|-----------|----------------|----------------|--------|
| アイデア壁打ち・設計相談 | **メイン** | | | |
| 仕様書の対話的作成 | **メイン** | | | |
| 仕様書のファイル生成 | | **メイン** | | |
| 対話型のコーディング | | **メイン** | | |
| デバッグ（原因調査） | | **メイン** | | サブ |
| 環境構築・CI/CD設定 | | **メイン** | | |
| DB マイグレーション | | **メイン** | | |
| 機能実装（仕様確定済） | | サブ | **メイン** | |
| テスト生成 | | | **メイン** | |
| 一括リファクタリング | | | **メイン** | |
| コードレビュー | | | **メイン** | サブ |
| バグ修正（原因明確） | | | **メイン** | |
| 複数タスク並列実行 | | | **メイン** | |
| コード編集・Lint確認 | | | | **メイン** |
| ブラウザUI確認 | | | | **メイン** |

### 連携フロー

```
1. Claude.ai: 仕様の壁打ち・設計判断
2. Claude Code CLI: プロジェクト初期構築、対話的な実装
3. Claude Code Web: 仕様確定済みタスクを並列送信
   & "SSOT_*.md を読んでXXX機能を実装して"
   → クラウドで非同期実行 → 完了後に自動PR作成
4. Cursor: IDE上でのコード編集、Lint確認、ブラウザ確認
5. レビュー → マージ
```

### 並列実行のルール

```
並列OK:
  - 異なるSSOTの機能を実装する場合
  - 異なるファイルを変更する場合

直列必須:
  - 同じファイルを変更する可能性がある場合
  - DB マイグレーションを含む場合
  - 依存関係がある機能同士
```

### 禁止事項

- ローカルコミットのまま引き継がない（push → pull で同期必須）
- Claude Code CLI / Web がコードの設計判断をしない（実行に徹する）
- Cursor で重いシェルコマンド（migrate reset, npm ci 等）を実行しない

---

## AI中断プロトコル（最優先ルール）

以下の場合、即座に作業を中断しユーザーに質問すること:

1. **T1**: SSOTに記載がない仕様判断が必要な時
2. **T2**: SSOTの記載が曖昧で複数解釈が可能な時
3. **T3**: 技術的な選択肢が複数あり判断できない時
4. **T4**: SSOTと既存実装が矛盾している時
5. **T5**: 制約・規約に未定義のケースに遭遇した時
6. **T6**: 変更の影響範囲が判断できない時
7. **T7**: ビジネス判断が必要な時

「推測で進める」「とりあえず仮で」は禁止。

---

## プロジェクト概要

| 項目 | 内容 |
|------|------|
| プロダクト名 | ミエルボード for 現場（MielBoard for Jobsites） |
| 概要 | 弱電・電気工事会社向け現場業務DXプラットフォーム。ホワイトボード文化をリアルタイムサイネージ+AI日程調整で置換 |
| 技術スタック | Nuxt 3 / Vue 3 / Prisma ORM / PostgreSQL / Socket.IO / TypeScript |
| リポジトリ | https://github.com/watchout/wbs |

---

## 最重要ルール

```
1. 仕様書がない機能は実装しない
2. 実装前に必ず該当の仕様書を読む
3. 仕様と実装の乖離を見つけたら報告する
4. 生SQL（$queryRaw / $executeRaw）は禁止 → Prisma ORM のみ
5. 全データクエリに organizationId スコープ必須
6. 認証は requireAuth() を使用（JWT直接デコード禁止）
```

---

## 仕様書の参照方法

### 実装前に必ず確認するドキュメント（優先順）

```
0. フレームワーク標準     → docs/standards/
   - マスターガイド       → docs/standards/00_MASTER_GUIDE.md
   - ツールチェーン定義   → docs/standards/09_TOOLCHAIN.md
   - SSOT 12セクション形式 → docs/standards/12_SSOT_FORMAT.md
   - ビジュアルテスト     → docs/standards/20_VISUAL_TEST.md
   - AIエスカレーション    → docs/standards/21_AI_ESCALATION.md
1. PRD（プロダクト要件）   → docs/ssot/SSOT-0_PRD.md [CORE]
2. 機能台帳               → docs/ssot/SSOT-1_FEATURE_CATALOG.md [CORE]
3. コア定義（横断ルール） → docs/core/ [CONTRACT]
   - UI/画面・状態遷移    → docs/core/SSOT-2_UI_STATE.md
   - API契約              → docs/core/SSOT-3_API_CONTRACT.md
   - データモデル規約      → docs/core/SSOT-4_DATA_MODEL.md
   - 横断的関心事          → docs/core/SSOT-5_CROSS_CUTTING.md
4. 個別機能仕様           → docs/SSOT_*.md [DETAIL]
   - スケジュールボード   → docs/SSOT_GENBA_WEEK.md
   - カレンダー連携       → docs/SSOT_CALENDAR_SYNC.md
   - AI日程調整           → docs/SSOT_MEETING_SCHEDULER.md
   - 共通ヘッダー・設定   → docs/SSOT_APP_HEADER.md
   - MVP拡張              → docs/SSOT_MVP_EXTEND.md
   - UIナビゲーション     → docs/SSOT_UI_NAVIGATION.md
   - Stripe決済統合       → docs/SSOT_BILLING.md
   - 料金体系             → docs/SSOT_PRICING.md
5. API仕様               → openapi.yaml
6. データモデル           → prisma/schema.prisma
7. 品質・運用             → docs/DONE_DEFINITION.md
                           → docs/TEST_STRATEGY.md
                           → docs/BRANCH_AND_RELEASE.md
```

### 機能を実装する時のフロー

```
1. SSOT-1_FEATURE_CATALOG.md で対象機能IDと受入条件を確認
2. 対応する SSOT_*.md を最後まで読む
3. コア定義を確認
   - API設計 → SSOT-3_API_CONTRACT.md
   - DB設計 → SSOT-4_DATA_MODEL.md
   - 認証/エラー/ログ → SSOT-5_CROSS_CUTTING.md
4. 実装
   - .cursorrules のガードレールに従う
   - organizationId スコープ必須
   - requireAuth() 使用必須
5. テスト（★ 省略禁止 ★）
   - npm run typecheck → 必ず実行、エラー0で通過
   - npm run test → 必ず実行、全テスト通過
   - 新規 API には統合テストを追加（TEST_STRATEGY.md 参照）
6. ブラウザ確認（★ 省略禁止 ★）
   - 実装した画面を実際にブラウザで開いて動作確認
   - コンソールエラーがないことを確認
   - 20_VISUAL_TEST.md の Level 1 を満たすこと
7. 仕様書のテストケース / 受入条件で検証

### ★ テスト省略時の処理 ★

Step 5-6 を省略した場合、その実装は「未完了」とみなす。
DoD（docs/DONE_DEFINITION.md）の Level 2 基準を満たさない PR は
マージ禁止とする。
```

---

## 機能実装の実行方法

### 仕様確定済みのタスク → Claude Code Web

```bash
# CLIから & プレフィックスで Web セッションを作成
& "docs/SSOT_GENBA_WEEK.md を読んでスケジュール機能を実装して"
& "docs/SSOT_CALENDAR_SYNC.md を読んでカレンダー連携を実装して"

# 進捗確認
/tasks

# 完了したセッションをローカルに取り込む
/teleport
```

### 対話が必要な作業 → Claude Code CLI

```bash
claude "認証基盤の設計について相談しながら実装したい"
claude "デバッグ: ログインAPIが500エラーを返す原因を調査して"
```

### Git 運用（PR 駆動レビューフロー）

```
Claude Code Web のタスク完了
  → 自動PR作成
  → CI通過確認（typecheck, test, forbidden-operations）
  → コードレビュー
  → マージ
```

---

## ディレクトリ構造

```
/                              ← Nuxt 3 ルート
├── CLAUDE.md                  ← 本ファイル（Claude Code CLI / Web 用）
├── .cursorrules               ← ガードレール（Cursor 用）
├── .mcp.json                  ← MCP サーバー設定（Claude Code 用）
├── openapi.yaml               ← API仕様
├── prisma/
│   ├── schema.prisma          ← データモデル定義
│   ├── seed.ts                ← シードデータ
│   └── migrations/            ← マイグレーション履歴
├── docs/
│   ├── ssot/                  ← SSOT階層（ai-dev-framework v3.3 準拠）
│   │   ├── SSOT-0_PRD.md
│   │   └── SSOT-1_FEATURE_CATALOG.md
│   ├── core/                  ← コア定義（横断ルール）
│   │   ├── SSOT-2_UI_STATE.md
│   │   ├── SSOT-3_API_CONTRACT.md
│   │   ├── SSOT-4_DATA_MODEL.md
│   │   └── SSOT-5_CROSS_CUTTING.md
│   ├── standards/             ← フレームワーク標準
│   │   ├── 00_MASTER_GUIDE.md
│   │   ├── 09_TOOLCHAIN.md
│   │   ├── 12_SSOT_FORMAT.md
│   │   ├── 20_VISUAL_TEST.md
│   │   └── 21_AI_ESCALATION.md
│   ├── SSOT_*.md              ← 個別機能仕様（既存形式・維持）
│   ├── PRODUCT_VISION.md      ← プロダクトビジョン
│   ├── DONE_DEFINITION.md     ← 完了の定義
│   └── TEST_STRATEGY.md       ← テスト戦略
├── components/                ← Vue コンポーネント
├── composables/               ← Vue 3 Composables
├── pages/                     ← Nuxt ページ（自動ルーティング）
├── server/
│   ├── api/                   ← APIエンドポイント（自動ルーティング）
│   ├── utils/                 ← サーバーユーティリティ
│   └── plugins/               ← Socket.IO 等
├── middleware/                ← ルートミドルウェア
├── plugins/                   ← クライアントプラグイン
└── tests/
    ├── *.test.ts              ← ユニット/統合テスト
    └── visual/                ← ビジュアルテスト（20_VISUAL_TEST.md 準拠）
        ├── baseline/          ← 基準画像
        ├── current/           ← 最新スクリーンショット
        └── reports/           ← テストレポート
```

---

## 技術スタック

| カテゴリ | 技術 |
|---------|------|
| フレームワーク | Nuxt 3 (v3.14.0) |
| 言語 | TypeScript (strict) |
| DB | PostgreSQL (Prisma ORM v6.0.0) |
| リアルタイム | Socket.IO 4.7.2 |
| 認証 | JWT + Cookie + OAuth2 (Google) |
| ホスティング | ConoHa VPS + Docker + Nginx |
| CSS | Tailwind CSS |
| テスト | Vitest 2.1.0 |
| ビジュアルテスト | Playwright MCP |
| CI/CD | GitHub Actions |

---

## コーディング規約（要約）

### 命名規則
- コンポーネント: PascalCase（`WeeklyScheduleBoard.vue`）
- 関数/変数: camelCase（`handleSubmit`）
- 定数: UPPER_SNAKE_CASE（`MAX_RETRY_COUNT`）
- API ファイル: Nuxt 規約（`index.get.ts`, `[id].patch.ts`）

### 基本原則
- TypeScript strict モード（any 禁止）
- 1ファイル200行以内を目安
- マジックナンバー禁止（定数化する）
- コメントは「なぜ」を書く（「何を」はコードで表現）

---

## Git 運用（要約）

### コミットメッセージ
```
<type>(<scope>): <description>

type: feat | fix | docs | style | refactor | test | chore
scope: 機能ID or モジュール名
```

### 現在のPhase: Phase 1
- main への直接 push: ❌ **絶対禁止**（admin 権限でもバイパス不可）
- 全ての変更は **PR 経由** で実施（例外なし）
- CI 通過必須（typecheck, test, build, forbidden-operations）
- PR マージ前に最低1名のレビュー必須

### Git フロー（必須）

```
1. feature ブランチ作成: git checkout -b feat/<機能名>
2. 実装・コミット（小さく頻繁に）
3. push: git push -u origin HEAD
4. PR 作成: gh pr create --base main
5. CI 通過を確認
6. レビュー・承認
7. マージ（Squash and merge 推奨）
```

**違反チェック**: 以下のコミットパターンは Phase 1 違反
- `git push origin main` → ❌ 禁止
- PR なしのマージコミット → ❌ 禁止
- CI 未通過の PR マージ → ❌ 禁止

---

## 禁止事項

```
1. 生SQL（$queryRaw / $executeRaw でのDDL/DML）
2. organizationId なしのクエリ
3. organizationId ?? 'default' のようなフォールバック
4. 仕様書にない機能を勝手に実装
5. マイグレーションファイルの手動編集
6. スキーマ変更時のマイグレーション漏れ
7. any 型の使用
8. console.log をプロダクションコードに残す
9. 環境変数のハードコード
10. エラーの握りつぶし（必ずハンドリング）
```

---

## マルチテナント必須ルール

```
全てのAPIで:
1. requireAuth() でユーザー認証
2. organizationId でデータをフィルタ
3. 他テナントのデータにアクセスしない

全てのクエリで:
  where: { organizationId: user.organizationId, ... }
```

---

## よくあるタスクの例

```bash
# 機能実装（仕様確定済み → Claude Code Web）
& "SSOT_*.md を読んでXXX機能を実装して"

# 機能実装（対話必要 → Claude Code CLI）
claude "認証基盤の設計について相談しながら実装したい"

# テスト実行
npm run typecheck && npm run test

# DB マイグレーション
npx prisma migrate dev --name <変更内容>

# シード実行
npx prisma db seed

# 開発サーバー起動
npm run dev

# 品質監査
framework audit all
```
