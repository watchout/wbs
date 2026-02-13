# ギャップ分析レポート: ai-dev-framework v3.0 適用

> 対象: watchout/wbs リポジトリ
> 分析日: 2026-02-02
> フレームワーク: ai-dev-framework v3.0

---

## 1. エグゼクティブサマリー

wbs リポジトリには **65以上のドキュメント**（SSOT_*.md 12件含む）、包括的な `.cursorrules`、品質ゲート定義が既に存在する。しかし、ai-dev-framework v3.0 が要求する **構造化されたSSOT階層** との間に明確なギャップがある。

**総合評価: 内容は充実しているが、構造がフレームワーク非準拠**

| 評価軸 | スコア | 説明 |
|--------|--------|------|
| コンテンツ充実度 | 85/100 | 主要機能のドキュメントが豊富に存在 |
| 構造準拠度 | 25/100 | フレームワークの階層構造に非準拠 |
| 12セクション準拠 | 15/100 | IEEE/ISO 12セクション形式に未対応 |
| SSOT階層整備 | 20/100 | SSOT-0〜SSOT-5 の階層が未整備 |
| AI開発プロトコル | 60/100 | .cursorrules はあるが AI中断プロトコル未導入 |

---

## 2. フレームワーク要求 vs wbs現状

### 2.1 SSOT階層構造

| フレームワーク要求 | 要求ファイル | wbs現状 | ギャップ |
|-------------------|-------------|---------|---------|
| SSOT-0: PRD | `docs/ssot/SSOT-0_PRD.md` | PRODUCT_VISION.md が存在するが PRD形式ではない | **Critical** |
| SSOT-1: 機能台帳 | `docs/ssot/SSOT-1_FEATURE_CATALOG.md` | 個別 SSOT_*.md は12件あるが統合カタログなし | **Critical** |
| SSOT-2: UI/状態台帳 | `docs/core/SSOT-2_UI_STATE.md` | UI_ROUTING_MAP.md + SSOT_UI_NAVIGATION.md あり（形式違い） | **Major** |
| SSOT-3: API契約台帳 | `docs/core/SSOT-3_API_CONTRACT.md` | openapi.yaml あり（規約形式ではない） | **Major** |
| SSOT-4: データ台帳 | `docs/core/SSOT-4_DATA_MODEL.md` | prisma/schema.prisma あり（規約形式ではない） | **Major** |
| SSOT-5: 横断的関心事 | `docs/core/SSOT-5_CROSS_CUTTING.md` | .cursorrules に一部定義あり（形式違い） | **Major** |

### 2.2 ディレクトリ構造

**フレームワーク要求:**
```
docs/
├── ssot/                    ← PRD + 機能台帳
├── core/                    ← コア定義（SSOT-2〜5）
├── common-features/         ← 共通機能仕様
├── project-features/        ← 固有機能仕様
├── customization/           ← カスタマイズ記録
├── checklists/              ← チェックリスト
├── adr/                     ← 設計判断記録
└── traceability/            ← 追跡マトリクス
```

**wbs現状:**
```
docs/
├── SSOT_*.md (12件)         ← フラット配置、形式不統一
├── functional_spec.md       ← 基本的な要件リスト
├── PRODUCT_VISION.md        ← ビジョン（PRD形式ではない）
├── DONE_DEFINITION.md       ← DoD定義
├── UI_ROUTING_MAP.md        ← UI情報
├── TEST_STRATEGY.md         ← テスト戦略
├── technical_references/    ← 技術参考文献
├── reviews/                 ← レビュー記録
└── AI_ROLES/                ← AI役割定義
```

| 要求ディレクトリ | 存在 | 備考 |
|----------------|------|------|
| `docs/ssot/` | **なし** | 新規作成が必要 |
| `docs/core/` | **なし** | 新規作成が必要 |
| `docs/common-features/` | **なし** | AUTH系はSSOT_APP_HEADER等に分散 |
| `docs/project-features/` | **なし** | SSOT_GENBA_WEEK等に分散 |
| `docs/customization/` | **なし** | 新規作成が必要 |
| `docs/checklists/` | **なし** | quality_checklist.md がフラットに存在 |
| `docs/adr/` | **なし** | 設計判断の記録なし |
| `docs/traceability/` | **なし** | 追跡マトリクスなし |

