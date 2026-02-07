/**
 * 全契約一覧取得 API
 *
 * GET /api/platform/organizations
 *
 * プラットフォーム管理者専用。
 * 全 Organization（isSystemOrg: true を除く）と
 * Subscription、ユーザー数、AIクレジット残高を返す。
 */

import { requirePlatformAdmin } from '~/server/utils/requirePlatformAdmin'
import { prisma } from '~/server/utils/prisma'

// Prisma queryの戻り型
interface OrgQueryResult {
  id: string
  name: string
  createdAt: Date
  subscription: {
    planType: string
    status: string
    currentPeriodEnd: Date
    trialEndsAt: Date | null
  } | null
  aiCreditBalance: {
    balance: number
    monthlyGrant: number
    packCredits: number
  } | null
  _count: {
    users: number
  }
}

export default defineEventHandler(async (event) => {
  await requirePlatformAdmin(event)

  const organizations = await prisma.organization.findMany({
    where: {
      isSystemOrg: false,
    },
    orderBy: { createdAt: 'desc' },
    include: {
      subscription: {
        select: {
          planType: true,
          status: true,
          currentPeriodEnd: true,
          trialEndsAt: true,
        },
      },
      aiCreditBalance: {
        select: {
          balance: true,
          monthlyGrant: true,
          packCredits: true,
        },
      },
      _count: {
        select: {
          users: {
            where: {
              deletedAt: null,
              role: { not: 'DEVICE' },
            },
          },
        },
      },
    },
  })

  // レスポンス形式を整形
  const result = (organizations as OrgQueryResult[]).map((org: OrgQueryResult) => ({
    id: org.id,
    name: org.name,
    createdAt: org.createdAt,
    subscription: org.subscription
      ? {
          planType: org.subscription.planType,
          status: org.subscription.status,
          currentPeriodEnd: org.subscription.currentPeriodEnd,
          trialEndsAt: org.subscription.trialEndsAt,
        }
      : null,
    userCount: org._count.users,
    aiCreditBalance: org.aiCreditBalance
      ? {
          balance: org.aiCreditBalance.balance,
          monthlyGrant: org.aiCreditBalance.monthlyGrant,
          packCredits: org.aiCreditBalance.packCredits,
        }
      : null,
  }))

  return { organizations: result }
})
