/**
 * 料金設定を取得する Composable
 *
 * /api/billing/plans から PlanConfig, CreditPackConfig, CohortConfig を取得
 */

// Prisma の PlanType enum と互換
export type PlanType = 'STARTER' | 'BUSINESS' | 'ENTERPRISE'

export interface PlanConfigResponse {
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

export interface CreditPackConfigResponse {
  id: string
  name: string
  credits: number
  price: number
  stripePriceId: string | null
  sortOrder: number
}

export interface CohortConfigResponse {
  id: string
  cohortNumber: number
  maxOrgs: number
  discountPercent: number
  stripeCouponId: string | null
}

export interface LaunchStatus {
  totalSlots: number
  remaining: number
  currentDiscount: number
  isLaunchPhase: boolean
}

export interface PricingConfigResponse {
  plans: PlanConfigResponse[]
  creditPacks: CreditPackConfigResponse[]
  cohorts: CohortConfigResponse[]
  launchStatus: LaunchStatus
}

const defaultValue: PricingConfigResponse = {
  plans: [],
  creditPacks: [],
  cohorts: [],
  launchStatus: {
    totalSlots: 0,
    remaining: 0,
    currentDiscount: 0,
    isLaunchPhase: false,
  },
}

export function usePricingConfig() {
  return useLazyFetch<PricingConfigResponse>('/api/billing/plans', {
    key: 'pricing-config',
    default: () => defaultValue,
  })
}

/**
 * プラン名のマッピング
 */
export function getPlanDisplayName(planType: string): string {
  const names: Record<string, string> = {
    STARTER: 'スターター',
    BUSINESS: 'ビジネス',
    ENTERPRISE: 'エンタープライズ',
  }
  return names[planType] || planType
}

/**
 * ステータス名のマッピング
 */
export function getStatusDisplayName(status: string): string {
  const names: Record<string, string> = {
    TRIALING: 'トライアル中',
    ACTIVE: '有効',
    PAST_DUE: '支払い遅延',
    CANCELED: '解約済み',
    UNPAID: '未払い',
  }
  return names[status] || status
}
