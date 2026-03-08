# SSOT_SITE_ALLOCATION.md — 現場配置AIファースト

> ミエルボード for 現場の中核転換: 「個人スケジュール管理」から「現場配置の可視化・計画・調整」へ

---

## §0 Document Control

| 項目 | 内容 |
|------|------|
| Document ID | SSOT_SITE_ALLOCATION |
| Version | v0.1.0 (Draft) |
| Status | Draft |
| Owner | kaneko |
| Created | 2026-02-24 |
| Phase | Phase 1（現場配置AIファースト） |

### 完全性チェックリスト

- [x] §1 Purpose / Scope
- [x] §2 Background / Problem Statement
- [x] §3 Product Principles
- [x] §4 User Roles / Use Cases
- [x] §5 Domain Model Summary
- [x] §6 Phase Plan（Sprint 1-5）
- [x] §7 Functional Requirements
- [x] §8 Non-Functional Requirements
- [x] §9 Data Model Requirements
- [x] §10 API Requirements
- [x] §11 UI / Screen Requirements
- [x] §12 AI Interaction Policy
- [x] §13 Migration Strategy
- [x] §14 Risks / Open Issues
- [x] §15 Acceptance Criteria / Test Cases

### Related SSOTs

| SSOT | 関係 |
|------|------|
| SSOT-0_PRD.md | Phase 1 スコープ追加 |
| SSOT-1_FEATURE_CATALOG.md | SITE-*, AISITE-* カテゴリ追加 |
| SSOT-2_UI_STATE.md | 新画面 SCR-SITE-* 追加 |
| SSOT-3_API_CONTRACT.md | Site/SiteDemand/AI Command API 追加 |
| SSOT-4_DATA_MODEL.md | Site/SiteDemand/PlanningDocument 追加 |
| SSOT_AI_ASSISTANT.md | 新ツール定義・権限境界追加 |
| SSOT_GENBA_WEEK.md | 週間ボードに現場ビュータブ追加 |

---

## §1 Purpose / Scope

### 目的

ミエルボードを「個人スケジュール管理ツール」から **「現場配置の司令塔」** に進化させる。工程表を起点に、現場ごとの必要人員と実配置の差分を可視化し、AIが配置提案を行うプラットフォームを構築する。

### スコープ（Phase 1: Sprint 1-5）

| Sprint | 機能 | 概要 |
|--------|------|------|
| Sprint 1 | 現場ビュー | 人ベース ↔ 現場ベースのタブ切替、現場×日ピボット表示 |
| Sprint 2 | 必要人員管理 | SiteDemand導入、手入力UI、過不足表示、不足一覧 |
| Sprint 3 | AIコマンドバー | ヘッダー常駐コマンドバー、検索・限定書き込み |
| Sprint 4 | 工程表AI読み取り | PDF/画像アップロード、Vision AIパース、確認画面 |
| Sprint 5 | AI配置提案 | 不足セル候補提案、スコア付き理由表示、仮配置 |

### 非スコープ（明示）

- 自動確定配置（完全自律AI配置 — 初期は人間承認必須）
- 原価最適化・粗利予測
- 移動時間自動計算（地図API連携）
- 外注手配連携
- 音声入力（Whisper API — 後続Phase）
- Excel工程表パース（将来。PDF/画像優先）

---

## §2 Background / Problem Statement

### 現状の課題

| # | 課題 | 影響 |
|---|------|------|
| 1 | **Siteモデル不在** — 現場名は `Schedule.description` JSON内の文字列（`siteName`）で管理。構造化されていない | 現場単位の集計・検索・紐付けが不可能 |
| 2 | **必要人数の概念不在** — 「この現場に何人必要か」を管理するデータモデルがない | 過不足の可視化ができない |
| 3 | **工程表との断絶** — 現場の工程表（紙/PDF）と週間ボードが連携していない | 手動転記が必要、転記漏れが頻発 |
| 4 | **AIが検索止まり** — 読み取り専用（search_schedules/search_users）で配置操作できない | AIが「便利なチャット」で止まっている |
| 5 | **人ベースのみの表示** — 週間ボードは人×日。現場×日の表示がない | 現場責任者が「自分の現場の充足状況」を一目で判断できない |

### 最重要設計課題

```
データの中心軸の転換:
  現状: User → Schedule（人が主語）
  目標: Site → SiteDemand → Schedule（現場が主語）
```

---

## §3 Product Principles（現場配置AIファースト原則）

| # | 原則 | 説明 |
|---|------|------|
| P1 | **可視化先行** | AI提案より先に現場需給が見えること。見えないものは改善できない |
| P2 | **人間確認前提** | AI抽出・AI配置は初期フェーズで確認必須。自動実行しない |
| P3 | **監査可能性** | 誰が・いつ・何を変更したか追跡可能。AI操作も記録 |
| P4 | **段階導入可能性** | 既存運用（人ベース表示）を壊さず、現場ビューを追加導入 |
| P5 | **現場運用優先** | UIは「速く判断できる」を重視。情報密度 > 装飾 |
| P6 | **抽出と判断の分離** | 工程表AIは「データ抽出」と「配置判断」を分離設計 |

---

## §4 User Roles / Primary Use Cases

### ロール定義（既存RBAC拡張）

| ロール | 現場配置での権限 |
|--------|----------------|
| ADMIN | 全現場の配置管理、Site/SiteDemandのCRUD、AI書き込み確定 |
| LEADER | 担当部署関連現場の配置確認、AI提案の仮配置承認 |
| MEMBER | 自分の配置確認（閲覧中心） |
| AI | 提案・仮配置作成（確定は人間操作必須） |

