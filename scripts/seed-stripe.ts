/**
 * Stripe Product / Price / Coupon をプログラムで作成し、
 * DB（PlanConfig, CreditPackConfig, CohortConfig）に紐付けるスクリプト
 *
 * 実行: npx tsx scripts/seed-stripe.ts
 *
 * 前提:
 * - STRIPE_SECRET_KEY が .env に設定されている
 * - Prisma マイグレーションが最新
 *
 * SSOT_PRICING.md v2.0 準拠
 */

import Stripe from 'stripe'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-01-27.acacia' as Stripe.LatestApiVersion,
})

// ================================================================
// プラン定義（SSOT_PRICING.md v2.0 Section 1-2, 1-4）
// ================================================================

const PLANS = [
  {
    planType: 'STARTER' as const,
    name: 'Starter',
    description: '小規模チーム向け。10名まで。',
    monthlyPrice: 14800,
    annualPrice: 148000,
    maxUsers: 10,
    monthlyAiCredits: 150,
    features: [
      'weekly_board', 'department_filter', 'realtime_sync',
      'ai_voice_input', 'ai_text_input', 'ai_summary',
      'ai_consult', 'ai_scheduling',
    ],
    featureLabels: [
      '週間スケジュールボード', '部門フィルタ', 'リアルタイム同期',
      'AI音声入力', 'AI自然文入力', 'AI予定要約',
      'AI現場相談', 'AI日程調整',
    ],
    isRecommended: false,
    sortOrder: 1,
  },
  {
    planType: 'BUSINESS' as const,
    name: 'Business',
    description: '中規模企業向け。30名まで。推奨プラン。',
    monthlyPrice: 39800,
    annualPrice: 398000,
    maxUsers: 30,
    monthlyAiCredits: 400,
    features: [
      'weekly_board', 'department_filter', 'realtime_sync',
      'ai_voice_input', 'ai_text_input', 'ai_summary',
      'ai_consult', 'ai_scheduling',
      'signage_mode', 'calendar_sync', 'history_export', 'multi_site_1',
    ],
    featureLabels: [
      '週間スケジュールボード', '部門フィルタ', 'リアルタイム同期',
      'AI音声入力', 'AI自然文入力', 'AI予定要約',
      'AI現場相談', 'AI日程調整',
      'サイネージモード', 'カレンダー連携', '履歴エクスポート', '複数拠点(1拠点)',
    ],
    isRecommended: true,
    sortOrder: 2,
  },
  {
    planType: 'ENTERPRISE' as const,
    name: 'Enterprise',
    description: '大規模企業向け。100名まで。全機能利用可能。',
    monthlyPrice: 79800,
    annualPrice: null, // 個別見積
    maxUsers: 100,
    monthlyAiCredits: -1, // 無制限
    features: [
      'weekly_board', 'department_filter', 'realtime_sync',
      'ai_voice_input', 'ai_text_input', 'ai_summary',
      'ai_consult', 'ai_scheduling',
      'signage_mode', 'calendar_sync', 'history_export',
      'api_access', 'sso_saml', 'multi_site_unlimited', 'custom',
    ],
    featureLabels: [
      '週間スケジュールボード', '部門フィルタ', 'リアルタイム同期',
      'AI音声入力', 'AI自然文入力', 'AI予定要約',
      'AI現場相談', 'AI日程調整',
      'サイネージモード', 'カレンダー連携', '履歴エクスポート',
      'API連携', 'SSO/SAML', '複数拠点(無制限)', 'カスタマイズ',
    ],
    isRecommended: false,
    sortOrder: 3,
  },
]

// ================================================================
// AIクレジット追加パック（SSOT_PRICING.md v2.0 Section 2-3）
// ================================================================

const CREDIT_PACKS = [
  { name: 'ライト', credits: 100, price: 1500, sortOrder: 1 },
  { name: 'スタンダード', credits: 300, price: 3500, sortOrder: 2 },
  { name: 'プロ', credits: 1000, price: 9800, sortOrder: 3 },
]

// ================================================================
// ローンチ割引コホート（SSOT_PRICING.md v2.0 Section 1-3）
// ================================================================

const COHORTS = [
  { cohortNumber: 1, maxOrgs: 10, discountPercent: 40 },
  { cohortNumber: 2, maxOrgs: 20, discountPercent: 25 },
  { cohortNumber: 3, maxOrgs: 30, discountPercent: 10 },
]

// ================================================================
// メイン処理
// ================================================================

