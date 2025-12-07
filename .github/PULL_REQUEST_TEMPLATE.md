# Pull Request

## 📋 概要

<!-- このPRで何を実現するか、1-2文で簡潔に説明 -->

---

## 🎯 参照SSOT

<!-- 必須: このPRがどのSSOTに基づくかを明記 -->

**SSOT**: `docs/SSOT_GENBA_WEEK.md` または該当ドキュメント

**要件ID**: <!-- 例: P0-1.2 週間ボード表示機能 -->

---

## 🔗 Plane Issue

<!-- 必須: 対応するPlane IssueのURL -->

**Issue**: https://plane.arrowsworks.com/co/projects/WBS/issues/WBS-XX

---

## 🧪 テスト・証跡

<!-- 必須: 実行したコマンドと結果を貼り付け -->

### 実行コマンド

```bash
# 開発サーバー起動
npm run dev
```

### 実行結果

```
✔ Nuxt 3 server started
```

---

## 🚨 禁止パターンチェック

- [ ] ✅ DBスキーマ変更なし（`prisma/schema.prisma` 未変更）
- [ ] ✅ マイグレーションファイル作成なし
- [ ] ✅ `organizationId` によるテナント分離を徹底
- [ ] ✅ `requireAuth()` を使用（直接JWTデコード禁止）
- [ ] ✅ 生SQLクエリなし（Prisma ORM使用）

---

## 📝 チェックリスト

### コード品質

- [ ] TypeScript型エラーなし
- [ ] Lintエラーなし
- [ ] ビルド成功

### テスト

- [ ] ブラウザでの動作確認
- [ ] エラーケースのテスト

---

**このPRテンプレートは、AI駆動開発における品質保証のために作成されました。**
