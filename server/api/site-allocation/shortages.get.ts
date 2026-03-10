/**
 * 不足一覧API
 *
 * GET /api/site-allocation/shortages
 * クエリ: dateFrom, dateTo
 * 権限: MEMBER+
 * organizationId スコープ必須
 *
 * 配置人数 < 必要人数 の現場・日付・工種を返す
 * 色分け情報: shortage(不足=赤) / sufficient(充足=緑) / surplus(過剰=黄)
 *
 * SSOT参照: SSOT_SITE_ALLOCATION.md §10.3, FR-VIEW-005
 */

import { requireAuth } from '~/server/utils/authMiddleware'
import { prisma } from '~/server/utils/prisma'
import { parseScheduleMetadata } from '~/server/utils/scheduleFormatter'

type AllocationStatus = 'shortage' | 'sufficient' | 'surplus'

interface ShortageItem {
  siteId: string
  siteName: string
  date: string
  tradeType: string
  requiredCount: number
  allocatedCount: number
  gap: number
  status: AllocationStatus
  priority: string
}

export default defineEventHandler(async (event) => {
  const authContext = await requireAuth(event)
  const query = getQuery(event)

  const dateFrom = query.dateFrom as string | undefined
  const dateTo = query.dateTo as string | undefined

  if (!dateFrom || !dateTo) {
    throw createError({ statusCode: 400, message: 'dateFromとdateToは必須です' })
  }

  const from = new Date(dateFrom)
  const to = new Date(dateTo)

  if (isNaN(from.getTime()) || isNaN(to.getTime())) {
    throw createError({ statusCode: 400, message: '有効な日付を指定してください（YYYY-MM-DD）' })
  }

  // SiteDemandを取得（テナントスコープ）
  const demands = await prisma.siteDemand.findMany({
    where: {
      organizationId: authContext.organizationId,
      date: {
        gte: from,
        lte: to,
      },
    },
    include: {
      site: {
        select: { id: true, name: true },
      },
    },
    orderBy: [{ date: 'asc' }, { siteId: 'asc' }],
  })

  // 同期間のScheduleを取得して配置人数を集計
  const schedules = await prisma.schedule.findMany({
    where: {
      organizationId: authContext.organizationId,
      deletedAt: null,
      start: {
        gte: from,
        lt: new Date(to.getTime() + 86400000), // dateTo の翌日まで
      },
    },
    select: {
      siteId: true,
      description: true,
      start: true,
    },
  })

  // siteId + 日付 でグルーピングして配置人数集計
  const allocationMap = new Map<string, number>()
  // siteName → siteId のマッピング（siteId未設定のScheduleからの名前検索用）
  for (const schedule of schedules) {
    const dateStr = formatDate(new Date(schedule.start))

    if (schedule.siteId) {
      const key = `${schedule.siteId}:${dateStr}`
      allocationMap.set(key, (allocationMap.get(key) || 0) + 1)
    } else {
      // siteId がない場合はsiteNameで紐付け試行
      const metadata = parseScheduleMetadata(schedule.description)
      if (metadata.siteName) {
        // siteNameからSiteを逆引き
        const matchDemand = demands.find(
          (d) => d.site.name === metadata.siteName && formatDate(new Date(d.date)) === dateStr
        )
        if (matchDemand) {
          const key = `${matchDemand.siteId}:${dateStr}`
          allocationMap.set(key, (allocationMap.get(key) || 0) + 1)
        }
      }
    }
  }

  // ShortageItemを構築
  const items: ShortageItem[] = demands.map((demand) => {
    const dateStr = formatDate(new Date(demand.date))
    const key = `${demand.siteId}:${dateStr}`
    const allocatedCount = allocationMap.get(key) || 0
    const gap = allocatedCount - demand.requiredCount

    let status: AllocationStatus
    if (gap < 0) {
      status = 'shortage'
    } else if (gap > 0) {
      status = 'surplus'
    } else {
      status = 'sufficient'
    }

    return {
      siteId: demand.siteId,
      siteName: demand.site.name,
      date: dateStr,
      tradeType: demand.tradeType,
      requiredCount: demand.requiredCount,
      allocatedCount,
      gap,
      status,
      priority: demand.priority,
    }
  })

  // 不足が大きい順にソート
  items.sort((a, b) => a.gap - b.gap)

  return {
    success: true,
    data: {
      dateFrom: formatDate(from),
      dateTo: formatDate(to),
      items,
      summary: {
        total: items.length,
        shortageCount: items.filter((i) => i.status === 'shortage').length,
        sufficientCount: items.filter((i) => i.status === 'sufficient').length,
        surplusCount: items.filter((i) => i.status === 'surplus').length,
      },
    },
  }
})

function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
