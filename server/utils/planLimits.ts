/**
 * プラン制限ガード
 *
 * SSOT_PRICING.md に基づき、プラン別の機能制限を適用する。
 * 各APIエンドポイントで呼び出して使用する。
 *
 * 注: DB ベースの設定を使用。getPlanLimits() で PlanConfig テーブルから取得。
 */

import { createError } from 'h3'
import { prisma } from './prisma'
import { PLAN_LIMITS, getPlanLimits, type PlanTypeKey } from './stripe'
import type { PlanType } from '@prisma/client'

/**
 * ユーザー数上限チェック
 * ユーザー作成時に呼び出す
 */
export async function checkUserLimit(organizationId: string): Promise<void> {
  const subscription = await prisma.subscription.findUnique({
    where: { organizationId },
  })

  // サブスクリプションなし → 制限なし（トライアル/フリー）
  if (!subscription) return

  // 解約済みは新規作成を拒否
  if (subscription.status === 'CANCELED') {
    throw createError({
      statusCode: 403,
      message: 'サブスクリプションが解約されています。新しいユーザーを追加するにはプランを再契約してください。',
    })
  }

  // 現在のアクティブユーザー数をカウント（ソフトデリート済みを除く）
  const activeUserCount = await prisma.user.count({
    where: {
      organizationId,
      deletedAt: null,
      role: { not: 'DEVICE' }, // デバイスアカウントは除く
    },
  })

  if (activeUserCount >= subscription.maxUsers) {
    throw createError({
      statusCode: 403,
      message: `ユーザー数が上限（${subscription.maxUsers}名）に達しています。プランをアップグレードしてください。`,
    })
  }
}

/**
 * プラン別機能ゲート
 * 特定の機能を使おうとした時に呼び出す
 */
export async function requirePlanFeature(
  organizationId: string,
  feature: string
): Promise<void> {
  const subscription = await prisma.subscription.findUnique({
    where: { organizationId },
  })

  // サブスクリプションなし → 基本機能のみ
  if (!subscription) {
    const starterLimits = await getPlanLimits('STARTER')
    const starterFeatures: readonly string[] = starterLimits?.features || PLAN_LIMITS.STARTER.features
    if (!starterFeatures.includes(feature)) {
      throw createError({
        statusCode: 403,
        message: `この機能を使用するにはプランへの加入が必要です。`,
      })
    }
    return
  }

  // 解約済みはすべての機能を制限
  if (subscription.status === 'CANCELED' || subscription.status === 'UNPAID') {
    throw createError({
      statusCode: 403,
      message: 'サブスクリプションが無効です。プランを再契約してください。',
    })
  }

  const planType = subscription.planType as PlanTypeKey
  const planLimits = await getPlanLimits(subscription.planType)
  const allowedFeatures: readonly string[] = planLimits?.features || PLAN_LIMITS[planType]?.features || []

  if (!allowedFeatures.includes(feature)) {
    throw createError({
      statusCode: 403,
      message: `この機能は現在のプラン（${planType}）では利用できません。プランをアップグレードしてください。`,
    })
  }
}

/**
 * AI クレジットが利用可能かチェック
 * AI 機能呼び出し前に呼び出す
 */
export async function checkAiCreditAvailable(organizationId: string): Promise<void> {
  const creditBalance = await prisma.aiCreditBalance.findUnique({
    where: { organizationId },
  })

  if (!creditBalance) {
    throw createError({
      statusCode: 403,
      message: 'AI機能を使用するにはプランへの加入が必要です。',
    })
  }

  // 無制限の場合はOK
  if (creditBalance.monthlyGrant === -1) return

  if (creditBalance.balance <= 0) {
    throw createError({
      statusCode: 402,
      message: 'AIクレジットが不足しています。追加パックをご購入ください。',
    })
  }
}

/**
 * 現在のプラン情報を取得するヘルパー
 */
export async function getCurrentPlan(organizationId: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { organizationId },
  })

  if (!subscription) {
    const starterLimits = await getPlanLimits('STARTER')
    return {
      planType: null as PlanType | null,
      status: null,
      maxUsers: starterLimits?.maxUsers || 10,
      features: [...(starterLimits?.features || PLAN_LIMITS.STARTER.features)] as string[],
    }
  }

  const planType = subscription.planType as PlanTypeKey
  const planLimits = await getPlanLimits(subscription.planType)
  return {
    planType: subscription.planType,
    status: subscription.status,
    maxUsers: subscription.maxUsers,
    features: [...(planLimits?.features || PLAN_LIMITS[planType]?.features || [])] as string[],
  }
}
