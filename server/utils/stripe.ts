import Stripe from 'stripe'

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
// プラン定義（SSOT_PRICING.md v2.0 準拠）
// ================================================================

export const PLAN_LIMITS = {
  STARTER: {
    maxUsers: 10,
    monthlyAiCredits: 150,
    monthlyPrice: 14800,
    annualPrice: 148000,
    features: [
      'weekly_board',
      'department_filter',
      'realtime_sync',
      'ai_voice_input',
      'ai_text_input',
      'ai_summary',
      'ai_consult',
      'ai_schedule',
    ],
  },
  BUSINESS: {
    maxUsers: 30,
    monthlyAiCredits: 400,
    monthlyPrice: 39800,
    annualPrice: 398000,
    features: [
      'weekly_board',
      'department_filter',
      'realtime_sync',
      'ai_voice_input',
      'ai_text_input',
      'ai_summary',
      'ai_consult',
      'ai_schedule',
      'signage_mode',
      'calendar_sync',
      'history_export',
    ],
  },
  ENTERPRISE: {
    maxUsers: 100,
    monthlyAiCredits: -1, // 無制限
    monthlyPrice: 79800,
    annualPrice: null, // 個別見積
    features: [
      'weekly_board',
      'department_filter',
      'realtime_sync',
      'ai_voice_input',
      'ai_text_input',
      'ai_summary',
      'ai_consult',
      'ai_schedule',
      'signage_mode',
      'calendar_sync',
      'history_export',
      'api_access',
      'sso_saml',
      'multi_site',
      'custom',
    ],
  },
} as const

export type PlanTypeKey = keyof typeof PLAN_LIMITS

// ================================================================
// ローンチ割引コホート（先着30社グランドファザリング）
// ================================================================

export const LAUNCH_COHORTS = [
  { maxOrgs: 10, discountPercent: 40, couponId: 'cohort_1_40off' },
  { maxOrgs: 20, discountPercent: 25, couponId: 'cohort_2_25off' },
  { maxOrgs: 30, discountPercent: 10, couponId: 'cohort_3_10off' },
] as const

export type LaunchCohort = (typeof LAUNCH_COHORTS)[number]

// ================================================================
// 追加クレジットパック（買い切り）
// ================================================================

export const CREDIT_PACKS = {
  LIGHT: { credits: 100, price: 1500 },
  STANDARD: { credits: 300, price: 3500 },
  PRO: { credits: 1000, price: 9800 },
} as const

export type CreditPackKey = keyof typeof CREDIT_PACKS
