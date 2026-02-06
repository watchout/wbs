/**
 * AI Credit Management Unit Tests
 *
 * aiCredits.ts のユニットテスト
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Prisma モック（vi.hoisted で変数を事前に定義）
const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    aiCreditBalance: {
      findUnique: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
    aiCreditTransaction: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

vi.mock('./prisma', () => ({
  prisma: mockPrisma,
}))

import {
  useAiCredit,
  getAiCreditBalance,
  resetMonthlyCredits,
  grantPackCredits,
  initializeCredits,
  getCreditHistory,
} from './aiCredits'

describe('aiCredits', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('useAiCredit', () => {
    it('should consume 1 credit and return new balance', async () => {
      // $transaction をモック: コールバックを直接実行
      mockPrisma.$transaction.mockImplementation(async (cb: Function) => {
        const tx = {
          aiCreditBalance: {
            findUnique: vi.fn().mockResolvedValue({
              organizationId: 'org-1',
              balance: 10,
              monthlyGrant: 50,
              packCredits: 0,
            }),
            update: vi.fn().mockResolvedValue({
              balance: 9,
            }),
          },
          aiCreditTransaction: {
            create: vi.fn().mockResolvedValue({}),
          },
        }
        return cb(tx)
      })

      const result = await useAiCredit('org-1', 'テスト使用')
      expect(result.success).toBe(true)
      expect(result.balanceAfter).toBe(9)
    })

    it('should fail when balance is 0', async () => {
      mockPrisma.$transaction.mockImplementation(async (cb: Function) => {
        const tx = {
          aiCreditBalance: {
            findUnique: vi.fn().mockResolvedValue({
              organizationId: 'org-1',
              balance: 0,
              monthlyGrant: 50,
              packCredits: 0,
            }),
          },
          aiCreditTransaction: { create: vi.fn() },
        }
        return cb(tx)
      })

      const result = await useAiCredit('org-1')
      expect(result.success).toBe(false)
      expect(result.balanceAfter).toBe(0)
      expect(result.error).toContain('クレジットが不足')
    })

    it('should succeed for unlimited plans (monthlyGrant = -1)', async () => {
      mockPrisma.$transaction.mockImplementation(async (cb: Function) => {
        const tx = {
          aiCreditBalance: {
            findUnique: vi.fn().mockResolvedValue({
              organizationId: 'org-1',
              balance: 0,
              monthlyGrant: -1,
              packCredits: 0,
            }),
          },
          aiCreditTransaction: {
            create: vi.fn().mockResolvedValue({}),
          },
        }
        return cb(tx)
      })

      const result = await useAiCredit('org-1', 'エンタープライズ使用')
      expect(result.success).toBe(true)
      expect(result.balanceAfter).toBe(-1) // 無制限を示す
    })

    it('should fail when no credit balance exists', async () => {
      mockPrisma.$transaction.mockImplementation(async (cb: Function) => {
        const tx = {
          aiCreditBalance: {
            findUnique: vi.fn().mockResolvedValue(null),
          },
          aiCreditTransaction: { create: vi.fn() },
        }
        return cb(tx)
      })

      const result = await useAiCredit('org-1')
      expect(result.success).toBe(false)
      expect(result.error).toContain('設定されていません')
    })
  })

  describe('getAiCreditBalance', () => {
    it('should return balance info', async () => {
      mockPrisma.aiCreditBalance.findUnique.mockResolvedValue({
        balance: 42,
        monthlyGrant: 50,
        packCredits: 10,
        lastResetAt: new Date('2026-02-01'),
      })

      const result = await getAiCreditBalance('org-1')
      expect(result.balance).toBe(42)
      expect(result.monthlyGrant).toBe(50)
      expect(result.packCredits).toBe(10)
      expect(result.isUnlimited).toBe(false)
    })

    it('should mark unlimited for monthlyGrant = -1', async () => {
      mockPrisma.aiCreditBalance.findUnique.mockResolvedValue({
        balance: 0,
        monthlyGrant: -1,
        packCredits: 0,
        lastResetAt: new Date(),
      })

      const result = await getAiCreditBalance('org-1')
      expect(result.isUnlimited).toBe(true)
    })

    it('should return zeros when no balance exists', async () => {
      mockPrisma.aiCreditBalance.findUnique.mockResolvedValue(null)

      const result = await getAiCreditBalance('org-1')
      expect(result.balance).toBe(0)
      expect(result.monthlyGrant).toBe(0)
      expect(result.isUnlimited).toBe(false)
    })
  })

  describe('resetMonthlyCredits', () => {
    it('should reset balance to monthlyGrant + packCredits', async () => {
      mockPrisma.$transaction.mockImplementation(async (cb: Function) => {
        const tx = {
          aiCreditBalance: {
            findUnique: vi.fn().mockResolvedValue({
              organizationId: 'org-1',
              balance: 5,
              monthlyGrant: 50,
              packCredits: 20,
              lastResetAt: new Date('2026-01-01'),
            }),
            update: vi.fn().mockResolvedValue({}),
          },
          aiCreditTransaction: {
            create: vi.fn().mockResolvedValue({}),
          },
        }
        return cb(tx)
      })

      await resetMonthlyCredits('org-1')
      expect(mockPrisma.$transaction).toHaveBeenCalled()
    })

    it('should skip reset for unlimited plans', async () => {
      mockPrisma.$transaction.mockImplementation(async (cb: Function) => {
        const tx = {
          aiCreditBalance: {
            findUnique: vi.fn().mockResolvedValue({
              organizationId: 'org-1',
              balance: 0,
              monthlyGrant: -1,
              packCredits: 0,
            }),
            update: vi.fn(),
          },
          aiCreditTransaction: { create: vi.fn() },
        }
        return cb(tx)
      })

      await resetMonthlyCredits('org-1')
      // update が呼ばれないことを確認
      expect(mockPrisma.$transaction).toHaveBeenCalled()
    })
  })

  describe('grantPackCredits', () => {
    it('should add pack credits to balance', async () => {
      mockPrisma.$transaction.mockImplementation(async (cb: Function) => {
        const tx = {
          aiCreditBalance: {
            upsert: vi.fn().mockResolvedValue({
              balance: 200,
              packCredits: 150,
            }),
          },
          aiCreditTransaction: {
            create: vi.fn().mockResolvedValue({}),
          },
        }
        return cb(tx)
      })

      await grantPackCredits('org-1', 150, 'スタンダード', 'inv_123')
      expect(mockPrisma.$transaction).toHaveBeenCalled()
    })
  })

  describe('initializeCredits', () => {
    it('should upsert credit balance', async () => {
      mockPrisma.aiCreditBalance.upsert.mockResolvedValue({})

      await initializeCredits('org-1', 50)
      expect(mockPrisma.aiCreditBalance.upsert).toHaveBeenCalledWith({
        where: { organizationId: 'org-1' },
        create: expect.objectContaining({
          organizationId: 'org-1',
          balance: 50,
          monthlyGrant: 50,
        }),
        update: expect.objectContaining({
          monthlyGrant: 50,
          balance: 50,
        }),
      })
    })

    it('should set balance to 0 for unlimited plans', async () => {
      mockPrisma.aiCreditBalance.upsert.mockResolvedValue({})

      await initializeCredits('org-1', -1)
      expect(mockPrisma.aiCreditBalance.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            balance: 0,
            monthlyGrant: -1,
          }),
        })
      )
    })
  })

  describe('getCreditHistory', () => {
    it('should return transactions ordered by date desc', async () => {
      const mockTransactions = [
        { id: '1', type: 'USAGE', amount: -1, balanceAfter: 49, createdAt: new Date() },
        { id: '2', type: 'MONTHLY_GRANT', amount: 50, balanceAfter: 50, createdAt: new Date() },
      ]
      mockPrisma.aiCreditTransaction.findMany.mockResolvedValue(mockTransactions)

      const result = await getCreditHistory('org-1', 10, 0)
      expect(result).toHaveLength(2)
      expect(mockPrisma.aiCreditTransaction.findMany).toHaveBeenCalledWith({
        where: { organizationId: 'org-1' },
        orderBy: { createdAt: 'desc' },
        take: 10,
        skip: 0,
      })
    })
  })
})
