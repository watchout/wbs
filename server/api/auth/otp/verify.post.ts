/**
 * POST /api/auth/otp/verify
 *
 * OTP コードを検証し、セッションに検証済みフラグを設定する
 * 認証必須: ADMIN のみ
 *
 * 検証成功: セッションに otpVerifiedUntil を30分間保持
 * → 以降の課金操作で OTP 再入力不要
 */

import { defineEventHandler, readBody, createError, getCookie } from 'h3'
import { requireAuth } from '~/server/utils/authMiddleware'
import { verifyOtp } from '~/server/utils/otp'
import { setOtpVerified } from '~/server/utils/session'
import { OTP_VERIFIED_DURATION_MS } from '~/server/utils/otp'

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)

  if (auth.role !== 'ADMIN') {
    throw createError({ statusCode: 403, message: '管理者のみが利用できます' })
  }

  if (!auth.userId) {
    throw createError({ statusCode: 401, message: '認証情報が不足しています' })
  }

  const body = await readBody(event)
  const { code } = body as { code?: string }

  if (!code || typeof code !== 'string' || !/^\d{6}$/.test(code)) {
    throw createError({ statusCode: 400, message: '6桁の認証コードを入力してください' })
  }

  const valid = await verifyOtp({
    userId: auth.userId,
    purpose: 'billing',
    code,
  })

  if (!valid) {
    throw createError({
      statusCode: 401,
      message: '認証コードが正しくありません。コードを確認して再度入力してください',
    })
  }

  // セッションに OTP 検証済みフラグを設定（30分間有効）
  const sessionId = getCookie(event, 'session_id')
  if (sessionId) {
    setOtpVerified(sessionId, OTP_VERIFIED_DURATION_MS)
  }

  return {
    success: true,
    message: '認証に成功しました',
    verifiedUntil: new Date(Date.now() + OTP_VERIFIED_DURATION_MS).toISOString(),
  }
})
