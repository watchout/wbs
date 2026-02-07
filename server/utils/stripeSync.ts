/**
 * Stripe 同期ユーティリティ
 *
 * PlanConfig / CreditPackConfig / CohortConfig を Stripe に同期する
 */

// Prisma モデル型定義（prisma generate が未実行でもビルド可能にする）
interface PlanConfig {
  id: string
  planType: string
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

interface CreditPackConfig {
  id: string
  name: string
  credits: number
  price: number
  stripePriceId: string | null
  sortOrder: number
  isActive: boolean
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

import { stripe, clearPlanConfigCache, clearCohortConfigCache } from './stripe'
import { prisma } from './prisma'

/**
 * プラン設定を Stripe Product/Price に同期
 *
 * @param planConfig PlanConfig モデル
 * @returns 更新された PlanConfig
 */
export async function syncPlanToStripe(planConfig: PlanConfig): Promise<PlanConfig> {
  const lookupKey = `mielboard_${planConfig.planType.toLowerCase()}`

  // 既存の Product を検索
  const existingProducts = await stripe.products.search({
    query: `metadata['lookupKey']:'${lookupKey}'`,
  })

  let productId: string

  if (existingProducts.data.length > 0) {
    // 既存の Product を更新
    productId = existingProducts.data[0].id
    await stripe.products.update(productId, {
      name: `ミエルボード ${planConfig.name}プラン`,
      description: planConfig.description || undefined,
      metadata: {
        lookupKey,
        planType: planConfig.planType,
        maxUsers: String(planConfig.maxUsers),
        monthlyAiCredits: String(planConfig.monthlyAiCredits),
      },
    })
  } else {
    // 新規 Product を作成
    const product = await stripe.products.create({
      name: `ミエルボード ${planConfig.name}プラン`,
      description: planConfig.description || undefined,
      metadata: {
        lookupKey,
        planType: planConfig.planType,
        maxUsers: String(planConfig.maxUsers),
        monthlyAiCredits: String(planConfig.monthlyAiCredits),
      },
    })
    productId = product.id
  }

  // 月額 Price を作成/更新
  let monthlyPriceId = planConfig.stripePriceIdMonthly

  if (!monthlyPriceId) {
    const monthlyPrice = await stripe.prices.create({
      product: productId,
      unit_amount: planConfig.monthlyPrice,
      currency: 'jpy',
      recurring: { interval: 'month' },
      lookup_key: `${lookupKey}_month`,
    })
    monthlyPriceId = monthlyPrice.id
  }

  // 年額 Price を作成/更新（存在する場合のみ）
  let annualPriceId = planConfig.stripePriceIdAnnual

  if (planConfig.annualPrice && !annualPriceId) {
    const annualPrice = await stripe.prices.create({
      product: productId,
      unit_amount: planConfig.annualPrice,
      currency: 'jpy',
      recurring: { interval: 'year' },
      lookup_key: `${lookupKey}_year`,
    })
    annualPriceId = annualPrice.id
  }

  // DB を更新
  const updatedPlan = await prisma.planConfig.update({
    where: { id: planConfig.id },
    data: {
      stripePriceIdMonthly: monthlyPriceId,
      stripePriceIdAnnual: annualPriceId,
    },
  })

  clearPlanConfigCache()

  return updatedPlan
}

/**
 * クレジットパック設定を Stripe Product/Price に同期
 */
export async function syncCreditPackToStripe(packConfig: CreditPackConfig): Promise<CreditPackConfig> {
  const lookupKey = `ai_credit_pack_${packConfig.name.toLowerCase().replace(/\s+/g, '_')}`

  // 既存の Product を検索
  const existingProducts = await stripe.products.search({
    query: `metadata['lookupKey']:'${lookupKey}'`,
  })

  let productId: string

  if (existingProducts.data.length > 0) {
    productId = existingProducts.data[0].id
    await stripe.products.update(productId, {
      name: `AI クレジット追加パック ${packConfig.name}`,
      description: `+${packConfig.credits}回/月`,
      metadata: {
        lookupKey,
        credits: String(packConfig.credits),
      },
    })
  } else {
    const product = await stripe.products.create({
      name: `AI クレジット追加パック ${packConfig.name}`,
      description: `+${packConfig.credits}回/月`,
      metadata: {
        lookupKey,
        credits: String(packConfig.credits),
      },
    })
    productId = product.id
  }

  // Price を作成（存在しない場合のみ）
  let priceId = packConfig.stripePriceId

  if (!priceId) {
    const price = await stripe.prices.create({
      product: productId,
      unit_amount: packConfig.price,
      currency: 'jpy',
      recurring: { interval: 'month' },
      lookup_key: `${lookupKey}_month`,
    })
    priceId = price.id
  }

  // DB を更新
  const updatedPack = await prisma.creditPackConfig.update({
    where: { id: packConfig.id },
    data: { stripePriceId: priceId },
  })

  return updatedPack
}

/**
 * コホート設定を Stripe Coupon に同期
 */
export async function syncCohortToStripe(cohortConfig: CohortConfig): Promise<CohortConfig> {
  const couponId = `cohort_${cohortConfig.cohortNumber}_${cohortConfig.discountPercent}off`

  // 既存の Coupon を確認
  let existingCoupon = null
  try {
    existingCoupon = await stripe.coupons.retrieve(couponId)
  } catch {
    // Coupon が存在しない場合は新規作成
  }

  if (!existingCoupon) {
    await stripe.coupons.create({
      id: couponId,
      percent_off: cohortConfig.discountPercent,
      duration: 'forever', // 永続割引
      name: `ローンチ割引 コホート${cohortConfig.cohortNumber} (${cohortConfig.discountPercent}%OFF)`,
      metadata: {
        cohortNumber: String(cohortConfig.cohortNumber),
      },
    })
  }

  // DB を更新
  const updatedCohort = await prisma.cohortConfig.update({
    where: { id: cohortConfig.id },
    data: { stripeCouponId: couponId },
  })

  clearCohortConfigCache()

  return updatedCohort
}

/**
 * 全設定を Stripe に同期
 */
export async function syncAllToStripe(): Promise<{
  plans: number
  creditPacks: number
  cohorts: number
}> {
  const plans = await prisma.planConfig.findMany({ where: { isActive: true } })
  const creditPacks = await prisma.creditPackConfig.findMany({ where: { isActive: true } })
  const cohorts = await prisma.cohortConfig.findMany({ where: { isActive: true } })

  for (const plan of plans) {
    await syncPlanToStripe(plan)
  }

  for (const pack of creditPacks) {
    await syncCreditPackToStripe(pack)
  }

  for (const cohort of cohorts) {
    await syncCohortToStripe(cohort)
  }

  return {
    plans: plans.length,
    creditPacks: creditPacks.length,
    cohorts: cohorts.length,
  }
}