### 主要ユースケース

| UC-ID | アクター | ユースケース | Sprint |
|-------|---------|-------------|--------|
| UC-SA-001 | ADMIN | 来週の不足現場一覧を確認する | 1, 2 |
| UC-SA-002 | ADMIN | 特定現場の配置充足状況を確認する | 1, 2 |
| UC-SA-003 | ADMIN | 現場の必要人数を手入力で登録する | 2 |
| UC-SA-004 | ADMIN | 工程表（PDF/写真）から必要人数を登録する | 4 |
| UC-SA-005 | ADMIN | AIコマンドで不足現場を検索する | 3 |
| UC-SA-006 | ADMIN | AIコマンドで配置変更を実行する | 3 |
| UC-SA-007 | ADMIN | 不足セルにAI候補提案を受け配置する | 5 |
| UC-SA-008 | LEADER | 自部署メンバーの現場配置を確認する | 1 |
| UC-SA-009 | MEMBER | 自分の来週の配置先を確認する | 1 |

---

## §5 Domain Model Summary

### 概念モデル（ER関係）

```
Organization (テナント)
  ├── Site (現場マスタ)           ← 新設
  │     ├── SiteDemand (必要人員)  ← 新設
  │     │     └── PlanningDocument (工程表原本) ← 新設
  │     │           └── PlanningParseReview (修正履歴) ← 新設
  │     └── Schedule (実配置)     ← siteId追加
  ├── User (作業員/社員)
  │     └── Schedule (実配置)
  └── Department (部署)
```

### 関係性

| 関係 | カーディナリティ | 説明 |
|------|----------------|------|
| Site : SiteDemand | 1 : N | 1現場に日付×工種×時間帯ごとの需要レコード |
| Site : PlanningDocument | 1 : N | 1現場に複数の工程表 |
| PlanningDocument : SiteDemand | 1 : N | 1工程表から複数の需要を抽出 |
| Site : Schedule | 1 : N | 1現場に複数の配置（移行後） |
| User : Schedule | 1 : N | 1人に複数の配置（既存） |
| SiteDemand ←→ Schedule | 集計関係 | 同日同現場の配置数 = 充足数 |

---

## §6 Phase Plan（Sprint 1-5）

### Sprint 1: 現場ビュー（可視化基盤）

**目的**: 現場×日のピボット表示を追加し、配置状況を一目で把握できるようにする

**機能要件**:
- 週間ボードに「人ベース / 現場ベース」のタブ切替を追加
- 現場ベース表示: 行=現場、列=曜日（月〜日）
- 各セルに配置人数と配置者名を表示
- 現場名は `Schedule.description` の `siteName` から集計（Site未導入でも動作）
- 並び替え: 配置人数順 / 現場名順

**受け入れ条件（AC）**:
- [ ] AC-S1-01: タブ切替で人ベース/現場ベースが瞬時に切り替わる
- [ ] AC-S1-02: 現場ベースで全現場×7日が表示される
- [ ] AC-S1-03: 各セルに配置人数と人名が表示される
- [ ] AC-S1-04: siteName が空の Schedule は「未設定」行に集約される
- [ ] AC-S1-05: 既存の人ベース表示に影響がない
- [ ] AC-S1-06: モバイル表示で横スクロール可能

### Sprint 2: 必要人員管理

**目的**: 現場ごとの必要人数を管理し、過不足を可視化する

**機能要件**:
- Site マスタテーブル新設（現場の構造化）
- SiteDemand テーブル新設（日付×工種×必要人数）
- Site 管理画面（CRUD）
- 必要人数の手入力UI（現場ビュー上でインライン編集）
- 過不足表示: 配置人数 vs 必要人数
- 色分け: 不足=赤、充足=緑、過剰=黄
- 不足一覧画面（今週/来週の不足を一覧表示）
- Schedule に siteId（nullable）を追加

**受け入れ条件（AC）**:
- [ ] AC-S2-01: Site を作成・編集・一覧表示できる
- [ ] AC-S2-02: SiteDemand を日付×工種単位で入力できる
- [ ] AC-S2-03: 現場ビューで「配置人数 / 必要人数」が表示される
- [ ] AC-S2-04: 不足セルが赤、充足が緑、過剰が黄で色分けされる
- [ ] AC-S2-05: 不足一覧画面で今週・来週の不足現場が一覧できる
- [ ] AC-S2-06: 既存 Schedule.description.siteName から Site への紐付けが可能
- [ ] AC-S2-07: siteId 未設定の Schedule でもエラーにならない（後方互換）
- [ ] AC-S2-08: SiteDemand に sourceType（MANUAL/AI_PARSED/IMPORTED）が記録される
- [ ] AC-S2-09: 全APIで organizationId スコープが適用されている

### Sprint 3: AIコマンドバー

**目的**: ヘッダー常駐のコマンドバーで、自然言語による検索・配置変更を可能にする

**機能要件**:
- AppHeader にAIコマンドバーを常駐表示
- Cmd+K / Ctrl+K でフォーカス
- プレースホルダーに入力例をローテーション表示
- 検索系コマンド:
  - 現場別照会（「品川現場に来週誰がいる？」）
  - 空き人員検索（「電気工事できる人で水曜空いてる人」）
  - 不足現場一覧（「来週の不足現場を教えて」）
- 書き込み系コマンド:
  - 配置変更（「田中を新宿に移して」→ プレビュー → 確定）
- AI ツール拡張: search_site_demand, search_site_allocation, preview_assignment, execute_assignment
- 書き込み系は必ず**プレビュー → 確定**フロー
- 変更履歴（監査ログ）自動記録

