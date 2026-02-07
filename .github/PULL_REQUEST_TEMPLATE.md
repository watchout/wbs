# Pull Request

## 概要

<!-- このPRで何を実現するか、1-2文で簡潔に説明 -->

---

## 参照 SSOT

<!-- 必須: このPRがどのSSOTに基づくかを明記 -->

**SSOT**: <!-- 例: docs/SSOT_BILLING.md -->
**要件ID**: <!-- 例: BILLING-001 US-1 -->

---

## Plane / GitHub Issue

<!-- 必須: 対応するIssueのURL -->

**Issue**: <!-- 例: https://plane.arrowsworks.com/co/projects/WBS/issues/WBS-XX -->

---

## テスト証跡（省略禁止）

### 1. typecheck 結果

```bash
npm run typecheck
# ここに出力を貼り付け（エラー 0 であること）
```

### 2. test 結果

```bash
npm run test
# ここに出力を貼り付け（全テスト通過であること）
```

### 3. ブラウザ確認（UI変更がある場合）

<!-- スクリーンショットまたは動作確認の記録 -->
<!-- コンソールエラーがないことを確認 -->

---

## DoD チェックリスト（Phase 1 - Level 2）

### 必須（全項目チェック必須。未チェックの PR はマージ禁止）

- [ ] Issue・タスクと紐付け済み
- [ ] SSOT との整合性を確認済み
- [ ] .cursorrules 準拠
  - [ ] 生 SQL なし（Prisma ORM のみ）
  - [ ] `organizationId` スコープ適用
  - [ ] `requireAuth()` 使用
  - [ ] `any` 型なし
  - [ ] `console.log` なし（構造化ロガー使用）
- [ ] `npm run typecheck` 通過（エラー 0）
- [ ] `npm run test` 通過（全テスト通過）
- [ ] ブラウザ動作確認済み（UI 変更がある場合）
- [ ] ドキュメント更新済み（仕様変更がある場合）
- [ ] テスト証跡を上記に貼り付け済み

### スキーマ変更がある場合（追加チェック）

- [ ] `prisma/schema.prisma` を編集済み
- [ ] `npx prisma migrate dev --name <変更内容>` でマイグレーション作成済み
- [ ] マイグレーションファイルをコミット済み
- [ ] `prisma/seed.ts` を必要に応じて更新済み

---

## 禁止パターンチェック

- [ ] `$queryRaw` / `$executeRaw` なし
- [ ] 既存マイグレーションファイルの変更なし
- [ ] 環境変数のハードコードなし
- [ ] エラーの握りつぶしなし

---

**参考**: [完了の定義（DoD）](../docs/DONE_DEFINITION.md) | [テスト戦略](../docs/TEST_STRATEGY.md)
