/**
 * Stripe Products/Prices セットアップスクリプト
 *
 * 使い方:
 *   npx tsx scripts/stripe-setup.ts
 *
 * DB の PlanConfig / CreditPackConfig / CohortConfig を Stripe に同期します。
 * 冪等: 既存の Product があれば更新します。
 */

import Stripe from 'stripe'
import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'

dotenv.config()

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
if (!STRIPE_SECRET_KEY) {
  console.error('Error: STRIPE_SECRET_KEY is not set in .env')
  process.exit(1)
}

const stripe = new Stripe(STRIPE_SECRET_KEY)
const prisma = new PrismaClient()

// ================================================================
// Stripe 同期関数
// ================================================================

async function findOrCreateProduct(
  lookupKey: string,
  name: string,
  description: string | null,
  metadata: Record<string, string>
): Promise<Stripe.Product> {
  // 既存の Product を検索
  const existing = await stripe.products.search({
    query: `metadata['lookupKey']:'${lookupKey}'`,
  })

  if (existing.data.length > 0) {
    console.log(`  ✓ Product already exists: ${name} (${existing.data[0].id})`)
    // 更新
    await stripe.products.update(existing.data[0].id, {
      name,
      description: description || undefined,
      metadata: { ...metadata, lookupKey },
    })
    return existing.data[0]
  }

  const product = await stripe.products.create({
    name,
    description: description || undefined,
    metadata: { ...metadata, lookupKey },
  })

  console.log(`  + Created Product: ${name} (${product.id})`)
  return product
}

async function findOrCreatePrice(
  productId: string,
  unitAmount: number,
  interval: 'month' | 'year',
  lookupKey: string
): Promise<Stripe.Price> {
  // 同じ金額の Price を検索
  const existing = await stripe.prices.list({
    product: productId,
    active: true,
    recurring: { interval },
    limit: 10,
  })

  const match = existing.data.find(p => p.unit_amount === unitAmount)
  if (match) {
    console.log(`    ✓ Price already exists: ¥${unitAmount.toLocaleString()} / ${interval} (${match.id})`)
    return match
  }

  const price = await stripe.prices.create({
    product: productId,
    unit_amount: unitAmount,
    currency: 'jpy',
    recurring: { interval },
    lookup_key: `${lookupKey}_${interval}`,
  })

  console.log(`    + Created Price: ¥${unitAmount.toLocaleString()} / ${interval} (${price.id})`)
  return price
}

async function createCoupon(
  couponId: string,
  percentOff: number,
  name: string,
  metadata: Record<string, string>
): Promise<Stripe.Coupon> {
  try {
    const existing = await stripe.coupons.retrieve(couponId)
    console.log(`  ✓ Coupon already exists: ${name} (${couponId})`)
    return existing
  } catch {
    // Coupon が存在しない場合は新規作成
  }

  const coupon = await stripe.coupons.create({
    id: couponId,
    percent_off: percentOff,
    duration: 'forever',
    name,
    metadata,
  })

  console.log(`  + Created Coupon: ${name} (${couponId})`)
  return coupon
}

async function main() {
  console.log('=== Stripe Setup: ミエルボード for 現場 (DB ベース) ===\n')

  // 1. DB からプラン設定を取得
  const plans = await prisma.planConfig.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  })

  if (plans.length === 0) {
    console.log('⚠️  PlanConfig が見つかりません。先に seed-platform.ts を実行してください。')
    console.log('   npx tsx prisma/seed-platform.ts')
    return
  }

  console.log('📦 サブスクリプションプラン:')
  for (const plan of plans) {
    const lookupKey = `mielboard_${plan.planType.toLowerCase()}`
    const product = await findOrCreateProduct(
      lookupKey,
      `ミエルボード ${plan.name}プラン`,
      plan.description,
      {
        planType: plan.planType,
        maxUsers: String(plan.maxUsers),
        monthlyAiCredits: String(plan.monthlyAiCredits),
      }
    )

    // 月額 Price
    const monthlyPrice = await findOrCreatePrice(
      product.id,
      plan.monthlyPrice,
      'month',
      lookupKey
    )

    // DB に Price ID を保存
    let annualPriceId: string | null = plan.stripePriceIdAnnual

    // 年額 Price（存在する場合のみ）
    if (plan.annualPrice) {
      const annualPrice = await findOrCreatePrice(
        product.id,
        plan.annualPrice,
        'year',
        lookupKey
      )
      annualPriceId = annualPrice.id
    }

    // DB を更新
    await prisma.planConfig.update({
      where: { id: plan.id },
      data: {
        stripePriceIdMonthly: monthlyPrice.id,
        stripePriceIdAnnual: annualPriceId,
      },
    })
    console.log(`    📝 DB 更新完了: ${plan.planType}`)
  }

  // 2. DB からクレジットパック設定を取得
  const creditPacks = await prisma.creditPackConfig.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  })

  console.log('\n🤖 AI クレジット追加パック:')
  for (const pack of creditPacks) {
    const lookupKey = `ai_credit_pack_${pack.name.toLowerCase().replace(/\s+/g, '_')}`
    const product = await findOrCreateProduct(
      lookupKey,
      `AI クレジット追加パック ${pack.name}`,
      `+${pack.credits}回/月`,
      { credits: String(pack.credits) }
    )

    const price = await findOrCreatePrice(product.id, pack.price, 'month', lookupKey)

    // DB を更新
    await prisma.creditPackConfig.update({
      where: { id: pack.id },
      data: { stripePriceId: price.id },
    })
    console.log(`    📝 DB 更新完了: ${pack.name}`)
  }

  // 3. DB からコホート設定を取得
  const cohorts = await prisma.cohortConfig.findMany({
    where: { isActive: true },
    orderBy: { cohortNumber: 'asc' },
  })

  console.log('\n🎫 ローンチ割引クーポン:')
  for (const cohort of cohorts) {
    const couponId = `cohort_${cohort.cohortNumber}_${cohort.discountPercent}off`
    await createCoupon(
      couponId,
      cohort.discountPercent,
      `ローンチ割引 コホート${cohort.cohortNumber} (${cohort.discountPercent}%OFF)`,
      { cohortNumber: String(cohort.cohortNumber) }
    )

    // DB を更新
    await prisma.cohortConfig.update({
      where: { id: cohort.id },
      data: { stripeCouponId: couponId },
    })
    console.log(`    📝 DB 更新完了: コホート${cohort.cohortNumber}`)
  }

  // 4. Customer Portal の設定案内
  console.log('\n📋 手動設定が必要:')
  console.log('  1. Stripe Dashboard → Settings → Customer Portal を有効化')
  console.log('  2. Webhook エンドポイントを登録:')
  console.log('     URL: https://<your-domain>/api/billing/webhook')
  console.log('     Events: checkout.session.completed, customer.subscription.updated,')
  console.log('             customer.subscription.deleted, invoice.paid, invoice.payment_failed')
  console.log('\n✅ セットアップ完了')
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect()
  })
