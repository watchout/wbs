/**
 * SiteDemand一覧API
 *
 * GET /api/sites/:siteId/demands
 * クエリ: dateFrom, dateTo
 * 権限: MEMBER+
 * organizationId スコープ必須
 *
 * SSOT参照: SSOT_SITE_ALLOCATION.md §10.2
 */

import { requireAuth } from '~/server/utils/authMiddleware'
import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const authContext = await requireAuth(event)
  const siteId = getRouterParam(event, 'siteId')

  if (!siteId) {
    throw createError({ statusCode: 400, message: 'siteIdは必須です' })
  }

  // テナントスコープでSite存在チェック
  const site = await prisma.site.findFirst({
    where: {
      id: siteId,
      organizationId: authContext.organizationId,
      deletedAt: null,
    },
  })

  if (!site) {
    throw createError({ statusCode: 404, message: '現場が見つかりません' })
  }

  const query = getQuery(event)
  const dateFrom = query.dateFrom as string | undefined
  const dateTo = query.dateTo as string | undefined

  const where: Record<string, unknown> = {
    organizationId: authContext.organizationId,
    siteId,
  }

  if (dateFrom || dateTo) {
    const dateFilter: Record<string, Date> = {}
    if (dateFrom) dateFilter.gte = new Date(dateFrom)
    if (dateTo) dateFilter.lte = new Date(dateTo)
    where.date = dateFilter
  }

  const demands = await prisma.siteDemand.findMany({
    where,
    orderBy: [{ date: 'asc' }, { tradeType: 'asc' }],
  })

  return {
    success: true,
    data: demands,
  }
})
