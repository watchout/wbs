/**
 * POST /api/billing/credits/purchase
 *
 * AI クレジット追加パックの購入（Stripe Checkout Session 作成）
 * 認証必須: ADMIN のみ
 */

import { defineEventHandler, readBody, createError } from 'h3'
import { requireAuth } from '~/server/utils/authMiddleware'
import { stripe } from '~/server/utils/stripe'
import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)

  if (auth.role !== 'ADMIN') {
    throw createError({ statusCode: 403, message: '管理者のみが購入できます' })
  }

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

  // 追加パックはサブスクリプションに追加（既存のサブスクリプションに add-on として）
  const session = await stripe.checkout.sessions.create({
    customer: org.stripeCustomerId,
    mode: 'subscription',
    line_items: [{ price: packPriceId, quantity: 1 }],
    subscription_data: {
      metadata: {
        organizationId: auth.organizationId,
        type: 'credit_pack',
      },
    },
    success_url: `${baseUrl}/admin/billing?credits_purchased=true`,
    cancel_url: `${baseUrl}/admin/billing`,
    metadata: {
      organizationId: auth.organizationId,
      type: 'credit_pack',
    },
  })

  return { url: session.url }
})
