/**
 * Billing API Integration Tests
 *
 * テスト対象:
 * - GET /api/billing/subscription
 * - POST /api/billing/checkout
 * - POST /api/billing/portal
 * - GET /api/billing/credits
 * - POST /api/billing/credits/use
 * - POST /api/billing/credits/purchase
 * - GET /api/billing/plans
 *
 * 金銭計算・プラン判定は TEST_STRATEGY.md で「必須レベル」に指定
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// ================================================================
// モック定義（vi.hoisted で変数を事前に定義）
// ================================================================

const {
  mockPrisma,
  mockStripe,
  mockAuth,
  mockAiCredits,
  mockCohort,
} = vi.hoisted(() => ({
  mockPrisma: {
    subscription: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
      upsert: vi.fn(),
      count: vi.fn(),
    },
    organization: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    aiCreditBalance: {
      findUnique: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
    aiCreditTransaction: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    planConfig: {
      findMany: vi.fn(),
    },
    creditPackConfig: {
      findMany: vi.fn(),
    },
    cohortConfig: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
  mockStripe: {
    customers: { create: vi.fn() },
    checkout: {
      sessions: { create: vi.fn() },
    },
    billingPortal: {
      sessions: { create: vi.fn() },
    },
    subscriptions: { retrieve: vi.fn() },
    products: { retrieve: vi.fn() },
    prices: { retrieve: vi.fn() },
    webhooks: { constructEvent: vi.fn() },
  },
  mockAuth: vi.fn(),
  mockAiCredits: {
    getAiCreditBalance: vi.fn(),
    getCreditHistory: vi.fn(),
    useAiCredit: vi.fn(),
    resetMonthlyCredits: vi.fn(),
    initializeCredits: vi.fn(),
    grantPackCredits: vi.fn(),
  },
  mockCohort: {
    determineCohort: vi.fn(),
  },
}))

// モック登録
vi.mock('~/server/utils/prisma', () => ({ prisma: mockPrisma }))
vi.mock('~/server/utils/stripe', () => ({
  stripe: mockStripe,
  PLAN_LIMITS: {
    STARTER: { maxUsers: 10, monthlyAiCredits: 150, features: ['board'] },
    BUSINESS: { maxUsers: 30, monthlyAiCredits: 400, features: ['board', 'calendar', 'signage'] },
    ENTERPRISE: { maxUsers: -1, monthlyAiCredits: -1, features: ['board', 'calendar', 'signage', 'api'] },
  },
}))
vi.mock('~/server/utils/authMiddleware', () => ({
  requireAuth: mockAuth,
  requireOtpVerified: vi.fn(), // OTP 検証は課金テストではスキップ
}))
vi.mock('~/server/utils/aiCredits', () => mockAiCredits)
vi.mock('~/server/utils/cohort', () => mockCohort)
vi.mock('~/server/utils/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

// h3 モック
vi.mock('h3', async () => {
  const actual = await vi.importActual('h3')
  return {
    ...actual,
    readBody: (event: { _body: unknown }) => Promise.resolve(event._body),
    readRawBody: (event: { _rawBody: unknown }) => Promise.resolve(event._rawBody),
    getHeader: (_event: unknown, name: string) => {
      const headers = (_event as { _headers?: Record<string, string> })._headers || {}
      return headers[name]
    },
    getQuery: (event: { _query: unknown }) => event._query || {},
  }
})

// ================================================================
// ヘルパー
// ================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createMockEvent(overrides: {
  body?: Record<string, unknown>
  rawBody?: string
  headers?: Record<string, string>
  query?: Record<string, unknown>
}): any {
  return {
    node: {
      req: {
        headers: overrides.headers || {},
        url: '/api/billing/test',
        method: 'POST',
        socket: { remoteAddress: '127.0.0.1' },
      },
      res: {
        setHeader: vi.fn(),
        getHeader: vi.fn(),
      },
    },
    context: {},
    _body: overrides.body,
    _rawBody: overrides.rawBody,
    _headers: overrides.headers,
    _query: overrides.query,
  }
}

const MOCK_AUTH = {
  userId: 'user-1',
  organizationId: 'org-1',
  role: 'ADMIN' as const,
}

// ================================================================
// テスト
// ================================================================

describe('Billing API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue(MOCK_AUTH)
  })

  // ----------------------------------------------------------
  // GET /api/billing/subscription
  // ----------------------------------------------------------
  describe('GET /api/billing/subscription', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let handler: any

    beforeEach(async () => {
      const mod = await import('./subscription.get')
      handler = mod.default
    })

    it('サブスクリプションとクレジット残高を返す', async () => {
      const mockSub = {
        planType: 'BUSINESS',
        status: 'ACTIVE',
        maxUsers: 30,
        monthlyAiCredits: 400,
        currentPeriodStart: new Date('2026-01-01'),
        currentPeriodEnd: new Date('2026-02-01'),
        trialEndsAt: null,
        canceledAt: null,
        billingInterval: 'month',
      }
      mockPrisma.subscription.findUnique.mockResolvedValue(mockSub)
      mockAiCredits.getAiCreditBalance.mockResolvedValue({
        balance: 380,
        monthlyGrant: 400,
        packCredits: 0,
      })

      const event = createMockEvent({})
      const result = await handler(event)

      expect(mockAuth).toHaveBeenCalled()
      expect(mockPrisma.subscription.findUnique).toHaveBeenCalledWith({
        where: { organizationId: 'org-1' },
      })
      expect(result).toEqual({
        subscription: expect.objectContaining({
          planType: 'BUSINESS',
          status: 'ACTIVE',
        }),
        credits: expect.objectContaining({
          balance: 380,
        }),
      })
    })

    it('サブスクリプション未契約の場合 null を返す', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(null)
      mockAiCredits.getAiCreditBalance.mockResolvedValue(null)

      const event = createMockEvent({})
      const result = await handler(event) as { subscription: unknown }

      expect(result.subscription).toBeNull()
    })
  })

  // ----------------------------------------------------------
  // POST /api/billing/checkout
  // ----------------------------------------------------------
  describe('POST /api/billing/checkout', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let handler: any

    beforeEach(async () => {
      const mod = await import('./checkout.post')
      handler = mod.default
    })

    it('Checkout Session を作成して URL を返す', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({
        id: 'org-1',
        name: 'Test Org',
        stripeCustomerId: 'cus_test123',
      })
      mockCohort.determineCohort.mockResolvedValue({
        cohortNumber: 1,
        discountPercent: 40,
        couponId: 'coupon_1',
        remainingSlots: 5,
      })
      mockStripe.checkout.sessions.create.mockResolvedValue({
        url: 'https://checkout.stripe.com/session_test',
      })

      const event = createMockEvent({
        body: { priceId: 'price_test123' },
      })
      const result = await handler(event) as { url: string; cohort: { discountPercent: number } }

      expect(result.url).toBe('https://checkout.stripe.com/session_test')
      expect(result.cohort.discountPercent).toBe(40)
    })

    it('ADMINでない場合 403 を返す', async () => {
      mockAuth.mockResolvedValue({ ...MOCK_AUTH, role: 'MEMBER' })

      const event = createMockEvent({
        body: { priceId: 'price_test123' },
      })

      await expect(handler(event)).rejects.toMatchObject({
        statusCode: 403,
      })
    })

    it('priceId が未指定の場合 400 を返す', async () => {
      const event = createMockEvent({
        body: {},
      })

      await expect(handler(event)).rejects.toMatchObject({
        statusCode: 400,
      })
    })

    it('Stripe Customer 未作成の場合、新規作成する', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({
        id: 'org-1',
        name: 'New Org',
        stripeCustomerId: null,
      })
      mockStripe.customers.create.mockResolvedValue({ id: 'cus_new' })
      mockPrisma.organization.update.mockResolvedValue({})
      mockCohort.determineCohort.mockResolvedValue({
        cohortNumber: null,
        discountPercent: 0,
        couponId: null,
        remainingSlots: 0,
      })
      mockStripe.checkout.sessions.create.mockResolvedValue({
        url: 'https://checkout.stripe.com/session_new',
      })

      const event = createMockEvent({
        body: { priceId: 'price_test123' },
      })
      await handler(event)

      expect(mockStripe.customers.create).toHaveBeenCalledWith({
        name: 'New Org',
        metadata: { organizationId: 'org-1' },
      })
      expect(mockPrisma.organization.update).toHaveBeenCalledWith({
        where: { id: 'org-1' },
        data: { stripeCustomerId: 'cus_new' },
      })
    })
  })

  // ----------------------------------------------------------
  // POST /api/billing/portal
  // ----------------------------------------------------------
  describe('POST /api/billing/portal', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let handler: any

    beforeEach(async () => {
      const mod = await import('./portal.post')
      handler = mod.default
    })

    it('Customer Portal URL を返す', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({
        id: 'org-1',
        stripeCustomerId: 'cus_test123',
      })
      mockStripe.billingPortal.sessions.create.mockResolvedValue({
        url: 'https://billing.stripe.com/portal_test',
      })

      const event = createMockEvent({})
      const result = await handler(event) as { url: string }

      expect(result.url).toBe('https://billing.stripe.com/portal_test')
    })

    it('ADMIN でない場合 403 を返す', async () => {
      mockAuth.mockResolvedValue({ ...MOCK_AUTH, role: 'MEMBER' })

      const event = createMockEvent({})
      await expect(handler(event)).rejects.toMatchObject({
        statusCode: 403,
      })
    })

    it('Stripe Customer 未設定の場合 404 を返す', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({
        id: 'org-1',
        stripeCustomerId: null,
      })

      const event = createMockEvent({})
      await expect(handler(event)).rejects.toMatchObject({
        statusCode: 404,
      })
    })
  })

  // ----------------------------------------------------------
  // GET /api/billing/credits
  // ----------------------------------------------------------
  describe('GET /api/billing/credits', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let handler: any

    beforeEach(async () => {
      const mod = await import('./credits/index.get')
      handler = mod.default
    })

    it('クレジット残高と履歴を返す', async () => {
      mockAiCredits.getAiCreditBalance.mockResolvedValue({
        balance: 100,
        monthlyGrant: 150,
        packCredits: 0,
      })
      mockAiCredits.getCreditHistory.mockResolvedValue([
        { id: 'tx-1', type: 'USE', amount: -1, description: 'AI機能使用' },
      ])

      const event = createMockEvent({ query: { limit: '10', offset: '0' } })
      const result = await handler(event) as { balance: unknown; history: unknown[] }

      expect(result.balance).toEqual(
        expect.objectContaining({ balance: 100 })
      )
      expect(result.history).toHaveLength(1)
    })

    it('limit は最大 100 に制限される', async () => {
      mockAiCredits.getAiCreditBalance.mockResolvedValue({ balance: 0 })
      mockAiCredits.getCreditHistory.mockResolvedValue([])

      const event = createMockEvent({ query: { limit: '500' } })
      await handler(event)

      expect(mockAiCredits.getCreditHistory).toHaveBeenCalledWith(
        'org-1',
        100, // 500 → 100 に制限
        0,
      )
    })
  })

  // ----------------------------------------------------------
  // POST /api/billing/credits/use
  // ----------------------------------------------------------
  describe('POST /api/billing/credits/use', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let handler: any

    beforeEach(async () => {
      const mod = await import('./credits/use.post')
      handler = mod.default
    })

    it('クレジットを1消費して残高を返す', async () => {
      mockAiCredits.useAiCredit.mockResolvedValue({
        success: true,
        balanceAfter: 99,
      })

      const event = createMockEvent({
        body: { description: 'AI音声入力' },
      })
      const result = await handler(event) as { success: boolean; balanceAfter: number }

      expect(result.success).toBe(true)
      expect(result.balanceAfter).toBe(99)
      expect(mockAiCredits.useAiCredit).toHaveBeenCalledWith(
        'org-1',
        'AI音声入力',
      )
    })

    it('クレジット不足の場合 402 を返す', async () => {
      mockAiCredits.useAiCredit.mockResolvedValue({
        success: false,
        error: 'クレジット不足',
      })

      const event = createMockEvent({
        body: { description: 'AI機能使用' },
      })

      await expect(handler(event)).rejects.toMatchObject({
        statusCode: 402,
      })
    })

    it('description 省略時はデフォルトメッセージを使用', async () => {
      mockAiCredits.useAiCredit.mockResolvedValue({
        success: true,
        balanceAfter: 99,
      })

      const event = createMockEvent({ body: {} })
      await handler(event)

      expect(mockAiCredits.useAiCredit).toHaveBeenCalledWith(
        'org-1',
        'AI機能使用',
      )
    })
  })

  // ----------------------------------------------------------
  // POST /api/billing/credits/purchase
  // ----------------------------------------------------------
  describe('POST /api/billing/credits/purchase', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let handler: any

    beforeEach(async () => {
      const mod = await import('./credits/purchase.post')
      handler = mod.default
    })

    it('クレジットパック購入の Checkout Session を作成', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({
        id: 'org-1',
        stripeCustomerId: 'cus_test123',
      })
      mockStripe.checkout.sessions.create.mockResolvedValue({
        url: 'https://checkout.stripe.com/credit_pack',
      })

      const event = createMockEvent({
        body: { packPriceId: 'price_pack_100' },
      })
      const result = await handler(event) as { url: string }

      expect(result.url).toBe('https://checkout.stripe.com/credit_pack')
      // mode は 'payment'（買い切り）であること
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'payment',
          metadata: expect.objectContaining({
            type: 'credit_pack',
          }),
        }),
      )
    })

    it('ADMIN でない場合 403 を返す', async () => {
      mockAuth.mockResolvedValue({ ...MOCK_AUTH, role: 'MEMBER' })

      const event = createMockEvent({
        body: { packPriceId: 'price_pack_100' },
      })

      await expect(handler(event)).rejects.toMatchObject({
        statusCode: 403,
      })
    })

    it('Stripe Customer 未設定の場合 400 を返す', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({
        id: 'org-1',
        stripeCustomerId: null,
      })

      const event = createMockEvent({
        body: { packPriceId: 'price_pack_100' },
      })

      await expect(handler(event)).rejects.toMatchObject({
        statusCode: 400,
      })
    })
  })

  // ----------------------------------------------------------
  // GET /api/billing/plans
  // ----------------------------------------------------------
  describe('GET /api/billing/plans', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let handler: any

    beforeEach(async () => {
      // キャッシュをリセットするために新しいモジュールを取得
      vi.resetModules()
      // モック再登録
      vi.doMock('~/server/utils/prisma', () => ({ prisma: mockPrisma }))
      const mod = await import('./plans.get')
      handler = mod.default
    })

    it('プラン・クレジットパック・コホート情報を返す', async () => {
      mockPrisma.planConfig.findMany.mockResolvedValue([
        {
          id: 'plan-1',
          planType: 'STARTER',
          name: 'スターター',
          monthlyPrice: 14800,
          maxUsers: 10,
          monthlyAiCredits: 150,
          features: ['board'],
          featureLabels: ['週間ボード'],
          isRecommended: false,
          sortOrder: 1,
        },
      ])
      mockPrisma.creditPackConfig.findMany.mockResolvedValue([
        {
          id: 'pack-1',
          name: '100クレジット',
          credits: 100,
          price: 1500,
          sortOrder: 1,
        },
      ])
      mockPrisma.cohortConfig.findMany.mockResolvedValue([
        {
          id: 'cohort-1',
          cohortNumber: 1,
          maxOrgs: 10,
          discountPercent: 40,
        },
      ])
      mockPrisma.subscription.count.mockResolvedValue(3)

      const event = createMockEvent({})
      const result = await handler(event) as {
        plans: unknown[]
        creditPacks: unknown[]
        launchStatus: { remaining: number; currentDiscount: number }
      }

      expect(result.plans).toHaveLength(1)
      expect(result.creditPacks).toHaveLength(1)
      expect(result.launchStatus.remaining).toBe(7) // 10 - 3
      expect(result.launchStatus.currentDiscount).toBe(40)
    })
  })
})