**受け入れ条件（AC）**:
- [ ] AC-S3-01: Cmd+K でコマンドバーにフォーカスが移る
- [ ] AC-S3-02: 「品川に誰がいる」で該当現場の配置一覧が返る
- [ ] AC-S3-03: 「来週の不足現場」で不足一覧が返る
- [ ] AC-S3-04: 「田中を新宿に移して」でプレビュー画面が表示される
- [ ] AC-S3-05: プレビュー確定後に Schedule が更新される
- [ ] AC-S3-06: 配置変更が監査ログに記録される（操作者、変更前後、AI指示内容）
- [ ] AC-S3-07: MEMBER ロールでは書き込み系コマンドが拒否される
- [ ] AC-S3-08: AI クレジットが消費される（1コマンド = 1クレジット）

### Sprint 4: 工程表AI読み取り

**目的**: PDF/画像の工程表をAIで解析し、必要人員データに変換する

**機能要件**:
- アップロードUI（ドラッグ&ドロップ + ファイル選択）
- 対応形式: PDF（テキスト埋め込み + 画像PDF）、画像（JPEG/PNG）
- Vision API（GPT-4o / Claude）で工程表を構造化データに変換
- 抽出項目: 現場名、日付/期間、工種、必要人数、備考
- PlanningDocument テーブルに原本保存
- 解析ステータス管理: pending → parsed / failed / needs_review
- 確認画面: 抽出結果を表形式で表示、行単位で修正可能
- 承認後に SiteDemand に反映
- 「AI抽出（未確認）/ 確認済み / 手動入力」の状態ラベル表示
- 失敗時の手修正導線
- PlanningParseReview に修正履歴保存

**受け入れ条件（AC）**:
- [ ] AC-S4-01: PDF/画像をアップロードできる
- [ ] AC-S4-02: 解析結果が表形式の確認画面に表示される
- [ ] AC-S4-03: 確認画面で行単位の修正ができる
- [ ] AC-S4-04: 承認後に SiteDemand レコードが作成される
- [ ] AC-S4-05: 作成された SiteDemand の sourceType が `AI_PARSED` になる
- [ ] AC-S4-06: confidence（信頼度 0-1）が記録される
- [ ] AC-S4-07: 同一工程表の再アップロードが冪等（重複作成しない）
- [ ] AC-S4-08: 解析失敗時にエラーメッセージと手動入力への導線が表示される
- [ ] AC-S4-09: 修正履歴が PlanningParseReview に記録される

### Sprint 5: AI配置提案

**目的**: 不足現場にAIが候補人員を提案し、仮配置をワンタップで作成する

**機能要件**:
- 不足セル（赤表示）に「🤖 候補提案」ボタン表示
- 候補人員をスコア付きで提示:
  - スキル一致度
  - 当日の空き状況
  - 連続配置（前日/翌日の現場との整合性）
  - 所属部署との関連
- 提案理由を自然言語で表示
- ワンタップで仮配置（DRAFT）を作成
- 仮配置 → 確定は別操作（人間の明示承認）
- 仮配置と確定配置の視覚的区別（破線 vs 実線など）

**受け入れ条件（AC）**:
- [ ] AC-S5-01: 不足セルに提案ボタンが表示される
- [ ] AC-S5-02: 候補者がスコア順で表示される
- [ ] AC-S5-03: 各候補に提案理由が表示される
- [ ] AC-S5-04: ワンタップで仮配置が作成される
- [ ] AC-S5-05: 仮配置は視覚的に確定配置と区別される
- [ ] AC-S5-06: 仮配置を確定するには別の明示操作が必要
- [ ] AC-S5-07: 仮配置の作成が監査ログに記録される

---

## §7 Functional Requirements

### 7.1 Site Management（SITE-001〜003）

| FR-ID | 要件 | MUST/SHOULD | Sprint |
|-------|------|-------------|--------|
| FR-SITE-001 | Site マスタの CRUD（名称、住所、元請、有効/無効） | MUST | 2 |
| FR-SITE-002 | 旧 `Schedule.description.siteName` との暫定共存 | MUST | 1, 2 |
| FR-SITE-003 | Site の有効/無効管理（論理削除） | SHOULD | 2 |

### 7.2 Site Demand Management（DEMAND-001〜005）

| FR-ID | 要件 | MUST/SHOULD | Sprint |
|-------|------|-------------|--------|
| FR-DEMAND-001 | 日付単位の必要人数登録 | MUST | 2 |
| FR-DEMAND-002 | 工種（tradeType）別管理 | MUST | 2 |
| FR-DEMAND-003 | 時間帯（終日/AM/PM/夜間）管理（データモデルのみ、UIは将来） | SHOULD | 2 |
| FR-DEMAND-004 | sourceType / confidence 状態管理 | MUST | 2 |
| FR-DEMAND-005 | 手動修正時の変更履歴保持 | SHOULD | 2 |

### 7.3 Site Allocation View（VIEW-001〜005）

| FR-ID | 要件 | MUST/SHOULD | Sprint |
|-------|------|-------------|--------|
| FR-VIEW-001 | 現場ベース週間表示（行=現場、列=曜日） | MUST | 1 |
| FR-VIEW-002 | 配置人数の集計表示 | MUST | 1 |
| FR-VIEW-003 | 配置人数 / 必要人数 / 差分表示 | MUST | 2 |
| FR-VIEW-004 | 色分け表示（赤=不足、緑=充足、黄=過剰） | MUST | 2 |
| FR-VIEW-005 | 不足一覧表示（週別、現場別、工種別） | MUST | 2 |

