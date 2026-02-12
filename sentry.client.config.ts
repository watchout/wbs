/**
 * Sentry クライアント側初期化
 *
 * ブラウザで発生する JavaScript エラー、未処理の Promise rejection、
 * パフォーマンスデータを Sentry に送信する。
 *
 * DSN が未設定の場合（開発環境など）は Sentry は無効化される。
 */

import * as Sentry from '@sentry/nuxt'

const config = useRuntimeConfig()

if (config.public.sentryDsn) {
  Sentry.init({
    dsn: config.public.sentryDsn as string,
    environment: config.public.sentryEnvironment as string,

    // パフォーマンス監視: 10% サンプリング（無料枠節約）
    tracesSampleRate: 0.1,

    // セッションリプレイ: エラー発生時のみ 100% キャプチャ
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0,

    // 404 などの不要なエラーをフィルタ
    beforeSend(event) {
      // ナビゲーション系の 404 はノイズになるためスキップ
      if (event.exception?.values?.[0]?.value?.includes('404')) {
        return null
      }
      return event
    },
  })
}
