import { prisma } from './prisma'
import type { CreditTransactionType } from '@prisma/client'

/**
 * AI クレジット管理ユーティリティ
 *
 * SSOT_PRICING.md Section 2-2 準拠:
 * - プラン付属クレジット: Business 50回/月, Enterprise 無制限
 * - 追加パック: Light +50, Standard +150, Pro +400
 * - 月次リセット: プラン付属分のみリセット、パック分は繰り越し
 */

export interface CreditUsageResult {
  success: boolean
  balanceAfter: number
  error?: string
}

/**
 * AI クレジットを1消費する
 */
export async function useAiCredit(
  organizationId: string,
  description: string = 'AI機能使用'
): Promise<CreditUsageResult> {
  // トランザクションで残高チェック + 消費を原子的に行う
  return await prisma.$transaction(async (tx) => {
    const creditBalance = await tx.aiCreditBalance.findUnique({
      where: { organizationId },
    })

    if (!creditBalance) {
      return {
        success: false,
        balanceAfter: 0,
        error: 'クレジット残高が設定されていません。プランをご確認ください。',
      }
    }

    // 無制限チェック（monthlyGrant = -1 は無制限）
    if (creditBalance.monthlyGrant === -1) {
      // 無制限の場合、トランザクションだけ記録して残高は変えない
      await tx.aiCreditTransaction.create({
        data: {
          organizationId,
          type: 'USAGE',
          amount: -1,
          balanceAfter: -1, // 無制限を示す
          description,
        },
      })
      return { success: true, balanceAfter: -1 }
    }

    // 残高チェック
    if (creditBalance.balance <= 0) {
      return {
        success: false,
        balanceAfter: 0,
        error: 'AIクレジットが不足しています。追加パックをご購入ください。',
      }
    }

    // 残高を1減らす
    const updated = await tx.aiCreditBalance.update({
      where: { organizationId },
      data: { balance: { decrement: 1 } },
    })

    // トランザクション記録
    await tx.aiCreditTransaction.create({
      data: {
        organizationId,
        type: 'USAGE',
        amount: -1,
        balanceAfter: updated.balance,
        description,
      },
    })

    return { success: true, balanceAfter: updated.balance }
  })
}

/**
 * AI クレジット残高を取得する
 */
export async function getAiCreditBalance(organizationId: string) {
  const balance = await prisma.aiCreditBalance.findUnique({
    where: { organizationId },
  })

  if (!balance) {
    return { balance: 0, monthlyGrant: 0, packCredits: 0, isUnlimited: false }
  }

  return {
    balance: balance.balance,
    monthlyGrant: balance.monthlyGrant,
    packCredits: balance.packCredits,
    isUnlimited: balance.monthlyGrant === -1,
    lastResetAt: balance.lastResetAt,
  }
}

/**
 * 月次クレジットリセット（invoice.paid webhook で呼び出し）
 *
 * ルール:
 * - プラン付属分は全額リセット（未使用分は失効）
 * - 追加パック分は繰り越し（リセットしない）
 */
export async function resetMonthlyCredits(organizationId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const creditBalance = await tx.aiCreditBalance.findUnique({
      where: { organizationId },
    })

    if (!creditBalance || creditBalance.monthlyGrant === -1) {
      return // 無制限または残高なし
    }

    const newBalance = creditBalance.monthlyGrant + creditBalance.packCredits

    await tx.aiCreditBalance.update({
      where: { organizationId },
      data: {
        balance: newBalance,
        lastResetAt: new Date(),
      },
    })

    await tx.aiCreditTransaction.create({
      data: {
        organizationId,
        type: 'MONTHLY_GRANT',
        amount: creditBalance.monthlyGrant,
        balanceAfter: newBalance,
        description: `月次クレジット付与: ${creditBalance.monthlyGrant}回`,
      },
    })
  })
}

/**
 * 追加パック購入時のクレジット付与
 */
export async function grantPackCredits(
  organizationId: string,
  credits: number,
  packName: string,
  stripeInvoiceId?: string
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const updated = await tx.aiCreditBalance.upsert({
      where: { organizationId },
      create: {
        organizationId,
        balance: credits,
        monthlyGrant: 0,
        packCredits: credits,
      },
      update: {
        balance: { increment: credits },
        packCredits: { increment: credits },
      },
    })

    await tx.aiCreditTransaction.create({
      data: {
        organizationId,
        type: 'PACK_PURCHASE',
        amount: credits,
        balanceAfter: updated.balance,
        description: `追加パック購入: ${packName}`,
        relatedId: stripeInvoiceId,
      },
    })
  })
}

/**
 * サブスクリプション作成/変更時のクレジット初期化
 */
export async function initializeCredits(
  organizationId: string,
  monthlyGrant: number
): Promise<void> {
  await prisma.aiCreditBalance.upsert({
    where: { organizationId },
    create: {
      organizationId,
      balance: monthlyGrant === -1 ? 0 : monthlyGrant,
      monthlyGrant,
      packCredits: 0,
    },
    update: {
      monthlyGrant,
      balance: monthlyGrant === -1 ? 0 : monthlyGrant,
    },
  })
}

/**
 * クレジット使用履歴を取得する
 */
export async function getCreditHistory(
  organizationId: string,
  limit: number = 50,
  offset: number = 0
) {
  return await prisma.aiCreditTransaction.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  })
}
