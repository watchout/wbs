/**
 * パスワード変更API
 *
 * POST /api/auth/change-password
 */

import { readBody, createError } from 'h3'
import { prisma } from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/authMiddleware'
import { hashPassword, verifyPassword } from '~/server/utils/password'

interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

interface ChangePasswordResponse {
  success: boolean
  message: string
}

export default defineEventHandler(async (event): Promise<ChangePasswordResponse> => {
  const auth = await requireAuth(event)

  if (!auth.userId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ユーザーIDが取得できません'
    })
  }

  const body = await readBody<ChangePasswordRequest>(event)

  if (!body.currentPassword) {
    throw createError({
      statusCode: 400,
      statusMessage: '現在のパスワードは必須です'
    })
  }

  if (!body.newPassword || body.newPassword.length < 8) {
    throw createError({
      statusCode: 400,
      statusMessage: '新しいパスワードは8文字以上で入力してください'
    })
  }

  const user = await prisma.user.findFirst({
    where: {
      id: auth.userId,
      organizationId: auth.organizationId
    }
  })

  if (!user || !user.passwordHash) {
    throw createError({
      statusCode: 400,
      statusMessage: 'パスワードが設定されていません'
    })
  }

  const valid = await verifyPassword(body.currentPassword, user.passwordHash)
  if (!valid) {
    throw createError({
      statusCode: 401,
      statusMessage: '現在のパスワードが正しくありません'
    })
  }

  const newHash = await hashPassword(body.newPassword)

  await prisma.user.update({
    where: { id: auth.userId },
    data: { passwordHash: newHash }
  })

  return {
    success: true,
    message: 'パスワードを変更しました'
  }
})
