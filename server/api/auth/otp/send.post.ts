/**
 * POST /api/auth/otp/send
 *
 * OTP コードを生成してメール送信する（課金操作 2FA 用）
 * 認証必須: ADMIN のみ
 *
 * レート制限: 3回/5分（IP単位）
 */

import { defineEventHandler, createError } from 'h3'
import { requireAuth } from '~/server/utils/authMiddleware'
import { createOtp } from '~/server/utils/otp'
import { sendEmail, buildOtpEmail } from '~/server/utils/email'
import { checkRateLimit, getClientIp } from '~/server/utils/rateLimit'

const OTP_RATE_LIMIT = {
  maxRequests: 3,
  windowMs: 5 * 60 * 1000, // 5分
}

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)

  if (auth.role !== 'ADMIN') {
    throw createError({ statusCode: 403, message: '管理者のみが利用できます' })
  }

  if (!auth.userId || !auth.email) {
    throw createError({ statusCode: 401, message: '認証情報が不足しています' })
  }

  // レート制限
  const ip = getClientIp(event)
  const rateCheck = checkRateLimit(`otp:${ip}`, OTP_RATE_LIMIT)
  if (!rateCheck.allowed) {
    throw createError({
      statusCode: 429,
      message: `リクエストが多すぎます。${rateCheck.retryAfterSeconds}秒後に再試行してください`,
    })
  }

  // OTP 生成
  const code = await createOtp({
    userId: auth.userId,
    purpose: 'billing',
  })

  // メール送信
  const { subject, html } = buildOtpEmail({ code })
  await sendEmail({ to: auth.email, subject, html })

  return {
    success: true,
    message: '認証コードをメールに送信しました',
  }
})
