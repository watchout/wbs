# WBS AI開発環境 効率化ガイド

## 🚀 概要

このガイドでは、レポートで推奨されている効率的なAI開発環境の使用方法を説明します。

## 📋 導入済み効率化機能

### 1. .cursorrules (プロジェクト固有ルール)
- **場所**: `.cursorrules`
- **目的**: Cursorでの勝手な実装を防ぎ、一貫性を確保
- **効果**: トークン消費削減、ミスの防止

### 2. プロジェクト知識ベース
- **場所**: `docs/ai_development_context.md`
- **目的**: AIの忘却問題を解決
- **使用方法**: 開発前に必ず参照する

### 3. 品質チェックリスト
- **場所**: `docs/quality_checklist.md`
- **目的**: 省力的対応を防ぎ、品質基準を明確化
- **使用方法**: 実装前・中・後に確認

### 4. 自動品質チェック
- **場所**: `scripts/code-quality-check.js`
- **目的**: 継続的な品質評価
- **使用方法**: `node scripts/code-quality-check.cjs`

## 🔧 開発フロー（推奨）

### 実装前
1. **知識ベース確認**
   ```bash
   # 必ず確認
   cat docs/ai_development_context.md
   ```

2. **チェックリスト確認**
   ```bash
   # 実装前チェック
   cat docs/quality_checklist.md
   ```

3. **現在の課題確認**
   ```bash
   # 現在のエラーを確認
   pnpm run dev
   ```

### 実装中
1. **Cursorルールの活用**
   - `.cursorrules`が自動的に適用される
   - プロジェクト固有の制約が守られる

2. **段階的実装**
   - 最小限の変更から開始
   - 既存パターンに従う
   - 影響範囲を最小化

3. **継続的チェック**
   ```bash
   # 品質チェック実行
   node scripts/code-quality-check.cjs
   ```

### 実装後
1. **動作確認**
   ```bash
   # サーバー起動
   pnpm run dev
   
   # ブラウザで確認
   open http://localhost:3020/admin
   ```

2. **品質最終確認**
   ```bash
   # 最終品質チェック
   node scripts/code-quality-check.cjs
   ```

## 🎯 トークン消費削減テクニック

### 1. 簡潔な指示文
```
❌ 悪い例:
「現在、私はWBSプロジェクトでVue.jsとTypeScriptを使って管理画面を開発しています。社員管理機能でエラーが発生しているので、適切なエラーハンドリングを含めて修正してください。」

✅ 良い例:
「pages/admin.vue の社員管理でエラー。try-catch追加して修正。」
```

### 2. プロジェクト知識の活用
```
❌ 毎回説明:
「このプロジェクトはNuxt 3とPrismaを使っています...」

✅ 参照指示:
「docs/ai_development_context.md の通りに実装」
```

### 3. 英語プロンプト活用
```
❌ 日本語:
「社員管理のAPIエンドポイントを修正してください」

✅ 英語:
「Fix employee API endpoint. Add error handling.」
```

## 🐛 よくある問題と対策

### 1. organizationId エラー
**問題**: `organizationId is required for accessing Department`

**対策**:
1. 認証確認を先に実行
2. `/api/auth/me`で認証状態確認
3. API呼び出し前にauth待ち

**実装例**:
```typescript
// 認証確認後にAPI呼び出し
const authResponse = await $fetch('/api/auth/me')
if (authResponse.success) {
  await fetchData()
}
```

### 2. Vue コンパイルエラー
**問題**: `v-model`と`value`の同時使用

**対策**:
```vue
<!-- ❌ 間違い -->
<input v-model="value" type="color" value="#3b82f6">

<!-- ✅ 正しい -->
<input v-model="value" type="color">
```

### 3. 勝手なDB変更
**問題**: スキーマやマイグレーションの変更

**対策**:
- `.cursorrules`の禁止事項を確認
- 現在のスキーマを維持
- 最小限の変更で対応

## 📊 品質メトリクス

### 自動チェック項目
- エラーハンドリング実装率: 100%
- TypeScript型定義率: 95%以上
- コメント率: 15%以上
- ファイル長: 500行以内

### 実行コマンド
```bash
# 品質チェック実行
node scripts/code-quality-check.cjs

# 結果例:
# 📊 統計情報:
#   - 総ファイル数: 45
#   - 合格ファイル数: 42
#   - 問題ありファイル数: 3
#   - 合格率: 93.3%
```

## 🎨 開発のベストプラクティス

### 1. 認証フロー
```typescript
// 推奨パターン
export default defineEventHandler(async (event) => {
  const { user, organizationId } = await requireAuth(event)
  // 実装...
})
```

### 2. エラーハンドリング
```typescript
// フロントエンド
try {
  const response = await $fetch('/api/users')
  if (response.success) {
    data.value = response.data
  }
} catch (error) {
  console.error('エラー:', error)
  alert('操作に失敗しました: ' + (error.data?.message || error.message))
}
```

### 3. UI実装
```vue
<!-- 統一されたスタイル -->
<button 
  :class="['btn-primary', { loading: isLoading }]"
  @click="handleAction"
>
  {{ isLoading ? '処理中...' : 'アクション' }}
</button>
```

## 🔄 継続的改善プロセス

### 1. 週次レビュー
- 品質メトリクスの確認
- エラーパターンの分析
- プロセスの改善

### 2. 知識ベース更新
- 新しい問題パターンの追加
- 解決策の記録
- ベストプラクティスの更新

### 3. ツールの改善
- 品質チェックルールの追加
- 自動修正機能の実装
- レポート機能の拡張

## 🎯 現在の開発状況

### 完了済み
- [x] .cursorrules設定
- [x] 知識ベース構築
- [x] 品質チェックリスト
- [x] 自動品質チェック
- [x] 認証エラー対策
- [x] 効率化環境構築
- [x] 品質評価システム導入

### 進行中
- [ ] メニュー統合の動作確認
- [ ] 新規追加機能のテスト
- [ ] 既存コードの品質改善（現在合格率2.7%）

### 今後の予定
- [ ] 自動テスト導入
- [ ] CI/CD改善
- [ ] パフォーマンス最適化

## 📞 サポート・トラブルシューティング

### 問題が発生した場合
1. `docs/ai_development_context.md`で既知の問題を確認
2. `node scripts/code-quality-check.cjs`で品質チェック
3. サーバーログでエラー詳細を確認
4. 必要に応じてロールバック

### 緊急時対応
1. 現在の状態をバックアップ
2. 最小限の修正で一時的な回避
3. 根本原因の調査
4. 恒久的な修正の実装

---

**重要**: この開発環境は継続的に改善されます。定期的にこのガイドを確認し、最新のベストプラクティスに従って開発してください。 