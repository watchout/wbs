/**
 * Stripe Products/Prices セットアップスクリプト
 *
 * 使い方:
 *   npx tsx scripts/stripe-setup.ts
 *
 * SSOT_PRICING.md に基づく料金体系を Stripe に作成します。
 * 冪等: 既存の Product があればスキップします。
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
// 料金マスター（SSOT_PRICING.md 準拠）
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
  monthlyPrice: number
}

const PLANS: PlanDefinition[] = [
  {
    lookupKey: 'mielboard_starter',
    name: 'ミエルボード スタータープラン',
    description: '小規模チーム向け（〜10名）。週間ボード・部門フィルタ・リアルタイム更新。',
    metadata: { planType: 'STARTER', maxUsers: '10', monthlyAiCredits: '0' },
    monthlyPrice: 9800,
    annualPrice: 98000,
  },
  {
    lookupKey: 'mielboard_business',
    name: 'ミエルボード ビジネスプラン',
    description: '中規模企業向け（〜30名）。全機能 + カレンダー連携 + AI音声入力50回/月。',
    metadata: { planType: 'BUSINESS', maxUsers: '30', monthlyAiCredits: '50' },
    monthlyPrice: 29800,
    annualPrice: 298000,
  },
  {
    lookupKey: 'mielboard_enterprise',
    name: 'ミエルボード エンタープライズプラン',
    description: '大規模企業向け（〜100名）。全モジュール + AI無制限 + 専任サポート。',
    metadata: { planType: 'ENTERPRISE', maxUsers: '100', monthlyAiCredits: '-1' },
    monthlyPrice: 59800,
    annualPrice: null, // 個別見積
  },
]

const CREDIT_PACKS: CreditPackDefinition[] = [
  {
    lookupKey: 'ai_credit_pack_light',
    name: 'AI クレジット追加パック ライト',
    description: '+50回/月',
    metadata: { credits: '50' },
    monthlyPrice: 2000,
  },
  {
    lookupKey: 'ai_credit_pack_standard',
    name: 'AI クレジット追加パック スタンダード',
    description: '+150回/月',
    metadata: { credits: '150' },
    monthlyPrice: 5000,
  },
  {
    lookupKey: 'ai_credit_pack_pro',
    name: 'AI クレジット追加パック プロ',
    description: '+400回/月',
    metadata: { credits: '400' },
    monthlyPrice: 10000,
  },
]

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

async function findOrCreatePrice(
  productId: string,
  unitAmount: number,
  interval: 'month' | 'year',
  lookupKey: string
): Promise<Stripe.Price> {
  // lookup_key で検索
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

async function main() {
  console.log('=== Stripe Setup: ミエルボード for 現場 ===\n')

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
    await findOrCreatePrice(product.id, plan.monthlyPrice, 'month', plan.lookupKey)

    // 年額 Price（存在する場合のみ）
    if (plan.annualPrice) {
      await findOrCreatePrice(product.id, plan.annualPrice, 'year', plan.lookupKey)
    }
  }

  // 2. AI クレジット追加パック
  console.log('\n🤖 AI クレジット追加パック:')
  for (const pack of CREDIT_PACKS) {
    const product = await findOrCreateProduct(
      pack.lookupKey,
      pack.name,
      pack.description,
      pack.metadata
    )

    await findOrCreatePrice(product.id, pack.monthlyPrice, 'month', pack.lookupKey)
  }

  // 3. Customer Portal の設定案内
  console.log('\n📋 手動設定が必要:')
  console.log('  1. Stripe Dashboard → Settings → Customer Portal を有効化')
  console.log('  2. Webhook エンドポイントを登録:')
  console.log('     URL: https://<your-domain>/api/billing/webhook')
  console.log('     Events: checkout.session.completed, customer.subscription.updated,')
  console.log('             customer.subscription.deleted, invoice.paid, invoice.payment_failed')
  console.log('\n✅ セットアップ完了')
}

main().catch(console.error)
