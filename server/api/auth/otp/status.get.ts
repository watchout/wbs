/**
 * GET /api/auth/otp/status
 *
 * 現在のセッションの OTP 検証状態を確認する
 * 認証必須
 */

import { defineEventHandler, getCookie } from 'h3'
import { requireAuth } from '~/server/utils/authMiddleware'
import { isOtpVerified } from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  await requireAuth(event)

  const sessionId = getCookie(event, 'session_id')
  const verified = sessionId ? isOtpVerified(sessionId) : false

  return { verified }
})
