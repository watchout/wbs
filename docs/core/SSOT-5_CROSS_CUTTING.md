# SSOT-5: 横断的関心事（Cross-Cutting Concerns） [CONTRACT]

> 全機能で共通する技術的ルール・方針を定義
> ソース: .cursorrules, DONE_DEFINITION.md, server/utils/
> 層: CONTRACT（Freeze 3） - 変更にはテックリード承認必須

---

## 1. 認証・認可

### 1.1 認証方式

| 方式 | 用途 | 有効期限 |
|------|------|---------|
| JWT（アクセストークン） | API認証 | Cookie ベース |
| HttpOnly Cookie | トークン保持 | セッション |
| Setup Token | 初回パスワード設定 | 24時間 |
| Kiosk Secret | デバイス認証 | 無期限（ローテーション推奨） |

### 1.2 認証フロー

```
1. ログイン（メール/PW）
   → パスワードハッシュ検証（bcrypt）
   → JWT生成 → HttpOnly Cookie設定
   → S0 → S1 遷移

2. API呼び出し
   → Cookie からJWT取得
   → requireAuth() でデコード・検証
   → user { id, email, name, role, organizationId } をコンテキストに設定

3. デバイスログイン
   → orgSlug + kioskSecret 検証
   → DEVICE ロールのJWT発行
   → S0 → S4 遷移

4. セッション切れ
   → JWT期限切れ → 401返却
   → フロントの auth middleware が /login へリダイレクト（redirect query付き）
```

### 1.3 認可（ロール階層）

```
ADMIN > LEADER > MEMBER > DEVICE
```

| ロール | 権限 |
|-------|------|
| ADMIN | 全操作。ユーザー管理、部門管理、設定変更 |
| LEADER | スケジュールCRUD、会議作成、AI日程調整 |
| MEMBER | スケジュール閲覧、会議回答、プロフィール編集 |
| DEVICE | サイネージ表示のみ |

### 1.4 認証ミドルウェア使用ルール

```
MUST: 全APIハンドラの先頭で requireAuth() を呼び出す
MUST: requireAuth() の戻り値から organizationId を取得
MUST NOT: JWT を直接デコードする
MUST NOT: event.context.auth を手動で設定する
```

---

## 2. マルチテナント

### 2.1 テナント分離方針

| 項目 | 方針 |
|------|------|
| 分離方式 | 行レベル分離（共有DB、organizationId でフィルタ） |
| スコープ | 全データクエリに organizationId WHERE 句を強制 |
| フォールバック | 禁止（`organizationId ?? 'default'` は使わない） |

### 2.2 クエリパターン

```
MUST:
  prisma.schedule.findMany({
    where: { organizationId: user.organizationId, ... }
  })

MUST NOT:
  prisma.schedule.findMany({
    where: { ... }  // organizationId なし
  })

MUST NOT:
  prisma.schedule.findMany({
    where: { organizationId: organizationId ?? 'default' }
  })
```

### 2.3 データアクセス制約

```
MUST: ユーザーは自分の組織のデータのみ閲覧可能
MUST: 管理者であっても他組織のデータにアクセス不可
MUST: Socket.IO Room は org:{organizationId} でスコープ
```

---

## 3. エラーハンドリング

### 3.1 エラーレスポンス形式

```json
{
  "statusCode": 400,
  "statusMessage": "Bad Request",
  "message": "具体的なエラー説明"
}
```

### 3.2 エラーコード体系

| ステータス | 用途 | 例 |
|----------|------|-----|
| 400 | バリデーションエラー | 必須項目未入力、不正な形式 |
| 401 | 認証エラー | 未認証、トークン期限切れ |
| 403 | 権限エラー | ロール不足 |
| 404 | 未検出 | リソースが存在しない or 他テナント |
| 409 | 競合 | 重複データ |
| 423 | ロック | アカウントロック状態（AUTH-001 AC5） |
| 429 | レート制限超過 | 同一IPからのリクエスト過多（SEC-003） |
| 500 | 内部エラー | 予期しないエラー |

### 3.3 エラーハンドリングルール

```
MUST: 全てのエラーをキャッチしてハンドリング
MUST: ユーザー向けメッセージに内部情報を含めない
MUST: 500エラー時はサーバーログに詳細を記録
MUST NOT: エラーを握りつぶす（空catch禁止）
MUST NOT: console.log をプロダクションコードに残す
```

---

