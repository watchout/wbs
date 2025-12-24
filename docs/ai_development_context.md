# WBS (ミエルボード) AI開発コンテキスト

## 🎯 重要：必ず最初に読むこと

### 絶対禁止事項
- **データベーススキーマの変更禁止**
- **マイグレーション実行禁止**
- **package.jsonの無承認変更禁止（※例外あり）**
- **設定ファイルの変更禁止**

### package.json 変更ルール（管理AI判断での例外許可）

原則として `package.json` は変更禁止です。ただし、品質担保（テスト/リンター等）のために必要な変更は、
**管理AIの承認を得たうえで**例外的に許可します。

#### 許可される変更（承認必須）
- `devDependencies` の追加・更新（例: `vitest`, `eslint` 等の開発ツール）
- `scripts` の追加（例: `test`, `lint` 等の開発コマンド）

#### 禁止される変更（原則不可）
- `dependencies` の追加・更新（本番影響があるため）
- 既存 `scripts` の削除・動作変更（互換性/CI影響が大きいため）
- ビルド/実行系の挙動が変わる変更（例: エントリポイント変更、実行環境の前提変更）

## 📋 プロジェクト基本情報

### 技術スタック
- **フロントエンド**: Nuxt 3 + Vue 3 + TypeScript + Tailwind CSS
- **バックエンド**: Nitro (Nuxt Server) + PostgreSQL + Prisma ORM
- **認証**: Cookie + JWT方式
- **状態管理**: Pinia
- **開発ポート**: 3020

### ディレクトリ構造
```
pages/admin.vue           - メイン管理画面（統合済み）
src/pages/admin.vue       - 旧管理画面（使用停止）
server/api/               - APIエンドポイント
server/utils/             - サーバーユーティリティ
scripts/create-test-user.ts - テストユーザー作成
.cursorrules             - Cursor設定
```

## 🔑 認証・マルチテナントシステム

### 現在の仕様
- 役職（Position）にレベルが設定される古い仕様
- ユーザーは役職経由で権限レベルを取得
- `/admin` → 直接アクセス（demo-org-id使用）
- `/org/[slug]/admin` → 組織別アクセス

### APIエンドポイント実装パターン
```typescript
import { requireAuth } from '~/server/utils/authMiddleware'

export default defineEventHandler(async (event) => {
  const { user, organizationId } = await requireAuth(event)
  // 実装...
})
```

### 認証エラー対処法
- **"organizationId is required"** → `requireAuth()`の実装確認
- 認証確認を先に実行してからAPI呼び出し
- `/api/auth/me`で認証状態確認

## 🐛 既知の問題とパターン

### よくあるエラー
1. **Vue コンパイルエラー**: `v-model`と`value`同時使用禁止
2. **Unique constraint failed**: 既存データ確認が必要
3. **Prisma middleware error**: テナントコンテキスト未設定

### 修正パターン
```vue
<!-- ❌ 間違い -->
<input v-model="value" type="color" value="#3b82f6">

<!-- ✅ 正しい -->
<input v-model="value" type="color">
```

## 📊 データベース構造（重要）

### 権限システム（現在の実装）
```typescript
User {
  positionId: String? // 役職ID
}

Position {
  level: Int // 権限レベル（1-5）
  // 5: 管理者, 1-4: 一般ユーザー
}
```

### 組織関係
```typescript
Organization {
  id: String
  slug: String // demo-organization
}

User {
  organizationId: String // 組織との紐付け
}
```

## 🔧 開発パターン

### フロントエンドAPI呼び出し
```typescript
// 認証確認
const authResponse = await $fetch('/api/auth/me')

// データ取得
const response = await $fetch('/api/users')
if (response.success) {
  data.value = response.data
}
```

### エラーハンドリング
```typescript
try {
  // API呼び出し
} catch (error) {
  console.error('エラー:', error)
  alert('操作に失敗しました: ' + (error.data?.message || error.message))
}
```

## 🎨 UI/UXガイドライン

### カラーパレット
- **メイン**: #3b82f6 (青)
- **成功**: #10b981 (緑)
- **警告**: #f59e0b (黄)
- **エラー**: #ef4444 (赤)

### レスポンシブ設計
- Tailwind CSSクラス使用
- モバイルファーストアプローチ
- `sm:`, `md:`, `lg:`プレフィックス活用

## 📝 コーディング規約

### 命名規則
- 日本語コメント必須
- 関数名は動詞＋名詞（例: `fetchEmployees`）
- コンポーネント名はPascalCase
- ファイル名はkebab-case

### TypeScript
```typescript
// 型定義例
interface User {
  id: string
  name: string
  email: string
  organizationId: string
}
```

## ⚡ パフォーマンス最適化

### API最適化
- 必要なデータのみ取得
- `light=true`パラメータでスケジュール除外
- 適切なinclude設定

### フロントエンド最適化
- 不要な再レンダリング回避
- ローディング状態の適切な管理
- エラー状態の表示

## 🧪 テスト・デバッグ

### テストユーザー
- **Email**: admin@example.com
- **Password**: admin123
- **組織**: デモ組織 (demo-organization)
- **権限**: 管理者レベル5

### デバッグ方法
- `console.log()`でデバッグ情報出力
- ブラウザ開発者ツールでネットワーク確認
- サーバーログでエラー詳細確認

## 🔄 変更時の注意点

### 修正原則
1. **既存コードを壊さない**
2. **最小限の変更**
3. **既存パターンに従う**
4. **影響範囲を最小化**

### 変更前チェックリスト
- [ ] .cursorrulesの内容を確認
- [ ] 既存のAPIパターンを確認
- [ ] 認証要件を確認
- [ ] エラーハンドリングを実装

## 🎯 現在の課題と対応状況

### 完了した修正
- [x] .cursorrulesファイル作成
- [x] 認証フロー修正
- [x] redirectToLogin関数追加
- [x] organizationIdエラー対策
- [x] プロジェクト知識ベース作成
- [x] 品質チェックリスト作成
- [x] 自動品質チェックシステム構築
- [x] 開発環境効率化ガイド作成

### 進行中のタスク
- [ ] メニュー統合（アカウント管理）の動作確認
- [ ] 新規追加機能のテスト
- [ ] 既存コードの品質改善（合格率2.7%から向上）

## 💡 今後の開発指針

### 優先事項
1. **現在の仕様を維持**
2. **段階的な改善**
3. **エラーの根本解決**
4. **ユーザビリティ向上**

### 技術的改善
- トークン消費量削減
- レスポンス時間最適化
- エラーログ改善
- テスト自動化

---

**重要**: このファイルは開発時に必ず参照し、忘却を防ぐための知識ベースとして活用してください。 