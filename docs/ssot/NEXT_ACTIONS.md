# 次のアクションリスト

> ai-dev-framework v3.0 適用後のアクションプラン
> 作成日: 2026-02-02

---

## 今回の成果物

| # | 成果物 | パス | 状態 |
|---|--------|------|------|
| 1 | ギャップ分析レポート | docs/ssot/GAP_ANALYSIS_REPORT.md | 完了 |
| 2 | SSOT-0 PRD | docs/ssot/SSOT-0_PRD.md | 完了（条件付き合格: 87/100） |
| 3 | SSOT-1 機能台帳 | docs/ssot/SSOT-1_FEATURE_CATALOG.md | 完了（不合格: 81/100 → 改善必要） |
| 4 | SSOT監査レポート | docs/ssot/SSOT_AUDIT_REPORT.md | 完了 |
| 5 | 次のアクションリスト | docs/ssot/NEXT_ACTIONS.md | 本文書 |

---

## Phase A: 即座に実施すべきアクション（1-2日）

### A1. SSOT-0 / SSOT-1 の監査指摘修正

| # | アクション | 対象 | 効果 |
|---|----------|------|------|
| A1-1 | UC→機能IDマッピング列を追加 | SSOT-0 §3 | 追跡可能性 +2点 |
| A1-2 | Goals に MUST/SHOULD を付与 | SSOT-0 §4 | RFC 2119 +3点 |
| A1-3 | 「最小限」→「初期投資 ¥0」に修正 | SSOT-0 §6.2 | 明確性 +1点 |
| A1-4 | 各カテゴリに MUST/SHOULD/MAY 列追加 | SSOT-1 全体 | RFC 2119 +4点 |
| A1-5 | SEC/OPS/ERR に受入条件3-5件追加 | SSOT-1 §9-11 | 完全性 +2点 |
| A1-6 | 標準機能→SSOT_*.md のリンク追加 | SSOT-1 全体 | 追跡可能性 +2点 |

**目標: SSOT-0 → 95点合格、SSOT-1 → 90点条件付き合格**

### A2. CLAUDE.md の作成

| # | アクション | 詳細 |
|---|----------|------|
| A2-1 | CLAUDE.md を wbs ルートに作成 | templates/project/CLAUDE.md をベースに wbs 固有値を設定 |
| A2-2 | AI中断プロトコル（7トリガー）を記載 | 21_AI_ESCALATION.md のルールを組み込み |
| A2-3 | 仕様書参照パスを wbs 構造に合わせる | docs/ssot/, docs/SSOT_*.md への参照 |
| A2-4 | 技術スタックを設定 | Nuxt 3 / Prisma / Socket.IO / PostgreSQL |

---

## Phase B: 早期に実施すべきアクション（1-2週間）

### B1. コア定義の整備（SSOT-2〜5）

| # | ドキュメント | ソース | 内容 |
|---|------------|--------|------|
| B1-1 | docs/core/SSOT-2_UI_STATE.md | UI_ROUTING_MAP.md + SSOT_UI_NAVIGATION.md | 画面一覧、状態遷移、認証状態（S0-S4）定義 |
| B1-2 | docs/core/SSOT-3_API_CONTRACT.md | openapi.yaml + server/api/ | API共通規約（レスポンス形式、エラーコード体系、認証方式） |
| B1-3 | docs/core/SSOT-4_DATA_MODEL.md | prisma/schema.prisma | データモデル規約（命名規則、マルチテナント、ソフトデリート） |
| B1-4 | docs/core/SSOT-5_CROSS_CUTTING.md | .cursorrules + DONE_DEFINITION.md | 認証・エラー・ログの横断ルール |

### B2. 既存SSOTのフレームワーク形式への変換（パイロット）

**推奨: SSOT_CALENDAR_SYNC.md を最初のパイロットとして選定**

理由:
- 既存で最も完成度が高い（98%）
- 18セクション構成 → 12セクション形式へのマッピングが容易
- Hard Gate が既に実装されており、フレームワークの TBD=0 要件を満たす

| # | アクション | 詳細 |
|---|----------|------|
| B2-1 | SSOT_CALENDAR_SYNC.md を 12セクション形式に変換 | §1-§12 構成、RFC 2119 要求レベル付与 |
| B2-2 | 13_SSOT_AUDIT.md で監査（95点合格を目指す） | 変換結果を正式監査 |
| B2-3 | 変換手順を記録 | 他のSSOTの変換テンプレートとして |

### B3. ディレクトリ構造の整備