### 7.4 AI Command Bar（AICMD-001〜006）

| FR-ID | 要件 | MUST/SHOULD | Sprint |
|-------|------|-------------|--------|
| FR-AICMD-001 | 現場別照会（検索） | MUST | 3 |
| FR-AICMD-002 | 空き人員検索 | MUST | 3 |
| FR-AICMD-003 | 不足現場検索 | MUST | 3 |
| FR-AICMD-004 | 配置変更プレビュー | MUST | 3 |
| FR-AICMD-005 | 配置変更確定 | MUST | 3 |
| FR-AICMD-006 | 実行ログ保存（監査ログ連携） | MUST | 3 |

### 7.5 Planning Document AI Parse（PARSE-001〜006）

| FR-ID | 要件 | MUST/SHOULD | Sprint |
|-------|------|-------------|--------|
| FR-PARSE-001 | PDF/画像アップロード | MUST | 4 |
| FR-PARSE-002 | 解析ステータス管理（pending/parsed/failed/needs_review） | MUST | 4 |
| FR-PARSE-003 | 抽出結果の確認UI（表形式、行単位修正） | MUST | 4 |
| FR-PARSE-004 | 承認後 SiteDemand 反映 | MUST | 4 |
| FR-PARSE-005 | 失敗時の手動救済導線 | MUST | 4 |
| FR-PARSE-006 | 修正履歴の PlanningParseReview 保存 | SHOULD | 4 |

### 7.6 AI Allocation Proposal（AIPLAN-001〜004）

| FR-ID | 要件 | MUST/SHOULD | Sprint |
|-------|------|-------------|--------|
| FR-AIPLAN-001 | 不足セルの候補人員提案 | MUST | 5 |
| FR-AIPLAN-002 | 提案理由表示（スキル、空き、連続性） | MUST | 5 |
| FR-AIPLAN-003 | 仮配置（DRAFT）保存 | MUST | 5 |
| FR-AIPLAN-004 | 仮配置 → 確定のレビューフロー | MUST | 5 |

---

## §8 Non-Functional Requirements

| NFR-ID | 要件 | 基準 |
|--------|------|------|
| NFR-001 | 週間ボード描画性能 | 100人×20現場×7日で3秒以内に描画 |
| NFR-002 | AI処理の非同期化 | 工程表解析は非同期。UIはポーリングで状態確認 |
| NFR-003 | 冪等性 | 同一工程表の再アップロードで重複レコード作成しない |
| NFR-004 | 監査ログ保存期間 | 最低1年間 |
| NFR-005 | 権限制御 | Site/SiteDemand 書き込みは ADMIN/LEADER のみ |
| NFR-006 | 障害時フォールバック | AI不通時も手入力で運用継続可能 |
| NFR-007 | マルチテナント | 全テーブルに organizationId。テナント横断アクセス不可 |
| NFR-008 | ファイルサイズ制限 | アップロード上限: PDF 20MB、画像 10MB |

---

## §9 Data Model Requirements

> 以下は要件定義。実スキーマは SSOT-4_DATA_MODEL.md に反映する。

### 9.1 Site（現場マスタ）— 新設

| カラム | 型 | 必須 | 説明 |
|--------|-----|------|------|
| id | UUID | PK | |
| organizationId | UUID | FK | テナントスコープ |
| name | String | YES | 現場名（例: "品川ホテル新館"） |
| address | String | NO | 住所 |
| clientName | String | NO | 元請/顧客名 |
| status | Enum | YES | ACTIVE / INACTIVE / COMPLETED |
| startDate | Date | NO | 工期開始 |
| endDate | Date | NO | 工期終了 |
| note | String | NO | 備考 |
| createdBy | UUID | FK | 作成者 |
| createdAt | DateTime | YES | |
| updatedAt | DateTime | YES | |
| deletedAt | DateTime | NO | 論理削除 |

**インデックス**: `(organizationId, status)`, `(organizationId, name)`

### 9.2 SiteDemand（現場必要人員）— 新設

| カラム | 型 | 必須 | 説明 |
|--------|-----|------|------|
| id | UUID | PK | |
| organizationId | UUID | FK | テナントスコープ |
| siteId | UUID | FK | 対象現場 |
| date | Date | YES | 対象日 |
| tradeType | String | YES | 工種（例: "電気工事", "配線", "器具付け"） |
| requiredCount | Int | YES | 必要人数 |
| timeSlot | Enum | YES | ALL_DAY / AM / PM / NIGHT（デフォルト: ALL_DAY） |
| priority | Enum | YES | HIGH / MEDIUM / LOW（デフォルト: MEDIUM） |
| sourceType | DemandSourceType | YES | MANUAL / AI_PARSED / IMPORTED |
| sourceDocumentId | UUID | FK? | 工程表からの場合の元ドキュメントID |
| confidence | Float? | NO | AI抽出信頼度（0.0-1.0）。手入力時はNULL |
| confirmationStatus | Enum | YES | UNCONFIRMED / CONFIRMED（デフォルト: CONFIRMED for manual） |
| note | String | NO | |
| createdBy | UUID | FK | |
| updatedBy | UUID | FK? | |
| createdAt | DateTime | YES | |
| updatedAt | DateTime | YES | |

**インデックス**: `(organizationId, siteId, date)`, `(organizationId, date)`
**ユニーク制約**: `(siteId, date, tradeType, timeSlot)`

### 9.3 PlanningDocument（工程表ドキュメント）— 新設