async function main() {
  console.log('🚀 Stripe シード開始...\n')

  // ── 1. Product + Price 作成（プラン） ──

  for (const plan of PLANS) {
    console.log(`📦 ${plan.name} プラン...`)

    // Product 作成（既存があればスキップ）
    const existingProducts = await stripe.products.search({
      query: `metadata["planType"]:"${plan.planType}"`,
    })

    let product: Stripe.Product
    if (existingProducts.data.length > 0) {
      product = existingProducts.data[0]!
      console.log(`  ✅ Product 既存: ${product.id}`)
    } else {
      product = await stripe.products.create({
        name: `ミエルボード ${plan.name}`,
        description: plan.description,
        metadata: {
          planType: plan.planType,
          maxUsers: plan.maxUsers.toString(),
          monthlyAiCredits: plan.monthlyAiCredits.toString(),
        },
      })
      console.log(`  ✅ Product 作成: ${product.id}`)
    }

    // 月額 Price
    const existingMonthlyPrices = await stripe.prices.list({
      product: product.id,
      type: 'recurring',
    })
    const existingMonthly = existingMonthlyPrices.data.find(
      (p) => p.recurring?.interval === 'month' && p.active
    )

    let monthlyPrice: Stripe.Price
    if (existingMonthly) {
      monthlyPrice = existingMonthly
      console.log(`  ✅ 月額Price 既存: ${monthlyPrice.id}`)
    } else {
      monthlyPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: plan.monthlyPrice,
        currency: 'jpy',
        recurring: { interval: 'month' },
        metadata: { planType: plan.planType, interval: 'month' },
      })
      console.log(`  ✅ 月額Price 作成: ${monthlyPrice.id} (¥${plan.monthlyPrice}/月)`)
    }

    // 年額 Price（Enterprise は個別見積のためスキップ）
    let annualPrice: Stripe.Price | null = null
    if (plan.annualPrice) {
      const existingAnnual = existingMonthlyPrices.data.find(
        (p) => p.recurring?.interval === 'year' && p.active
      )

      if (existingAnnual) {
        annualPrice = existingAnnual
        console.log(`  ✅ 年額Price 既存: ${annualPrice.id}`)
      } else {
        annualPrice = await stripe.prices.create({
          product: product.id,
          unit_amount: plan.annualPrice,
          currency: 'jpy',
          recurring: { interval: 'year' },
          metadata: { planType: plan.planType, interval: 'year' },
        })
        console.log(`  ✅ 年額Price 作成: ${annualPrice.id} (¥${plan.annualPrice}/年)`)
      }
    }

    // DB に PlanConfig を upsert
    await prisma.planConfig.upsert({
      where: { planType: plan.planType },
      update: {
        name: plan.name,
        description: plan.description,
        monthlyPrice: plan.monthlyPrice,
        annualPrice: plan.annualPrice,
        maxUsers: plan.maxUsers,
        monthlyAiCredits: plan.monthlyAiCredits,
        features: plan.features,
        featureLabels: plan.featureLabels,
        isRecommended: plan.isRecommended,
        sortOrder: plan.sortOrder,
        stripePriceIdMonthly: monthlyPrice.id,
        stripePriceIdAnnual: annualPrice?.id || null,
        isActive: true,
      },
      create: {
        planType: plan.planType,
        name: plan.name,
        description: plan.description,
        monthlyPrice: plan.monthlyPrice,
        annualPrice: plan.annualPrice,
        maxUsers: plan.maxUsers,
        monthlyAiCredits: plan.monthlyAiCredits,
        features: plan.features,
        featureLabels: plan.featureLabels,
        isRecommended: plan.isRecommended,
        sortOrder: plan.sortOrder,
        stripePriceIdMonthly: monthlyPrice.id,
        stripePriceIdAnnual: annualPrice?.id || null,
        isActive: true,
      },
    })
    console.log(`  ✅ DB PlanConfig upsert 完了\n`)
  }

  // ── 2. Product + Price 作成（クレジットパック） ──

  console.log('💎 AIクレジット追加パック...')

  for (const pack of CREDIT_PACKS) {
    console.log(`  📦 ${pack.name} パック (${pack.credits}回 / ¥${pack.price})...`)

    // Product
    const existingProducts = await stripe.products.search({
      query: `metadata["creditPack"]:"${pack.name}"`,
    })

    let product: Stripe.Product
    if (existingProducts.data.length > 0) {
      product = existingProducts.data[0]!
      console.log(`    ✅ Product 既存: ${product.id}`)
    } else {
      product = await stripe.products.create({
        name: `AIクレジット ${pack.name}パック`,
        description: `${pack.credits}回分のAIクレジット（買い切り）`,
        metadata: {
          creditPack: pack.name,
          credits: pack.credits.toString(),
        },
      })
      console.log(`    ✅ Product 作成: ${product.id}`)
    }

    // Price（one_time）
    const existingPrices = await stripe.prices.list({
      product: product.id,
      active: true,
    })

    let price: Stripe.Price
    if (existingPrices.data.length > 0) {
      price = existingPrices.data[0]!
      console.log(`    ✅ Price 既存: ${price.id}`)
    } else {
      price = await stripe.prices.create({
        product: product.id,
        unit_amount: pack.price,
        currency: 'jpy',
        metadata: { creditPack: pack.name, credits: pack.credits.toString() },
      })
      console.log(`    ✅ Price 作成: ${price.id} (¥${pack.price})`)
    }

    // DB に CreditPackConfig を upsert
    const existing = await prisma.creditPackConfig.findFirst({
      where: { name: pack.name },
    })

    if (existing) {
      await prisma.creditPackConfig.update({
        where: { id: existing.id },
        data: {
          credits: pack.credits,
          price: pack.price,
          stripePriceId: price.id,
          sortOrder: pack.sortOrder,
          isActive: true,
        },
      })
    } else {
      await prisma.creditPackConfig.create({
        data: {
          name: pack.name,
          credits: pack.credits,
          price: pack.price,
          stripePriceId: price.id,
          sortOrder: pack.sortOrder,
          isActive: true,
        },
      })
    }
    console.log(`    ✅ DB CreditPackConfig upsert 完了`)
  }

  // ── 3. Coupon 作成（ローンチ割引コホート） ──

  console.log('\n🎫 ローンチ割引クーポン...')

  for (const cohort of COHORTS) {
    console.log(`  📦 コホート${cohort.cohortNumber} (${cohort.discountPercent}%OFF, ${cohort.maxOrgs}社)...`)

    // Coupon（既存チェック: name で検索）
    const couponId = `launch_cohort_${cohort.cohortNumber}`

    let coupon: Stripe.Coupon
    try {
      coupon = await stripe.coupons.retrieve(couponId)
      console.log(`    ✅ Coupon 既存: ${coupon.id}`)
    } catch {
      coupon = await stripe.coupons.create({
        id: couponId,
        percent_off: cohort.discountPercent,
        duration: 'forever',
        name: `ローンチ割引 コホート${cohort.cohortNumber}（${cohort.discountPercent}%OFF・永久適用）`,
        metadata: {
          cohortNumber: cohort.cohortNumber.toString(),
          maxOrgs: cohort.maxOrgs.toString(),
        },
      })
      console.log(`    ✅ Coupon 作成: ${coupon.id} (${cohort.discountPercent}%OFF forever)`)
    }

    // DB に CohortConfig を upsert
    await prisma.cohortConfig.upsert({
      where: { cohortNumber: cohort.cohortNumber },
      update: {
        maxOrgs: cohort.maxOrgs,
        discountPercent: cohort.discountPercent,
        stripeCouponId: coupon.id,
        isActive: true,
      },
      create: {
        cohortNumber: cohort.cohortNumber,
        maxOrgs: cohort.maxOrgs,
        discountPercent: cohort.discountPercent,
        stripeCouponId: coupon.id,
        isActive: true,
      },
    })
    console.log(`    ✅ DB CohortConfig upsert 完了`)
  }

  // ── 4. 検証 ──

  console.log('\n📋 検証...')

  const dbPlans = await prisma.planConfig.findMany({ orderBy: { sortOrder: 'asc' } })
  console.log(`  PlanConfig: ${dbPlans.length}件`)
  for (const p of dbPlans) {
    console.log(`    ${p.planType}: ¥${p.monthlyPrice}/月 | monthly=${p.stripePriceIdMonthly} | annual=${p.stripePriceIdAnnual}`)
  }

  const dbPacks = await prisma.creditPackConfig.findMany({ orderBy: { sortOrder: 'asc' } })
  console.log(`  CreditPackConfig: ${dbPacks.length}件`)
  for (const p of dbPacks) {
    console.log(`    ${p.name}: ${p.credits}回 ¥${p.price} | priceId=${p.stripePriceId}`)
  }

  const dbCohorts = await prisma.cohortConfig.findMany({ orderBy: { cohortNumber: 'asc' } })
  console.log(`  CohortConfig: ${dbCohorts.length}件`)
  for (const c of dbCohorts) {
    console.log(`    コホート${c.cohortNumber}: ${c.discountPercent}%OFF ~${c.maxOrgs}社 | couponId=${c.stripeCouponId}`)
  }

  console.log('\n🎉 Stripe シード完了!')
}

main()
  .catch((e) => {
    console.error('❌ エラー:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
