/**
 * 部署削除API
 * 
 * DELETE /api/departments/:id
 */

import { createError } from 'h3'
import { prisma } from '~/server/utils/prisma'
import { requireAuth, requireAdmin } from '~/server/utils/authMiddleware'

interface DeleteDepartmentResponse {
  success: boolean
  message: string
}

export default defineEventHandler(async (event): Promise<DeleteDepartmentResponse> => {
  const auth = await requireAuth(event)
  requireAdmin(auth)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: '部署IDは必須です'
    })
  }

  // 存在確認・所有権確認
  const existing = await prisma.department.findFirst({
    where: {
      id,
      organizationId: auth.organizationId
    },
    include: {
      _count: {
        select: { users: true }
      }
    }
  })

  if (!existing) {
    throw createError({
      statusCode: 404,
      statusMessage: '部署が見つかりません'
    })
  }

  // 所属ユーザーがいる場合は削除不可
  if (existing._count.users > 0) {
    throw createError({
      statusCode: 409,
      statusMessage: `この部署には${existing._count.users}名のユーザーが所属しています。先にユーザーの部署を変更してください。`
    })
  }

  await prisma.department.delete({
    where: { id }
  })

  return {
    success: true,
    message: '部署を削除しました'
  }
})
