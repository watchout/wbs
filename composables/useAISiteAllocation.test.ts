/**
 * useAISiteAllocation.test.ts
 *
 * AI現場配置 Composable のユニットテスト（Phase 1）
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'

// ===== モック =====

// $fetch モック（グローバル - csrfFetch の内部で呼ばれる）
const mockFetch = vi.fn()
vi.stubGlobal('$fetch', mockFetch)

// useCsrf モック: csrfFetch は $fetch をそのまま呼ぶシンプルなラッパーとしてモック
vi.mock('~/composables/useCsrf', () => ({
  useCsrf: () => ({
    csrfFetch: mockFetch,
    getCsrfToken: vi.fn().mockReturnValue('test-csrf-token'),
  }),
}))

// ===== テスト対象 =====
import { useAISiteAllocation } from './useAISiteAllocation'

// ===== ヘルパー =====

function makeSuccessResponse(reply: string, creditsRemaining = 10) {
  return {
    success: true,
    reply,
    creditsRemaining,
  }
}

const WEEK_START = '2026-03-09'
const WEEK_END = '2026-03-15'

// ===== テストスイート =====

describe('useAISiteAllocation', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  // ----------------------------------------------------------------
  // 初期状態
  // ----------------------------------------------------------------
  describe('初期状態', () => {
    it('loading は false', () => {
      const { loading } = useAISiteAllocation()
      expect(loading.value).toBe(false)
    })

    it('error は null', () => {
      const { error } = useAISiteAllocation()
      expect(error.value).toBeNull()
    })

    it('result は null', () => {
      const { result } = useAISiteAllocation()
      expect(result.value).toBeNull()
    })

    it('hasProposals は false', () => {
      const { hasProposals } = useAISiteAllocation()
      expect(hasProposals.value).toBe(false)
    })
  })

  // ----------------------------------------------------------------
  // requestProposal
  // ----------------------------------------------------------------
  describe('requestProposal', () => {
    it('成功時: rawReply がセットされる', async () => {
      const reply = '現場配置の提案です。AI分析結果を以下に示します。'
      mockFetch.mockResolvedValueOnce(makeSuccessResponse(reply))

      const { requestProposal, result } = useAISiteAllocation()
      await requestProposal(WEEK_START, WEEK_END)

      expect(result.value).not.toBeNull()
      expect(result.value!.rawReply).toBe(reply)
    })

    it('成功時: creditsRemaining がセットされる', async () => {
      mockFetch.mockResolvedValueOnce(makeSuccessResponse('返答', 42))

      const { requestProposal, result } = useAISiteAllocation()
      await requestProposal(WEEK_START, WEEK_END)

      expect(result.value!.creditsRemaining).toBe(42)
    })

    it('成功時: proposals はデフォルトで空配列', async () => {
      mockFetch.mockResolvedValueOnce(makeSuccessResponse('構造化データなし'))

      const { requestProposal, result } = useAISiteAllocation()
      await requestProposal(WEEK_START, WEEK_END)

      expect(result.value!.proposals).toEqual([])
    })

    it('AI返答に```json ブロックがあれば proposals をパースする', async () => {
      const proposals = [
        {
          siteName: '○○ビル',
          date: '2026-03-10',
          requiredCount: 2,
          candidates: [
            { userId: 'u1', name: '田中太郎', department: '施工部' },
            { userId: 'u2', name: '鈴木花子', department: '施工部' },
          ],
        },
      ]
      const reply = `現場配置を提案します。\n\`\`\`json\n${JSON.stringify(proposals)}\n\`\`\``
      mockFetch.mockResolvedValueOnce(makeSuccessResponse(reply))

      const { requestProposal, result, hasProposals } = useAISiteAllocation()
      await requestProposal(WEEK_START, WEEK_END)

      expect(result.value!.proposals).toHaveLength(1)
      expect(result.value!.proposals[0].siteName).toBe('○○ビル')
      expect(hasProposals.value).toBe(true)
    })

    it('APIエラー時: error がセットされ result は null のまま', async () => {
      mockFetch.mockRejectedValueOnce(new Error('network error'))

      const { requestProposal, result, error } = useAISiteAllocation()
      await requestProposal(WEEK_START, WEEK_END)

      expect(result.value).toBeNull()
      expect(error.value).toBe('network error')
    })

    it('APIエラー後 loading は false に戻る', async () => {
      mockFetch.mockRejectedValueOnce(new Error('fail'))

      const { requestProposal, loading } = useAISiteAllocation()
      const promise = requestProposal(WEEK_START, WEEK_END)
      await promise

      expect(loading.value).toBe(false)
    })

    it('/api/ai/chat を POST で呼ぶ', async () => {
      mockFetch.mockResolvedValueOnce(makeSuccessResponse('ok'))

      const { requestProposal } = useAISiteAllocation()
      await requestProposal(WEEK_START, WEEK_END)

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/ai/chat',
        expect.objectContaining({
          method: 'POST',
        })
      )
    })
  })

  // ----------------------------------------------------------------
  // reset
  // ----------------------------------------------------------------
  describe('reset', () => {
    it('result, error, confirmError, confirmSuccess をリセットする', async () => {
      mockFetch.mockResolvedValueOnce(makeSuccessResponse('返答'))

      const { requestProposal, reset, result, error } = useAISiteAllocation()
      await requestProposal(WEEK_START, WEEK_END)

      expect(result.value).not.toBeNull()

      reset()

      expect(result.value).toBeNull()
      expect(error.value).toBeNull()
    })
  })

  // ----------------------------------------------------------------
  // confirmProposals
  // ----------------------------------------------------------------
  describe('confirmProposals', () => {
    it('空の assignments では API を呼ばない', async () => {
      const { confirmProposals } = useAISiteAllocation()
      await confirmProposals([])

      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('assignments がある場合 /api/schedules を POST で呼ぶ', async () => {
      mockFetch.mockResolvedValueOnce({ success: true })

      const { confirmProposals, confirmSuccess } = useAISiteAllocation()
      await confirmProposals([{ userId: 'u1', siteName: '現場A', date: '2026-03-10' }])

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/schedules',
        expect.objectContaining({ method: 'POST' })
      )
      expect(confirmSuccess.value).toBe(true)
    })

    it('APIエラー時: confirmError がセットされる', async () => {
      mockFetch.mockRejectedValueOnce(new Error('confirm error'))

      const { confirmProposals, confirmError } = useAISiteAllocation()
      await confirmProposals([{ userId: 'u1', siteName: '現場A', date: '2026-03-10' }])

      expect(confirmError.value).toBe('confirm error')
    })
  })

  // ----------------------------------------------------------------
  // parseProposalsFromReply（内部ロジックを外から検証）
  // ----------------------------------------------------------------
  describe('proposals パース - candidates JSON', () => {
    it('proposals ラッパーオブジェクトを認識する', async () => {
      const data = {
        proposals: [
          { siteName: '現場X', date: '2026-03-11', requiredCount: 1, candidates: [] },
        ],
      }
      const reply = `\`\`\`json\n${JSON.stringify(data)}\n\`\`\``
      mockFetch.mockResolvedValueOnce(makeSuccessResponse(reply))

      const { requestProposal, result } = useAISiteAllocation()
      await requestProposal(WEEK_START, WEEK_END)

      expect(result.value!.proposals[0].siteName).toBe('現場X')
    })
  })
})
