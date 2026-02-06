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
// プラン定義（SSOT_PRICING.md 準拠）
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
