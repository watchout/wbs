/**
 * CORS設定ミドルウェア（SEC-002）
 *
 * 許可するオリジンを明示的に指定し、ワイルドカードを排除
 */

import { setHeader, getMethod, getHeader, sendNoContent } from 'h3'

function getAllowedOrigins(): string[] {
  const origins: string[] = []

  // 環境変数から許可オリジンを取得
  const envOrigins = process.env.ALLOWED_ORIGINS
  if (envOrigins) {
    origins.push(...envOrigins.split(',').map((o) => o.trim()))
  }

  // 開発環境のデフォルト
  if (process.env.NODE_ENV !== 'production') {
    origins.push(
      'http://localhost:6001',
      'http://localhost:3000',
      'http://127.0.0.1:6001',
      'http://127.0.0.1:3000'
    )
  }

  return origins
}

export default defineEventHandler((event) => {
  const origin = getHeader(event, 'origin')
  const allowedOrigins = getAllowedOrigins()

  // オリジンが許可リストに含まれる場合のみCORSヘッダーを設定
  if (origin && allowedOrigins.includes(origin)) {
    setHeader(event, 'Access-Control-Allow-Origin', origin)
    setHeader(event, 'Access-Control-Allow-Credentials', 'true')
    setHeader(event, 'Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
    setHeader(event, 'Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token')
    setHeader(event, 'Access-Control-Max-Age', 86400)
  }

  // プリフライトリクエスト
  if (getMethod(event) === 'OPTIONS') {
    sendNoContent(event)
    return
  }
})
