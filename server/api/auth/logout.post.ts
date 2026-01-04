/**
 * ログアウトAPI
 * 
 * POST /api/auth/logout
 * 
 * Cookieをクリアしてログアウト
 */

import { setCookie } from 'h3'

interface LogoutResponse {
  success: boolean
  message: string
}

export default defineEventHandler(async (event): Promise<LogoutResponse> => {
  // Cookieをクリア（maxAge: 0で即座に削除）
  setCookie(event, 'access_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0
  })

  setCookie(event, 'refresh_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0
  })

  return {
    success: true,
    message: 'ログアウトしました'
  }
})

