/**
 * Plan Limits Unit Tests
 *
 * planLimits.ts のユニットテスト
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Prisma モック（vi.hoisted で変数を事前に定義）
const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    subscription: {
      findUnique: vi.fn(),
    },
    user: {
      count: vi.fn(),
    },
    aiCreditBalance: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock('./prisma', () => ({
  prisma: mockPrisma,
}))

const MOCK_PLAN_LIMITS = {
  STARTER: {
    maxUsers: 10,
    monthlyAiCredits: 0,
    features: ['weekly_board', 'department_filter', 'realtime_sync'],
  },
  BUSINESS: {
    maxUsers: 30,
    monthlyAiCredits: 50,
    features: [
      'weekly_board', 'department_filter', 'realtime_sync',
      'signage_mode', 'calendar_sync', 'ai_voice_input',
      'history_export',
    ],
  },
  ENTERPRISE: {
    maxUsers: 100,
    monthlyAiCredits: -1,
    features: [
      'weekly_board', 'department_filter', 'realtime_sync',
      'signage_mode', 'calendar_sync', 'ai_voice_input',
      'history_export', 'api_access', 'sso_saml',
      'multi_site', 'custom',
    ],
  },
}

vi.mock('./stripe', () => ({
  stripe: {},
  PLAN_LIMITS: MOCK_PLAN_LIMITS,
  getPlanLimits: async (planType: string) => {
    const limits = MOCK_PLAN_LIMITS[planType as keyof typeof MOCK_PLAN_LIMITS]
    return limits || null
  },
}))

import {
  checkUserLimit,
  requirePlanFeature,
  checkAiCreditAvailable,
  getCurrentPlan,
} from './planLimits'

describe('planLimits', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('checkUserLimit', () => {
    it('should pass when under user limit', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        maxUsers: 10,
        status: 'ACTIVE',
      })
      mockPrisma.user.count.mockResolvedValue(5)

      await expect(checkUserLimit('org-1')).resolves.toBeUndefined()
    })

    it('should throw 403 when at user limit', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        maxUsers: 10,
        status: 'ACTIVE',
      })
      mockPrisma.user.count.mockResolvedValue(10)

      await expect(checkUserLimit('org-1')).rejects.toMatchObject({
        statusCode: 403,
      })
    })

    it('should pass when no subscription exists', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(null)

      await expect(checkUserLimit('org-1')).resolves.toBeUndefined()
    })

    it('should throw 403 for canceled subscription', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        maxUsers: 30,
        status: 'CANCELED',
      })

      await expect(checkUserLimit('org-1')).rejects.toMatchObject({
        statusCode: 403,
      })
    })
  })

  describe('requirePlanFeature', () => {
    it('should allow starter features without subscription', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(null)

      await expect(
        requirePlanFeature('org-1', 'weekly_board')
      ).resolves.toBeUndefined()
    })

    it('should deny non-starter features without subscription', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(null)

      await expect(
        requirePlanFeature('org-1', 'signage_mode')
      ).rejects.toMatchObject({ statusCode: 403 })
    })

    it('should allow business features for business plan', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        planType: 'BUSINESS',
        status: 'ACTIVE',
      })

      await expect(
        requirePlanFeature('org-1', 'signage_mode')
      ).resolves.toBeUndefined()
    })

    it('should deny enterprise features for business plan', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        planType: 'BUSINESS',
        status: 'ACTIVE',
      })

      await expect(
        requirePlanFeature('org-1', 'api_access')
      ).rejects.toMatchObject({ statusCode: 403 })
    })

    it('should allow all features for enterprise plan', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        planType: 'ENTERPRISE',
        status: 'ACTIVE',
      })

      await expect(
        requirePlanFeature('org-1', 'api_access')
      ).resolves.toBeUndefined()

      await expect(
        requirePlanFeature('org-1', 'sso_saml')
      ).resolves.toBeUndefined()
    })

    it('should deny all features for canceled subscription', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        planType: 'BUSINESS',
        status: 'CANCELED',
      })

      await expect(
        requirePlanFeature('org-1', 'weekly_board')
      ).rejects.toMatchObject({ statusCode: 403 })
    })
  })

  describe('checkAiCreditAvailable', () => {
    it('should pass when credits available', async () => {
      mockPrisma.aiCreditBalance.findUnique.mockResolvedValue({
        balance: 10,
        monthlyGrant: 50,
      })

      await expect(
        checkAiCreditAvailable('org-1')
      ).resolves.toBeUndefined()
    })

    it('should pass for unlimited plans', async () => {
      mockPrisma.aiCreditBalance.findUnique.mockResolvedValue({
        balance: 0,
        monthlyGrant: -1,
      })

      await expect(
        checkAiCreditAvailable('org-1')
      ).resolves.toBeUndefined()
    })

    it('should throw 402 when no credits', async () => {
      mockPrisma.aiCreditBalance.findUnique.mockResolvedValue({
        balance: 0,
        monthlyGrant: 50,
      })

      await expect(
        checkAiCreditAvailable('org-1')
      ).rejects.toMatchObject({ statusCode: 402 })
    })

    it('should throw 403 when no balance exists', async () => {
      mockPrisma.aiCreditBalance.findUnique.mockResolvedValue(null)

      await expect(
        checkAiCreditAvailable('org-1')
      ).rejects.toMatchObject({ statusCode: 403 })
    })
  })

  describe('getCurrentPlan', () => {
    it('should return starter defaults when no subscription', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(null)

      const plan = await getCurrentPlan('org-1')
      expect(plan.planType).toBeNull()
      expect(plan.maxUsers).toBe(10)
      expect(plan.features).toContain('weekly_board')
    })

    it('should return business plan features', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        planType: 'BUSINESS',
        status: 'ACTIVE',
        maxUsers: 30,
      })

      const plan = await getCurrentPlan('org-1')
      expect(plan.planType).toBe('BUSINESS')
      expect(plan.maxUsers).toBe(30)
      expect(plan.features).toContain('signage_mode')
      expect(plan.features).toContain('calendar_sync')
    })
  })
})