| カラム | 型 | 必須 | 説明 |
|--------|-----|------|------|
| id | UUID | PK | |
| organizationId | UUID | FK | テナントスコープ |
| siteId | UUID | FK? | 紐付け現場（不明なら NULL で後から紐付け） |
| fileName | String | YES | 元ファイル名 |
| fileType | Enum | YES | PDF / IMAGE |
| storagePath | String | YES | ファイル保存パス |
| fileSize | Int | YES | バイト数 |
| parseStatus | Enum | YES | PENDING / PARSING / PARSED / FAILED / NEEDS_REVIEW |
| parserVersion | String | NO | 使用したAIモデル/バージョン |
| rawExtractJson | Json | NO | AI抽出結果の生データ |
| summaryText | String | NO | 人が読む要約 |
| errorMessage | String | NO | 解析失敗時のエラー |
| uploadedBy | UUID | FK | |
| uploadedAt | DateTime | YES | |
| parsedAt | DateTime | NO | |

**インデックス**: `(organizationId, siteId)`, `(organizationId, parseStatus)`

### 9.4 PlanningParseReview（抽出修正ログ）— 新設

| カラム | 型 | 必須 | 説明 |
|--------|-----|------|------|
| id | UUID | PK | |
| documentId | UUID | FK | 対象ドキュメント |
| fieldPath | String | YES | 修正箇所（例: "demands[3].requiredCount"） |
| beforeValue | String | NO | 修正前の値 |
| afterValue | String | YES | 修正後の値 |
| reviewedBy | UUID | FK | 修正者 |
| reviewedAt | DateTime | YES | |

### 9.5 Schedule 拡張（既存テーブル）

| カラム | 型 | 必須 | 説明 |
|--------|-----|------|------|
| siteId | UUID | FK? | 紐付け現場。**nullable**（移行期間は未設定を許容） |
| assignmentStatus | Enum | NO | DRAFT / CONFIRMED（デフォルト: CONFIRMED） |

### 9.6 Enum 定義

```
SiteStatus: ACTIVE | INACTIVE | COMPLETED
TimeSlot: ALL_DAY | AM | PM | NIGHT
DemandPriority: HIGH | MEDIUM | LOW
DemandSourceType: MANUAL | AI_PARSED | IMPORTED
ConfirmationStatus: UNCONFIRMED | CONFIRMED
DocumentFileType: PDF | IMAGE
DocumentParseStatus: PENDING | PARSING | PARSED | FAILED | NEEDS_REVIEW
AssignmentStatus: DRAFT | CONFIRMED
AssignmentEventType: ASSIGNED | UNASSIGNED | REASSIGNED | SITE_CHANGED | DATE_CHANGED | DRAFT_CREATED | DRAFT_CONFIRMED | DRAFT_REJECTED | BULK_ASSIGNED | BULK_UNASSIGNED | IMPORTED | MIGRATED
```

---

## §10 API Requirements

> エンドポイント詳細は SSOT-3_API_CONTRACT.md に反映する。ここでは概要要件を定義。

### 10.1 Site API

| Method | Path | 説明 | 権限 | Sprint |
|--------|------|------|------|--------|
| GET | /api/sites | 現場一覧（status, search フィルタ） | MEMBER+ | 2 |
| POST | /api/sites | 現場作成 | ADMIN | 2 |
| GET | /api/sites/:id | 現場詳細 | MEMBER+ | 2 |
| PATCH | /api/sites/:id | 現場更新 | ADMIN | 2 |
| DELETE | /api/sites/:id | 現場削除（論理削除） | ADMIN | 2 |

### 10.2 SiteDemand API

| Method | Path | 説明 | 権限 | Sprint |
|--------|------|------|------|--------|
| GET | /api/sites/:siteId/demands | 需要一覧（date range フィルタ） | MEMBER+ | 2 |
| POST | /api/sites/:siteId/demands | 需要登録 | LEADER+ | 2 |
| PATCH | /api/site-demands/:id | 需要更新 | LEADER+ | 2 |
| DELETE | /api/site-demands/:id | 需要削除 | ADMIN | 2 |

### 10.3 Site Allocation Summary API

| Method | Path | 説明 | 権限 | Sprint |
|--------|------|------|------|--------|
| GET | /api/site-allocation/weekly | 現場×週の配置サマリー（配置数/必要数/差分） | MEMBER+ | 1, 2 |
| GET | /api/site-allocation/shortages | 不足一覧（日付範囲指定） | MEMBER+ | 2 |

### 10.4 AI Command API

| Method | Path | 説明 | 権限 | Sprint |
|--------|------|------|------|--------|
| POST | /api/ai/command | AIコマンド実行（検索/プレビュー/確定） | MEMBER+ | 3 |

### 10.5 Planning Document API

| Method | Path | 説明 | 権限 | Sprint |
|--------|------|------|------|--------|
| POST | /api/planning-documents/upload | 工程表アップロード | ADMIN | 4 |
| GET | /api/planning-documents/:id | ドキュメント詳細（解析結果含む） | ADMIN | 4 |
| POST | /api/planning-documents/:id/confirm | 解析結果承認 → SiteDemand 反映 | ADMIN | 4 |
| GET | /api/planning-documents | ドキュメント一覧 | ADMIN | 4 |

### 10.6 AI Allocation Proposal API

| Method | Path | 説明 | 権限 | Sprint |
|--------|------|------|------|--------|
| POST | /api/ai/allocation-proposal | 不足セルの候補提案要求 | LEADER+ | 5 |
| POST | /api/ai/allocation-proposal/:id/apply | 提案を仮配置として適用 | LEADER+ | 5 |