### 2.3 機能仕様書フォーマット（12_SSOT_FORMAT.md 準拠）

フレームワークが要求する12セクション（§1〜§12）と既存SSOTの対応:

| セクション | 要求 | SSOT_GENBA_WEEK | SSOT_CALENDAR_SYNC | SSOT_MEETING_SCHEDULER | SSOT_APP_HEADER |
|-----------|------|----------------|-------------------|----------------------|----------------|
| §1 文書情報 | MUST | 部分的 | 部分的 | 部分的 | 部分的 |
| §2 機能概要 | MUST | あり | あり | あり | あり |
| §3 機能要件（RFC 2119） | MUST | なし（形式違い） | あり（CRITICAL/SHOULD形式） | 部分的 | 部分的 |
| §4 データ仕様 | MUST | 部分的 | あり | あり | なし |
| §5 API仕様 | MUST | あり | あり | あり | なし |
| §6 UI仕様 | MUST | あり | なし | 部分的 | あり |
| §7 ビジネスルール | MUST | 部分的 | 部分的 | 部分的 | なし |
| §8 非機能要件 | SHOULD | 部分的 | 部分的 | なし | なし |
| §9 エラーハンドリング | MUST | なし | あり | なし | なし |
| §10 テストケース | MUST | 部分的 | あり | 部分的 | 部分的 |
| §11 依存関係 | SHOULD | 部分的 | 部分的 | 部分的 | 部分的 |
| §12 未決定事項 | MUST | なし | あり（Open Questions: NONE） | なし | なし |

### 2.4 AI開発プロトコル

| フレームワーク要求 | wbs現状 | ギャップ |
|-------------------|---------|---------|
| CLAUDE.md（プロジェクト用） | **なし**（.cursorrules で代用） | **Critical** |
| AI中断プロトコル（21_AI_ESCALATION.md） | .cursorrules に「推測禁止」の言及あり | **Major** - 7トリガーの明示的定義なし |
| RFC 2119 要求レベル定義 | 一部SSOTで CRITICAL/SHOULD 使用 | **Minor** - MUST/SHOULD/MAY 統一が必要 |
| 仕様書なしの実装禁止 | .cursorrules に記載あり | 準拠 |

### 2.5 品質プロセス

| フレームワーク要求 | wbs現状 | ギャップ |
|-------------------|---------|---------|
| SSOT監査（95点合格） | 未実施 | **Critical** |
| 実装プロンプト（15_PROMPT_FORMAT.md） | 未整備 | **Major** |
| コード監査（17_CODE_AUDIT.md） | CI でのlint/build チェックあり | **Minor** |
| テスト監査（18_TEST_FORMAT.md） | TEST_STRATEGY.md あり | **Minor** |
| 機能完了検証（22_FEATURE_ACCEPTANCE.md） | DONE_DEFINITION.md あり | **Minor** |

---

## 3. 既存SSOT品質評価

### 3.1 SSOT_TEMPLATE_GENERIC.md

wbs独自のSSOTテンプレートが存在する。フレームワークの12セクション形式とは異なるが、以下の強みがある:
- Hard Gate（未決定事項の強制解決）
- マルチテナンシールール
- Observability セクション
- ロールアウト/移行計画

**評価:** 独自に高品質なテンプレートを持つが、フレームワーク形式とは不統一。

### 3.2 最も準拠度が高い SSOT: SSOT_CALENDAR_SYNC.md

- 18セクション構成（フレームワークの12セクションより多い）
- Hard Gate 条件あり（全決定済み）
- 受入条件7件定義
- API契約5エンドポイント詳細記載
- テスト戦略記載
- Open Questions: NONE

**評価: 98%完成度** - フレームワーク形式へのマッピングは容易。

### 3.3 最も改善が必要な SSOT: SSOT_MIEL_FILE.md

- 戦略方向性は明確だが実装詳細が不足
- API契約が未定義
- テストケースなし

**評価: 75%完成度** - Phase 2以降の機能のため優先度は低い。

