/**
 * POST /api/billing/credits/purchase
 *
 * AI クレジット追加パックの購入（Stripe Checkout Session 作成）
 * 認証必須: ADMIN のみ
 *
 * v2.0: 追加パックは買い切り（一回払い）に変更
 */

import { defineEventHandler, readBody, createError } from 'h3'
import { requireAuth, requireOtpVerified } from '~/server/utils/authMiddleware'
import { stripe } from '~/server/utils/stripe'
import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)

  if (auth.role !== 'ADMIN') {
    throw createError({ statusCode: 403, message: '管理者のみが購入できます' })
  }

  // OTP 2FA 検証（課金操作保護）
  requireOtpVerified(event)

  const body = await readBody(event)
  const { packPriceId } = body as { packPriceId: string }

  if (!packPriceId) {
    throw createError({ statusCode: 400, message: 'packPriceId は必須です' })
  }

  const org = await prisma.organization.findUnique({
    where: { id: auth.organizationId },
  })

  if (!org?.stripeCustomerId) {
    throw createError({
      statusCode: 400,
      message: 'まずプランに加入してください',
    })
  }

  const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000'

  // v2.0: 追加パックは買い切り（一回払い）
  const session = await stripe.checkout.sessions.create({
    customer: org.stripeCustomerId,
    mode: 'payment', // subscription → payment に変更
    line_items: [{ price: packPriceId, quantity: 1 }],
    success_url: `${baseUrl}/admin/billing?credits_purchased=true`,
    cancel_url: `${baseUrl}/admin/billing`,
    metadata: {
      organizationId: auth.organizationId,
      type: 'credit_pack',
    },
    payment_intent_data: {
      metadata: {
        organizationId: auth.organizationId,
        type: 'credit_pack',
      },
    },
  })

  return { url: session.url }
})
