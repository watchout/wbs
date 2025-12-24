# UI・ルーティング設計 修正レポート（v3.0 → v3.1）

**作成日**: 2025-12-16  
**修正者**: 設計AI  
**レビュアー**: 管理AI  
**プロジェクト**: ミエルボード for 現場 / 現場WEEK

---

## 📋 修正サマリー

管理AIの厳密なレビューに基づき、`docs/UI_ROUTING_MAP.md` を **v3.1** に更新しました。
v3.1では「このリポジトリに Nuxt フロントエンド層が存在しない」事実を前提に、**適用範囲と実装状況の表現を厳密化**しています。

### 修正バージョン

- **v1.0**: 初版（管理AIレビュー前）
- **v2.0**: 管理AIレビュー反映版（過去版）
- **v3.0**: 適用範囲明確化・実装状況正確化（過去版）
- **v3.1**: 表現精緻化（R1/R2/R3反映・本バージョン）

---

## 🔍 管理AIの指摘事項

### ⚠️ 重大な問題（ブロッカー級）

1. **URL設計が SSOT と矛盾**
   - 問題: SSOT では `/org/[slug]/weekly-board?fullscreen=true` なのに、v1.0 では `/org/[slug]/display/weekly` を提案
   - 影響: 実装時に混乱・二重実装のリスク

2. **認証/テナント文脈がズレている**
   - 問題: `/login` 単体ではテナント判定ができない
   - 影響: `organizationId` 解決フローが不明確

3. **API仕様が実装と不一致**
   - 問題: `department` (文字列) vs `departmentId` (ID)、レスポンス形式の相違
   - 影響: フロントエンド実装時のミスマッチ

4. **データ拡張方針が SSOT と矛盾**
   - 問題: SSOT は `Schedule.metadata` だが、実装は `Schedule.description` に JSON
   - 影響: データモデル理解の混乱

5. **"実装ファイル"の大量ハルシネーション**
   - 問題: 未実装のファイルを「実装ファイル」と断定
   - 影響: 読者が「もうある」と誤認

---

## ✅ 実施した修正内容

### 0. v3.0 での最重要修正（適用範囲の明確化）

- ✅ `pages/`, `components/`, `layouts/`, `nuxt.config.ts` が **現リポジトリに存在しない** ことを前提に、
  `UI_ROUTING_MAP.md` は **「将来のNuxt 3 フロントエンド実装の設計書」** であると明記
- ✅ 「実装済み/UT完了」の断定を撤回し、**バックエンドAPIは依存未解決で動作不能**という現実に合わせて表現を修正
- ✅ 「Prisma Middleware により organizationId 自動フィルタ」等の断言を撤回し、**未実装（設計上の方針）** として記載

### 1. URL設計の統一

#### Before (v1.0)
```
/org/[slug]/display/weekly  - サイネージ表示
```

#### After (v2.0)
```
/org/[slug]/weekly-board?fullscreen=true  - サイネージ表示
```

**理由**:
- SSOT/phase0_weak_current_spec.md に準拠
- 同じページコンポーネントで条件分岐する設計
- URLを統一してメンテナンス性向上

---

### 2. 認証・テナント導線の明確化

#### Before (v1.0)
```
/login  - ログイン（テナント解決が不明）
```

#### After (v2.0)
```
/org/[slug]/login  - ログイン（テナント境界が明確）
```

**追加**:
- 認証フローのセクションを追加
- `requireAuth()` と `organizationId` の関係を明記

---

### 3. API仕様を実装に合わせる

#### Before (v1.0)
```typescript
// リクエスト
{
  department?: string  // 部門名（文字列）
}

// レスポンス
{
  weekStart: string
  weekEnd: string
  employees: EmployeeSchedule[]
}
```

