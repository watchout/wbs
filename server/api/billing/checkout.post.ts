/**
 * POST /api/billing/checkout
 *
 * Stripe Checkout Session を作成する（新規契約/プラン変更）
 * 認証必須: ADMIN のみ
 *
 * ローンチ割引コホートが適用可能な場合、自動的にクーポンを付与
 */

import { defineEventHandler, readBody, createError } from 'h3'
import { requireAuth } from '~/server/utils/authMiddleware'
import { stripe } from '~/server/utils/stripe'
import { prisma } from '~/server/utils/prisma'
import { determineCohort } from '~/server/utils/cohort'

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)

  if (auth.role !== 'ADMIN') {
    throw createError({ statusCode: 403, message: '管理者のみが課金設定を変更できます' })
  }

  const body = await readBody(event)
  const { priceId, billingInterval } = body as {
    priceId: string
    billingInterval?: 'month' | 'year'
  }

  if (!priceId) {
    throw createError({ statusCode: 400, message: 'priceId は必須です' })
  }

  // Organization の Stripe Customer を取得または作成
  const org = await prisma.organization.findUnique({
    where: { id: auth.organizationId },
  })

  if (!org) {
    throw createError({ statusCode: 404, message: '組織が見つかりません' })
  }

  let customerId = org.stripeCustomerId

  if (!customerId) {
    // Stripe Customer を新規作成
    const customer = await stripe.customers.create({
      name: org.name,
      metadata: { organizationId: org.id },
    })
    customerId = customer.id

    await prisma.organization.update({
      where: { id: org.id },
      data: { stripeCustomerId: customerId },
    })
  }

  // ローンチ割引コホートを判定
  const cohort = await determineCohort()

  // Checkout Session を作成
  const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000'

  // セッション作成オプション
  const sessionParams: Parameters<typeof stripe.checkout.sessions.create>[0] = {
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: 14,
      metadata: {
        organizationId: auth.organizationId,
        cohortNumber: cohort.cohortNumber?.toString() || '',
        cohortDiscount: cohort.discountPercent.toString(),
      },
    },
    success_url: `${baseUrl}/admin/billing?success=true`,
    cancel_url: `${baseUrl}/admin/billing?canceled=true`,
    metadata: {
      organizationId: auth.organizationId,
      cohortNumber: cohort.cohortNumber?.toString() || '',
    },
  }

  // コホート割引がある場合、クーポンを付与
  if (cohort.couponId) {
    sessionParams.discounts = [{ coupon: cohort.couponId }]
  }

  const session = await stripe.checkout.sessions.create(sessionParams)

  return {
    url: session.url,
    cohort: {
      cohortNumber: cohort.cohortNumber,
      discountPercent: cohort.discountPercent,
      remainingSlots: cohort.remainingSlots,
    },
  }
})
