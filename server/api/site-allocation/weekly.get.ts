/**
 * 現場配置サマリーAPI（Sprint 1 + Sprint 2 拡張）
 *
 * GET /api/site-allocation/weekly
 *
 * 現場×日のピボット形式で配置状況を取得する。
 * Sprint 1: Schedule.description.siteName から現場名を集計。
 * Sprint 2: Site テーブル + SiteDemand から required/gap を算出。
 *
 * クエリパラメータ:
 * - weekStart: 週の開始日（YYYY-MM-DD）。省略時は今週月曜
 * - departmentId: 部門フィルタ（optional）
 * - sort: ソート順 'name' | 'count'（default: 'name'）
 *
 * SSOT参照: SSOT_SITE_ALLOCATION.md §10.3, §6 Sprint 1-2
 */

import { createLogger } from '~/server/utils/logger'
import { requireAuth } from '~/server/utils/authMiddleware'
import { prisma } from '~/server/utils/prisma'
import {
  parseScheduleMetadata,
  getWeekStart,
  getWeekEnd,
} from '~/server/utils/scheduleFormatter'

const log = createLogger('site-allocation-weekly')

/** 現場ごとの日別配置者 */
interface SiteWorker {
  userId: string
  name: string
  status: 'CONFIRMED'  // Sprint 5 で assignmentStatus 導入後に拡張
}

/** 現場の1日分データ */
interface SiteDayData {
  date: string          // YYYY-MM-DD
  dayKey: string        // 'monday' | 'tuesday' | ...
  allocated: number     // 配置人数
  required: number | null  // Sprint 2: SiteDemand からの必要人数（なければ null）
  gap: number | null       // Sprint 2: allocated - required（なければ null）
  workers: SiteWorker[]
}

/** 1現場分のデータ */
interface SiteRow {
  siteId: string | null    // Sprint 2: Site.id（存在する場合）
  siteName: string         // description.siteName または '未設定'
  days: SiteDayData[]
}

/** APIレスポンス */
interface SiteAllocationWeeklyResponse {
  success: boolean
  data: {
    weekStart: string     // YYYY-MM-DD
    weekEnd: string       // YYYY-MM-DD
    sites: SiteRow[]
    unassigned: SiteRow   // siteName 未設定の集約行
    summary: {
      totalSites: number  // 未設定を除く現場数
      totalAllocated: number  // 週全体の延べ配置数
    }
  }
  organizationId: string
}

const DAY_KEYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const

const ORDERED_DAY_KEYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const