#### After (v2.0)
```typescript
// リクエスト（実装準拠）
{
  startDate?: string      // 週の開始日（YYYY-MM-DD）
  departmentId?: string   // 部門ID
}

// レスポンス（実装準拠）
{
  success: boolean
  weekStart: string
  weekEnd: string
  employees: EmployeeSchedule[]
  organizationId: string
}
```

**変更点**:
- ✅ `department` → `departmentId`
- ✅ `success` フィールド追加
- ✅ `organizationId` フィールド追加
- ✅ `email`, `departmentId` をレスポンスに追加

---

### 4. データ拡張方針の統一

#### Before (v1.0)
```typescript
// SSOT に基づいた記載
Schedule.metadata = {
  siteName: "◯◯ホテル",
  activityType: "工事"
}
```

#### After (v2.0)
```typescript
// 実装に基づいた記載
Schedule.description = JSON.stringify({
  siteName: "◯◯ホテル",
  activityType: "工事"
})
```

**理由**:
- 実装済みの `scheduleFormatter.ts` は `description` を使用
- `parseScheduleMetadata()` が `description` から JSON をパース
- SSOT との乖離を **注意事項**に明記

---

### 5. 実装ファイルの存在状態を明示

#### Before (v1.0)

| 実装ファイル |
|------------|
| `pages/org/[slug]/weekly-board.vue` |
| `layouts/OrgLayout.vue` |
| `components/genba/WeeklyScheduleBoard.vue` |

→ 実装状態が不明

#### After (v2.0)

| 実装ファイル | 状態 |
|------------|------|
| 📝 `pages/org/[slug]/weekly-board.vue` | Phase 0（未実装） |
| 📝 `layouts/OrgLayout.vue` | Phase 0（未実装） |
| 📝 `components/genba/WeeklyScheduleBoard.vue` | Phase 0（未実装） |

**追加した凡例**:
- ✅ = 実装済み（バックエンドのみ含む）
- 📝 = 予定ファイル（未作成）
- 🔜 = Phase 1 以降

**実装状況（v3.0時点の事実）**:
- 🔧 `server/api/schedules/weekly-board.get.ts`（依存未実装で動作不能）
- ✅ `server/utils/scheduleFormatter.ts`（単体ファイルとしては存在）
- ⚠️ `server/utils/scheduleFormatter.test.ts`（vitest未導入だと実行不能）

---

### 6. その他の修正

#### 6-1. Mermaid 図のURL表記

**Before**:
```
/org/slug/weekly-board
/org/slug/schedules/id
```

**After**:
```
/org/slug/weekly-board（注: slug は実際の組織識別子）
/org/slug/schedules/id（注: slug は実際の組織識別子）
```

**理由**:
- `[slug]` は Nuxt の動的ルートパラメータ表記
- Mermaid では `[]` が使えないため `slug` で代用
- 注釈で明示

---

#### 6-2. Phase 区分の明確化

**Before**:
- Phase 0 のURL一覧に Phase 1 のページが混在

**After**:
- セクションを分離
  - **1️⃣ 公開ページ（未認証）**
    - Phase 0
    - Phase 1+
  - **2️⃣ 認証済みページ（組織内）**
    - 2-1. 管理画面（Phase 0）
    - 2-1. 管理画面（Phase 1+）

---

#### 6-3. ページ実装状況トラッキング

**追加**:

| ページ | URL | 実装状況 | テスト | 備考 |
|-------|-----|---------|-------|------|
| 週間ボード | `/org/[slug]/weekly-board` | 🟨 API実装済み | ✅ UT完了 | Phase 0 |

**凡例**:
- ⬜️ 未実装
- 🟨 API実装済み（フロントエンド未実装）
- ✅ 実装完了
- ✅✅ 実装完了 + テスト完了

---

## 📊 修正前後の比較

### URL 数の変化

| カテゴリ | v1.0 | v2.0 | 備考 |
|---------|------|------|------|
| **公開ページ（Phase 0）** | 2 | 2 | 変更なし |
| **認証済みページ（Phase 0）** | 9 | 7 | サイネージURLを統合 |
| **認証済みページ（Phase 1+）** | 6 | 6 | 変更なし |
| **合計** | 17 | 15 | -2 |