---

## §11 UI / Screen Requirements

### 新規画面・コンポーネント

| Screen ID | パス / 位置 | 種別 | Sprint |
|-----------|------------|------|--------|
| SCR-SITE-BOARD | /org/[slug]/weekly-board（タブ追加） | タブ | 1 |
| SCR-SITE-MANAGE | /org/[slug]/admin/sites | ページ | 2 |
| CMP-SITE-DEMAND-EDITOR | 現場ビュー上のインラインUI | コンポーネント | 2 |
| SCR-SHORTAGE-LIST | /org/[slug]/shortages | ページ | 2 |
| CMP-AI-COMMAND-BAR | AppHeader 内コンポーネント | コンポーネント | 3 |
| CMP-AI-PREVIEW-MODAL | 配置変更プレビューモーダル | コンポーネント | 3 |
| SCR-PLANNING-UPLOAD | /org/[slug]/admin/planning-documents | ページ | 4 |
| SCR-PLANNING-REVIEW | /org/[slug]/admin/planning-documents/[id]/review | ページ | 4 |
| CMP-ALLOCATION-PROPOSAL | 不足セル内の提案パネル | コンポーネント | 5 |

### 現場ビュー画面設計（Sprint 1）

```
┌─ 週間ボード ─────────────────────────────────┐
│ [人ベース] [現場ベース]    ← 2/24(月) 〜 3/2(日) →│
├──────────┬────月────┬────火────┬────水────┤
│ 品川ホテル │ 田中,佐藤│ 田中     │ （空き）  │
│          │ 2名      │ 1名      │ 0名      │
├──────────┼─────────┼─────────┤─────────┤
│ 新宿ビル  │ 鈴木     │ 鈴木,高橋│ 鈴木     │
│          │ 1名      │ 2名      │ 1名      │
├──────────┼─────────┼─────────┤─────────┤
│ 未設定    │ 山田     │ —       │ 山田     │
│          │ 1名      │ 0名      │ 1名      │
└──────────┴─────────┴─────────┴─────────┘
```

### 過不足表示（Sprint 2 追加）

```
┌──────────┬─────────────┬─────────────┐
│ 品川ホテル │ 2/3 ⚠️ -1  │ 1/3 🔴 -2  │  ← 配置数/必要数 差分
│ 新宿ビル  │ 1/1 ✅  0   │ 2/2 ✅  0   │
│ 横浜倉庫  │ 0/2 🔴 -2  │ 0/1 🔴 -1  │
└──────────┴─────────────┴─────────────┘
```

---

## §12 AI Interaction Policy

### AI権限境界

| 操作 | AI単独 | 人間確認後 | 人間操作必須 |
|------|--------|-----------|-------------|
| スケジュール検索 | ✅ | | |
| 現場配置状況照会 | ✅ | | |
| 不足現場分析 | ✅ | | |
| 配置変更プレビュー生成 | ✅ | | |
| 配置変更（仮配置）実行 | | ✅ | |
| 仮配置 → 確定 | | | ✅ |
| 工程表解析の実行 | ✅ | | |
| 解析結果の SiteDemand 反映 | | | ✅ |
| SiteDemand の手動編集 | | | ✅ |

### 必須ルール

1. **書き込み系はプレビュー必須**: AIが配置変更を行う前に、変更内容をプレビュー表示し、ユーザーが確認・確定する
2. **監査ログ必須**: 全ての配置変更に対して、操作者（ユーザー or AI）、変更前後、実行時刻を記録
3. **変更理由の説明生成**: AI提案には必ず理由を付与（「スキル一致」「当日空き」「連続配置で移動負荷低」等）
4. **不明確な指示は実行拒否**: AIが解釈できない場合、候補を提示して確認を求める
5. **クレジット消費**: AI操作は1コマンド = 1クレジット（検索含む）

### AI Tool 拡張（SSOT_AI_ASSISTANT.md に追加）

| Tool名 | 種別 | 説明 |
|--------|------|------|
| search_site_allocation | 読取 | 現場×期間の配置状況を取得 |
| search_site_demand | 読取 | 現場×期間の必要人員を取得 |
| search_shortages | 読取 | 期間内の不足現場一覧を取得 |
| search_available_workers | 読取 | 指定日に空いている人員を検索 |
| preview_assignment | 読取 | 配置変更のプレビューを生成（実行はしない） |
| execute_assignment | 書込 | プレビュー確認済みの配置変更を実行（**LLMツール定義に含まず**。APIエンドポイント経由でのみ実行） |
| propose_allocation | 読取 | 不足セルに対する候補人員を提案 |

---

## §13 Migration Strategy

### Phase M1: 共存（Sprint 1）

```
目標: 既存運用を止めずに現場ビューを追加

- Schedule.description.siteName を引き続き参照可能
- Schedule.siteId は nullable（未設定を許容）
- 現場ビューは siteName 文字列から集計（Siteマスタ不要で動作）
- UIは siteId 優先、なければ description.siteName を表示
```

### Phase M2: マッピング補助（Sprint 2）

```
目標: Siteマスタを導入し、既存データとの紐付けを支援

- Site テーブル新設
- 既存 siteName のユニーク値を候補として Site に取り込むバッチ
- 表記ゆれ（◯◯ホテル / ○○ホテル / ○○ﾎﾃﾙ）の手動統合UI
- 新規 Schedule 作成時は Site 選択を推奨（必須ではない）
- Schedule.siteId ← Site.id の紐付けは任意で実行可能
```

### Phase M3: 構造化移行（Sprint 3以降）

