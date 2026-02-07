/**
 * コホート設定更新 API
 *
 * PATCH /api/platform/cohorts/:id
 *
 * プラットフォーム管理者専用。
 */

import { createError, readBody } from 'h3'
import { requirePlatformAdmin } from '~/server/utils/requirePlatformAdmin'
import { prisma } from '~/server/utils/prisma'
import { clearCohortConfigCache } from '~/server/utils/stripe'

interface CohortUpdateBody {
  maxOrgs?: number
  discountPercent?: number
  stripeCouponId?: string | null
  isActive?: boolean
}

export default defineEventHandler(async (event) => {
  await requirePlatformAdmin(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'コホートIDが指定されていません',
    })
  }

  const body = await readBody<CohortUpdateBody>(event)

  // 存在確認
  const existingCohort = await prisma.cohortConfig.findUnique({
    where: { id },
  })

  if (!existingCohort) {
    throw createError({
      statusCode: 404,
      message: 'コホートが見つかりません',
    })
  }

  // 許可されたフィールドのみ更新
  const updateData: CohortUpdateBody = {}

  if (body.maxOrgs !== undefined) updateData.maxOrgs = body.maxOrgs
  if (body.discountPercent !== undefined) updateData.discountPercent = body.discountPercent
  if (body.stripeCouponId !== undefined) updateData.stripeCouponId = body.stripeCouponId
  if (body.isActive !== undefined) updateData.isActive = body.isActive

  const updatedCohort = await prisma.cohortConfig.update({
    where: { id },
    data: updateData,
  })

  // キャッシュをクリア
  clearCohortConfigCache()

  return { cohort: updatedCohort }
})
