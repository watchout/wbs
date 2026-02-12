/**
 * Sentry サーバー側初期化
 *
 * API エンドポイントで発生する未処理のエラー、
 * Prisma クエリエラー、認証エラーなどを Sentry に送信する。
 *
 * DSN が未設定の場合は Sentry は無効化される。
 *
 * Dockerfile で --import フラグを使って読み込む:
 *   CMD ["node", "--import", "./.output/server/sentry.server.config.mjs", ".output/server/index.mjs"]
 */

import * as Sentry from '@sentry/nuxt'

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',

    // パフォーマンス監視: 10% サンプリング
    tracesSampleRate: 0.1,
  })
}