```
目標: 新規作成を Site 紐付け前提に切り替え

- 新規 Schedule 作成時は siteId 必須（ただし「その他」Site を用意）
- 旧 description.siteName のみの Schedule は表示可能のまま維持
- 移行率の監視（siteId 有り率をダッシュボードに表示）
```

### Phase M4: 廃止（将来 — 時期未定）

```
- description.siteName 依存を完全撤去
- Schedule.description のJSON格納方式を廃止（metadata カラム化など）
- 全 Schedule に siteId 必須化
```

---

## §14 Risks / Open Issues

| # | リスク | 影響度 | 対策 |
|---|--------|--------|------|
| R1 | 工程表フォーマットのばらつき | 高 | 初期は主要3社フォーマットに絞る。汎用パーサーは段階的に |
| R2 | 手書き/低画質写真のOCR精度 | 中 | confidence 値で品質管理。低信頼度は手動確認必須 |
| R3 | 現場名の表記ゆれ | 高 | 類似名マッチング提案 + 手動統合UI |
| R4 | AI提案の責任分界 | 中 | AI=提案のみ、確定=人間操作。監査ログで証跡 |
| R5 | 初期データ移行コスト | 中 | 段階移行（M1→M4）で一括移行を避ける |
| R6 | パフォーマンス（大量現場×日の集計） | 中 | 集計APIにキャッシュ/マテリアライズドビュー検討 |
| R7 | ファイルストレージ | 低 | 初期はローカルディスク、将来S3移行 |

### Open Issues（[要確認]）

- [ ] OI-1: 工種（tradeType）のマスタ管理は必要か？初期はフリーテキストで可？
- [ ] OI-2: ファイルストレージの選定（ローカル / S3 / GCS）
- [ ] OI-3: AI解析のバッチ処理 vs リアルタイム処理の境界
- [ ] OI-4: 外注作業員（社外人員）の扱い（将来要件として記録）

---

## §15 Acceptance Criteria / Test Cases

### §3-E 入出力例

#### E-1: 現場ビュー取得（正常系）

```
入力: GET /api/site-allocation/weekly?weekStart=2026-03-02
認証: ADMIN (田中太郎, org: demo-org-001)

出力:
{
  "success": true,
  "data": {
    "weekStart": "2026-03-02",
    "weekEnd": "2026-03-08",
    "sites": [
      {
        "siteId": "site-001",
        "siteName": "品川ホテル新館",
        "days": [
          {
            "date": "2026-03-02",
            "allocated": 2,
            "required": 3,
            "gap": -1,
            "workers": [
              { "userId": "user-001", "name": "田中太郎", "status": "CONFIRMED" },
              { "userId": "user-002", "name": "佐藤花子", "status": "DRAFT" }
            ]
          }
        ]
      }
    ],
    "unassigned": {
      "siteName": "未設定",
      "days": [...]
    }
  }
}
```

#### E-2: SiteDemand 登録（正常系）

```
入力: POST /api/sites/site-001/demands
{
  "date": "2026-03-05",
  "tradeType": "電気工事",
  "requiredCount": 3,
  "timeSlot": "ALL_DAY",
  "priority": "HIGH"
}

出力:
{
  "success": true,
  "data": {
    "id": "demand-xxx",
    "siteId": "site-001",
    "date": "2026-03-05",
    "tradeType": "電気工事",
    "requiredCount": 3,
    "timeSlot": "ALL_DAY",
    "priority": "HIGH",
    "sourceType": "MANUAL",
    "confirmationStatus": "CONFIRMED"
  }
}
```

#### E-3: AIコマンド — 不足検索（正常系）

```
入力: POST /api/ai/command
{ "message": "来週の不足現場を教えて" }

出力:
{
  "success": true,
  "type": "search_result",
  "reply": "来週（3/2〜3/8）の不足現場は3件です:\n1. 品川ホテル新館 — 3/5(水) 電気工事 3名必要、1名不足\n2. 横浜倉庫 — 3/3(月)-3/5(水) 配線 2名必要、未配置\n3. 新宿ビル — 3/7(金) 器具付け 2名必要、1名不足",
  "data": { "shortages": [...] },
  "creditsRemaining": 45
}
```

#### E-4: 認証なしアクセス（異常系）

```
入力: GET /api/site-allocation/weekly（Cookie なし）

出力: 401
{
  "error": true,
  "statusCode": 401,
  "message": "認証が必要です"
}
```

#### E-5: 他テナントの現場アクセス（異常系）

```
入力: GET /api/sites/other-org-site-001
認証: ADMIN (org: demo-org-001)

出力: 404
{
  "error": true,
  "statusCode": 404,
  "message": "現場が見つかりません"
}
```

### §3-F 境界値

| データ項目 | 境界パターン | 期待動作 |
|-----------|-------------|---------|
| Site.name | 1文字 | 許可 |
| Site.name | 100文字 | 許可 |
| Site.name | 101文字 | 400エラー |
| Site.name | 空文字 | 400エラー |
| SiteDemand.requiredCount | 0 | 許可（不要の明示） |
| SiteDemand.requiredCount | 999 | 許可 |
| SiteDemand.requiredCount | -1 | 400エラー |
| SiteDemand.requiredCount | 1000 | 400エラー |
| SiteDemand.confidence | 0.0 | 許可 |
| SiteDemand.confidence | 1.0 | 許可 |
| SiteDemand.confidence | 1.1 | 400エラー |
| PlanningDocument ファイルサイズ | 20MB PDF | 許可 |
| PlanningDocument ファイルサイズ | 21MB PDF | 400エラー |
| PlanningDocument ファイルサイズ | 10MB 画像 | 許可 |
| PlanningDocument ファイルサイズ | 11MB 画像 | 400エラー |
| AIコマンド message | 1文字 | 許可 |
| AIコマンド message | 2000文字 | 許可 |
| AIコマンド message | 2001文字 | 400エラー |
| 週間表示の現場数 | 0件 | 空表示 |
| 週間表示の現場数 | 100件 | 表示可能（スクロール） |

