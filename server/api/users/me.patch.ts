/**
 * プロフィール更新API
 *
 * PATCH /api/users/me
 *
 * 自分のプロフィール（名前）を更新
 */

import { readBody, createError } from 'h3'
import { prisma } from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/authMiddleware'

interface ProfileUpdateRequest {
  name: string
}

interface ProfileUpdateResponse {
  success: boolean
  user: {
    id: string
    name: string
    email: string
  }
}

export default defineEventHandler(async (event): Promise<ProfileUpdateResponse> => {
  const auth = await requireAuth(event)

  if (!auth.userId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ユーザーIDが取得できません'
    })
  }

  const body = await readBody<ProfileUpdateRequest>(event)

  // バリデーション
  if (typeof body.name !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: '名前は必須です'
    })
  }

  const trimmedName = body.name.trim()

  if (!trimmedName) {
    throw createError({
      statusCode: 400,
      statusMessage: '名前を入力してください'
    })
  }

  if (trimmedName.length > 100) {
    throw createError({
      statusCode: 400,
      statusMessage: '名前は100文字以内で入力してください'
    })
  }

  // マルチテナント境界を守ってユーザー更新
  const user = await prisma.user.update({
    where: {
      id: auth.userId,
      organizationId: auth.organizationId
    },
    data: {
      name: trimmedName
    },
    select: {
      id: true,
      name: true,
      email: true
    }
  })

  return {
    success: true,
    user: {
      id: user.id,
      name: user.name || '',
      email: user.email
    }
  }
})
