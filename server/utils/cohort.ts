/**
 * ローンチ割引コホート判定ロジック
 * SSOT_PRICING.md v2.0 Section 1-3 準拠
 *
 * 先着30社に対するグランドファザリング制度
 */

import { prisma } from './prisma'
import { LAUNCH_COHORTS, type LaunchCohort } from './stripe'

// ================================================================
// コホート情報
// ================================================================

export interface CohortInfo {
  /** コホート番号 (1, 2, 3, or null for no discount) */
  cohortNumber: number | null
  /** 割引率 (40, 25, 10, or 0) */
  discountPercent: number
  /** Stripeクーポン ID */
  couponId: string | null
  /** このコホートの最大組織数 */
  maxOrgs: number
  /** 現在の有料組織数 */
  currentPaidOrgs: number
  /** 残り枠数 */
  remainingSlots: number
}

export interface LaunchDiscountStatus {
  /** ローンチ割引が利用可能か */
  isAvailable: boolean
  /** 現在の有料契約組織数 */
  currentPaidOrgs: number
  /** 次の契約者が適用されるコホート */
  nextCohort: CohortInfo | null
  /** 各コホートの状態 */
  cohorts: Array<{
    cohortNumber: number
    discountPercent: number
    maxOrgs: number
    filledOrgs: number
    remainingSlots: number
    isFull: boolean
  }>
}

// ================================================================
// コホート判定
// ================================================================

/**
 * 現在の有料契約組織数をカウント
 * ACTIVE または TRIALING ステータスの Subscription を持つ組織数
 */
async function countPaidOrganizations(): Promise<number> {
  const count = await prisma.subscription.count({
    where: {
      status: {
        in: ['ACTIVE', 'TRIALING'],
      },
    },
  })
  return count
}

/**
 * 次の契約者に適用されるコホートを判定
 */
export async function determineCohort(): Promise<CohortInfo> {
  const currentPaidOrgs = await countPaidOrganizations()

  // コホートを順番にチェック
  for (let i = 0; i < LAUNCH_COHORTS.length; i++) {
    const cohort = LAUNCH_COHORTS[i]
    const prevMax = i === 0 ? 0 : LAUNCH_COHORTS[i - 1].maxOrgs

    // このコホートにまだ空きがあるか
    if (currentPaidOrgs < cohort.maxOrgs) {
      return {
        cohortNumber: i + 1,
        discountPercent: cohort.discountPercent,
        couponId: cohort.couponId,
        maxOrgs: cohort.maxOrgs,
        currentPaidOrgs,
        remainingSlots: cohort.maxOrgs - currentPaidOrgs,
      }
    }
  }

  // 30社を超えた場合は割引なし
  return {
    cohortNumber: null,
    discountPercent: 0,
    couponId: null,
    maxOrgs: LAUNCH_COHORTS[LAUNCH_COHORTS.length - 1].maxOrgs,
    currentPaidOrgs,
    remainingSlots: 0,
  }
}

/**
 * LP表示用のローンチ割引ステータスを取得
 */
export async function getLaunchDiscountStatus(): Promise<LaunchDiscountStatus> {
  const currentPaidOrgs = await countPaidOrganizations()
  const nextCohort = await determineCohort()

  const cohorts = LAUNCH_COHORTS.map((cohort, index) => {
    const prevMax = index === 0 ? 0 : LAUNCH_COHORTS[index - 1].maxOrgs
    const cohortCapacity = cohort.maxOrgs - prevMax // このコホートの枠数

    // このコホートに入った組織数
    let filledOrgs = 0
    if (currentPaidOrgs > prevMax) {
      filledOrgs = Math.min(currentPaidOrgs - prevMax, cohortCapacity)
    }

    return {
      cohortNumber: index + 1,
      discountPercent: cohort.discountPercent,
      maxOrgs: cohort.maxOrgs,
      filledOrgs,
      remainingSlots: cohortCapacity - filledOrgs,
      isFull: filledOrgs >= cohortCapacity,
    }
  })

  return {
    isAvailable: nextCohort.discountPercent > 0,
    currentPaidOrgs,
    nextCohort: nextCohort.discountPercent > 0 ? nextCohort : null,
    cohorts,
  }
}

/**
 * 特定の組織のコホート情報を取得（既存契約者用）
 */
export async function getOrganizationCohort(
  organizationId: string
): Promise<CohortInfo | null> {
  const subscription = await prisma.subscription.findFirst({
    where: {
      organizationId,
      status: {
        in: ['ACTIVE', 'TRIALING', 'PAST_DUE'],
      },
    },
    select: {
      stripeSubscriptionId: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  })

  if (!subscription) {
    return null
  }

  // 契約時点での組織数を推定（createdAt以前のサブスクリプション数）
  const orgCountAtSignup = await prisma.subscription.count({
    where: {
      createdAt: {
        lt: subscription.createdAt,
      },
      status: {
        in: ['ACTIVE', 'TRIALING', 'PAST_DUE', 'CANCELED'],
      },
    },
  })

  // 契約時のコホートを判定
  for (let i = 0; i < LAUNCH_COHORTS.length; i++) {
    const cohort = LAUNCH_COHORTS[i]
    if (orgCountAtSignup < cohort.maxOrgs) {
      return {
        cohortNumber: i + 1,
        discountPercent: cohort.discountPercent,
        couponId: cohort.couponId,
        maxOrgs: cohort.maxOrgs,
        currentPaidOrgs: orgCountAtSignup + 1, // 自社を含む
        remainingSlots: 0, // 既存契約者には不要
      }
    }
  }

  return {
    cohortNumber: null,
    discountPercent: 0,
    couponId: null,
    maxOrgs: LAUNCH_COHORTS[LAUNCH_COHORTS.length - 1].maxOrgs,
    currentPaidOrgs: orgCountAtSignup + 1,
    remainingSlots: 0,
  }
}
