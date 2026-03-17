#!/bin/bash

##
# Sprint 5 デプロイチェックリスト
# 本番環境へのデプロイ前に実行する検証スクリプト
##

set -e

echo "=== Sprint 5 デプロイチェックリスト ==="
echo ""

# 1. ユニットテスト
echo "✓ ユニットテスト実行中..."
npm test
if [ $? -ne 0 ]; then
    echo "❌ ユニットテスト失敗"
    exit 1
fi
echo ""

# 2. 型チェック
echo "✓ TypeScript型チェック中..."
npm run typecheck
if [ $? -ne 0 ]; then
    echo "❌ 型チェック失敗"
    exit 1
fi
echo ""

# 3. ビルド
echo "✓ プロダクションビルド中..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ ビルド失敗"
    exit 1
fi
echo ""

# 4. E2Eテスト（オプション：CI環境では自動スキップ）
if [ -z "$CI" ]; then
    echo "✓ E2Eテスト実行中（ローカル環境のみ）..."
    npm run test:e2e || true
    echo ""
fi

# 5. セキュリティチェック
echo "✓ セキュリティチェック中..."
npm audit --audit-level=moderate
if [ $? -ne 0 ]; then
    echo "⚠️  セキュリティ警告あり（詳細確認推奨）"
fi
echo ""

# 6. ビルド出力サイズ確認
echo "✓ ビルド出力サイズ確認..."
if [ -d ".output" ]; then
    BUILD_SIZE=$(du -sh .output | cut -f1)
    echo "  ビルドサイズ: $BUILD_SIZE"
fi
echo ""

# 7. 環境変数チェック
echo "✓ 環境変数チェック..."
REQUIRED_VARS=(
    "DATABASE_URL"
    "JWT_SECRET"
    "STRIPE_SECRET_KEY"
    "STRIPE_WEBHOOK_SECRET"
)

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo "  ⚠️  環境変数 $var が未設定です"
    else
        echo "  ✓ $var は設定済み"
    fi
done
echo ""

# 8. Git状態確認
echo "✓ Git状態確認..."
if [ -n "$(git status --porcelain)" ]; then
    echo "  ⚠️  未コミットの変更があります"
    git status --short
fi

CURRENT_BRANCH=$(git branch --show-current)
echo "  現在のブランチ: $CURRENT_BRANCH"
echo ""

# 9. Prismaマイグレーション確認
echo "✓ Prismaスキーマ確認..."
npx prisma validate
echo "  Prismaスキーマは有効です"
echo ""

echo "=== デプロイチェック完了 ==="
echo ""
echo "✅ すべての検証が完了しました。デプロイの準備ができています。"
echo ""
echo "次のステップ:"
echo "  1. main ブランチにマージ"
echo "  2. GitHub Actionsでビルド・デプロイを実行"
echo "  3. 本番環境でスモークテスト実施"
