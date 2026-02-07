import Stripe from 'stripe'
import { prisma } from './prisma'

// Prisma モデル型定義（prisma generate が未実行でもビルド可能にする）
type PlanType = 'STARTER' | 'BUSINESS' | 'ENTERPRISE'

interface PlanConfig {
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
  isActive: boolean
  stripePriceIdMonthly: string | null
  stripePriceIdAnnual: string | null
  createdAt: Date
  updatedAt: Date
}

interface CohortConfig {
  id: string
  cohortNumber: number
  maxOrgs: number
  discountPercent: number
  stripeCouponId: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

/**
 * Stripe Client singleton
 */
const globalForStripe = globalThis as unknown as { __stripe?: Stripe }

export const stripe: Stripe =
  globalForStripe.__stripe ??
  new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2025-01-27.acacia' as Stripe.LatestApiVersion,
  })

if (process.env.NODE_ENV !== 'production') {
  globalForStripe.__stripe = stripe
}

// ================================================================
// プラン定義（後方互換用 - 新規コードは getPlanConfigFromDB を使用）
// ================================================================

export const PLAN_LIMITS = {
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
    monthlyAiCredits: -1, // 無制限
    features: [
      'weekly_board', 'department_filter', 'realtime_sync',
      'signage_mode', 'calendar_sync', 'ai_voice_input',
      'history_export', 'api_access', 'sso_saml',
      'multi_site', 'custom',
    ],
  },
} as const

export type PlanTypeKey = keyof typeof PLAN_LIMITS

// ================================================================
// DB ベースのプラン設定取得（サーバーキャッシュ 60秒）
// ================================================================

interface PlanConfigCache {
  data: Map<PlanType, PlanConfig>
  timestamp: number
}

interface CohortConfigCache {
  data: CohortConfig[]
  timestamp: number
}

let planConfigCache: PlanConfigCache | null = null
let cohortConfigCache: CohortConfigCache | null = null
const CACHE_TTL = 60 * 1000 // 60秒

/**
 * DB からプラン設定を取得（キャッシュ付き）
 */
export async function getPlanConfigFromDB(): Promise<Map<PlanType, PlanConfig>> {
  if (planConfigCache && Date.now() - planConfigCache.timestamp < CACHE_TTL) {
    return planConfigCache.data
  }

  const plans = await prisma.planConfig.findMany({
    where: { isActive: true },
  })

  const planMap = new Map<PlanType, PlanConfig>()
  for (const plan of plans) {
    planMap.set(plan.planType, plan)
  }

  planConfigCache = {
    data: planMap,
    timestamp: Date.now(),
  }

  return planMap
}

/**
 * 特定のプランタイプの設定を取得
 */
export async function getPlanConfigByType(planType: PlanType): Promise<PlanConfig | null> {
  const planMap = await getPlanConfigFromDB()
  return planMap.get(planType) || null
}

/**
 * 旧 PLAN_LIMITS 互換形式でプラン設定を取得
 */
export async function getPlanLimits(planType: PlanType): Promise<{
  maxUsers: number
  monthlyAiCredits: number
  features: readonly string[]
} | null> {
  const planConfig = await getPlanConfigByType(planType)
  if (!planConfig) {
    // DB に設定がない場合はハードコードにフォールバック
    return PLAN_LIMITS[planType as PlanTypeKey] || null
  }

  return {
    maxUsers: planConfig.maxUsers,
    monthlyAiCredits: planConfig.monthlyAiCredits,
    features: planConfig.features,
  }
}

/**
 * DB からコホート設定を取得（キャッシュ付き）
 */
export async function getCohortConfigFromDB(): Promise<CohortConfig[]> {
  if (cohortConfigCache && Date.now() - cohortConfigCache.timestamp < CACHE_TTL) {
    return cohortConfigCache.data
  }

  const cohorts = await prisma.cohortConfig.findMany({
    where: { isActive: true },
    orderBy: { cohortNumber: 'asc' },
  })

  cohortConfigCache = {
    data: cohorts,
    timestamp: Date.now(),
  }

  return cohorts
}

/**
 * 現在のコホートと割引率を取得
 */
export async function getCurrentCohort(): Promise<{
  cohort: CohortConfig | null
  currentDiscount: number
  isLaunchPhase: boolean
}> {
  const cohorts = await getCohortConfigFromDB()

  if (cohorts.length === 0) {
    return { cohort: null, currentDiscount: 0, isLaunchPhase: false }
  }

  // 現在のアクティブ契約数を取得
  const activeCount = await prisma.subscription.count({
    where: {
      status: { in: ['ACTIVE', 'TRIALING'] },
      organization: { isSystemOrg: false },
    },
  })

  let cumulativeSlots = 0
  for (const cohort of cohorts) {
    cumulativeSlots += cohort.maxOrgs
    if (activeCount < cumulativeSlots) {
      return {
        cohort,
        currentDiscount: cohort.discountPercent,
        isLaunchPhase: true,
      }
    }
  }

  // 全枠が埋まっている場合
  return { cohort: null, currentDiscount: 0, isLaunchPhase: false }
}

/**
 * プラン設定キャッシュをクリア（更新時に呼び出す）
 */
export function clearPlanConfigCache(): void {
  planConfigCache = null
}

/**
 * コホート設定キャッシュをクリア（更新時に呼び出す）
 */
export function clearCohortConfigCache(): void {
  cohortConfigCache = null
}
