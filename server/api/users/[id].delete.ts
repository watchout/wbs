/**
 * ユーザー削除API
 *
 * DELETE /api/users/:id
 */

import { createError, getRouterParam } from 'h3'
import { prisma } from '~/server/utils/prisma'
import { requireAuth, requireAdmin } from '~/server/utils/authMiddleware'

interface DeleteUserResponse {
  success: boolean
  message: string
}

export default defineEventHandler(async (event): Promise<DeleteUserResponse> => {
  const auth = await requireAuth(event)
  requireAdmin(auth)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ユーザーIDは必須です'
    })
  }

  // 自分自身は削除不可
  if (id === auth.userId) {
    throw createError({
      statusCode: 400,
      statusMessage: '自分自身は削除できません'
    })
  }

  const existing = await prisma.user.findFirst({
    where: {
      id,
      organizationId: auth.organizationId,
      deletedAt: null  // ソフトデリート済みは除外
    }
  })

  if (!existing) {
    throw createError({
      statusCode: 404,
      statusMessage: 'ユーザーが見つかりません'
    })
  }

  // ソフトデリート（物理削除ではなく論理削除）
  await prisma.user.update({
    where: { id },
    data: { deletedAt: new Date() }
  })

  return {
    success: true,
    message: 'ユーザーを削除しました'
  }
})
