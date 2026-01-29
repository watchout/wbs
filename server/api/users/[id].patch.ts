/**
 * ユーザー更新API
 *
 * PATCH /api/users/:id
 */

import { readBody, createError, getRouterParam } from 'h3'
import { prisma } from '~/server/utils/prisma'
import { requireAuth, requireAdmin } from '~/server/utils/authMiddleware'

interface UpdateUserRequest {
  name?: string
  role?: string
  departmentId?: string | null
}

interface UpdateUserResponse {
  success: boolean
  user: {
    id: string
    email: string
    name: string | null
    role: string
    departmentId: string | null
  }
}

export default defineEventHandler(async (event): Promise<UpdateUserResponse> => {
  const auth = await requireAuth(event)
  requireAdmin(auth)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ユーザーIDは必須です'
    })
  }

  const existing = await prisma.user.findFirst({
    where: {
      id,
      organizationId: auth.organizationId
    }
  })

  if (!existing) {
    throw createError({
      statusCode: 404,
      statusMessage: 'ユーザーが見つかりません'
    })
  }

  const body = await readBody<UpdateUserRequest>(event)

  // departmentId の組織チェック
  if (body.departmentId) {
    const dept = await prisma.department.findFirst({
      where: {
        id: body.departmentId,
        organizationId: auth.organizationId
      }
    })
    if (!dept) {
      throw createError({
        statusCode: 400,
        statusMessage: '指定された部署が見つかりません'
      })
    }
  }

  const validRoles = ['ADMIN', 'MEMBER'] as const
  type ValidRole = typeof validRoles[number]

  const user = await prisma.user.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name?.trim() || null }),
      ...(body.role && (validRoles as readonly string[]).includes(body.role) && { role: body.role as ValidRole }),
      ...(body.departmentId !== undefined && { departmentId: body.departmentId ?? null })
    }
  })

  return {
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      departmentId: user.departmentId
    }
  }
})
