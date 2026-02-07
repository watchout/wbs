/**
 * Stripe Products/Prices/Coupons セットアップスクリプト
 *
 * 使い方:
 *   npx tsx scripts/stripe-setup.ts
 *
 * SSOT_PRICING.md v2.0 に基づく料金体系を Stripe に作成します。
 * 冪等: 既存の Product/Coupon があればスキップします。
 */

import Stripe from 'stripe'
import * as dotenv from 'dotenv'

dotenv.config()

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
if (!STRIPE_SECRET_KEY) {
  console.error('Error: STRIPE_SECRET_KEY is not set in .env')
  process.exit(1)
}

const stripe = new Stripe(STRIPE_SECRET_KEY)

// ================================================================
// 料金マスター（SSOT_PRICING.md v2.0 準拠）
// ================================================================

interface PlanDefinition {
  lookupKey: string
  name: string
  description: string
  metadata: Record<string, string>
  monthlyPrice: number     // 円
  annualPrice: number | null // 円（null = 個別見積）
}

interface CreditPackDefinition {
  lookupKey: string
  name: string
  description: string
  metadata: Record<string, string>
  price: number // 買い切り価格（円）
}

interface CouponDefinition {
  id: string
  name: string
  percentOff: number
  duration: 'forever' | 'once' | 'repeating'
}

// v2.0 価格体系
const PLANS: PlanDefinition[] = [
  {
    lookupKey: 'mielboard_starter',
    name: 'ミエルボード Starter プラン',
    description: '小規模チーム向け（〜10名）。全機能 + AI 150回/月。',
    metadata: { planType: 'STARTER', maxUsers: '10', monthlyAiCredits: '150' },
    monthlyPrice: 14800,
    annualPrice: 148000,
  },
  {
    lookupKey: 'mielboard_business',
    name: 'ミエルボード Business プラン',
    description: '中規模企業向け（〜30名）。全機能 + カレンダー連携 + AI 400回/月。',
    metadata: { planType: 'BUSINESS', maxUsers: '30', monthlyAiCredits: '400' },
    monthlyPrice: 39800,
    annualPrice: 398000,
  },
  {
    lookupKey: 'mielboard_enterprise',
    name: 'ミエルボード Enterprise プラン',
    description: '大規模企業向け（〜100名）。全モジュール + AI無制限 + 専任サポート。',
    metadata: { planType: 'ENTERPRISE', maxUsers: '100', monthlyAiCredits: '-1' },
    monthlyPrice: 79800,
    annualPrice: null, // 個別見積
  },
]

// v2.0 買い切りクレジットパック
const CREDIT_PACKS: CreditPackDefinition[] = [
  {
    lookupKey: 'ai_credit_pack_light',
    name: 'AI クレジットパック ライト',
    description: '100回（買い切り・有効期限なし）',
    metadata: { credits: '100', type: 'one_time' },
    price: 1500,
  },
  {
    lookupKey: 'ai_credit_pack_standard',
    name: 'AI クレジットパック スタンダード',
    description: '300回（買い切り・有効期限なし）',
    metadata: { credits: '300', type: 'one_time' },
    price: 3500,
  },
  {
    lookupKey: 'ai_credit_pack_pro',
    name: 'AI クレジットパック プロ',
    description: '1,000回（買い切り・有効期限なし）',
    metadata: { credits: '1000', type: 'one_time' },
    price: 9800,
  },
]

// ローンチ割引クーポン（グランドファザリング）
const COUPONS: CouponDefinition[] = [
  {
    id: 'cohort_1_40off',
    name: 'ローンチ割引 コホート1（40%OFF）',
    percentOff: 40,
    duration: 'forever',
  },
  {
    id: 'cohort_2_25off',
    name: 'ローンチ割引 コホート2（25%OFF）',
    percentOff: 25,
    duration: 'forever',
  },
  {
    id: 'cohort_3_10off',
    name: 'ローンチ割引 コホート3（10%OFF）',
    percentOff: 10,
    duration: 'forever',
  },
]

// ================================================================
// ヘルパー関数
// ================================================================

async function findOrCreateProduct(
  lookupKey: string,
  name: string,
  description: string,
  metadata: Record<string, string>
): Promise<Stripe.Product> {
  // 既存の Product を検索
  const existing = await stripe.products.search({
    query: `metadata['lookupKey']:'${lookupKey}'`,
  })

  if (existing.data.length > 0) {
    console.log(`  ✓ Product already exists: ${name} (${existing.data[0].id})`)
    return existing.data[0]
  }

  const product = await stripe.products.create({
    name,
    description,
    metadata: { ...metadata, lookupKey },
  })

  console.log(`  + Created Product: ${name} (${product.id})`)
  return product
}

