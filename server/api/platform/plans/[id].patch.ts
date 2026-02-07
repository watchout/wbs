/**
 * プラン設定更新 API
 *
 * PATCH /api/platform/plans/:id
 *
 * プラットフォーム管理者専用。
 * 価格、ユーザー上限、AIクレジット数、機能ON/OFF等を更新。
 */

import { createError, readBody } from 'h3'
import { requirePlatformAdmin } from '~/server/utils/requirePlatformAdmin'
import { prisma } from '~/server/utils/prisma'
import { clearPlanConfigCache } from '~/server/utils/stripe'

interface PlanUpdateBody {
  name?: string
  description?: string
  monthlyPrice?: number
  annualPrice?: number | null
  maxUsers?: number
  monthlyAiCredits?: number
  features?: string[]
  featureLabels?: string[]
  isRecommended?: boolean
  sortOrder?: number
  isActive?: boolean
  stripePriceIdMonthly?: string | null
  stripePriceIdAnnual?: string | null
}

export default defineEventHandler(async (event) => {
  await requirePlatformAdmin(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'プランIDが指定されていません',
    })
  }

  const body = await readBody<PlanUpdateBody>(event)

  // プランの存在確認
  const existingPlan = await prisma.planConfig.findUnique({
    where: { id },
  })

  if (!existingPlan) {
    throw createError({
      statusCode: 404,
      message: 'プランが見つかりません',
    })
  }

  // 許可されたフィールドのみ更新
  const updateData: PlanUpdateBody = {}

  if (body.name !== undefined) updateData.name = body.name
  if (body.description !== undefined) updateData.description = body.description
  if (body.monthlyPrice !== undefined) updateData.monthlyPrice = body.monthlyPrice
  if (body.annualPrice !== undefined) updateData.annualPrice = body.annualPrice
  if (body.maxUsers !== undefined) updateData.maxUsers = body.maxUsers
  if (body.monthlyAiCredits !== undefined) updateData.monthlyAiCredits = body.monthlyAiCredits
  if (body.features !== undefined) updateData.features = body.features
  if (body.featureLabels !== undefined) updateData.featureLabels = body.featureLabels
  if (body.isRecommended !== undefined) updateData.isRecommended = body.isRecommended
  if (body.sortOrder !== undefined) updateData.sortOrder = body.sortOrder
  if (body.isActive !== undefined) updateData.isActive = body.isActive
  if (body.stripePriceIdMonthly !== undefined) updateData.stripePriceIdMonthly = body.stripePriceIdMonthly
  if (body.stripePriceIdAnnual !== undefined) updateData.stripePriceIdAnnual = body.stripePriceIdAnnual

  const updatedPlan = await prisma.planConfig.update({
    where: { id },
    data: updateData,
  })

  // キャッシュをクリア
  clearPlanConfigCache()

  return { plan: updatedPlan }
})
