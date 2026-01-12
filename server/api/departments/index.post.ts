/**
 * 部署作成API
 * 
 * POST /api/departments
 */

import { readBody, createError } from 'h3'
import { prisma } from '~/server/utils/prisma'
import { requireAuth, requireAdmin } from '~/server/utils/authMiddleware'

interface CreateDepartmentRequest {
  name: string
  color?: string
  sortOrder?: number
}

interface CreateDepartmentResponse {
  success: boolean
  department: {
    id: string
    name: string
    color: string | null
    sortOrder: number
  }
}

export default defineEventHandler(async (event): Promise<CreateDepartmentResponse> => {
  const auth = await requireAuth(event)
  requireAdmin(auth)

  const body = await readBody<CreateDepartmentRequest>(event)

  if (!body.name || body.name.trim() === '') {
    throw createError({
      statusCode: 400,
      statusMessage: '部署名は必須です'
    })
  }

  // 重複チェック
  const existing = await prisma.department.findFirst({
    where: {
      organizationId: auth.organizationId,
      name: body.name.trim()
    }
  })

  if (existing) {
    throw createError({
      statusCode: 409,
      statusMessage: 'この部署名は既に存在します'
    })
  }

  const department = await prisma.department.create({
    data: {
      organizationId: auth.organizationId,
      name: body.name.trim(),
      color: body.color || null,
      sortOrder: body.sortOrder ?? 0
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