export default defineEventHandler(async (event): Promise<SiteAllocationWeeklyResponse> => {
  try {
    // 認証チェック + テナントスコープ
    const authContext = await requireAuth(event)

    // クエリパラメータ
    const query = getQuery(event)
    const weekStartParam = query.weekStart as string | undefined
    const departmentId = query.departmentId as string | undefined
    const sort = (query.sort as string | undefined) ?? 'name'

    // weekStart バリデーション
    let baseDate: Date
    if (weekStartParam) {
      baseDate = new Date(weekStartParam)
      if (isNaN(baseDate.getTime())) {
        throw createError({
          statusCode: 400,
          message: '有効な日付を指定してください（YYYY-MM-DD）',
        })
      }
    } else {
      baseDate = new Date()
    }

    const weekStart = getWeekStart(baseDate)
    const weekEnd = getWeekEnd(baseDate)

    // スケジュールを取得（organizationId スコープ必須）
    const whereClause: Record<string, unknown> = {
      organizationId: authContext.organizationId,
      deletedAt: null,
      start: {
        gte: weekStart,
        lt: weekEnd,
      },
    }

    // 部門フィルタ: authorId 経由でフィルタ
    if (departmentId) {
      const deptUsers = await prisma.user.findMany({
        where: {
          organizationId: authContext.organizationId,
          departmentId,
          deletedAt: null,
        },
        select: { id: true },
      })
      const deptUserIds = deptUsers.map((u) => u.id)
      whereClause.authorId = { in: deptUserIds }
    }

    const schedules = await prisma.schedule.findMany({
      where: whereClause,
      include: {
        author: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        start: 'asc',
      },
    })

    // Sprint 2: Site マスタを取得（テナントスコープ）
    const allSites = await prisma.site.findMany({
      where: {
        organizationId: authContext.organizationId,
        deletedAt: null,
      },
      select: { id: true, name: true },
    })
    const siteNameToId = new Map<string, string>()
    const siteIdToName = new Map<string, string>()
    for (const s of allSites) {
      siteNameToId.set(s.name, s.id)
      siteIdToName.set(s.id, s.name)
    }

    // Sprint 2: SiteDemand を取得（テナントスコープ）
    const demands = await prisma.siteDemand.findMany({
      where: {
        organizationId: authContext.organizationId,
        date: {
          gte: weekStart,
          lt: weekEnd,
        },
      },
    })

    // SiteDemand を siteId + date でグルーピング → 日毎の合計必要人数
    // key: "siteId:YYYY-MM-DD"
    const demandMap = new Map<string, number>()
    for (const d of demands) {
      const dateStr = formatDate(new Date(d.date))
      const key = `${d.siteId}:${dateStr}`
      demandMap.set(key, (demandMap.get(key) || 0) + d.requiredCount)
    }

    // 現場名ごとにグルーピング
    // key: siteName（未設定は特別扱い）
    const siteMap = new Map<string, { siteId: string | null; dayMap: Map<string, SiteWorker[]> }>()
    const unassignedMap = new Map<string, SiteWorker[]>()

    for (const schedule of schedules) {
      const metadata = parseScheduleMetadata(schedule.description)
      let siteName = metadata.siteName?.trim() || ''
      let siteId: string | null = null

      // Sprint 2: siteId が設定されている場合はそちらを優先
      if ('siteId' in schedule && schedule.siteId) {
        siteId = schedule.siteId as string
        const name = siteIdToName.get(siteId)
        if (name) siteName = name
      } else if (siteName) {
        // siteName → siteId 逆引き
        siteId = siteNameToId.get(siteName) || null
      }

      // 曜日キーを計算
      const scheduleDate = new Date(schedule.start)
      const dayOfWeek = scheduleDate.getDay()
      const dayKey = DAY_KEYS[dayOfWeek]

      const worker: SiteWorker = {
        userId: schedule.author?.id ?? 'unknown',
        name: schedule.author?.name ?? '不明',
        status: 'CONFIRMED',
      }

      if (!siteName) {
        // siteName 未設定 → unassigned
        const existing = unassignedMap.get(dayKey) ?? []
        existing.push(worker)
        unassignedMap.set(dayKey, existing)
      } else {
        // 通常の現場
        if (!siteMap.has(siteName)) {
          siteMap.set(siteName, { siteId, dayMap: new Map<string, SiteWorker[]>() })
        }
        const entry = siteMap.get(siteName)!
        if (siteId && !entry.siteId) entry.siteId = siteId
        const existing = entry.dayMap.get(dayKey) ?? []
        existing.push(worker)
        entry.dayMap.set(dayKey, existing)
      }
    }

    // Sprint 2: SiteDemandがあるがScheduleがない現場もサイトマップに追加
    for (const s of allSites) {
      if (!siteMap.has(s.name)) {
        // この現場にdemandがあるか確認
        const hasDemand = demands.some((d) => d.siteId === s.id)
        if (hasDemand) {
          siteMap.set(s.name, { siteId: s.id, dayMap: new Map<string, SiteWorker[]>() })
        }
      }
    }

    // 日付文字列の配列を生成（月〜日）
    const dayDates: string[] = ORDERED_DAY_KEYS.map((_, index) => {
      const d = new Date(weekStart)
      d.setDate(d.getDate() + index)
      return formatDate(d)
    })

    // SiteRow 配列を構築
    const sites: SiteRow[] = []
    let totalAllocated = 0

    for (const [siteName, entry] of siteMap) {
      const days: SiteDayData[] = ORDERED_DAY_KEYS.map((dayKey, index) => {
        const workers = entry.dayMap.get(dayKey) ?? []
        totalAllocated += workers.length

        // Sprint 2: required/gap を算出
        let required: number | null = null
        let gap: number | null = null

        if (entry.siteId) {
          const demandKey = `${entry.siteId}:${dayDates[index]}`
          const demandTotal = demandMap.get(demandKey)
          if (demandTotal !== undefined) {
            required = demandTotal
            gap = workers.length - required
          }
        }

        return {
          date: dayDates[index],
          dayKey,
          allocated: workers.length,
          required,
          gap,
          workers,
        }
      })

      sites.push({
        siteId: entry.siteId,
        siteName,
        days,
      })
    }

    // ソート
    if (sort === 'count') {
      // 配置人数合計の降順（同数時は現場名の昇順でタイブレーク）
      sites.sort((a, b) => {
        const aTotal = a.days.reduce((sum, d) => sum + d.allocated, 0)
        const bTotal = b.days.reduce((sum, d) => sum + d.allocated, 0)
        return bTotal - aTotal || a.siteName.localeCompare(b.siteName, 'ja')
      })
    } else {
      // 現場名の昇順（デフォルト）
      sites.sort((a, b) => a.siteName.localeCompare(b.siteName, 'ja'))
    }

    // 未設定行
    const unassignedDays: SiteDayData[] = ORDERED_DAY_KEYS.map((dayKey, index) => {
      const workers = unassignedMap.get(dayKey) ?? []
      totalAllocated += workers.length
      return {
        date: dayDates[index],
        dayKey,
        allocated: workers.length,
        required: null,
        gap: null,
        workers,
      }
    })

    const unassigned: SiteRow = {
      siteId: null,
      siteName: '未設定',
      days: unassignedDays,
    }

    return {
      success: true,
      data: {
        weekStart: formatDate(weekStart),
        weekEnd: formatDate(new Date(weekEnd.getTime() - 86400000)), // 日曜日（weekEnd は次の月曜なので-1日）
        sites,
        unassigned,
        summary: {
          totalSites: sites.length,
          totalAllocated,
        },
      },
      organizationId: authContext.organizationId,
    }
  } catch (error: unknown) {
    log.error('Failed to fetch site allocation weekly', {
      error: error instanceof Error ? error : new Error(String(error)),
    })

    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    throw createError({
      statusCode: 500,
      message: '現場配置サマリーの取得に失敗しました',
    })
  }
})

/** Date → YYYY-MM-DD */
function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
