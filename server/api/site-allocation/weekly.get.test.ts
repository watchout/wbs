/**
 * Site Allocation Weekly API Integration Tests
 *
 * GET /api/site-allocation/weekly
 *
 * Sprint 1: 現場×日ピボット配置サマリー
 * マルチテナント境界テスト（最重要）
 *
 * SSOT参照: SSOT_SITE_ALLOCATION.md §15 E-1, E-4, E-5
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { createTestContext, cleanupTestData, cleanupSession } from '../../../tests/helpers'
import { prisma } from '../../utils/prisma'
import { getWeekStart } from '../../utils/scheduleFormatter'

// APIハンドラを直接インポート
import weeklyHandler from './weekly.get'

// H3イベントのモック作成ヘルパー
function createMockEvent(options: {
  sessionId?: string
  query?: Record<string, string>
}) {
  const cookies: Record<string, string> = {}
  if (options.sessionId) {
    cookies['session_id'] = options.sessionId
  }

  return {
    node: {
      req: {
        headers: {
          cookie: options.sessionId ? `session_id=${options.sessionId}` : '',
        },
        url: `/api/site-allocation/weekly${options.query ? '?' + new URLSearchParams(options.query).toString() : ''}`
      },
      res: {
        setHeader: vi.fn(),
        getHeader: vi.fn()
      }
    },
    context: {},
    _query: options.query || {},
    _cookies: cookies
  } as unknown as Parameters<typeof weeklyHandler>[0]
}

describe('GET /api/site-allocation/weekly', () => {
  let ctxA: Awaited<ReturnType<typeof createTestContext>>
  let ctxB: Awaited<ReturnType<typeof createTestContext>>

  // 今週の月曜日を基準にする
  const monday = getWeekStart(new Date())

  function dayOfWeek(dayOffset: number): Date {
    const d = new Date(monday)
    d.setDate(d.getDate() + dayOffset)
    d.setHours(9, 0, 0, 0)
    return d
  }

  function dayEnd(dayOffset: number): Date {
    const d = new Date(monday)
    d.setDate(d.getDate() + dayOffset)
    d.setHours(18, 0, 0, 0)
    return d
  }

  beforeAll(async () => {
    // 2つの組織を作成（マルチテナント境界テスト用）
    ctxA = await createTestContext('site-alloc-a')
    ctxB = await createTestContext('site-alloc-b')

    // 組織Aにスケジュールを作成（siteName あり / なし）
    // 月曜: 品川ホテル
    await prisma.schedule.create({
      data: {
        organizationId: ctxA.org.id,
        authorId: ctxA.user.id,
        title: '電気工事',
        description: JSON.stringify({ siteName: '品川ホテル', activityType: '工事' }),
        start: dayOfWeek(0),
        end: dayEnd(0),
      },
    })

    // 火曜: 品川ホテル（同じ現場、別の日）
    await prisma.schedule.create({
      data: {
        organizationId: ctxA.org.id,
        authorId: ctxA.user.id,
        title: '配線',
        description: JSON.stringify({ siteName: '品川ホテル', activityType: '配線' }),
        start: dayOfWeek(1),
        end: dayEnd(1),
      },
    })

    // 月曜: 新宿ビル（別の現場）
    // 別ユーザーを作成
    const userA2 = await prisma.user.create({
      data: {
        email: `site-alloc-a2-${Date.now()}@example.com`,
        name: '佐藤テスト',
        role: 'MEMBER',
        organizationId: ctxA.org.id,
      },
    })

    await prisma.schedule.create({
      data: {
        organizationId: ctxA.org.id,
        authorId: userA2.id,
        title: '打合せ',
        description: JSON.stringify({ siteName: '新宿ビル' }),
        start: dayOfWeek(0),
        end: dayEnd(0),
      },
    })

    // 水曜: siteName なし（未設定行に集約されるはず）
    await prisma.schedule.create({
      data: {
        organizationId: ctxA.org.id,
        authorId: ctxA.user.id,
        title: '社内会議',
        description: null,
        start: dayOfWeek(2),
        end: dayEnd(2),
      },
    })

    // 組織Bにスケジュール作成
    await prisma.schedule.create({
      data: {
        organizationId: ctxB.org.id,
        authorId: ctxB.user.id,
        title: '横浜現場',
        description: JSON.stringify({ siteName: '横浜倉庫' }),
        start: dayOfWeek(0),
        end: dayEnd(0),
      },
    })
  })

  afterAll(async () => {
    cleanupSession(ctxA.sessionId)
    cleanupSession(ctxB.sessionId)
    await cleanupTestData(ctxA.org.id)
    await cleanupTestData(ctxB.org.id)
  })

  describe('§3-E #1: 正常系 — 現場ビュー取得', () => {
    it('should return site-based weekly allocation with correct structure', async () => {
      const weekStartStr = formatDate(monday)
      const event = createMockEvent({
        sessionId: ctxA.sessionId,
        query: { weekStart: weekStartStr },
      })

      const response = await weeklyHandler(event)

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      expect(response.data.weekStart).toBe(weekStartStr)
      expect(response.data.sites).toBeInstanceOf(Array)
      expect(response.data.unassigned).toBeDefined()
      expect(response.data.summary).toBeDefined()
    })

    it('should group schedules by siteName', async () => {
      const event = createMockEvent({
        sessionId: ctxA.sessionId,
        query: { weekStart: formatDate(monday) },
      })

      const response = await weeklyHandler(event)

      // 品川ホテル と 新宿ビル が存在するはず
      const siteNames = response.data.sites.map((s) => s.siteName)
      expect(siteNames).toContain('品川ホテル')
      expect(siteNames).toContain('新宿ビル')
    })

    it('should show worker names in each day cell', async () => {
      const event = createMockEvent({
        sessionId: ctxA.sessionId,
        query: { weekStart: formatDate(monday) },
      })

      const response = await weeklyHandler(event)

      const shinagawa = response.data.sites.find((s) => s.siteName === '品川ホテル')
      expect(shinagawa).toBeDefined()

      // 月曜日に配置者がいるはず
      const mondayData = shinagawa!.days.find((d) => d.dayKey === 'monday')
      expect(mondayData).toBeDefined()
      expect(mondayData!.allocated).toBeGreaterThanOrEqual(1)
      expect(mondayData!.workers.length).toBeGreaterThanOrEqual(1)
      expect(mondayData!.workers[0].name).toBeDefined()
    })

    it('should return required and gap as null in Sprint 1', async () => {
      const event = createMockEvent({
        sessionId: ctxA.sessionId,
        query: { weekStart: formatDate(monday) },
      })

      const response = await weeklyHandler(event)

      // Sprint 1: required / gap は null
      for (const site of response.data.sites) {
        for (const day of site.days) {
          expect(day.required).toBeNull()
          expect(day.gap).toBeNull()
        }
      }
    })

    it('should return siteId as null in Sprint 1', async () => {
      const event = createMockEvent({
        sessionId: ctxA.sessionId,
        query: { weekStart: formatDate(monday) },
      })

      const response = await weeklyHandler(event)

      for (const site of response.data.sites) {
        expect(site.siteId).toBeNull()
      }
    })
  })

  describe('§3-E #4: 異常系 — 未設定行の集約', () => {
    it('should aggregate schedules without siteName into unassigned row', async () => {
      const event = createMockEvent({
        sessionId: ctxA.sessionId,
        query: { weekStart: formatDate(monday) },
      })

      const response = await weeklyHandler(event)

      expect(response.data.unassigned.siteName).toBe('未設定')

      // 水曜に siteName なしのスケジュールがあるはず
      const wednesdayData = response.data.unassigned.days.find((d) => d.dayKey === 'wednesday')
      expect(wednesdayData).toBeDefined()
      expect(wednesdayData!.allocated).toBeGreaterThanOrEqual(1)
    })
  })

  describe('マルチテナント境界（最重要）', () => {
    it('should return only own organization sites', async () => {
      const event = createMockEvent({
        sessionId: ctxA.sessionId,
        query: { weekStart: formatDate(monday) },
      })

      const response = await weeklyHandler(event)

      expect(response.organizationId).toBe(ctxA.org.id)

      // 組織Bの「横浜倉庫」が含まれないこと
      const siteNames = response.data.sites.map((s) => s.siteName)
      expect(siteNames).not.toContain('横浜倉庫')
    })

    it('§3-E #5: should not leak other organization data', async () => {
      // 組織Aとしてアクセス
      const eventA = createMockEvent({
        sessionId: ctxA.sessionId,
        query: { weekStart: formatDate(monday) },
      })
      const responseA = await weeklyHandler(eventA)

      // 組織Bとしてアクセス
      const eventB = createMockEvent({
        sessionId: ctxB.sessionId,
        query: { weekStart: formatDate(monday) },
      })
      const responseB = await weeklyHandler(eventB)

      // 組織IDが異なること
      expect(responseA.organizationId).not.toBe(responseB.organizationId)

      // 組織Aに横浜倉庫がないこと
      const sitesA = responseA.data.sites.map((s) => s.siteName)
      expect(sitesA).not.toContain('横浜倉庫')

      // 組織Bに品川ホテル/新宿ビルがないこと
      const sitesB = responseB.data.sites.map((s) => s.siteName)
      expect(sitesB).not.toContain('品川ホテル')
      expect(sitesB).not.toContain('新宿ビル')
    })
  })

  describe('ソート', () => {
    it('should sort by name by default', async () => {
      const event = createMockEvent({
        sessionId: ctxA.sessionId,
        query: { weekStart: formatDate(monday) },
      })

      const response = await weeklyHandler(event)

      // 現場名の昇順であること
      const siteNames = response.data.sites.map((s) => s.siteName)
      const sorted = [...siteNames].sort((a, b) => a.localeCompare(b, 'ja'))
      expect(siteNames).toEqual(sorted)
    })

    it('should sort by count when specified', async () => {
      const event = createMockEvent({
        sessionId: ctxA.sessionId,
        query: { weekStart: formatDate(monday), sort: 'count' },
      })

      const response = await weeklyHandler(event)

      // 配置人数の降順であること
      const totals = response.data.sites.map((s) =>
        s.days.reduce((sum, d) => sum + d.allocated, 0)
      )
      for (let i = 0; i < totals.length - 1; i++) {
        expect(totals[i]).toBeGreaterThanOrEqual(totals[i + 1])
      }
    })
  })

  describe('日付バリデーション', () => {
    it('should return 400 for invalid date', async () => {
      const event = createMockEvent({
        sessionId: ctxA.sessionId,
        query: { weekStart: 'invalid-date' },
      })

      await expect(weeklyHandler(event)).rejects.toMatchObject({
        statusCode: 400,
      })
    })

    it('should use current week when weekStart is not provided', async () => {
      const event = createMockEvent({
        sessionId: ctxA.sessionId,
      })

      const response = await weeklyHandler(event)

      expect(response.success).toBe(true)
      expect(response.data.weekStart).toBeDefined()
    })
  })

  describe('サマリー', () => {
    it('should return correct summary counts', async () => {
      const event = createMockEvent({
        sessionId: ctxA.sessionId,
        query: { weekStart: formatDate(monday) },
      })

      const response = await weeklyHandler(event)

      // 現場数は0以上
      expect(response.data.summary.totalSites).toBeGreaterThanOrEqual(2)
      // 配置数は0以上
      expect(response.data.summary.totalAllocated).toBeGreaterThanOrEqual(3) // 品川x2日 + 新宿x1日 + 未設定x1日
    })
  })

  describe('パフォーマンス', () => {
    it('should respond within 500ms', async () => {
      const event = createMockEvent({
        sessionId: ctxA.sessionId,
        query: { weekStart: formatDate(monday) },
      })

      const startTime = performance.now()
      const response = await weeklyHandler(event)
      const duration = performance.now() - startTime

      expect(response.success).toBe(true)
      expect(duration).toBeLessThan(500)
    })
  })
})

/** Date → YYYY-MM-DD */
function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
