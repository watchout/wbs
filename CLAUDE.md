# CLAUDE.md - プロジェクト指示書（Claude Code用）

> Claude Code はこのファイルを自動で読み込みます。
> プロジェクトの全仕様書は docs/ にあります。
> Cursor 用のガードレールは .cursorrules を参照してください。

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
1. PRD（プロダクト要件）   → docs/ssot/SSOT-0_PRD.md
2. 機能台帳               → docs/ssot/SSOT-1_FEATURE_CATALOG.md
3. コア定義（横断ルール） → docs/core/
   - UI/画面・状態遷移    → docs/core/SSOT-2_UI_STATE.md
   - API契約              → docs/core/SSOT-3_API_CONTRACT.md
   - データモデル規約      → docs/core/SSOT-4_DATA_MODEL.md
   - 横断的関心事          → docs/core/SSOT-5_CROSS_CUTTING.md
4. 個別機能仕様           → docs/SSOT_*.md（既存形式）
   - スケジュールボード   → docs/SSOT_GENBA_WEEK.md
   - カレンダー連携       → docs/SSOT_CALENDAR_SYNC.md
   - AI日程調整           → docs/SSOT_MEETING_SCHEDULER.md
   - 共通ヘッダー・設定   → docs/SSOT_APP_HEADER.md
   - MVP拡張              → docs/SSOT_MVP_EXTEND.md
   - UIナビゲーション     → docs/SSOT_UI_NAVIGATION.md
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
5. テスト
   - npm run typecheck 必須
   - npm run test 必須
6. 仕様書のテストケース / 受入条件で検証
```

---

## ディレクトリ構造

```
/                              ← Nuxt 3 ルート
├── CLAUDE.md                  ← 本ファイル（Claude Code 用）
├── .cursorrules               ← ガードレール（Cursor 用）
├── openapi.yaml               ← API仕様
├── prisma/
│   ├── schema.prisma          ← データモデル定義
│   ├── seed.ts                ← シードデータ
│   └── migrations/            ← マイグレーション履歴
├── docs/
│   ├── ssot/                  ← SSOT階層（ai-dev-framework v3.0 準拠）
│   │   ├── SSOT-0_PRD.md
│   │   └── SSOT-1_FEATURE_CATALOG.md
│   ├── core/                  ← コア定義（横断ルール）
│   │   ├── SSOT-2_UI_STATE.md
│   │   ├── SSOT-3_API_CONTRACT.md
│   │   ├── SSOT-4_DATA_MODEL.md
│   │   └── SSOT-5_CROSS_CUTTING.md
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
└── tests/                     ← テスト
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

### 現在のPhase: Phase 0
- main 直接 push: 許可
- PR/レビュー: 任意
- スピード優先、MVP検証に集中

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
# 機能実装
# → まず SSOT_*.md を読んでから実装

# テスト実行
npm run typecheck && npm run test

# DB マイグレーション
npx prisma migrate dev --name <変更内容>

# シード実行
npx prisma db seed

# 開発サーバー起動
npm run dev
```