## 4. ログ・監査

### 4.1 監査ログ方針

| 項目 | 方針 | レベル |
|------|------|--------|
| 対象操作 | SCHEDULE_CREATE, SCHEDULE_UPDATE, SCHEDULE_DELETE, USER_CREATE, USER_UPDATE 等 | MUST |
| 保存先 | AuditLog テーブル（SSOT-4 §3.12） | MUST |
| テナント分離 | organizationId でスコープ | MUST |
| 保持期間 | 無期限（Phase 0） | MUST |
| 書き込み | データ変更操作時に AuditLog レコードを作成 | SHOULD |

### 4.2 記録内容

```
MUST: action（操作種別）
MUST: organizationId（テナント）
SHOULD: userId（操作者）
SHOULD: targetId（対象エンティティ）
MAY: meta（追加情報、JSON）
```

### 4.3 ログ出力ルール

```
MUST: 500エラー発生時はサーバーログに詳細を記録
MUST: 認証失敗時はログに記録（ブルートフォース検出用）
MUST NOT: console.log をプロダクションコードに残す
SHOULD: ERROR 以上のイベントを構造化ログとして出力
MAY: DEBUG レベルのログは開発環境でのみ有効化
```

---

## 5. セキュリティ

### 5.1 OWASP Top 10 対策

| 脅威 | 対策 | 実装 |
|------|------|------|
| SQLインジェクション | Prisma ORM のみ使用 | rawSQL禁止（CI検出） |
| XSS | Vue.js テンプレートエスケープ | v-html 禁止 |
| CSRF | SameSite Cookie | nuxt.config.ts |
| 認証情報漏洩 | bcryptハッシュ + 暗号化保存 | server/utils/password.ts, encryption.ts |
| 情報漏洩 | エラーメッセージの汎用化 | 「メールまたはパスワードが正しくありません」 |

### 5.2 トークン・認証情報の保存

```
MUST: パスワードは bcrypt でハッシュ化
MUST: OAuth トークンは AES-256 で暗号化保存
MUST: JWT シークレットは環境変数から取得
MUST NOT: 認証情報をハードコード
MUST NOT: .env ファイルをコミット
```

### 5.3 レート制限（SEC-003）

| 項目 | 仕様 |
|------|------|
| 対象 | `/api/auth/login` のみ（MVP） |
| 制限値 | 同一IPから 10リクエスト/分 |
| 識別子 | IPアドレス（X-Forwarded-For 対応） |
| 超過時 | HTTP 429 + Retry-After ヘッダー |
| 実装 | インメモリ Map（将来Redis移行可） |
| 連携 | AUTH-001 AC5（アカウントロック）と併用 |

```
MUST: ログインAPIにレート制限を適用
MUST: 429レスポンスに Retry-After ヘッダーを含める
MUST: IPアドレス取得時は X-Forwarded-For を考慮（プロキシ対応）
SHOULD: レート制限超過をログに記録
MAY: 将来的に Redis 等の分散キャッシュに移行
```

**受入条件（SEC-003）:**
```
- [x] AC1: 同一IPから1分間に11回目のログインリクエストで HTTP 429 を返す
- [x] AC2: 429レスポンスに Retry-After ヘッダーが含まれる
- [x] AC3: 1分経過後は再度リクエスト可能（ウィンドウリセット）
- [x] AC4: 異なるIPからは制限なしでリクエスト可能
```
**実装ファイル**: `server/utils/rateLimit.ts`, `server/api/auth/login.post.ts`

---

## 6. コーディング規約

### 6.1 TypeScript

```
MUST: strict モード有効
MUST NOT: any 型の使用
SHOULD: 1ファイル 200行以内
MUST: マジックナンバー禁止（定数化）
```

### 6.2 命名規則

| 対象 | 規則 | 例 |
|------|------|-----|
| Vue コンポーネント | PascalCase | WeeklyScheduleBoard.vue |
| 関数/変数 | camelCase | handleSubmit |
| 定数 | UPPER_SNAKE_CASE | MAX_RETRY_COUNT |
| API ファイル | Nuxt 規約 | index.get.ts, [id].patch.ts |
| DB カラム | camelCase（Prisma） | organizationId |

### 6.3 コメント規約

```
MUST: 「なぜ」を書く（「何を」はコードで表現）
MUST NOT: 自明なコメント（// increment counter 等）
SHOULD: TODO/FIXME にはチケット番号を付与
```

