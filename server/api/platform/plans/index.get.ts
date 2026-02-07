/**
 * プラン設定一覧取得 API
 *
 * GET /api/platform/plans
 *
 * プラットフォーム管理者専用。全プラン（isActive 問わず）を返す。
 */

import { requirePlatformAdmin } from '~/server/utils/requirePlatformAdmin'
import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  await requirePlatformAdmin(event)

  const plans = await prisma.planConfig.findMany({
    orderBy: { sortOrder: 'asc' },
  })

  return { plans }
})