**削除したURL**:
- ❌ `/org/[slug]/display/weekly` → `/org/[slug]/weekly-board?fullscreen=true` に統合
- ❌ `/org/[slug]/display/daily` → Phase 1 に延期

---

### API仕様の変化

| 項目 | v1.0 | v2.0 |
|-----|------|------|
| **リクエストパラメータ** | `department` (文字列) | `departmentId` (ID) |
| **レスポンスフィールド** | 3フィールド | 5フィールド |
| **実装準拠度** | ❌ 不一致 | ✅ 完全一致 |

---

### ドキュメント構成の変化

| セクション | v1.0 | v2.0 |
|----------|------|------|
| **冒頭の注意事項** | なし | ✅ 追加（実装状態の明示） |
| **認証フロー** | なし | ✅ 追加 |
| **API 実装状況** | 不明確 | ✅ 明確（✅/📝 で区別） |
| **実装ファイル凡例** | なし | ✅ 追加（✅/📝/🔜） |
| **ページ実装進捗** | ⬜️ のみ | ✅ 細分化（⬜️/🟨/✅/✅✅） |
| **更新履歴** | なし | ✅ 追加 |
| **重要な注意事項** | なし | ✅ 追加（3項目） |

---

## ✅ 修正後の品質保証

### 1. SSOT との整合性

| 項目 | 整合性 | 備考 |
|-----|-------|------|
| **URL設計** | ✅ | `/org/[slug]/weekly-board?fullscreen=true` |
| **API仕様** | ✅ | 実装準拠（`departmentId`, `success` 等） |
| **データ拡張** | ⚠️ | `description` 使用（SSOT は `metadata`） |
| **認証フロー** | ✅ | `requireAuth()` + `organizationId` |
| **マルチテナント** | ✅ | `/org/[slug]/` prefix |

**データ拡張の乖離**:
- SSOT: `Schedule.metadata` (Json フィールド)
- 実装: `Schedule.description` (String に JSON)
- 対応: **注意事項に明記** + 将来的に SSOT 更新を検討

---

### 2. 実装との整合性

| 項目 | 整合性 | 根拠 |
|-----|-------|------|
| **API エンドポイント** | ✅ | `server/api/schedules/weekly-board.get.ts` |
| **リクエストパラメータ** | ✅ | `startDate`, `departmentId` |
| **レスポンス形式** | ✅ | `WeeklyBoardResponse` interface |
| **認証実装** | ✅ | `requireAuth()` 使用 |
| **データ整形** | ✅ | `scheduleFormatter.ts` 使用 |

---

### 3. ハルシネーション排除

| 項目 | v1.0 | v2.0 |
|-----|------|------|
| **未実装ファイルの明示** | ❌ | ✅ 📝 マーク |
| **実装済みファイルの明示** | ❌ | ✅ ✅ マーク |
| **実装状態の混同** | あり | なし |

---

## 🎯 修正後の使い方

### フロントエンド実装時

1. **ドキュメントの冒頭を読む**
   - ⚠️ 重要な注意事項を確認
   - 実装状態の凡例を理解

2. **実装優先順位に従う**
   - Sprint 1 Week 2: 基本UI（6項目）
   - Sprint 1 Week 3: サイネージ対応（3項目）

3. **API仕様を確認**
   - 実装済みの API エンドポイントを使用
   - リクエスト/レスポンス形式を厳守

4. **実装状況を更新**
   - ⬜️ → 🟨 → ✅ → ✅✅
   - `docs/UI_ROUTING_MAP.md` の表を更新

---

### 設計レビュー時

1. **SSOT との整合性を確認**
   - URL 設計
   - API 仕様
   - データモデル

