# Quality Management Overview（品質管理体制）

**プロジェクト**: ミエルボード for 現場  
**最終更新**: 2025-12-07

---

## 🎯 このドキュメントの目的

AI駆動開発における品質・セキュリティ・保守性を担保するための仕組みを説明します。

---

## 📊 品質管理の多層構造

```
Layer 1: AI制御（.cursorrules）
  ├─ 禁止パターン
  └─ 実装フロー

Layer 2: 開発プロセス（GitHub）
  ├─ PRテンプレート
  ├─ CI/CD
  └─ 保護ブランチ

Layer 3: 標準・規則
  ├─ API命名規則
  └─ コーディング標準
```

---

## 🚫 禁止パターン

### データベース
- ❌ `prisma/schema.prisma` の無承認修正（例外: 管理AI承認 + 影響範囲修正が揃う場合のみ）
- ❌ マイグレーションファイルの作成
- ✅ `Schedule.metadata` で拡張

### マルチテナント
- ❌ `organizationId` なしのクエリ
- ❌ `organizationId ?? 'default'`
- ✅ `requireAuth()` + `organizationId` フィルタ

### SQL
- ❌ `prisma.$queryRaw`
- ✅ Prisma ORMのみ

---

## 📋 開発フロー

1. **ブランチ作成**
2. **実装**（.cursorrules に従う）
3. **PR作成**（テンプレート使用）
4. **CI実行**（自動）
5. **レビュー**
6. **マージ**

---

## 🔗 関連ドキュメント

### SSOT・仕様
- `docs/SSOT_GENBA_WEEK.md` - **設計の唯一の正**
- `docs/phase0_weak_current_spec.md` - Phase 0 詳細仕様
- `docs/phase0_architecture.md` - アーキテクチャ設計
- `docs/INDEX_WEAK_CURRENT.md` - ドキュメント索引

### 基本設定
- `.cursorrules` - AI制御ルール
- `.github/PULL_REQUEST_TEMPLATE.md` - PRテンプレート
- `.github/workflows/ci.yml` - CI設定
- `docs/GITHUB_SETUP_GUIDE.md` - GitHub保護ブランチ設定

### 開発ルール
- `docs/TEST_STRATEGY.md` - テスト戦略
- `docs/BRANCH_AND_RELEASE.md` - ブランチ・リリース戦略
- `docs/DONE_DEFINITION.md` - 完了の定義（DoD）