```
docs/
├── ssot/                          ← 今回作成済み
│   ├── SSOT-0_PRD.md              ← 今回作成済み
│   ├── SSOT-1_FEATURE_CATALOG.md  ← 今回作成済み
│   └── ...（監査レポート等）
├── core/                          ← Phase B で作成
│   ├── SSOT-2_UI_STATE.md
│   ├── SSOT-3_API_CONTRACT.md
│   ├── SSOT-4_DATA_MODEL.md
│   └── SSOT-5_CROSS_CUTTING.md
├── adr/                           ← Phase B で作成
│   └── ADR-001_ssot_framework_adoption.md
├── customization/                 ← Phase B で作成
│   └── CUSTOMIZATION_LOG.md
└── traceability/                  ← Phase B で作成
    └── TRACEABILITY_MATRIX.md
```

---

## Phase C: 継続的に実施するアクション（1-3ヶ月）

### C1. 残りのSSOT変換

| 優先順 | SSOT | 理由 |
|--------|------|------|
| 1 | SSOT_CALENDAR_SYNC.md | パイロット（Phase B で実施） |
| 2 | SSOT_MEETING_SCHEDULER.md | テスト未完了（3/8）の解消が必要 |
| 3 | SSOT_GENBA_WEEK.md | コア機能。12セクション化で品質向上 |
| 4 | SSOT_APP_HEADER.md | 共通UI機能。common-features/ への移動候補 |
| 5 | SSOT_MVP_EXTEND.md | テスト未完了（3/5）の解消が必要 |
| 6 | SSOT_UI_NAVIGATION.md | SSOT-2_UI_STATE.md に統合候補 |
| 7 | SSOT_BRAND.md | マーケティング系。形式変換優先度低 |
| 8 | SSOT_PRICING.md | マーケティング系。形式変換優先度低 |
| 9 | SSOT_MARKETING.md | マーケティング系。形式変換優先度低 |
| 10 | SSOT_EXIT_STRATEGY.md | 事業戦略。形式変換対象外 |
| 11 | SSOT_MIEL_FILE.md | Phase 2以降。現時点では変換不要 |

### C2. 品質プロセスの導入

| # | プロセス | フレームワーク参照 | 導入優先度 |
|---|---------|-----------------|----------|
| C2-1 | SSOT監査の定常化 | 13_SSOT_AUDIT.md | High |
| C2-2 | 実装プロンプトフォーマット | 15_PROMPT_FORMAT.md | Medium |
| C2-3 | コード監査 | 17_CODE_AUDIT.md | Medium |
| C2-4 | テスト監査 | 18_TEST_FORMAT.md | Medium |
| C2-5 | ビジュアルテスト | 20_VISUAL_TEST.md | Low |
| C2-6 | 機能完了検証 | 22_FEATURE_ACCEPTANCE.md | Medium |

### C3. 未完了機能の実装

Phase 0 未完了の P1 機能:

| # | 機能ID | 機能名 | 推定規模 |
|---|--------|--------|---------|
| 1 | AUTH-006 | パスワードリセット | S |
| 2 | AUTH-010 | セッション自動更新 | S |
| 3 | ERR-001 | 404ページ | S |
| 4 | ERR-003 | 500ページ | S |
| 5 | SEC-003 | レート制限 | M |
| 6 | WBS-001 AC6 | オフラインキオスク（PWA） | L |
| 7 | WBS-001 AC7 | 多言語対応（7言語） | L |

---

## 意思決定が必要な事項

以下は推測せず、プロダクトオーナーの確認が必要（21_AI_ESCALATION.md T7 準拠）:

| # | 質問 | 選択肢 | 推奨 | 影響 |
|---|------|--------|------|------|
| Q1 | 既存 SSOT_*.md は 12セクション形式に完全変換するか、現形式を維持するか | a) 完全変換 b) ハイブリッド（新規のみ12セクション） c) 現形式維持 | b) ハイブリッド | 全変換は大量の作業が発生。新規機能から適用が現実的 |
| Q2 | docs/ のディレクトリ構造をフレームワーク標準に再編成するか | a) 再編成（既存ファイル移動） b) ssot/ のみ追加（既存はそのまま） c) 段階的に移行 | c) 段階的 | 一括移動はリンク切れリスク大 |
| Q3 | CLAUDE.md と .cursorrules の役割分担をどうするか | a) CLAUDE.md のみ b) .cursorrules のみ c) 両方維持（用途別） | c) 両方維持 | CLAUDE.md = Claude Code用、.cursorrules = Cursor用 |
| Q4 | RFC 2119 用語を日本語にするか英語のままにするか | a) 日本語（必須/推奨/任意） b) 英語（MUST/SHOULD/MAY） c) 併記 | b) 英語 | フレームワーク標準が英語。開発者は英語に慣れている |

---

## 変更履歴

| 日付 | 変更内容 | 変更者 |
|------|---------|-------|
| 2026-02-02 | 初版作成 | AI（Claude Code） |
