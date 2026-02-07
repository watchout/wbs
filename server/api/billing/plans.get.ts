/**
 * プラン・料金情報取得 API
 *
 * GET /api/billing/plans
 *
 * 認証不要の公開 API。
 * PlanConfig, CreditPackConfig, CohortConfig を返す。
 * ローンチ割引の残り枠も算出して返す。
 *
 * 60秒のサーバーサイドキャッシュを適用。
 */

import { prisma } from '~/server/utils/prisma'

// Prisma モデル型定義（prisma generate が未実行でもビルド可能にする）
type PlanType = 'STARTER' | 'BUSINESS' | 'ENTERPRISE'

// サーバーサイドキャッシュ
interface CacheEntry {
  data: BillingPlansResponse
  timestamp: number
}

let cache: CacheEntry | null = null
const CACHE_TTL = 60 * 1000 // 60秒

interface PlanConfigResponse {
  id: string
  planType: PlanType
  name: string
  description: string | null
  monthlyPrice: number
  annualPrice: number | null
  maxUsers: number
  monthlyAiCredits: number
  features: string[]
  featureLabels: string[]
  isRecommended: boolean
  sortOrder: number
  stripePriceIdMonthly: string | null
  stripePriceIdAnnual: string | null
}

interface CreditPackConfigResponse {
  id: string
  name: string
  credits: number
  price: number
  stripePriceId: string | null
  sortOrder: number
}

interface CohortConfigResponse {
  id: string
  cohortNumber: number
  maxOrgs: number
  discountPercent: number
  stripeCouponId: string | null
}

interface LaunchStatus {
  totalSlots: number
  remaining: number
  currentDiscount: number
  isLaunchPhase: boolean
}

interface BillingPlansResponse {
  plans: PlanConfigResponse[]
  creditPacks: CreditPackConfigResponse[]
  cohorts: CohortConfigResponse[]
  launchStatus: LaunchStatus
}

async function fetchBillingPlansData(): Promise<BillingPlansResponse> {
  // プラン設定（isActive: true、sortOrder 昇順）
  const plans = await prisma.planConfig.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    select: {
      id: true,
      planType: true,
      name: true,
      description: true,
      monthlyPrice: true,
      annualPrice: true,
      maxUsers: true,
      monthlyAiCredits: true,
      features: true,
      featureLabels: true,
      isRecommended: true,
      sortOrder: true,
      stripePriceIdMonthly: true,
      stripePriceIdAnnual: true,
    },
  })

  // クレジットパック設定
  const creditPacks = await prisma.creditPackConfig.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    select: {
      id: true,
      name: true,
      credits: true,
      price: true,
      stripePriceId: true,
      sortOrder: true,
    },
  })

  // コホート設定
  const cohorts = await prisma.cohortConfig.findMany({
    where: { isActive: true },
    orderBy: { cohortNumber: 'asc' },
    select: {
      id: true,
      cohortNumber: true,
      maxOrgs: true,
      discountPercent: true,
      stripeCouponId: true,
    },
  })

  // ローンチ割引の残り枠を算出
  // 現在のアクティブ Subscription 数をカウント（システム組織を除く）
  const activeSubscriptionCount = await prisma.subscription.count({
    where: {
      status: { in: ['ACTIVE', 'TRIALING'] },
      organization: {
        isSystemOrg: false,
      },
    },
  })

  // 各コホートの上限を累積して、現在のコホートと残り枠を計算
  let totalSlots = 0
  let currentDiscount = 0
  let isLaunchPhase = true

  for (const cohort of cohorts) {
    totalSlots += cohort.maxOrgs
    if (activeSubscriptionCount < totalSlots) {
      currentDiscount = cohort.discountPercent
      break
    }
  }

  // 全コホート枠を超えた場合
  if (activeSubscriptionCount >= totalSlots && cohorts.length > 0) {
    isLaunchPhase = false
    currentDiscount = 0
  }

  const remaining = Math.max(0, totalSlots - activeSubscriptionCount)

  return {
    plans,
    creditPacks,
    cohorts,
    launchStatus: {
      totalSlots,
      remaining,
      currentDiscount,
      isLaunchPhase,
    },
  }
}

export default defineEventHandler(async (): Promise<BillingPlansResponse> => {
  // キャッシュが有効な場合はキャッシュを返す
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return cache.data
  }

  // データを取得してキャッシュを更新
  const data = await fetchBillingPlansData()
  cache = {
    data,
    timestamp: Date.now(),
  }

  return data
})
