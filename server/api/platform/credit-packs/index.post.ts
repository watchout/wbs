/**
 * クレジットパック設定追加 API
 *
 * POST /api/platform/credit-packs
 *
 * プラットフォーム管理者専用。
 */

import { createError, readBody } from 'h3'
import { requirePlatformAdmin } from '~/server/utils/requirePlatformAdmin'
import { prisma } from '~/server/utils/prisma'

interface CreditPackCreateBody {
  name: string
  credits: number
  price: number
  stripePriceId?: string
  sortOrder?: number
  isActive?: boolean
}

export default defineEventHandler(async (event) => {
  await requirePlatformAdmin(event)

  const body = await readBody<CreditPackCreateBody>(event)

  // バリデーション
  if (!body.name || body.name.trim() === '') {
    throw createError({
      statusCode: 400,
      message: 'パック名は必須です',
    })
  }

  if (typeof body.credits !== 'number' || body.credits <= 0) {
    throw createError({
      statusCode: 400,
      message: 'クレジット数は正の整数である必要があります',
    })
  }

  if (typeof body.price !== 'number' || body.price < 0) {
    throw createError({
      statusCode: 400,
      message: '価格は0以上の整数である必要があります',
    })
  }

  // 最大 sortOrder を取得
  const maxSortOrder = await prisma.creditPackConfig.aggregate({
    _max: { sortOrder: true },
  })

  const creditPack = await prisma.creditPackConfig.create({
    data: {
      name: body.name.trim(),
      credits: body.credits,
      price: body.price,
      stripePriceId: body.stripePriceId || null,
      sortOrder: body.sortOrder ?? (maxSortOrder._max.sortOrder ?? 0) + 1,
      isActive: body.isActive ?? true,
    },
  })

  return { creditPack }
})