### §3-G 例外応答

| 状況 | ステータス | メッセージ |
|------|-----------|-----------|
| 未認証 | 401 | 認証が必要です |
| 権限不足（MEMBER が Site 作成） | 403 | この操作には管理者権限が必要です |
| 他テナントのリソース | 404 | リソースが見つかりません |
| 必須パラメータ不足 | 400 | [パラメータ名]は必須です |
| バリデーションエラー | 400 | [フィールド名]: [詳細メッセージ] |
| AIクレジット不足 | 402 | AIクレジットが不足しています |
| ファイルサイズ超過 | 400 | ファイルサイズが上限を超えています（PDF: 20MB, 画像: 10MB） |
| 非対応ファイル形式 | 400 | 対応ファイル形式: PDF, JPEG, PNG |
| 工程表解析失敗 | 200 | （parseStatus: FAILED, errorMessage に詳細） |
| 重複 SiteDemand | 409 | 同じ日付・工種・時間帯の需要が既に登録されています |
| AI レート制限 | 429 | リクエストが多すぎます。しばらくお待ちください |

### §3-H Gherkin シナリオ

```gherkin
Feature: 現場ビュー表示
  ADMIN として、現場別の配置状況を把握したい

  Scenario: 現場ベースの週間表示に切り替える
    Given ユーザーは ADMIN として週間ボードにログインしている
    And 3つの現場に合計5件の Schedule が登録されている
    When 「現場ベース」タブをクリックする
    Then 現場×曜日のピボット表示に切り替わる
    And 各セルに配置人数と人名が表示される
    And siteName 未設定の Schedule は「未設定」行に表示される

  Scenario: 過不足の色分け表示
    Given 品川ホテルの 3/5(水) に必要人数 3名、配置 1名が設定されている
    When 現場ベースの週間表示を表示する
    Then 品川ホテルの 3/5(水) セルが赤色で表示される
    And 「1/3 -2」と過不足が表示される

  Scenario: 不足一覧の表示
    Given 来週に3現場で人員不足がある
    When 不足一覧画面を開く
    Then 不足している現場×日×工種の一覧が表示される
    And 不足数の大きい順にソートされている

Feature: AIコマンドバー
  ADMIN として、自然言語で配置操作を行いたい

  Scenario: 不足現場の検索
    Given ユーザーは ADMIN としてログインしている
    When AIコマンドバーに「来週の不足現場を教えて」と入力する
    Then 来週の不足現場の一覧がチャット形式で返される
    And AIクレジットが1消費される

  Scenario: 配置変更のプレビューと確定
    Given 田中太郎が品川ホテルに配置されている
    When AIコマンドバーに「田中を新宿ビルに移して」と入力する
    Then 変更プレビューモーダルが表示される
    And 変更前（品川→）と変更後（→新宿）が明示される
    When 「確定」ボタンをクリックする
    Then Schedule が更新される
    And 監査ログに変更が記録される

  Scenario: 権限不足による書き込み拒否
    Given ユーザーは MEMBER としてログインしている
    When AIコマンドバーに「田中を新宿に移して」と入力する
    Then 「配置変更には管理者権限が必要です」とメッセージが返される
    And Schedule は変更されない

Feature: 工程表AI読み取り
  ADMIN として、工程表から必要人員を自動登録したい

  Scenario: PDF工程表のアップロードと解析
    Given ユーザーは ADMIN としてログインしている
    When 工程表管理画面で PDF をアップロードする
    Then PlanningDocument が PENDING 状態で作成される
    And 解析処理が開始される
    When 解析が完了する
    Then 確認画面に抽出結果が表形式で表示される
    And 各行に confidence（信頼度）が表示される

  Scenario: 解析結果の修正と承認
    Given 工程表の解析結果が確認画面に表示されている
    And 3行目の requiredCount が 2 と誤抽出されている
    When 3行目の requiredCount を 3 に修正する
    And 「承認」ボタンをクリックする
    Then SiteDemand レコードが作成される
    And sourceType が AI_PARSED になる
    And PlanningParseReview に修正履歴が記録される

  Scenario: 解析失敗時の手動救済
    Given 低画質の写真をアップロードした
    When 解析が失敗する
    Then parseStatus が FAILED になる
    And エラーメッセージと「手動で入力する」ボタンが表示される
    When 「手動で入力する」をクリックする
    Then SiteDemand の手動入力フォームが開く

Feature: マルチテナント境界
  テナント間のデータ分離を保証する

  Scenario: 他テナントの現場にアクセスできない
    Given org-A のユーザーがログインしている
    When org-B の現場 ID で GET /api/sites/:id にアクセスする
    Then 404 が返される
    And レスポンスに org-B のデータは含まれない

  Scenario: 全APIで organizationId フィルタが適用される
    Given Site, SiteDemand, PlanningDocument の全APIについて
    Then 全クエリの where 句に organizationId が含まれる
    And organizationId のフォールバック(?? 'default')がない
```

---

## 変更履歴

| 日付 | バージョン | 変更内容 |
|------|-----------|---------|
| 2026-02-24 | v0.1.0 | 初版作成（Draft） |
