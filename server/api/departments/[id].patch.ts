/**
 * 部署更新API
 * 
 * PATCH /api/departments/:id
 */

import { readBody, createError } from 'h3'
import { prisma } from '~/server/utils/prisma'
import { requireAuth, requireAdmin } from '~/server/utils/authMiddleware'

interface UpdateDepartmentRequest {
  name?: string
  color?: string | null
  sortOrder?: number
}

interface UpdateDepartmentResponse {
  success: boolean
  department: {
    id: string
    name: string
    color: string | null
    sortOrder: number
  }
}

export default defineEventHandler(async (event): Promise<UpdateDepartmentResponse> => {
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
    }
  })

  if (!existing) {
    throw createError({
      statusCode: 404,
      statusMessage: '部署が見つかりません'
    })
  }

  const body = await readBody<UpdateDepartmentRequest>(event)

  // 名前変更時の重複チェック
  if (body.name && body.name.trim() !== existing.name) {
    const duplicate = await prisma.department.findFirst({
      where: {
        organizationId: auth.organizationId,
        name: body.name.trim(),
        NOT: { id }
      }
    })

    if (duplicate) {
      throw createError({
        statusCode: 409,
        statusMessage: 'この部署名は既に存在します'
      })
    }
  }

  const department = await prisma.department.update({
    where: { id },
    data: {
      ...(body.name && { name: body.name.trim() }),
      ...(body.color !== undefined && { color: body.color }),
      ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder })
    }
  })

  return {
    success: true,
    department: {
      id: department.id,
      name: department.name,
      color: department.color,
      sortOrder: department.sortOrder
    }
  }
})
