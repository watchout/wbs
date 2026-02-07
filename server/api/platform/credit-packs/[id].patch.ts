/**
 * クレジットパック設定更新 API
 *
 * PATCH /api/platform/credit-packs/:id
 *
 * プラットフォーム管理者専用。
 */

import { createError, readBody } from 'h3'
import { requirePlatformAdmin } from '~/server/utils/requirePlatformAdmin'
import { prisma } from '~/server/utils/prisma'

interface CreditPackUpdateBody {
  name?: string
  credits?: number
  price?: number
  stripePriceId?: string | null
  sortOrder?: number
  isActive?: boolean
}

export default defineEventHandler(async (event) => {
  await requirePlatformAdmin(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'パックIDが指定されていません',
    })
  }

  const body = await readBody<CreditPackUpdateBody>(event)

  // 存在確認
  const existingPack = await prisma.creditPackConfig.findUnique({
    where: { id },
  })

  if (!existingPack) {
    throw createError({
      statusCode: 404,
      message: 'クレジットパックが見つかりません',
    })
  }

  // 許可されたフィールドのみ更新
  const updateData: CreditPackUpdateBody = {}

  if (body.name !== undefined) updateData.name = body.name
  if (body.credits !== undefined) updateData.credits = body.credits
  if (body.price !== undefined) updateData.price = body.price
  if (body.stripePriceId !== undefined) updateData.stripePriceId = body.stripePriceId
  if (body.sortOrder !== undefined) updateData.sortOrder = body.sortOrder
  if (body.isActive !== undefined) updateData.isActive = body.isActive

  const updatedPack = await prisma.creditPackConfig.update({
    where: { id },
    data: updateData,
  })

  return { creditPack: updatedPack }
})
