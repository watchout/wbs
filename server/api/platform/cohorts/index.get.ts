/**
 * コホート設定一覧取得 API
 *
 * GET /api/platform/cohorts
 *
 * プラットフォーム管理者専用。
 */

import { requirePlatformAdmin } from '~/server/utils/requirePlatformAdmin'
import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  await requirePlatformAdmin(event)

  const cohorts = await prisma.cohortConfig.findMany({
    orderBy: { cohortNumber: 'asc' },
  })

  return { cohorts }
})