---

## 7. テスト

### 7.1 テスト方針

| 種類 | ツール | 対象 |
|------|-------|------|
| ユニットテスト | Vitest 2.1.0 | ビジネスロジック、ユーティリティ |
| 型チェック | TypeScript strict | 全ファイル |

### 7.2 テスト実行

```
MUST: npm run typecheck（型チェック）
MUST: npm run test（ユニットテスト）
```

### 7.3 テストカバレッジ目標（Phase 0）

```
認証・マルチテナント境界: MUST テストあり
ビジネスロジック: SHOULD テストあり
UI: MAY テストあり
```

---

## 8. CI/CD

### 8.1 GitHub Actions チェック項目

| チェック | 内容 | ブロック |
|---------|------|---------|
| 禁止操作検出 | $queryRaw / $executeRaw の使用 | Yes |
| マイグレーション改ざん | 既存 migration.sql の変更 | Yes |
| スキーマ同期 | schema.prisma 変更時に migration 必須 | Warning |
| ビルド | nuxt build | Yes |
| セキュリティ | npm audit | Warning |

### 8.2 ブランチ戦略（Phase 0）

```
Phase 0: main 直接 push 許可、PR/レビュー任意
Phase 1: main 保護、PR 必須、レビュー必須
```

---

## 9. 環境管理

### 9.1 環境変数

```
MUST: .env.sample に全環境変数を記載
MUST: 新規環境変数追加時は .env.sample も更新
MUST NOT: 環境変数をハードコード
MUST NOT: .env ファイルをコミット
```

### 9.2 必須環境変数

| 変数 | 用途 |
|------|------|
| DATABASE_URL | PostgreSQL 接続文字列 |
| JWT_SECRET | JWT 署名キー |
| GOOGLE_CLIENT_ID | Google OAuth2 クライアントID |
| GOOGLE_CLIENT_SECRET | Google OAuth2 シークレット |
| ENCRYPTION_KEY | トークン暗号化キー |

---

## 10. ロール整理履歴

### 10.1 SUPER_ADMIN / MANAGER ロールの削除（2026-02-03 解決済み）

PO判断により、4ロール体系（ADMIN, LEADER, MEMBER, DEVICE）に統一。

| 項目 | 対応 |
|------|------|
| Prisma スキーマ | 変更なし（元から4ロール） |
| server/utils/authMiddleware.ts | SUPER_ADMIN / MANAGER 参照を削除 |
| SSOT_UI_NAVIGATION.md | SUPER_ADMIN 行を削除 |
| SSOT_APP_HEADER.md | SUPER_ADMIN 行を削除 |
| SSOT_MVP_EXTEND.md | SUPER_ADMIN 記述を ADMIN に統一 |
| コンポーネント / ページ | SUPER_ADMIN 参照を ADMIN に統一 |

**根拠**: YAGNI原則。SaaSマルチテナント管理者ロールは Phase 0 で不要。将来必要になった場合は Prisma スキーマへの追加 + マイグレーションで対応可能（削除より追加の方が安全）。

---

## 11. 検証方法

本文書の検証は以下で実施:

| 対象 | 検証方法 |
|------|---------|
| 認証ルール | 全 API ハンドラで `requireAuth()` が呼ばれていることを grep で確認 |
| マルチテナント | 全クエリに `organizationId` 条件が含まれることを grep で確認 |
| エラー形式 | API エラーレスポンスが §3.1 形式に従うことを確認 |
| セキュリティ | `$queryRaw` / `$executeRaw` がコードベースに存在しないことを CI で検出 |
| コーディング規約 | `any` 型が使用されていないことを TypeScript strict でチェック |
| CI/CD | GitHub Actions チェックが §8.1 の項目を全て実行していることを確認 |

---

## 変更履歴

| 日付 | 変更内容 | 変更者 |
|------|---------|-------|
| 2026-02-03 | ai-dev-framework v3.0 準拠で新規作成。.cursorrules + DONE_DEFINITION.md + server/utils/ から統合 | AI（Claude Code） |
| 2026-02-03 | 監査指摘修正: ログ出力ルール追加、ファイル行数をSHOULDに修正、SUPER_ADMIN乖離事項記載、検証方法追加 | AI（Claude Code） |
| 2026-02-03 | SUPER_ADMIN/MANAGER削除完了。§10を「ロール整理履歴」に更新 | AI（Claude Code） |
