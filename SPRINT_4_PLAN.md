# Sprint 4 Development Plan — 工程表AI読み取り実装

> **日時**: 2026-03-16
> **担当**: 開発チーム
> **期間**: 1週間（5営業日）

---

## 📋 概要

Sprint 3 の **AIコマンドバー** 完了に続き、Sprint 4 では **工程表（PDF/画像）の AI 解析** に取り組む。

現場の工程表を Vision AI（GPT-4o/Claude）で自動読み取りし、必要人員情報を構造化データ（SiteDemand）に変換するプラットフォームを構築する。

### キャッチコピー
```
「工程表の写真を撮るだけで、必要人数が自動で配置表に反映される」
```

---

## 🎯 目的

- **工程表データの自動抽出**: 紙/PDF の工程表 → デジタル化
- **AI信頼度の可視化**: 解析精度を数値化（confidence 0-1）
- **人間確認の仕組み**: 承認画面で修正可能（AI完全自律化 ✗）
- **監査トレーサビリティ**: 誰が・いつ・何を修正したか全て記録
- **Sprint 5 への架け橋**: AI配置提案の基盤データ準備

---

## 📚 SSOT 参照

| 項目 | 場所 |
|------|------|
| **主要仕様** | `docs/SSOT_SITE_ALLOCATION.md` §6 Sprint 4 |
| **データモデル** | `docs/SSOT_SITE_ALLOCATION.md` §9（新テーブル定義） |
| **API仕様** | `docs/SSOT_SITE_ALLOCATION.md` §10 |
| **UI仕様** | `docs/SSOT_SITE_ALLOCATION.md` §11 |

---

## ✅ 受け入れ条件（Acceptance Criteria）

### AC-S4-01: PDF/画像をアップロードできる
- **画面**: `/org/[slug]/admin/planning-documents`
- **操作**: ドラッグ&ドロップ、またはファイル選択
- **対応形式**: PDF（テキスト埋め込み + 画像PDF）、JPEG、PNG
- **ファイルサイズ制限**: 10MB
- **フィードバック**: アップロード進度表示、エラーメッセージ

### AC-S4-02: 解析結果が表形式の確認画面に表示される
- **画面**: `/org/[slug]/admin/planning-documents/[id]/review`
- **表示内容**: 現場名、日付/期間、工種、必要人数、信頼度
- **レイアウト**: 行=抽出項目、列=フィールド値
- **UI要素**: 信頼度バッジ（色分け）、AI抽出インジケータ

### AC-S4-03: 確認画面で行単位の修正ができる
- **操作**: 行をクリック → インライン編集UI
- **修正可能項目**: 現場名、日付、工種、必要人数
- **制約**: 確認前のみ修正可能（ステートチェック）
- **UX**: 修正内容はハイライト表示

### AC-S4-04: 承認後に SiteDemand レコードが作成される
- **トリガー**: 確認画面の「承認」ボタン押下
- **処理**: 表の全行から SiteDemand 生成（トランザクション）
- **ステート遷移**: PlanningDocument.parseStatus: PARSED
- **フィードバック**: 成功メッセージ、成功後に一覧画面へ遷移

### AC-S4-05: 作成された SiteDemand の sourceType が `AI_PARSED` になる
- **DB**: SiteDemand.sourceType = `AI_PARSED`
- **目的**: 手入力（MANUAL）との区別
- **影響**: Sprint 5 の AI提案ロジックで sourceType を参照

### AC-S4-06: confidence（信頼度 0-1）が記録される
- **DB**: SiteDemand.confidence フィールド
- **計算方式**: Vision AI レスポンス内の confidence スコア平均
- **表示**: 確認画面に信頼度バッジ表示（例: "92% 信頼度"）
- **活用**: Sprint 5 で提案スコアの加重に使用

### AC-S4-07: 同一工程表の再アップロードが冪等（重複作成しない）
- **識別方式**: ファイル MD5 ハッシュ、またはファイル名 + uploadDate
- **動作**: 再アップロード時に既存ドキュメントを検出 → 新規作成スキップ
- **UX**: 「既に処理済み」メッセージ表示
- **テスト**: 同一ファイルを2回アップロード → 1件のみ生成

