/**
 * CSRF対策ミドルウェア（SEC-001）
 *
 * Double Submit Cookie パターンを採用:
 * - サーバーがCSRFトークンをCookieにセット
 * - クライアントはリクエスト時にヘッダー(X-CSRF-Token)にトークンを付与
 * - サーバーはCookie値とヘッダー値を比較
 *
 * GETリクエスト・認証不要API・Webhookは除外
 */

import { getCookie, setCookie, createError, getHeader, getMethod } from 'h3'
import { randomUUID } from 'crypto'

const CSRF_COOKIE_NAME = 'csrf_token'
const CSRF_HEADER_NAME = 'x-csrf-token'

// CSRFチェック除外パス（Webhook・公開API等）
const CSRF_EXEMPT_PATHS = [
  '/api/auth/login',
  '/api/auth/device-login',
  '/api/contact',
  '/api/ai/lp-chat',
  '/api/calendar/webhook',
  '/api/billing/webhook',
  '/api/health',
]

// CSRFチェック対象のHTTPメソッド
const CSRF_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE']

function isExemptPath(path: string): boolean {
  return CSRF_EXEMPT_PATHS.some((exempt) => path.startsWith(exempt))
}

export default defineEventHandler((event) => {
  const method = getMethod(event)
  const path = event.path || ''

  // GETリクエストではトークンをセットのみ
  if (method === 'GET') {
    const existingToken = getCookie(event, CSRF_COOKIE_NAME)
    if (!existingToken) {
      const token = randomUUID()
      setCookie(event, CSRF_COOKIE_NAME, token, {
        httpOnly: false, // JSから読み取り可能にする
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 24 * 60 * 60, // 24時間
      })
    }
    return
  }

  // 変更系メソッド以外はスキップ
  if (!CSRF_METHODS.includes(method)) {
    return
  }

  // 除外パスはスキップ
  if (isExemptPath(path)) {
    return
  }

  // API以外のパスはスキップ
  if (!path.startsWith('/api/')) {
    return
  }

  // CSRFトークン検証
  const cookieToken = getCookie(event, CSRF_COOKIE_NAME)
  const headerToken = getHeader(event, CSRF_HEADER_NAME)

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    throw createError({
      statusCode: 403,
      statusMessage: 'CSRFトークンが無効です。ページを再読み込みしてください。',
    })
  }
})
