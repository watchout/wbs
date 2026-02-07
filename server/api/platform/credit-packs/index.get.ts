/**
 * クレジットパック設定一覧取得 API
 *
 * GET /api/platform/credit-packs
 *
 * プラットフォーム管理者専用。
 */

import { requirePlatformAdmin } from '~/server/utils/requirePlatformAdmin'
import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  await requirePlatformAdmin(event)

  const creditPacks = await prisma.creditPackConfig.findMany({
    orderBy: { sortOrder: 'asc' },
  })

  return { creditPacks }
})
