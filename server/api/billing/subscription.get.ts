/**
 * GET /api/billing/subscription
 *
 * 現在のサブスクリプション情報を取得する
 * 認証必須
 */

import { defineEventHandler } from 'h3'
import { requireAuth } from '~/server/utils/authMiddleware'
import { prisma } from '~/server/utils/prisma'
import { getAiCreditBalance } from '~/server/utils/aiCredits'

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)

  const subscription = await prisma.subscription.findUnique({
    where: { organizationId: auth.organizationId },
  })

  const creditBalance = await getAiCreditBalance(auth.organizationId)

  return {
    subscription: subscription
      ? {
          planType: subscription.planType,
          status: subscription.status,
          maxUsers: subscription.maxUsers,
          monthlyAiCredits: subscription.monthlyAiCredits,
          currentPeriodStart: subscription.currentPeriodStart,
          currentPeriodEnd: subscription.currentPeriodEnd,
          trialEndsAt: subscription.trialEndsAt,
          canceledAt: subscription.canceledAt,
          billingInterval: subscription.billingInterval,
        }
      : null,
    credits: creditBalance,
  }
})
