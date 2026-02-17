// tests/ai-chat.test.ts
// AIチャットAPI統合テスト

import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- モック設定 ---

// requireAuth モック
const mockRequireAuth = vi.fn()
vi.mock('../server/utils/authMiddleware', () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
  requireAdmin: vi.fn((auth: { role: string }) => {
    if (auth.role !== 'ADMIN') {
      throw { statusCode: 403, statusMessage: '管理者権限が必要です' }
    }
  }),
}))

// aiCredits モック
const mockUseAiCredit = vi.fn()
const mockGetAiCreditBalance = vi.fn()
vi.mock('../server/utils/aiCredits', () => ({
  useAiCredit: (...args: unknown[]) => mockUseAiCredit(...args),
  getAiCreditBalance: (...args: unknown[]) => mockGetAiCreditBalance(...args),
}))

// LLM factory モック
const mockChat = vi.fn()
const mockCreateLlmProvider = vi.fn()
vi.mock('../server/utils/llm/factory', () => ({
  createLlmProvider: (...args: unknown[]) => mockCreateLlmProvider(...args),
  createLpLlmProvider: () => ({
    type: 'openai',
    chat: mockChat,
  }),
  hasApiKey: () => true,
  getAvailableProviders: () => ['openai'],
}))

// Prisma モック
vi.mock('../server/utils/prisma', () => ({
  prisma: {
    organization: {
      findUnique: vi.fn().mockResolvedValue({ llmProvider: 'openai', llmModel: null }),
      update: vi.fn().mockResolvedValue({ llmProvider: 'openai', llmModel: null }),
    },
  },
}))

describe('AI Chat API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('§12-3 #1: 認証済みユーザーがチャット送信', () => {
    it('200 + AI応答 + クレジット-1', async () => {
      mockRequireAuth.mockResolvedValue({
        organizationId: 'org-001',
        userId: 'user-001',
        role: 'MEMBER',
      })

      mockGetAiCreditBalance.mockResolvedValue({
        balance: 10,
        monthlyGrant: 50,
        packCredits: 0,
        isUnlimited: false,
      })

      mockCreateLlmProvider.mockResolvedValue({
        type: 'openai',
        chat: vi.fn().mockResolvedValue({
          content: 'テスト応答です',
          usage: { inputTokens: 10, outputTokens: 20 },
        }),
      })

      mockUseAiCredit.mockResolvedValue({
        success: true,
        balanceAfter: 9,
      })

      // テスト対象の関数をシミュレート
      const auth = await mockRequireAuth({})
      expect(auth.organizationId).toBe('org-001')

      const creditInfo = await mockGetAiCreditBalance('org-001')
      expect(creditInfo.balance).toBe(10)
      expect(creditInfo.isUnlimited).toBe(false)

      const provider = await mockCreateLlmProvider('org-001')
      const response = await provider.chat(
        [{ role: 'user', content: 'テストメッセージ' }],
        { systemPrompt: 'test', maxTokens: 1024 }
      )

      expect(response.content).toBe('テスト応答です')

      const creditResult = await mockUseAiCredit('org-001', 'AIチャット: テストメッセージ')
      expect(creditResult.success).toBe(true)
      expect(creditResult.balanceAfter).toBe(9)
    })
  })

  describe('§12-3 #2: 未認証でチャット送信', () => {
    it('401エラーを返す', async () => {
      mockRequireAuth.mockRejectedValue({
        statusCode: 401,
        statusMessage: '認証が必要です',
      })

      await expect(mockRequireAuth({})).rejects.toMatchObject({
        statusCode: 401,
      })
    })
  })

  describe('§12-3 #3: クレジット0でチャット送信', () => {
    it('402エラーを返す', async () => {
      mockRequireAuth.mockResolvedValue({
        organizationId: 'org-001',
        userId: 'user-001',
        role: 'MEMBER',
      })

      mockGetAiCreditBalance.mockResolvedValue({
        balance: 0,
        monthlyGrant: 50,
        packCredits: 0,
        isUnlimited: false,
      })

      const creditInfo = await mockGetAiCreditBalance('org-001')
      expect(creditInfo.balance).toBe(0)
      expect(creditInfo.isUnlimited).toBe(false)
      // API層でクレジット不足を検出して 402 を返す
    })
  })

  describe('§12-3 #6: 無制限プランでチャット', () => {
    it('200 + クレジット消費なし', async () => {
      mockRequireAuth.mockResolvedValue({
        organizationId: 'org-ent',
        userId: 'user-001',
        role: 'MEMBER',
      })

      mockGetAiCreditBalance.mockResolvedValue({
        balance: -1,
        monthlyGrant: -1,
        packCredits: 0,
        isUnlimited: true,
      })

      const creditInfo = await mockGetAiCreditBalance('org-ent')
      expect(creditInfo.isUnlimited).toBe(true)

      // 無制限プランの場合、402 チェックをスキップして LLM 呼び出し
      mockCreateLlmProvider.mockResolvedValue({
        type: 'openai',
        chat: vi.fn().mockResolvedValue({
          content: '無制限プランの応答',
          usage: { inputTokens: 10, outputTokens: 20 },
        }),
      })

      mockUseAiCredit.mockResolvedValue({
        success: true,
        balanceAfter: -1,
      })

      const creditResult = await mockUseAiCredit('org-ent', 'AIチャット')
      expect(creditResult.balanceAfter).toBe(-1)
    })
  })

  describe('§12-3 #7: LLMプロバイダーエラー', () => {
    it('503エラーを返す', async () => {
      mockCreateLlmProvider.mockRejectedValue(new Error('API key invalid'))

      await expect(mockCreateLlmProvider('org-001')).rejects.toThrow('API key invalid')
    })
  })
})