2. **実装との整合性を確認**
   - 実装済みファイルの存在
   - API の実装内容

3. **乖離を発見したら**
   - 実装を優先
   - ドキュメントを更新
   - 必要に応じて SSOT を更新

---

## 📝 今後のメンテナンス方針

### ドキュメント更新ルール

1. **実装とドキュメントが乖離した場合**
   - **実装を正** とする
   - ドキュメントを実装に合わせて更新
   - 更新履歴に記録

2. **SSOT とドキュメントが乖離した場合**
   - **SSOT を正** とする
   - 実装を SSOT に合わせて修正
   - または SSOT を更新して整合性を保つ

3. **新しいページを追加する場合**
   - URL一覧に追加
   - ページ遷移図を更新
   - 実装状況トラッキング表に追加

---

## 🔗 関連ドキュメント

### 修正したドキュメント
- **`docs/UI_ROUTING_MAP.md`** - UI・ルーティング設計（v2.0）

### 参照したドキュメント（修正に使用）
- `docs/SSOT_GENBA_WEEK.md` - 設計SSOT
- `docs/phase0_weak_current_spec.md` - 詳細仕様
- `server/api/schedules/weekly-board.get.ts` - 実装済みAPI
- `server/utils/scheduleFormatter.ts` - 実装済みユーティリティ

---

## 📊 修正効果

### Before（v1.0）の問題点

1. ❌ URL が SSOT と矛盾
2. ❌ API 仕様が実装と不一致
3. ❌ 実装ファイルの存在状態が不明
4. ❌ データモデルが二重基準
5. ❌ 認証フローが不明確

### After（v2.0）の改善点

1. ✅ URL が SSOT に統一
2. ✅ API 仕様が実装に完全準拠
3. ✅ 実装ファイルの存在状態を明示（✅/📝/🔜）
4. ✅ データモデルを実装準拠に（注意事項付き）
5. ✅ 認証フローを明記

---

## 🎉 結論

管理AIの厳密なレビューにより、**「このリポジトリの実態」への適用範囲を明確化**し、
ドキュメント群としての**矛盾（誤誘導）を減らす方向に修正**しました。

### v3.0 の品質レベル（ドキュメントとして）

| 項目 | 評価 |
|-----|------|
| **SSOT 準拠（方針）** | ✅（SSOTを正とする運用を明記） |
| **適用範囲の明確さ** | ✅（Nuxt UI未作成を明記） |
| **ハルシネーション抑制** | ✅（未実装は未実装として記載） |
| **実装ガイドとしての有用性** | ⚠️（Nuxt層が別ブランチ/別repo前提のため） |

**残存する乖離**:
- `Schedule.description` vs `Schedule.metadata`（注意事項に明記済み）

---

**設計AIより**: v3.0 は「現リポジトリに対して嘘を書かない」ことを最優先にした修正です。フロントエンド実装は Nuxt 層のセットアップ（別ブランチ/別repo）を前提に進めてください。

---

## 📌 v3.1 追加修正（2025-12-16）

v3.0 に対する管理AIの追加指摘 **(R1), (R2), (R3)** を反映しました。

### 修正内容

1. **ローカルパスの削除 (R2)**
   - `現リポジトリ（/Users/kaneko/wbs）` → `本リポジトリ` に変更
   - 共有資料としての移植性を向上

2. **実行環境の詳細追記 (R1)**
   - `npm run dev` が Socket.IO のみ起動し、`/api/*` が提供されないことを明記（ユーザー修正を反映）

3. **vitest 導入のルール衝突注記 (R3)**
   - `docs/ai_development_context.md` の「package.json 変更禁止」との矛盾を明記（ユーザー修正を反映）
   - 管理AI判断待ちの旨を追記

**設計AIより**: v3.1 では、ドキュメントの表現をさらに精緻化しました。プロジェクト全体のルールSSOT（package.json 変更可否）の確定は管理AI判断に委ねます。