### AC-S4-08: 解析失敗時にエラーメッセージと手動入力への導線が表示される
- **エラーケース**:
  - ファイル形式非対応
  - Vision API エラー
  - テキスト抽出失敗（画像PDF）
  - タイムアウト（解析時間超過）
- **UX**: エラー画面 → 「手動入力画面へ」リンク表示
- **ログ**: エラー内容を PlanningDocument.errorMessage に記録

### AC-S4-09: 修正履歴が PlanningParseReview に記録される
- **記録項目**:
  - 何を修正したか（fieldPath: `demands[3].requiredCount`）
  - 修正前の値（beforeValue）
  - 修正後の値（afterValue）
  - 誰が修正したか（reviewedBy: userId）
  - いつ修正したか（reviewedAt: datetime）
- **用途**: 監査ログ、変更履歴の追跡
- **UI**: 確認画面に修正履歴ビューア（オプション）

---

## 🏗️ 実装アーキテクチャ

### DB層（Prisma）

#### 新テーブル: PlanningDocument
```prisma
model PlanningDocument {
  id              String   @id @default(cuid())
  organizationId  String   @db.Uuid
  siteId          String?  @db.Uuid  // 紐付け現場（不明なら NULL）
  fileName        String
  fileType        Enum     // PDF | IMAGE
  storagePath     String
  fileSize        Int
  parseStatus     Enum     // PENDING | PARSING | PARSED | FAILED | NEEDS_REVIEW
  parserVersion   String?
  rawExtractJson  Json?
  summaryText     String?
  errorMessage    String?
  uploadedBy      String   @db.Uuid  @relation("User")
  uploadedAt      DateTime @default(now())
  parsedAt        DateTime?

  organization    Organization @relation(fields: [organizationId], references: [id])
  site            Site?        @relation(fields: [siteId], references: [id])
  reviews         PlanningParseReview[]
  siteDemands     SiteDemand[]
}
```

#### 新テーブル: PlanningParseReview
```prisma
model PlanningParseReview {
  id          String   @id @default(cuid())
  documentId  String   @db.Uuid
  fieldPath   String   // "demands[3].requiredCount"
  beforeValue String?
  afterValue  String
  reviewedBy  String   @db.Uuid  @relation("User")
  reviewedAt  DateTime @default(now())

  document    PlanningDocument @relation(fields: [documentId], references: [id])
}
```

#### SiteDemand 拡張
```prisma
// 追加カラム:
sourceType            Enum      // MANUAL | AI_PARSED | IMPORTED
sourceDocumentId      String?   @db.Uuid  @relation("PlanningDocument")
confidence            Float?    // 0.0-1.0
```

#### インデックス
```prisma
@@index([organizationId, siteId, date])
@@index([organizationId, date])
@@index([parseStatus])
@@unique([siteId, date, tradeType, timeSlot])
```

### API層

#### エンドポイント一覧

| Method | Path | 説明 | AC |
|--------|------|------|-----|
| POST | `/api/planning-documents/upload` | ファイルアップロード + 初期解析 | AC-S4-01 |
| GET | `/api/planning-documents/:id` | 解析結果取得 | AC-S4-02 |
| POST | `/api/planning-documents/:id/confirm` | 結果承認 → SiteDemand 作成 | AC-S4-04, 05, 07 |
| PATCH | `/api/planning-documents/:id/patch` | 行単位修正 | AC-S4-03, 09 |
| GET | `/api/planning-documents` | ドキュメント一覧 | - |

### サーバー処理

#### 1. Vision AI 連携（工程表パース）
- **使用API**: GPT-4o Vision API（またはClaude Opus Vision）
- **入力**: PDF テキスト + 画像（base64）
- **出力**: JSON 構造化データ（表検出 → セル抽出）
- **プロンプト例**:
  ```
  この工程表から以下を抽出してください:
  - 現場名（複数個あれば "主現場名 / 副現場" 形式）
  - 日付範囲
  - 工種（電気工事、配線、器具付けなど）
  - 必要人数
  - 時間帯（終日 / 午前 / 午後 / 夜間）
  
  JSON 形式で返却: { site_name, date_range, trade_type, required_count, time_slot, confidence }
  ```

