/**
 * POST /api/billing/portal
 *
 * Stripe Customer Portal Session を作成する（カード変更/解約）
 * 認証必須: ADMIN のみ
 */

import { defineEventHandler, createError } from 'h3'
import { requireAuth, requireOtpVerified } from '~/server/utils/authMiddleware'
import { stripe } from '~/server/utils/stripe'
import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)

  if (auth.role !== 'ADMIN') {
    throw createError({ statusCode: 403, message: '管理者のみがアクセスできます' })
  }

  // OTP 2FA 検証（課金操作保護）
  requireOtpVerified(event)

  const org = await prisma.organization.findUnique({
    where: { id: auth.organizationId },
  })

  if (!org?.stripeCustomerId) {
    throw createError({ statusCode: 404, message: 'サブスクリプションが見つかりません' })
  }

  const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000'

  const session = await stripe.billingPortal.sessions.create({
    customer: org.stripeCustomerId,
    return_url: `${baseUrl}/admin/billing`,
  })

  return { url: session.url }
})