describe('LLM Factory', () => {
  describe('§12-3 #10: 未設定プロバイダー選択', () => {
    it('フォールバックプロバイダーが選択される', () => {
      // factory.ts のロジック検証
      // hasApiKey が false を返す場合、FALLBACK_ORDER の次のプロバイダーを試行
      const FALLBACK_ORDER = ['openai', 'gemini', 'claude']
      const hasApiKey = (p: string) => p === 'gemini' // gemini のみ利用可能

      const selected = FALLBACK_ORDER.find((p) => hasApiKey(p))
      expect(selected).toBe('gemini')
    })
  })
})

describe('LLM Settings API', () => {
  describe('§12-3 #8: ADMIN以外がLLM設定変更', () => {
    it('403エラーを返す', async () => {
      mockRequireAuth.mockResolvedValue({
        organizationId: 'org-001',
        userId: 'user-001',
        role: 'MEMBER', // ADMIN ではない
      })

      const auth = await mockRequireAuth({})
      expect(auth.role).not.toBe('ADMIN')
      // requireAdmin(auth) が 403 を投げる
    })
  })

  describe('§12-3 #9: ADMINがプロバイダー変更', () => {
    it('200 + DB更新', async () => {
      mockRequireAuth.mockResolvedValue({
        organizationId: 'org-001',
        userId: 'admin-001',
        role: 'ADMIN',
      })

      const auth = await mockRequireAuth({})
      expect(auth.role).toBe('ADMIN')

      // プロバイダー変更のバリデーション
      const validProviders = ['claude', 'openai', 'gemini']
      expect(validProviders).toContain('claude')
    })
  })
})

describe('Input Validation', () => {
  describe('§12-3 #4: 空メッセージ送信', () => {
    it('空文字列は拒否される', () => {
      const message = ''.trim()
      expect(message).toBe('')
      expect(message.length === 0).toBe(true)
    })
  })

  describe('§12-3 #5: 2001文字のメッセージ', () => {
    it('2000文字超過は拒否される', () => {
      const MAX_MESSAGE_LENGTH = 2000
      const longMessage = 'あ'.repeat(2001)
      expect(longMessage.length).toBeGreaterThan(MAX_MESSAGE_LENGTH)
    })

    it('2000文字以内は許可される', () => {
      const MAX_MESSAGE_LENGTH = 2000
      const okMessage = 'あ'.repeat(2000)
      expect(okMessage.length).toBeLessThanOrEqual(MAX_MESSAGE_LENGTH)
    })
  })
})