#### 2. PDF テキスト抽出
- **パッケージ**: `pdf-parse`（Node.js）
- **処理**: 埋め込みテキスト抽出（失敗時は画像化してOCR）

#### 3. 工程表パース実装
- **機能**:
  - 表検出（Vision API で行う）
  - セル値抽出
  - 日付パース（"2026年3月20日" → "2026-03-20"）
  - 現場名マッピング（"品川" → Site.id 検索）
- **信頼度スコア**: Vision API response の `confidence` フィールドを使用

#### 4. 重複チェック（冪等性）
```typescript
// ファイルMD5ハッシュで既存確認
const md5 = crypto.createHash('md5').update(fileBuffer).digest('hex');
const existing = await db.planningDocument.findUnique({
  where: { md5Hash: md5 }
});
if (existing) {
  // 既存ドキュメント返却（再作成しない）
  return { id: existing.id, isNew: false };
}
```

### UI層

#### 新規スクリーン

**SCR-PLANNING-UPLOAD** (`/org/[slug]/admin/planning-documents`)
```
┌─────────────────────────────────────┐
│  工程表管理                         │
├─────────────────────────────────────┤
│                                     │
│  ▭▭▭▭ DRAG & DROP AREA ▭▭▭▭       │
│  ファイルをここにドラッグしてください    │
│     または [ファイルを選択]           │
│                                     │
│  対応形式: PDF, JPEG, PNG           │
│  最大サイズ: 10MB                   │
│                                     │
├─────────────────────────────────────┤
│ 過去のアップロード                    │
├─────────────────────────────────────┤
│ ファイル名          | 現場 | 日時    │
│ 2026年3月_工程表.pdf | 品川 | 3/15 │
│ ...                                 │
└─────────────────────────────────────┘
```

**SCR-PLANNING-REVIEW** (`/org/[slug]/admin/planning-documents/[id]/review`)
```
┌────────────────────────────────────────┐
│  工程表確認                            │
│  [←戻る]                              │
├────────────────────────────────────────┤
│ ファイル: 2026年3月_工程表.pdf          │
│ 状態: 解析完了（信頼度: 92%）           │
├────────────────────────────────────────┤
│ 現場名  | 日付     | 工種 | 人数 | 信頼 │
├────────────────────────────────────────┤
│ 品川    | 3/20-22 | 電気 | 3人  | 92% │
│ 新宿    | 3/21-23 | 配線 | 2人  | 85% │
│ 渋谷    | 3/24    | 器具 | 1人  | 78% │
├────────────────────────────────────────┤
│ [キャンセル]           [承認して確定]   │
└────────────────────────────────────────┘
```

---

## 📊 実装フェーズと見積もり

| Phase | タスク | 見積 | GitHub Issue |
|-------|--------|------|--------------|
| **1** | DB準備（テーブル定義、マイグレーション） | 4h | #429 |
| **2** | Vision AI統合 | 3h | #430 |
| **2** | アップロードAPI | 2h | #431 |
| **2** | 確認・承認API | 2h | #432 |
| **2** | 修正・ログAPI | 1h | #433 |
| **3** | アップロード画面UI | 3h | #434 |
| **3** | 確認画面UI | 3h | #435 |
| **4** | E2E & Unit テスト | 4h | #436 |
| | **合計** | **20h** | |

### 実装順序
```
Phase 1 (DB) 
    ↓
Phase 2 (API) ← Phase 1 完了後開始
    ↓
Phase 3 (UI) ← Phase 2 のアップロード・確認API 完了後開始
    ↓
Phase 4 (Test) ← Phase 2, 3 完了後開始
```

**推奨スケジュール**: 1週間（月〜金）
- 月火: Phase 1, 2-a (API Design)
- 水: Phase 2-b/c (API Impl)
- 木: Phase 3 (UI)
- 金: Phase 4 (Test)

---

## 🔗 依存関係

