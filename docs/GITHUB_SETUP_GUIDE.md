# GitHub Repository Setup Guide

**プロジェクト**: ミエルボード for 現場 / 現場WEEK  
**最終更新**: 2025-12-05

---

## 🎯 目的

GitHubリポジトリ側で品質ゲートを設定し、**レビューなしの直接コミット**や**CI落ちのままマージ**を物理的に防ぎます。

---

## 🔧 設定手順

### Step 1: 保護ブランチ設定

1. GitHub リポジトリの **Settings** → **Branches** にアクセス

2. **Add branch protection rule** をクリック

3. **Branch name pattern** に `main` を入力

4. 以下にチェック:
   - [x] **Require a pull request before merging**
     - Require approvals: **1**
   - [x] **Require status checks to pass before merging**
     - `lint-and-typecheck`
     - `build`
     - `security`
     - `ssot-compliance`
   - [x] **Do not allow bypassing the above settings**

5. **Create** をクリック

---

### Step 2: 動作確認

テストPRを作成してCI が動作することを確認:

```bash
git checkout -b test/ci-check
echo "# Test" > test.md
git add test.md
git commit -m "test: CI確認"
git push origin test/ci-check
```

GitHub でPR作成 → CI が自動実行されることを確認

---

## 📋 設定後の効果

- ✅ `main` への直接push禁止
- ✅ CI失敗時のマージ禁止
- ✅ レビュー必須
- ✅ スキーマ変更の自動検出

---

## 🔗 関連ファイル

- `.github/workflows/ci.yml` - CI設定
- `.github/PULL_REQUEST_TEMPLATE.md` - PRテンプレート
