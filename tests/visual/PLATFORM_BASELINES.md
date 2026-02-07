# Platform 管理画面ビジュアルテスト ベースライン取得手順

## 前提条件

1. 開発サーバーが起動していること (`npm run dev`)
2. データベースにシードデータが投入済み (`npx prisma db seed`)
3. プラットフォーム管理者アカウントでログイン可能なこと
   - メール: `admin@mielplus.jp`
   - パスワード: シード設定値

## 取得対象画面

| # | ページ | パス | ファイル名 |
|---|--------|------|-----------|
| 08 | ダッシュボード | /platform/ | `08-platform-dashboard.png` |
| 09 | プラン管理 | /platform/plans | `09-platform-plans.png` |
| 10 | クレジットパック管理 | /platform/credit-packs | `10-platform-credit-packs.png` |
| 11 | コホート管理 | /platform/cohorts | `11-platform-cohorts.png` |
| 12 | テナント一覧 | /platform/organizations | `12-platform-organizations.png` |
| 13 | 課金管理画面 | /admin/billing | `13-admin-billing.png` |

## 取得手順

### Playwright MCP を使用する場合

```bash
# 1. ログインページにアクセス
# 2. admin@mielplus.jp でログイン
# 3. 各画面に遷移してスクリーンショット取得
# 4. tests/visual/baseline/ に保存
```

### 手動取得の場合

1. ブラウザで `http://localhost:3000/login` にアクセス
2. プラットフォーム管理者でログイン
3. 各画面を開いてスクリーンショットを取得
4. `tests/visual/baseline/` に上記ファイル名で保存

## Level 1 チェック項目

各画面で以下を確認:
- [ ] ページが正常に表示される（エラーなし）
- [ ] コンソールに JavaScript エラーがない
- [ ] レイアウトが崩れていない
- [ ] データが正しく表示されている（シードデータ）