### 外部依存
- **Vision API**: GPT-4o または Claude 3 Opus
  - 初期化: `OPENAI_API_KEY` または `ANTHROPIC_API_KEY` を `.env` に設定
  - レート制限: API呼び出しは非同期ジョブで管理

- **ファイルストレージ**: ローカルディスク または S3
  - 初期: `./uploads/planning-documents/` に保存
  - 本番: AWS S3（オプション）

### 内部依存
- **SiteDemand**: Sprint 2 で実装済み（拡張される）
- **Site マスタ**: Sprint 2 で実装済み
- **User 認証**: 既存の RBAC（ADMIN のみアップロード可能）

### Sprint 5 との接続
```
Sprint 4 で生成された SiteDemand
  ↓ (sourceType = AI_PARSED)
Sprint 5 の AI配置提案ロジック
  ↓
不足セルに AI候補人員を提案
```

---

## ⚠️ リスク・制約

| # | リスク | 影響度 | 対策 |
|----|--------|--------|------|
| R1 | Vision API の解析精度が低い（複雑な表形式） | 高 | テンプレート化、段階的パース、手修正導線 |
| R2 | PDF画像化の時間コスト（大量ページ） | 中 | ページ数制限（初期: 10ページまで） |
| R3 | ファイルアップロードのS3コスト増加 | 低 | ローカルストレージで十分検証可能 |
| R4 | 既存 SiteDemand との整合性崩れ | 中 | `sourceType` で区別、migration script テスト |
| R5 | エラー時の手修正導線の整備不足 | 中 | 確認画面 UI で全項目修正可能に設計 |

---

## 📋 チェックリスト

### 事前準備
- [ ] docs/SSOT_SITE_ALLOCATION.md を全読
- [ ] Vision API キー設定確認
- [ ] Prisma schema バージョン確認
- [ ] テスト工程表（PDF/画像）の準備

### 実装中
- [ ] 各フェーズ完了後に GitHub Issue を close
- [ ] コミットメッセージは conventional commits に従う
- [ ] PR は必ず code review をもらう
- [ ] テストカバレッジ 80% 以上

### 完了判定
- [ ] 全受け入れ条件（AC-S4-01〜09）を満たすか確認
- [ ] E2E テストが成功
- [ ] 実工程表での解析精度確認（手動テスト）
- [ ] ドキュメント更新（API doc, CLAUDE.md など）

---

## 📞 Q&A・相談

- **工程表の形式について**: 実際の工程表画像を共有してください → Vision AI プロンプト調整
- **信頼度スコアの閾値**: 初期は表示のみ。Sprint 5 で活用予定
- **多言語対応**: 初期は日本語のみ。多言語化は後続 Phase で検討
- **バッチ処理**: 複数ファイル一括アップロードは Sprint 5 で検討

---

## 📝 GitHub Issues

| Issue # | タイトル | フェーズ |
|---------|---------|---------|
| #428 | [Sprint 4] 工程表AI読み取り実装 | EPIC |
| #429 | [Sprint 4-DB] PlanningDocument & PlanningParseReview テーブル | 1 |
| #430 | [Sprint 4-API] Vision AI統合（工程表パース） | 2 |
| #431 | [Sprint 4-API] POST /api/planning-documents/upload | 2 |
| #432 | [Sprint 4-API] POST /api/planning-documents/:id/confirm | 2 |
| #433 | [Sprint 4-API] 修正・ログ エンドポイント | 2 |
| #434 | [Sprint 4-UI] アップロード画面実装 | 3 |
| #435 | [Sprint 4-UI] 確認画面実装 | 3 |
| #436 | [Sprint 4-TEST] E2E & Unit テスト実装 | 4 |

---

## 🎉 成功基準

**Sprint 4 完了の定義**:
```
✅ 全受け入れ条件（AC-S4-01〜09）を達成
✅ GitHub Issues #428 を close
✅ 実工程表での解析精度 80% 以上（手動テスト）
✅ E2E テスト 100% pass
✅ コードレビュー通過 & main ブランチマージ
```

---

**Plan Created**: 2026-03-16 16:23 GMT+9  
**Owner**: 開発チーム  
**Status**: PLAN_READY
