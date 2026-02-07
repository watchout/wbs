/**
 * Platform API Integration Tests
 *
 * テスト対象:
 * - GET /api/platform/plans
 * - PATCH /api/platform/plans/:id
 * - GET /api/platform/credit-packs
 * - POST /api/platform/credit-packs
 * - PATCH /api/platform/credit-packs/:id
 * - GET /api/platform/cohorts
 * - PATCH /api/platform/cohorts/:id
 * - GET /api/platform/organizations
 * - GET /api/platform/organizations/:id
 *
 * requirePlatformAdmin による認証・認可を検証
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// ================================================================
// モック定義（vi.hoisted で変数を事前に定義）
// ================================================================

const {
  mockPrisma,
  mockPlatformAdmin,
  mockClearPlanCache,
} = vi.hoisted(() => ({
  mockPrisma: {
    planConfig: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    creditPackConfig: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      aggregate: vi.fn(),
    },
    cohortConfig: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    organization: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
  mockPlatformAdmin: vi.fn(),
  mockClearPlanCache: vi.fn(),
}))

// モック登録
vi.mock('~/server/utils/prisma', () => ({ prisma: mockPrisma }))
vi.mock('~/server/utils/requirePlatformAdmin', () => ({
  requirePlatformAdmin: mockPlatformAdmin,
}))
vi.mock('~/server/utils/stripe', () => ({
  clearPlanConfigCache: mockClearPlanCache,
  clearCohortConfigCache: vi.fn(),
}))

// h3 モック
vi.mock('h3', async () => {
  const actual = await vi.importActual('h3')
  return {
    ...actual,
    readBody: (event: { _body: unknown }) => Promise.resolve(event._body),
    getRouterParam: (event: { _params?: Record<string, string> }, name: string) =>
      event._params?.[name],
    getQuery: (event: { _query: unknown }) => event._query || {},
  }
})

// Nuxt 自動インポートのグローバルスタブ
// eslint-disable-next-line @typescript-eslint/no-explicit-any
vi.stubGlobal('getRouterParam', (event: any, name: string) =>
  event._params?.[name]
)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
vi.stubGlobal('readBody', (event: any) => Promise.resolve(event._body))
// eslint-disable-next-line @typescript-eslint/no-explicit-any
vi.stubGlobal('getQuery', (event: any) => event._query || {})

// ================================================================
// ヘルパー
// ================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createMockEvent(overrides: {
  body?: Record<string, unknown>
  params?: Record<string, string>
  query?: Record<string, unknown>
}): any {
  return {
    node: {
      req: {
        headers: {},
        url: '/api/platform/test',
        method: 'GET',
        socket: { remoteAddress: '127.0.0.1' },
      },
      res: {
        setHeader: vi.fn(),
        getHeader: vi.fn(),
      },
    },
    context: {},
    _body: overrides.body,
    _params: overrides.params,
    _query: overrides.query,
  }
}

const MOCK_PLATFORM_ADMIN = {
  userId: 'admin-1',
  organizationId: 'system-org',
  role: 'ADMIN',
  isPlatformAdmin: true,
}

// ================================================================
// テスト
// ================================================================

describe('Platform API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPlatformAdmin.mockResolvedValue(MOCK_PLATFORM_ADMIN)
  })

  // ----------------------------------------------------------
  // GET /api/platform/plans
  // ----------------------------------------------------------
  describe('GET /api/platform/plans', () => {
    it('全プランを sortOrder 昇順で返す', async () => {
      const mockPlans = [
        { id: 'plan-1', planType: 'STARTER', name: 'スターター', sortOrder: 1 },
        { id: 'plan-2', planType: 'BUSINESS', name: 'ビジネス', sortOrder: 2 },
      ]
      mockPrisma.planConfig.findMany.mockResolvedValue(mockPlans)

      const mod = await import('./plans/index.get')
      const handler = mod.default
      const event = createMockEvent({})
      const result = await handler(event) as { plans: unknown[] }

      expect(mockPlatformAdmin).toHaveBeenCalled()
      expect(result.plans).toHaveLength(2)
      expect(mockPrisma.planConfig.findMany).toHaveBeenCalledWith({
        orderBy: { sortOrder: 'asc' },
      })
    })

    it('プラットフォーム管理者でない場合 403 を返す', async () => {
      mockPlatformAdmin.mockRejectedValue(
        Object.assign(new Error('Forbidden'), { statusCode: 403 })
      )

      const mod = await import('./plans/index.get')
      const handler = mod.default
      const event = createMockEvent({})

      await expect(handler(event)).rejects.toMatchObject({
        statusCode: 403,
      })
    })
  })

  // ----------------------------------------------------------
  // PATCH /api/platform/plans/:id
  // ----------------------------------------------------------
  describe('PATCH /api/platform/plans/:id', () => {
    it('プランの価格を更新してキャッシュをクリアする', async () => {
      mockPrisma.planConfig.findUnique.mockResolvedValue({
        id: 'plan-1',
        planType: 'STARTER',
        name: 'スターター',
        monthlyPrice: 14800,
      })
      mockPrisma.planConfig.update.mockResolvedValue({
        id: 'plan-1',
        planType: 'STARTER',
        name: 'スターター',
        monthlyPrice: 16800,
      })

      const mod = await import('./plans/[id].patch')
      const handler = mod.default
      const event = createMockEvent({
        params: { id: 'plan-1' },
        body: { monthlyPrice: 16800 },
      })
      const result = await handler(event) as { plan: { monthlyPrice: number } }

      expect(result.plan.monthlyPrice).toBe(16800)
      expect(mockClearPlanCache).toHaveBeenCalled()
    })

    it('存在しないプランの場合 404 を返す', async () => {
      mockPrisma.planConfig.findUnique.mockResolvedValue(null)

      const mod = await import('./plans/[id].patch')
      const handler = mod.default
      const event = createMockEvent({
        params: { id: 'nonexistent' },
        body: { monthlyPrice: 16800 },
      })

      await expect(handler(event)).rejects.toMatchObject({
        statusCode: 404,
      })
    })
  })

  // ----------------------------------------------------------
  // GET /api/platform/credit-packs
  // ----------------------------------------------------------
  describe('GET /api/platform/credit-packs', () => {
    it('全クレジットパックを返す', async () => {
      const mockPacks = [
        { id: 'pack-1', name: '100クレジット', credits: 100, price: 1500 },
      ]
      mockPrisma.creditPackConfig.findMany.mockResolvedValue(mockPacks)

      const mod = await import('./credit-packs/index.get')
      const handler = mod.default
      const event = createMockEvent({})
      const result = await handler(event) as { creditPacks: unknown[] }

      expect(result.creditPacks).toHaveLength(1)
    })
  })

  // ----------------------------------------------------------
  // POST /api/platform/credit-packs
  // ----------------------------------------------------------
  describe('POST /api/platform/credit-packs', () => {
    it('新規クレジットパックを作成する', async () => {
      mockPrisma.creditPackConfig.aggregate.mockResolvedValue({
        _max: { sortOrder: 2 },
      })
      mockPrisma.creditPackConfig.create.mockResolvedValue({
        id: 'pack-new',
        name: '500クレジット',
        credits: 500,
        price: 5000,
        sortOrder: 3,
      })

      const mod = await import('./credit-packs/index.post')
      const handler = mod.default
      const event = createMockEvent({
        body: { name: '500クレジット', credits: 500, price: 5000 },
      })
      const result = await handler(event) as { creditPack: { name: string } }

      expect(result.creditPack.name).toBe('500クレジット')
    })

    it('必須フィールド欠落時は 400 を返す', async () => {
      const mod = await import('./credit-packs/index.post')
      const handler = mod.default
      const event = createMockEvent({
        body: { name: '500クレジット' }, // credits, price が欠落
      })

      await expect(handler(event)).rejects.toMatchObject({
        statusCode: 400,
      })
    })
  })

  // ----------------------------------------------------------
  // PATCH /api/platform/credit-packs/:id
  // ----------------------------------------------------------
  describe('PATCH /api/platform/credit-packs/:id', () => {
    it('クレジットパックの価格を更新する', async () => {
      mockPrisma.creditPackConfig.findUnique.mockResolvedValue({
        id: 'pack-1',
        name: '100クレジット',
        credits: 100,
        price: 1500,
      })
      mockPrisma.creditPackConfig.update.mockResolvedValue({
        id: 'pack-1',
        name: '100クレジット',
        credits: 100,
        price: 2000,
      })

      const mod = await import('./credit-packs/[id].patch')
      const handler = mod.default
      const event = createMockEvent({
        params: { id: 'pack-1' },
        body: { price: 2000 },
      })
      const result = await handler(event) as { creditPack: { price: number } }

      expect(result.creditPack.price).toBe(2000)
    })
  })

  // ----------------------------------------------------------
  // GET /api/platform/cohorts
  // ----------------------------------------------------------
  describe('GET /api/platform/cohorts', () => {
    it('全コホートを返す', async () => {
      const mockCohorts = [
        { id: 'c-1', cohortNumber: 1, maxOrgs: 10, discountPercent: 40 },
        { id: 'c-2', cohortNumber: 2, maxOrgs: 10, discountPercent: 25 },
      ]
      mockPrisma.cohortConfig.findMany.mockResolvedValue(mockCohorts)

      const mod = await import('./cohorts/index.get')
      const handler = mod.default
      const event = createMockEvent({})
      const result = await handler(event) as { cohorts: unknown[] }

      expect(result.cohorts).toHaveLength(2)
    })
  })

  // ----------------------------------------------------------
  // PATCH /api/platform/cohorts/:id
  // ----------------------------------------------------------
  describe('PATCH /api/platform/cohorts/:id', () => {
    it('コホートの割引率を更新する', async () => {
      mockPrisma.cohortConfig.findUnique.mockResolvedValue({
        id: 'c-1',
        cohortNumber: 1,
        maxOrgs: 10,
        discountPercent: 40,
      })
      mockPrisma.cohortConfig.update.mockResolvedValue({
        id: 'c-1',
        cohortNumber: 1,
        maxOrgs: 10,
        discountPercent: 35,
      })

      const mod = await import('./cohorts/[id].patch')
      const handler = mod.default
      const event = createMockEvent({
        params: { id: 'c-1' },
        body: { discountPercent: 35 },
      })
      const result = await handler(event) as { cohort: { discountPercent: number } }

      expect(result.cohort.discountPercent).toBe(35)
    })
  })

  // ----------------------------------------------------------
  // GET /api/platform/organizations
  // ----------------------------------------------------------
  describe('GET /api/platform/organizations', () => {
    it('システム組織を除く全組織を返す', async () => {
      const mockOrgs = [
        {
          id: 'org-1',
          name: 'テスト社',
          isSystemOrg: false,
          createdAt: new Date('2026-01-01'),
          subscription: { planType: 'BUSINESS', status: 'ACTIVE', currentPeriodEnd: new Date(), trialEndsAt: null },
          _count: { users: 5 },
          aiCreditBalance: { balance: 100, monthlyGrant: 200, packCredits: 0 },
        },
        {
          id: 'org-2',
          name: '第二テスト社',
          isSystemOrg: false,
          createdAt: new Date('2026-01-15'),
          subscription: null,
          _count: { users: 2 },
          aiCreditBalance: null,
        },
      ]
      mockPrisma.organization.findMany.mockResolvedValue(mockOrgs)

      const mod = await import('./organizations/index.get')
      const handler = mod.default
      const event = createMockEvent({})
      const result = await handler(event) as { organizations: unknown[] }

      expect(result.organizations).toHaveLength(2)
      expect(mockPrisma.organization.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isSystemOrg: false },
        }),
      )
    })
  })

  // ----------------------------------------------------------
  // GET /api/platform/organizations/:id
  // ----------------------------------------------------------
  describe('GET /api/platform/organizations/:id', () => {
    it('組織の詳細情報を返す', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({
        id: 'org-1',
        name: 'テスト社',
        isSystemOrg: false,
        users: [{ id: 'u-1', name: 'テスト太郎', role: 'ADMIN' }],
        subscription: { planType: 'BUSINESS', status: 'ACTIVE' },
      })

      const mod = await import('./organizations/[id].get')
      const handler = mod.default
      const event = createMockEvent({
        params: { id: 'org-1' },
      })
      const result = await handler(event) as { organization: { name: string } }

      expect(result.organization.name).toBe('テスト社')
    })

    it('システム組織へのアクセスは 403 を返す', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({
        id: 'system-org',
        name: 'ミエルプラス運営',
        isSystemOrg: true,
      })

      const mod = await import('./organizations/[id].get')
      const handler = mod.default
      const event = createMockEvent({
        params: { id: 'system-org' },
      })

      await expect(handler(event)).rejects.toMatchObject({
        statusCode: 403,
      })
    })

    it('存在しない組織の場合 404 を返す', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(null)

      const mod = await import('./organizations/[id].get')
      const handler = mod.default
      const event = createMockEvent({
        params: { id: 'nonexistent' },
      })

      await expect(handler(event)).rejects.toMatchObject({
        statusCode: 404,
      })
    })
  })
})
