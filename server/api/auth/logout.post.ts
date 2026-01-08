/**
 * ログアウトAPI
 * 
 * POST /api/auth/logout
 * 
 * セッションを削除してログアウト
 */

import { getCookie, setCookie } from 'h3'
import { deleteSession } from '~/server/utils/session'

interface LogoutResponse {
  success: boolean
  message: string
}

export default defineEventHandler(async (event): Promise<LogoutResponse> => {
  // セッションIDを取得して削除
  const sessionId = getCookie(event, 'session_id')
  if (sessionId) {
    deleteSession(sessionId)
  }

  // Cookieをクリア
  setCookie(event, 'session_id', '', {
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
