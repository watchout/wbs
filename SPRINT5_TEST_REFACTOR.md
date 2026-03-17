# Sprint 5: テストモック層リファクタリング計画

> Sprint 4 完了時点で全843テストが通過。
> Sprint 5では、モック層の根本的な改善と E2E テスト拡張を実施。

---

## 現在の状態

### テスト統計
- **合計テストファイル:** 62 ファイル
- **合計テストケース:** 843 個
- **通過率:** 100%
- **実行時間:** 1.66 秒

### 既知の技術債
1. **モック層の競争状態**
   - `vi.mock()` (グローバル) vs `vi.doMock()` (ダイナミック) の混在
   - 環境変数変更時のモジュール再インポート時に発生
   - 解決済み: `webhook.test.ts` で完全統一

2. **型付きモック定義の欠落**
   - モック関数の戻り値型が明示的に定義されていない
   - 一部テストで `as any` を使用

3. **テスト間の状態共有リスク**
   - グローバル `vi.mock()` が存在すると、テスト間でモック状態が予期せず共有される

---

## Sprint 5 改善計画

### Phase 1: モック層統一（優先度: 高）

**目標:** すべてのテストで `vi.doMock()` パターンに統一

#### 対象ファイル
- `server/api/billing/webhook.test.ts` ✅ **完了**
- `server/api/auth/*.test.ts` （6ファイル）
- `server/api/*.test.ts` （残り20ファイル）

#### パターン
```typescript
// ❌ 古いパターン（グローバルモック）
vi.mock('h3', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, /* mocks */ }
})

// ✅ 新パターン（beforeEachでダイナミック）
beforeEach(async () => {
  vi.resetModules()
  vi.doMock('h3', async (importOriginal) => {
    const actual = await importOriginal()
    return { ...actual, /* mocks */ }
  })
  const mod = await import('./handler')
  handler = mod.default
})
```

#### 実装ステップ
1. 各テストファイルから `vi.mock()` グローバルを削除
2. `beforeEach` で全モックを `vi.doMock()` として登録
3. モジュール再インポートロジックを統一
4. 型定義を厳密に

### Phase 2: E2Eテスト拡張（優先度: 中）

**目標:** 主要フロー・エラーハンドリング・パフォーマンスの確認

#### 新規ファイル
- `tests/e2e/main-flow.spec.ts` ✅ **作成済み**
  - ユーザー登録・ログイン
  - データ CRUD フロー
  - ページ間遷移

#### 追加予定
- `tests/e2e/performance.spec.ts`
  - ページロード時間測定
  - API レスポンス時間測定
  - バンドルサイズ確認

- `tests/e2e/error-handling.spec.ts`
  - 404/500 エラーページ
  - 入力バリデーション
  - ネットワークエラー時の動作

### Phase 3: CI/CD パイプライン調整（優先度: 中）

**目標:** テスト・ビルド・デプロイの効率化

#### 実装内容
- E2Eテスト実行ステップの追加（`.github/workflows/test.yml`）
- デプロイ前チェックスクリプト (`scripts/deploy-checklist.sh`) ✅ **作成済み**
- パフォーマンスベンチマーク記録

---

## テスト実行コマンド

### 現在利用可能
```bash
# ユニットテスト（vitest）
npm test                    # 全テスト実行
npm run test:watch         # ウォッチモード
npm run test:coverage      # カバレッジ報告

# E2Eテスト（Playwright）
npm run test:e2e           # 全E2Eテスト実行
npm run test:e2e:watch     # ウォッチモード
npm run test:e2e:debug     # デバッグモード

# デプロイ前チェック
./scripts/deploy-checklist.sh
```

### Sprint 5 で追加予定
```bash
npm run test:perf          # パフォーマンステスト
npm run test:all           # 全テスト実行（ユニット + E2E）
```

---

## リファクタリング チェックリスト

### モック層統一
- [ ] `server/api/auth/*.test.ts` 統一
- [ ] `server/api/billing/*.test.ts` 統一
- [ ] `server/api/meetings/*.test.ts` 統一
- [ ] `server/api/schedules/*.test.ts` 統一
- [ ] `server/api/users/*.test.ts` 統一
- [ ] `server/api/departments/*.test.ts` 統一
- [ ] `server/api/platform/*.test.ts` 統一
- [ ] その他 API テスト

### E2Eテスト
- [x] `tests/e2e/main-flow.spec.ts` 作成
- [ ] `tests/e2e/performance.spec.ts` 作成
- [ ] `tests/e2e/error-handling.spec.ts` 作成
- [ ] CI で E2Eテスト実行確認

### ドキュメント
- [x] このファイル作成
- [ ] テストガイド更新
- [ ] デプロイドキュメント更新

---

## 技術的背景

### なぜモック層の統一が必要か？

Vitest での `vi.mock()` と `vi.doMock()` の違い:

| 特性 | `vi.mock()` | `vi.doMock()` |
|------|-----------|--------------|
| 定義位置 | ファイル最上位 | 関数内（beforeEach等） |
| 有効範囲 | グローバル（全テスト） | ダイナミック（現在のコンテキスト） |
| モジュール再インポート | 反映されない | 反映される |
| 環境変数変更との相性 | 悪い | 良い |

**結論:** 環境変数や設定を動的に変更するテスト（例：`process.env.STRIPE_WEBHOOK_SECRET` の削除）では `vi.doMock()` が必須。

---

## 参考資料

- [Vitest Mock Documentation](https://vitest.dev/api/vi.html#vi-mock)
- [Previous Fix in webhook.test.ts](./server/api/billing/webhook.test.ts) - 実装済みの参考パターン
- [CI-CD.md](./CI-CD.md) - パイプライン詳細

---

## 次のマイルストーン

- **Sprint 5 開始:** 2026-03-17
- **Phase 1 完了:** 2026-03-18（モック層統一）
- **Phase 2 完了:** 2026-03-19（E2E拡張）
- **Phase 3 完了:** 2026-03-20（CI/CD調整）
- **Sprint 5 終了:** 2026-03-20

---

_最終更新: 2026-03-17 10:37 JST_
