/**
 * ユーザー作成API
 *
 * POST /api/users
 */

import { readBody, createError } from 'h3'
import { prisma } from '~/server/utils/prisma'
import { requireAuth, requireAdmin } from '~/server/utils/authMiddleware'

interface CreateUserRequest {
  email: string
  name?: string
  role?: string
  departmentId?: string
}

interface CreateUserResponse {
  success: boolean
  user: {
    id: string
    email: string
    name: string | null
    role: string
    departmentId: string | null
  }
}

export default defineEventHandler(async (event): Promise<CreateUserResponse> => {
  const auth = await requireAuth(event)
  requireAdmin(auth)

  const body = await readBody<CreateUserRequest>(event)

  if (!body.email || body.email.trim() === '') {
    throw createError({
      statusCode: 400,
      statusMessage: 'メールアドレスは必須です'
    })
  }

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  if (!emailRegex.test(body.email.trim())) {
    throw createError({
      statusCode: 400,
      statusMessage: 'メールアドレスの形式が不正です'
    })
  }

  // メール重複チェック（グローバルユニーク）
  const existing = await prisma.user.findUnique({
    where: { email: body.email.trim() }
  })
  if (existing) {
    throw createError({
      statusCode: 409,
      statusMessage: 'このメールアドレスは既に登録されています'
    })
  }

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

  const validRoles = ['ADMIN', 'LEADER', 'MEMBER'] as const
  type ValidRole = typeof validRoles[number]
  const role: ValidRole = body.role && (validRoles as readonly string[]).includes(body.role)
    ? body.role as ValidRole
    : 'MEMBER'

  const user = await prisma.user.create({
    data: {
      organizationId: auth.organizationId,
      email: body.email.trim(),
      name: body.name?.trim() || null,
      role,
      departmentId: body.departmentId ?? null
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
