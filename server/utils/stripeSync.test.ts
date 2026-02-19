/**
 * Stripe Sync Utility Unit Tests
 *
 * stripeSync.ts のユニットテスト
 * - syncPlanToStripe: プラン設定の Stripe 同期
 * - syncCreditPackToStripe: クレジットパック設定の Stripe 同期
 * - syncCohortToStripe: コホート設定の Stripe 同期
 * - syncAllToStripe: 全設定の一括同期
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// モック定義（vi.hoisted で変数を事前に定義）
const { mockStripe, mockClearPlanConfigCache, mockClearCohortConfigCache, mockPrisma } = vi.hoisted(() => ({
  mockStripe: {
    products: {
      search: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    prices: {
      create: vi.fn(),
    },
    coupons: {
      retrieve: vi.fn(),
      create: vi.fn(),
    },
  },
  mockClearPlanConfigCache: vi.fn(),
  mockClearCohortConfigCache: vi.fn(),
  mockPrisma: {
    planConfig: {
      update: vi.fn(),
      findMany: vi.fn(),
    },
    creditPackConfig: {
      update: vi.fn(),
      findMany: vi.fn(),
    },
    cohortConfig: {
      update: vi.fn(),
      findMany: vi.fn(),
    },
  },
}))

vi.mock('./stripe', () => ({
  stripe: mockStripe,
  clearPlanConfigCache: mockClearPlanConfigCache,
  clearCohortConfigCache: mockClearCohortConfigCache,
}))

vi.mock('./prisma', () => ({
  prisma: mockPrisma,
}))

import {
  syncPlanToStripe,
  syncCreditPackToStripe,
  syncCohortToStripe,
  syncAllToStripe,
} from './stripeSync'

// テスト用データファクトリ
function createMockPlanConfig(overrides = {}) {
  return {
    id: 'plan-1',
    planType: 'BUSINESS',
    name: 'ビジネス',
    description: 'ビジネスプランの説明',
    monthlyPrice: 9800,
    annualPrice: 98000,
    maxUsers: 30,
    monthlyAiCredits: 50,
    features: ['weekly_board', 'calendar_sync'],
    featureLabels: ['週間ボード', 'カレンダー連携'],
    isRecommended: true,
    sortOrder: 2,
    isActive: true,
    stripePriceIdMonthly: null as string | null,
    stripePriceIdAnnual: null as string | null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  }
}

function createMockCreditPackConfig(overrides = {}) {
  return {
    id: 'pack-1',
    name: 'スタンダード',
    credits: 100,
    price: 3000,
    stripePriceId: null as string | null,
    sortOrder: 1,
    isActive: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  }
}

function createMockCohortConfig(overrides = {}) {
  return {
    id: 'cohort-1',
    cohortNumber: 1,
    maxOrgs: 50,
    discountPercent: 50,
    stripeCouponId: null as string | null,
    isActive: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  }
}

describe('stripeSync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ================================================================
  // syncPlanToStripe
  // ================================================================
  describe('syncPlanToStripe', () => {
    it('既存Product がある場合、products.update を呼び出す', async () => {
      const plan = createMockPlanConfig()

      mockStripe.products.search.mockResolvedValue({
        data: [{ id: 'prod_existing' }],
      })
      mockStripe.products.update.mockResolvedValue({ id: 'prod_existing' })
      mockStripe.prices.create.mockResolvedValue({ id: 'price_monthly_new' })
      mockPrisma.planConfig.update.mockResolvedValue({ ...plan, stripePriceIdMonthly: 'price_monthly_new' })

      await syncPlanToStripe(plan)

      expect(mockStripe.products.update).toHaveBeenCalledWith('prod_existing', {
        name: 'ミエルボード ビジネスプラン',
        description: 'ビジネスプランの説明',
        metadata: {
          lookupKey: 'mielboard_business',
          planType: 'BUSINESS',
          maxUsers: '30',
          monthlyAiCredits: '50',
        },
      })
      expect(mockStripe.products.create).not.toHaveBeenCalled()
    })

    it('新規Product の場合、products.create を呼び出す', async () => {
      const plan = createMockPlanConfig()

      mockStripe.products.search.mockResolvedValue({ data: [] })
      mockStripe.products.create.mockResolvedValue({ id: 'prod_new' })
      mockStripe.prices.create.mockResolvedValue({ id: 'price_monthly_new' })
      mockPrisma.planConfig.update.mockResolvedValue({ ...plan, stripePriceIdMonthly: 'price_monthly_new' })

      await syncPlanToStripe(plan)

      expect(mockStripe.products.create).toHaveBeenCalledWith({
        name: 'ミエルボード ビジネスプラン',
        description: 'ビジネスプランの説明',
        metadata: {
          lookupKey: 'mielboard_business',
          planType: 'BUSINESS',
          maxUsers: '30',
          monthlyAiCredits: '50',
        },
      })
      expect(mockStripe.products.update).not.toHaveBeenCalled()
    })

    it('月額Price が未設定の場合、prices.create を月額で呼び出す', async () => {
      const plan = createMockPlanConfig({ stripePriceIdMonthly: null })

      mockStripe.products.search.mockResolvedValue({ data: [{ id: 'prod_existing' }] })
      mockStripe.products.update.mockResolvedValue({ id: 'prod_existing' })
      mockStripe.prices.create.mockResolvedValue({ id: 'price_monthly_new' })
      mockPrisma.planConfig.update.mockResolvedValue({ ...plan, stripePriceIdMonthly: 'price_monthly_new' })

      await syncPlanToStripe(plan)

      expect(mockStripe.prices.create).toHaveBeenCalledWith({
        product: 'prod_existing',
        unit_amount: 9800,
        currency: 'jpy',
        recurring: { interval: 'month' },
        lookup_key: 'mielboard_business_month',
      })
    })

    it('月額Price が既設定の場合、月額の prices.create をスキップする', async () => {
      const plan = createMockPlanConfig({
        stripePriceIdMonthly: 'price_monthly_existing',
        annualPrice: null,
        stripePriceIdAnnual: null,
      })

      mockStripe.products.search.mockResolvedValue({ data: [{ id: 'prod_existing' }] })
      mockStripe.products.update.mockResolvedValue({ id: 'prod_existing' })
      mockPrisma.planConfig.update.mockResolvedValue(plan)

      await syncPlanToStripe(plan)

      expect(mockStripe.prices.create).not.toHaveBeenCalled()
    })

    it('年額Price が未設定で annualPrice がある場合、prices.create を年額で呼び出す', async () => {
      const plan = createMockPlanConfig({
        stripePriceIdMonthly: 'price_monthly_existing',
        annualPrice: 98000,
        stripePriceIdAnnual: null,
      })

      mockStripe.products.search.mockResolvedValue({ data: [{ id: 'prod_existing' }] })
      mockStripe.products.update.mockResolvedValue({ id: 'prod_existing' })
      mockStripe.prices.create.mockResolvedValue({ id: 'price_annual_new' })
      mockPrisma.planConfig.update.mockResolvedValue({
        ...plan,
        stripePriceIdAnnual: 'price_annual_new',
      })

      await syncPlanToStripe(plan)

      expect(mockStripe.prices.create).toHaveBeenCalledWith({
        product: 'prod_existing',
        unit_amount: 98000,
        currency: 'jpy',
        recurring: { interval: 'year' },
        lookup_key: 'mielboard_business_year',
      })
    })

    it('年額Price が未設定で annualPrice が null の場合、年額の prices.create をスキップする', async () => {
      const plan = createMockPlanConfig({
        stripePriceIdMonthly: 'price_monthly_existing',
        annualPrice: null,
        stripePriceIdAnnual: null,
      })

      mockStripe.products.search.mockResolvedValue({ data: [{ id: 'prod_existing' }] })
      mockStripe.products.update.mockResolvedValue({ id: 'prod_existing' })
      mockPrisma.planConfig.update.mockResolvedValue(plan)

      await syncPlanToStripe(plan)

      expect(mockStripe.prices.create).not.toHaveBeenCalled()
    })

    it('DB 更新: planConfig.update を呼び出して Price ID を保存する', async () => {
      const plan = createMockPlanConfig({
        stripePriceIdMonthly: null,
        annualPrice: 98000,
        stripePriceIdAnnual: null,
      })

      mockStripe.products.search.mockResolvedValue({ data: [{ id: 'prod_existing' }] })
      mockStripe.products.update.mockResolvedValue({ id: 'prod_existing' })
      mockStripe.prices.create
        .mockResolvedValueOnce({ id: 'price_monthly_new' })
        .mockResolvedValueOnce({ id: 'price_annual_new' })
      mockPrisma.planConfig.update.mockResolvedValue({
        ...plan,
        stripePriceIdMonthly: 'price_monthly_new',
        stripePriceIdAnnual: 'price_annual_new',
      })

      await syncPlanToStripe(plan)

      expect(mockPrisma.planConfig.update).toHaveBeenCalledWith({
        where: { id: 'plan-1' },
        data: {
          stripePriceIdMonthly: 'price_monthly_new',
          stripePriceIdAnnual: 'price_annual_new',
        },
      })
    })

    it('clearPlanConfigCache を呼び出す', async () => {
      const plan = createMockPlanConfig({ stripePriceIdMonthly: 'price_existing', annualPrice: null })

      mockStripe.products.search.mockResolvedValue({ data: [{ id: 'prod_existing' }] })
      mockStripe.products.update.mockResolvedValue({ id: 'prod_existing' })
      mockPrisma.planConfig.update.mockResolvedValue(plan)

      await syncPlanToStripe(plan)

      expect(mockClearPlanConfigCache).toHaveBeenCalledTimes(1)
    })

    it('description が null の場合、undefined として渡される', async () => {
      const plan = createMockPlanConfig({ description: null })

      mockStripe.products.search.mockResolvedValue({ data: [] })
      mockStripe.products.create.mockResolvedValue({ id: 'prod_new' })
      mockStripe.prices.create.mockResolvedValue({ id: 'price_new' })
      mockPrisma.planConfig.update.mockResolvedValue(plan)

      await syncPlanToStripe(plan)

      expect(mockStripe.products.create).toHaveBeenCalledWith(
        expect.objectContaining({
          description: undefined,
        })
      )
    })
  })

  // ================================================================
  // syncCreditPackToStripe
  // ================================================================
  describe('syncCreditPackToStripe', () => {
    it('既存Product がある場合、products.update を呼び出す', async () => {
      const pack = createMockCreditPackConfig()

      mockStripe.products.search.mockResolvedValue({
        data: [{ id: 'prod_pack_existing' }],
      })
      mockStripe.products.update.mockResolvedValue({ id: 'prod_pack_existing' })
      mockStripe.prices.create.mockResolvedValue({ id: 'price_pack_new' })
      mockPrisma.creditPackConfig.update.mockResolvedValue({
        ...pack,
        stripePriceId: 'price_pack_new',
      })

      await syncCreditPackToStripe(pack)

      expect(mockStripe.products.update).toHaveBeenCalledWith('prod_pack_existing', {
        name: 'AI クレジット追加パック スタンダード',
        description: '+100回/月',
        metadata: {
          lookupKey: 'ai_credit_pack_スタンダード',
          credits: '100',
        },
      })
      expect(mockStripe.products.create).not.toHaveBeenCalled()
    })

    it('新規Product の場合、products.create を呼び出す', async () => {
      const pack = createMockCreditPackConfig()

      mockStripe.products.search.mockResolvedValue({ data: [] })
      mockStripe.products.create.mockResolvedValue({ id: 'prod_pack_new' })
      mockStripe.prices.create.mockResolvedValue({ id: 'price_pack_new' })
      mockPrisma.creditPackConfig.update.mockResolvedValue({
        ...pack,
        stripePriceId: 'price_pack_new',
      })

      await syncCreditPackToStripe(pack)

      expect(mockStripe.products.create).toHaveBeenCalledWith({
        name: 'AI クレジット追加パック スタンダード',
        description: '+100回/月',
        metadata: {
          lookupKey: 'ai_credit_pack_スタンダード',
          credits: '100',
        },
      })
      expect(mockStripe.products.update).not.toHaveBeenCalled()
    })

    it('Price が未設定の場合、prices.create を呼び出す', async () => {
      const pack = createMockCreditPackConfig({ stripePriceId: null })

      mockStripe.products.search.mockResolvedValue({ data: [{ id: 'prod_pack_existing' }] })
      mockStripe.products.update.mockResolvedValue({ id: 'prod_pack_existing' })
      mockStripe.prices.create.mockResolvedValue({ id: 'price_pack_new' })
      mockPrisma.creditPackConfig.update.mockResolvedValue({
        ...pack,
        stripePriceId: 'price_pack_new',
      })

      await syncCreditPackToStripe(pack)

      expect(mockStripe.prices.create).toHaveBeenCalledWith({
        product: 'prod_pack_existing',
        unit_amount: 3000,
        currency: 'jpy',
        recurring: { interval: 'month' },
        lookup_key: 'ai_credit_pack_スタンダード_month',
      })
    })

    it('Price が既設定の場合、prices.create をスキップする', async () => {
      const pack = createMockCreditPackConfig({ stripePriceId: 'price_pack_existing' })

      mockStripe.products.search.mockResolvedValue({ data: [{ id: 'prod_pack_existing' }] })
      mockStripe.products.update.mockResolvedValue({ id: 'prod_pack_existing' })
      mockPrisma.creditPackConfig.update.mockResolvedValue(pack)

      await syncCreditPackToStripe(pack)

      expect(mockStripe.prices.create).not.toHaveBeenCalled()
    })

    it('DB 更新: creditPackConfig.update を呼び出す', async () => {
      const pack = createMockCreditPackConfig({ stripePriceId: null })

      mockStripe.products.search.mockResolvedValue({ data: [{ id: 'prod_pack_existing' }] })
      mockStripe.products.update.mockResolvedValue({ id: 'prod_pack_existing' })
      mockStripe.prices.create.mockResolvedValue({ id: 'price_pack_new' })
      mockPrisma.creditPackConfig.update.mockResolvedValue({
        ...pack,
        stripePriceId: 'price_pack_new',
      })

      await syncCreditPackToStripe(pack)

      expect(mockPrisma.creditPackConfig.update).toHaveBeenCalledWith({
        where: { id: 'pack-1' },
        data: { stripePriceId: 'price_pack_new' },
      })
    })
  })

  // ================================================================
  // syncCohortToStripe
  // ================================================================
  describe('syncCohortToStripe', () => {
    it('既存Coupon がある場合、coupons.create をスキップする', async () => {
      const cohort = createMockCohortConfig()

      mockStripe.coupons.retrieve.mockResolvedValue({
        id: 'cohort_1_50off',
        percent_off: 50,
      })
      mockPrisma.cohortConfig.update.mockResolvedValue({
        ...cohort,
        stripeCouponId: 'cohort_1_50off',
      })

      await syncCohortToStripe(cohort)

      expect(mockStripe.coupons.create).not.toHaveBeenCalled()
    })

    it('新規Coupon の場合（retrieve が throw）、coupons.create を呼び出す', async () => {
      const cohort = createMockCohortConfig()

      mockStripe.coupons.retrieve.mockRejectedValue(new Error('No such coupon'))
      mockStripe.coupons.create.mockResolvedValue({ id: 'cohort_1_50off' })
      mockPrisma.cohortConfig.update.mockResolvedValue({
        ...cohort,
        stripeCouponId: 'cohort_1_50off',
      })

      await syncCohortToStripe(cohort)

      expect(mockStripe.coupons.create).toHaveBeenCalledWith({
        id: 'cohort_1_50off',
        percent_off: 50,
        duration: 'forever',
        name: 'ローンチ割引 コホート1 (50%OFF)',
        metadata: {
          cohortNumber: '1',
        },
      })
    })

    it('DB 更新: cohortConfig.update を呼び出す', async () => {
      const cohort = createMockCohortConfig()

      mockStripe.coupons.retrieve.mockRejectedValue(new Error('Not found'))
      mockStripe.coupons.create.mockResolvedValue({ id: 'cohort_1_50off' })
      mockPrisma.cohortConfig.update.mockResolvedValue({
        ...cohort,
        stripeCouponId: 'cohort_1_50off',
      })

      await syncCohortToStripe(cohort)

      expect(mockPrisma.cohortConfig.update).toHaveBeenCalledWith({
        where: { id: 'cohort-1' },
        data: { stripeCouponId: 'cohort_1_50off' },
      })
    })

    it('clearCohortConfigCache を呼び出す', async () => {
      const cohort = createMockCohortConfig()

      mockStripe.coupons.retrieve.mockResolvedValue({ id: 'cohort_1_50off' })
      mockPrisma.cohortConfig.update.mockResolvedValue({
        ...cohort,
        stripeCouponId: 'cohort_1_50off',
      })

      await syncCohortToStripe(cohort)

      expect(mockClearCohortConfigCache).toHaveBeenCalledTimes(1)
    })

    it('異なるコホート番号と割引率で正しい couponId を生成する', async () => {
      const cohort = createMockCohortConfig({
        id: 'cohort-2',
        cohortNumber: 3,
        discountPercent: 20,
      })

      mockStripe.coupons.retrieve.mockRejectedValue(new Error('Not found'))
      mockStripe.coupons.create.mockResolvedValue({ id: 'cohort_3_20off' })
      mockPrisma.cohortConfig.update.mockResolvedValue({
        ...cohort,
        stripeCouponId: 'cohort_3_20off',
      })

      await syncCohortToStripe(cohort)

      expect(mockStripe.coupons.retrieve).toHaveBeenCalledWith('cohort_3_20off')
      expect(mockStripe.coupons.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'cohort_3_20off',
          percent_off: 20,
          name: 'ローンチ割引 コホート3 (20%OFF)',
        })
      )
    })
  })

  // ================================================================
  // syncAllToStripe
  // ================================================================
  describe('syncAllToStripe', () => {
    it('全設定を一括同期し、件数を返す', async () => {
      const plans = [
        createMockPlanConfig({ id: 'plan-1', planType: 'STARTER', name: 'スターター', stripePriceIdMonthly: 'price_s', annualPrice: null }),
        createMockPlanConfig({ id: 'plan-2', planType: 'BUSINESS', name: 'ビジネス', stripePriceIdMonthly: 'price_b', annualPrice: null }),
      ]
      const creditPacks = [
        createMockCreditPackConfig({ id: 'pack-1', stripePriceId: 'price_p1' }),
      ]
      const cohorts = [
        createMockCohortConfig({ id: 'cohort-1' }),
        createMockCohortConfig({ id: 'cohort-2', cohortNumber: 2, discountPercent: 30 }),
        createMockCohortConfig({ id: 'cohort-3', cohortNumber: 3, discountPercent: 10 }),
      ]

      mockPrisma.planConfig.findMany.mockResolvedValue(plans)
      mockPrisma.creditPackConfig.findMany.mockResolvedValue(creditPacks)
      mockPrisma.cohortConfig.findMany.mockResolvedValue(cohorts)

      // syncPlanToStripe 内部のモック
      mockStripe.products.search.mockResolvedValue({ data: [{ id: 'prod_existing' }] })
      mockStripe.products.update.mockResolvedValue({ id: 'prod_existing' })
      mockPrisma.planConfig.update.mockImplementation(async ({ where }: { where: { id: string } }) => {
        return plans.find(p => p.id === where.id) || plans[0]
      })

      // syncCreditPackToStripe 内部のモック
      mockPrisma.creditPackConfig.update.mockImplementation(async ({ where }: { where: { id: string } }) => {
        return creditPacks.find(p => p.id === where.id) || creditPacks[0]
      })

      // syncCohortToStripe 内部のモック
      mockStripe.coupons.retrieve.mockResolvedValue({ id: 'coupon_existing' })
      mockPrisma.cohortConfig.update.mockImplementation(async ({ where }: { where: { id: string } }) => {
        return cohorts.find(c => c.id === where.id) || cohorts[0]
      })

      const result = await syncAllToStripe()

      expect(result).toEqual({
        plans: 2,
        creditPacks: 1,
        cohorts: 3,
      })

      // findMany が isActive: true で呼ばれることを確認
      expect(mockPrisma.planConfig.findMany).toHaveBeenCalledWith({ where: { isActive: true } })
      expect(mockPrisma.creditPackConfig.findMany).toHaveBeenCalledWith({ where: { isActive: true } })
      expect(mockPrisma.cohortConfig.findMany).toHaveBeenCalledWith({ where: { isActive: true } })
    })

    it('空データの場合、全て 0件 を返す', async () => {
      mockPrisma.planConfig.findMany.mockResolvedValue([])
      mockPrisma.creditPackConfig.findMany.mockResolvedValue([])
      mockPrisma.cohortConfig.findMany.mockResolvedValue([])

      const result = await syncAllToStripe()

      expect(result).toEqual({
        plans: 0,
        creditPacks: 0,
        cohorts: 0,
      })

      // Stripe API が一切呼ばれないことを確認
      expect(mockStripe.products.search).not.toHaveBeenCalled()
      expect(mockStripe.products.create).not.toHaveBeenCalled()
      expect(mockStripe.products.update).not.toHaveBeenCalled()
      expect(mockStripe.prices.create).not.toHaveBeenCalled()
      expect(mockStripe.coupons.retrieve).not.toHaveBeenCalled()
      expect(mockStripe.coupons.create).not.toHaveBeenCalled()
    })
  })
})
