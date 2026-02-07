/**
 * 契約詳細取得 API
 *
 * GET /api/platform/organizations/:id
 *
 * プラットフォーム管理者専用。
 * Organization 詳細 + Subscription 詳細 + ユーザー一覧 +
 * クレジット残高 + 直近のトランザクションを返す。
 */

import { createError } from 'h3'
import { requirePlatformAdmin } from '~/server/utils/requirePlatformAdmin'
import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  await requirePlatformAdmin(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      message: '組織IDが指定されていません',
    })
  }

  const organization = await prisma.organization.findUnique({
    where: { id },
    include: {
      subscription: true,
      aiCreditBalance: true,
      users: {
        where: { deletedAt: null },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          department: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
      aiCreditTransactions: {
        orderBy: { createdAt: 'desc' },
        take: 50, // 直近50件
        select: {
          id: true,
          type: true,
          amount: true,
          balanceAfter: true,
          description: true,
          createdAt: true,
        },
      },
    },
  })

  if (!organization) {
    throw createError({
      statusCode: 404,
      message: '組織が見つかりません',
    })
  }

  // システム組織へのアクセスを禁止
  if (organization.isSystemOrg) {
    throw createError({
      statusCode: 403,
      message: 'システム組織へのアクセスは禁止されています',
    })
  }

  return {
    organization: {
      id: organization.id,
      name: organization.name,
      timezone: organization.timezone,
      stripeCustomerId: organization.stripeCustomerId,
      createdAt: organization.createdAt,
      updatedAt: organization.updatedAt,
    },
    subscription: organization.subscription,
    aiCreditBalance: organization.aiCreditBalance,
    users: organization.users,
    recentTransactions: organization.aiCreditTransactions,
  }
})
