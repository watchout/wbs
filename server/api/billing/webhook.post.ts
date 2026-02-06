/**
 * POST /api/billing/webhook
 *
 * Stripe Webhook 受信エンドポイント
 * 認証: Stripe 署名検証（requireAuth 不要）
 *
 * 処理イベント:
 * - checkout.session.completed: 新規契約完了
 * - customer.subscription.updated: プラン変更/更新
 * - customer.subscription.deleted: 解約
 * - invoice.paid: 支払い成功（月次クレジットリセット）
 * - invoice.payment_failed: 支払い失敗
 */

import { defineEventHandler, readRawBody, getHeader, createError } from 'h3'
import Stripe from 'stripe'
import { stripe, PLAN_LIMITS, type PlanTypeKey } from '~/server/utils/stripe'
import { prisma } from '~/server/utils/prisma'
import { resetMonthlyCredits, initializeCredits, grantPackCredits } from '~/server/utils/aiCredits'
import type { PlanType, SubscriptionStatus } from '@prisma/client'

export default defineEventHandler(async (event) => {
  const rawBody = await readRawBody(event)
  const signature = getHeader(event, 'stripe-signature')

  if (!rawBody || !signature) {
    throw createError({ statusCode: 400, message: 'Missing body or signature' })
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('[Stripe Webhook] STRIPE_WEBHOOK_SECRET is not configured')
    throw createError({ statusCode: 500, message: 'Webhook not configured' })
  }

  let stripeEvent: Stripe.Event

  try {
    stripeEvent = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error(`[Stripe Webhook] Signature verification failed: ${message}`)
    throw createError({ statusCode: 400, message: `Webhook signature verification failed` })
  }

  console.log(`[Stripe Webhook] Received: ${stripeEvent.type}`)

  try {
    switch (stripeEvent.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(stripeEvent.data.object as Stripe.Checkout.Session)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(stripeEvent.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(stripeEvent.data.object as Stripe.Subscription)
        break

      case 'invoice.paid':
        await handleInvoicePaid(stripeEvent.data.object as unknown as Record<string, any>)
        break

      case 'invoice.payment_failed':
        await handlePaymentFailed(stripeEvent.data.object as unknown as Record<string, any>)
        break

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${stripeEvent.type}`)
    }
  } catch (err) {
    console.error(`[Stripe Webhook] Error handling ${stripeEvent.type}:`, err)
    throw createError({ statusCode: 500, message: 'Webhook processing failed' })
  }

  return { received: true }
})

// ================================================================
// Event Handlers
// ================================================================

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (session.mode !== 'subscription' || !session.subscription) {
    return
  }

  const organizationId = session.metadata?.organizationId
  if (!organizationId) {
    console.error('[Stripe Webhook] Missing organizationId in checkout session metadata')
    return
  }

  // クレジットパック購入の場合
  if (session.metadata?.type === 'credit_pack') {
    // invoice.paid で処理するのでここではスキップ
    return
  }

  // サブスクリプション詳細を取得
  const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
  await syncSubscription(organizationId, subscription)
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const organizationId = subscription.metadata?.organizationId

  if (!organizationId) {
    // metadata がない場合、DB から検索
    const existing = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscription.id },
    })
    if (existing) {
      await syncSubscription(existing.organizationId, subscription)
    }
    return
  }

  await syncSubscription(organizationId, subscription)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId: subscription.id },
    data: {
      status: 'CANCELED',
      canceledAt: new Date(),
    },
  })

  console.log(`[Stripe Webhook] Subscription canceled: ${subscription.id}`)
}

async function handleInvoicePaid(invoice: Record<string, any>) {
  const subscriptionId = invoice.subscription
  if (!subscriptionId) return

  // サブスクリプションの organizationId を取得
  const sub = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: String(subscriptionId) },
  })

  if (!sub) return

  // クレジットパックの支払いかチェック
  const lineItems = invoice.lines?.data || []
  for (const item of lineItems) {
    const priceObj = item.price
    const product = priceObj?.product
    if (typeof product === 'string') {
      const productObj = await stripe.products.retrieve(product)
      const credits = productObj.metadata?.credits
      if (credits) {
        // クレジットパックの支払い
        await grantPackCredits(
          sub.organizationId,
          parseInt(credits, 10),
          productObj.name,
          invoice.id
        )
        console.log(`[Stripe Webhook] Credit pack granted: ${credits} credits to ${sub.organizationId}`)
      }
    }
  }

  // 通常サブスクリプションの月次更新 → クレジットリセット
  await resetMonthlyCredits(sub.organizationId)

  console.log(`[Stripe Webhook] Invoice paid, credits reset for: ${sub.organizationId}`)
}

async function handlePaymentFailed(invoice: Record<string, any>) {
  const subscriptionId = invoice.subscription
  if (!subscriptionId) return

  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId: String(subscriptionId) },
    data: { status: 'PAST_DUE' },
  })

  console.log(`[Stripe Webhook] Payment failed for subscription: ${subscriptionId}`)
}

// ================================================================
// Helpers
// ================================================================

function mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  const mapping: Record<string, SubscriptionStatus> = {
    trialing: 'TRIALING',
    active: 'ACTIVE',
    past_due: 'PAST_DUE',
    canceled: 'CANCELED',
    unpaid: 'UNPAID',
  }
  return mapping[status] || 'ACTIVE'
}

function detectPlanType(product: Stripe.Product): PlanType {
  const planType = product.metadata?.planType
  if (planType === 'STARTER' || planType === 'BUSINESS' || planType === 'ENTERPRISE') {
    return planType
  }
  // フォールバック: 名前から推定
  if (product.name.includes('スターター') || product.name.includes('Starter')) return 'STARTER'
  if (product.name.includes('エンタープライズ') || product.name.includes('Enterprise')) return 'ENTERPRISE'
  return 'BUSINESS'
}

async function syncSubscription(
  organizationId: string,
  subscription: Stripe.Subscription
) {
  const priceItem = subscription.items.data[0]
  if (!priceItem) return

  const price = priceItem.price
  const productId = typeof price.product === 'string' ? price.product : (price.product as any).id
  const product = await stripe.products.retrieve(productId)

  // クレジットパックはサブスクリプション同期の対象外
  if (product.metadata?.credits) return

  const planType = detectPlanType(product)
  const limits = PLAN_LIMITS[planType]

  // Stripe API v20+ ではプロパティ名が変わっている可能性があるため any でアクセス
  const subAny = subscription as any
  const currentPeriodStart = subAny.current_period_start ?? subAny.currentPeriodStart
  const currentPeriodEnd = subAny.current_period_end ?? subAny.currentPeriodEnd
  const trialEnd = subAny.trial_end ?? subAny.trialEnd
  const canceledAt = subAny.canceled_at ?? subAny.canceledAt

  const data = {
    stripeSubscriptionId: subscription.id,
    stripePriceId: price.id,
    planType,
    status: mapStripeStatus(subscription.status),
    maxUsers: limits.maxUsers,
    monthlyAiCredits: limits.monthlyAiCredits,
    currentPeriodStart: new Date(currentPeriodStart * 1000),
    currentPeriodEnd: new Date(currentPeriodEnd * 1000),
    trialEndsAt: trialEnd ? new Date(trialEnd * 1000) : null,
    canceledAt: canceledAt ? new Date(canceledAt * 1000) : null,
    billingInterval: price.recurring?.interval || 'month',
  }

  await prisma.subscription.upsert({
    where: { organizationId },
    create: { organizationId, ...data },
    update: data,
  })

  // クレジット初期化
  await initializeCredits(organizationId, limits.monthlyAiCredits)

  console.log(`[Stripe Webhook] Subscription synced: ${planType} for ${organizationId}`)
}