---

## 4. 改善優先度マトリクス

### Critical（即座に対応が必要）

| # | 項目 | 理由 | 推奨アクション |
|---|------|------|-------------|
| C1 | SSOT-0_PRD.md 不在 | SSOT階層の根幹。全機能仕様のトレーサビリティ起点 | PRODUCT_VISION.md + functional_spec.md から変換生成 |
| C2 | SSOT-1_FEATURE_CATALOG.md 不在 | 全機能の母艦。実装順序決定の基盤 | 既存12件のSSOT_*.md から統合生成 |
| C3 | CLAUDE.md 不在 | Claude Code での開発効率に直結 | テンプレートから wbs 固有値で生成 |

### Major（早期対応推奨）

| # | 項目 | 理由 | 推奨アクション |
|---|------|------|-------------|
| M1 | docs/core/ ディレクトリ不在 | SSOT-2〜5 のコア定義未整備 | openapi.yaml, schema.prisma, .cursorrules から抽出・構造化 |
| M2 | 既存SSOT の12セクション非準拠 | フレームワーク統一形式への変換が必要 | SSOT_CALENDAR_SYNC.md をパイロットとして変換 |
| M3 | AI中断プロトコル未導入 | 開発時の品質担保に必要 | CLAUDE.md に7トリガーを明記 |
| M4 | RFC 2119 用語未統一 | 要求レベルの混在（CRITICAL/SHOULD vs MUST/SHOULD/MAY） | 既存SSOTの用語を統一 |

### Minor（余裕があれば対応）

| # | 項目 | 理由 | 推奨アクション |
|---|------|------|-------------|
| m1 | docs/adr/ 不在 | 設計判断の記録が散在 | ADRテンプレートを配置し、主要判断を記録 |
| m2 | docs/traceability/ 不在 | 要件-実装-テストの追跡不可 | トレーサビリティマトリクス生成 |
| m3 | docs/customization/ 不在 | 共通機能のカスタマイズ記録なし | CUSTOMIZATION_LOG.md を作成 |

---

## 5. wbs の強み（フレームワーク以上の点）

既存のwbsドキュメントには、フレームワークが想定していない優れた要素がある:

| 強み | 詳細 |
|------|------|
| Hard Gate パターン | SSOT_TEMPLATE_GENERIC.md で未決定事項の強制解決を定義 |
| Observability セクション | 監視・メトリクスの定義がテンプレートに組み込み済み |
| マルチテナンシールール | 全SSOTで `organizationId` スコープを強制 |
| EXIT戦略統合 | SSOT_EXIT_STRATEGY.md がM&A観点で機能優先度を定義 |
| AI役割定義 | AI_ROLES/STRATEGIC_CONTEXT_PROMPT.md で事業コンテキストを構造化 |
| 3層品質ゲート | .cursorrules + CI + DoD の3段階品質管理 |

**推奨:** フレームワーク適用時にこれらの独自強みを失わないよう注意する。

---

## 6. 変換戦略

### 推奨アプローチ: ハイブリッド（段階的統合）

フレームワークの構造を導入しつつ、wbs独自の強みを維持する。

```
Phase A: 今回実施（SSOT階層の土台を構築）
  ├── docs/ssot/SSOT-0_PRD.md ← 新規生成
  ├── docs/ssot/SSOT-1_FEATURE_CATALOG.md ← 新規生成
  └── docs/ssot/GAP_ANALYSIS_REPORT.md ← 本文書

Phase B: 次回以降（コア定義の整備）
  ├── docs/core/SSOT-2_UI_STATE.md
  ├── docs/core/SSOT-3_API_CONTRACT.md
  ├── docs/core/SSOT-4_DATA_MODEL.md
  └── docs/core/SSOT-5_CROSS_CUTTING.md

Phase C: 継続的（個別SSOT変換）
  ├── 既存 SSOT_*.md → 12セクション形式に変換
  ├── CLAUDE.md 生成
  └── AI中断プロトコル導入
```

---

## 変更履歴

| 日付 | 変更内容 | 変更者 |
|------|---------|-------|
| 2026-02-02 | 初版作成 | AI（Claude Code） |