async function findOrCreateRecurringPrice(
  productId: string,
  unitAmount: number,
  interval: 'month' | 'year',
  lookupKey: string
): Promise<Stripe.Price> {
  const existing = await stripe.prices.list({
    product: productId,
    active: true,
    recurring: { interval },
    limit: 10,
  })

  const match = existing.data.find(p => p.unit_amount === unitAmount)
  if (match) {
    console.log(`    ✓ Price already exists: ¥${unitAmount} / ${interval} (${match.id})`)
    return match
  }

  const price = await stripe.prices.create({
    product: productId,
    unit_amount: unitAmount,
    currency: 'jpy',
    recurring: { interval },
    lookup_key: `${lookupKey}_${interval}`,
  })

  console.log(`    + Created Price: ¥${unitAmount} / ${interval} (${price.id})`)
  return price
}

async function findOrCreateOneTimePrice(
  productId: string,
  unitAmount: number,
  lookupKey: string
): Promise<Stripe.Price> {
  const existing = await stripe.prices.list({
    product: productId,
    active: true,
    type: 'one_time',
    limit: 10,
  })

  const match = existing.data.find(p => p.unit_amount === unitAmount)
  if (match) {
    console.log(`    ✓ Price already exists: ¥${unitAmount} (one-time) (${match.id})`)
    return match
  }

  const price = await stripe.prices.create({
    product: productId,
    unit_amount: unitAmount,
    currency: 'jpy',
    lookup_key: `${lookupKey}_onetime`,
  })

  console.log(`    + Created Price: ¥${unitAmount} (one-time) (${price.id})`)
  return price
}

async function findOrCreateCoupon(coupon: CouponDefinition): Promise<Stripe.Coupon> {
  try {
    const existing = await stripe.coupons.retrieve(coupon.id)
    console.log(`  ✓ Coupon already exists: ${coupon.name} (${existing.id})`)
    return existing
  } catch (error: unknown) {
    // Coupon が存在しない場合は作成
    if ((error as { code?: string }).code === 'resource_missing') {
      const created = await stripe.coupons.create({
        id: coupon.id,
        name: coupon.name,
        percent_off: coupon.percentOff,
        duration: coupon.duration,
        metadata: {
          type: 'launch_discount',
          cohort: coupon.id.split('_')[1], // e.g., '1', '2', '3'
        },
      })
      console.log(`  + Created Coupon: ${coupon.name} (${created.id})`)
      return created
    }
    throw error
  }
}

// ================================================================
// メイン処理
// ================================================================

async function main() {
  console.log('=== Stripe Setup: ミエルボード for 現場 v2.0 ===\n')

  // 1. サブスクリプションプラン
  console.log('📦 サブスクリプションプラン:')
  for (const plan of PLANS) {
    const product = await findOrCreateProduct(
      plan.lookupKey,
      plan.name,
      plan.description,
      plan.metadata
    )

    // 月額 Price
    await findOrCreateRecurringPrice(product.id, plan.monthlyPrice, 'month', plan.lookupKey)

    // 年額 Price（存在する場合のみ）
    if (plan.annualPrice) {
      await findOrCreateRecurringPrice(product.id, plan.annualPrice, 'year', plan.lookupKey)
    }
  }

  // 2. AI クレジット追加パック（買い切り）
  console.log('\n🤖 AI クレジットパック（買い切り）:')
  for (const pack of CREDIT_PACKS) {
    const product = await findOrCreateProduct(
      pack.lookupKey,
      pack.name,
      pack.description,
      pack.metadata
    )

    await findOrCreateOneTimePrice(product.id, pack.price, pack.lookupKey)
  }

  // 3. ローンチ割引クーポン
  console.log('\n🎫 ローンチ割引クーポン（グランドファザリング）:')
  for (const coupon of COUPONS) {
    await findOrCreateCoupon(coupon)
  }

  // 4. 設定案内
  console.log('\n📋 手動設定が必要:')
  console.log('  1. Stripe Dashboard → Settings → Customer Portal を有効化')
  console.log('  2. Webhook エンドポイントを登録:')
  console.log('     URL: https://<your-domain>/api/billing/webhook')
  console.log('     Events: checkout.session.completed, customer.subscription.updated,')
  console.log('             customer.subscription.deleted, invoice.paid, invoice.payment_failed,')
  console.log('             payment_intent.succeeded (クレジットパック購入用)')
  console.log('\n✅ セットアップ完了')
}

main().catch(console.error)
