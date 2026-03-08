/**
 * useAISiteAllocation
 *
 * AI主導の現場配置提案を管理する Composable（Phase 1）
 * /api/ai/chat を呼んでsite_allocation関連ツールを活用し、
 * 提案結果をparseして構造化データで返す。
 *
 * SSOT参照: SSOT_SITE_ALLOCATION.md §AI-TOOLS, SSOT_AI_ASSISTANT.md
 */

import { ref, computed } from 'vue'
import { useCsrf } from '~/composables/useCsrf'

// ===== 型定義 =====

/** 配置候補者 */
export interface AllocationCandidate {
  userId: string
  name: string
  department: string
}

/** 1現場の提案データ */
export interface SiteProposal {
  siteName: string
  date: string
  requiredCount: number
  candidates: AllocationCandidate[]
}

/** プレビューアイテム */
export interface AssignmentPreviewItem {
  userId: string
  userName: string
  siteName: string
  date: string
  action: string
}

/** 確定用の配置データ */
export interface AssignmentRequest {
  userId: string
  siteName: string
  date: string
}

/** AIが返す構造化提案データ */
export interface AISiteAllocationResult {
  proposals: SiteProposal[]
  preview: AssignmentPreviewItem[]
  rawReply: string
  creditsRemaining: number | null
}

// ===== 内部ヘルパー =====

/** AI返答テキストからJSON構造を抽出する（ベストエフォート） */
function parseProposalsFromReply(reply: string): SiteProposal[] {
  // ```json ブロックがあれば抽出
  const jsonBlockMatch = reply.match(/```json\s*([\s\S]*?)```/)
  if (jsonBlockMatch) {
    try {
      const parsed = JSON.parse(jsonBlockMatch[1])
      if (Array.isArray(parsed)) return parsed as SiteProposal[]
      if (parsed.proposals) return parsed.proposals as SiteProposal[]
    } catch {
      // fall through
    }
  }

  // 生テキストから candidates らしきJSONを抽出
  const rawJsonMatch = reply.match(/\{[\s\S]*"candidates"[\s\S]*\}/)
  if (rawJsonMatch) {
    try {
      const parsed = JSON.parse(rawJsonMatch[0])
      if (parsed.candidates) {
        return [{
          siteName: parsed.siteName ?? '不明',
          date: parsed.date ?? '',
          requiredCount: parsed.requiredCount ?? 1,
          candidates: parsed.candidates,
        }]
      }
    } catch {
      // fall through
    }
  }

  return []
}

// ===== Composable =====

export function useAISiteAllocation() {
  const { csrfFetch, getCsrfToken } = useCsrf()

  // 状態
  const loading = ref(false)
  const error = ref<string | null>(null)
  const result = ref<AISiteAllocationResult | null>(null)
  const confirming = ref(false)
  const confirmError = ref<string | null>(null)
  const confirmSuccess = ref(false)

  const hasProposals = computed(() =>
    (result.value?.proposals.length ?? 0) > 0 || (result.value?.preview.length ?? 0) > 0
  )

  /**
   * AI に現場配置の提案を依頼する
   * @param weekStart 対象週の開始日（YYYY-MM-DD）
   * @param weekEnd   対象週の終了日（YYYY-MM-DD）
   */
  async function requestProposal(weekStart: string, weekEnd: string): Promise<void> {
    loading.value = true
    error.value = null
    result.value = null
    confirmSuccess.value = false

    try {
      const message = `現場配置の提案をお願いします。
対象期間: ${weekStart} 〜 ${weekEnd}

以下の順で分析してください:
1. search_site_allocation で現在の配置状況を確認
2. search_available_workers で各日の配置可能な人員を確認
3. propose_allocation で不足が想定される現場に人員を提案
4. preview_assignment で提案内容のプレビューを生成

提案結果は日本語で簡潔に説明し、最後にJSONブロックで proposals 配列を出力してください。`

      const res = await csrfFetch<{
        success: boolean
        reply: string
        creditsRemaining: number | null
      }>('/api/ai/chat', {
        method: 'POST',
        body: { message },
      })

      if (!res.success) {
        throw new Error('AIからの応答が不正です')
      }

      const proposals = parseProposalsFromReply(res.reply)

      result.value = {
        proposals,
        preview: [],
        rawReply: res.reply,
        creditsRemaining: res.creditsRemaining,
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'AI提案の取得に失敗しました'
      error.value = message
    } finally {
      loading.value = false
    }
  }

  /**
   * プレビューをリクエストする
   * @param assignments 配置リスト
   */
  async function requestPreview(assignments: AssignmentRequest[]): Promise<void> {
    if (assignments.length === 0) return

    loading.value = true
    error.value = null

    try {
      const message = `以下の配置変更のプレビューを生成してください。
preview_assignment ツールを使用してください。

assignments: ${JSON.stringify(assignments)}`

      const res = await csrfFetch<{
        success: boolean
        reply: string
        creditsRemaining: number | null
      }>('/api/ai/chat', {
        method: 'POST',
        body: { message },
      })

      if (result.value) {
        result.value = {
          ...result.value,
          creditsRemaining: res.creditsRemaining,
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'プレビューの取得に失敗しました'
      error.value = message
    } finally {
      loading.value = false
    }
  }

  /**
   * 提案を確定する（execute_assignment API を呼ぶ）
   * execute_assignment は LLM ツールに含めず API 経由のみ
   * @param assignments 確定する配置リスト
   */
  async function confirmProposals(assignments: AssignmentRequest[]): Promise<void> {
    if (assignments.length === 0) return

    confirming.value = true
    confirmError.value = null
    confirmSuccess.value = false

    try {
      // execute_assignment API エンドポイント（Phase 2 実装予定）
      // Sprint 1 では schedules API 経由でスケジュール作成を行う
      await csrfFetch('/api/schedules', {
        method: 'POST',
        body: { assignments },
      })

      confirmSuccess.value = true
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '配置の確定に失敗しました'
      confirmError.value = message
    } finally {
      confirming.value = false
    }
  }

  function reset(): void {
    result.value = null
    error.value = null
    confirmError.value = null
    confirmSuccess.value = false
  }

  return {
    // 状態
    loading,
    error,
    result,
    confirming,
    confirmError,
    confirmSuccess,
    hasProposals,
    // アクション
    requestProposal,
    requestPreview,
    confirmProposals,
    reset,
  }
}
