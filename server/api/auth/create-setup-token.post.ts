/**
 * セットアップトークン発行API
 *
 * POST /api/auth/create-setup-token
 *
 * ADMIN専用。指定ユーザーに初回パスワード設定用トークンを発行する。
 */

import { readBody, createError } from 'h3'
import { prisma } from '~/server/utils/prisma'
import { requireAuth, requireAdmin } from '~/server/utils/authMiddleware'
import { randomUUID } from 'crypto'

interface CreateSetupTokenRequest {
  userId: string
}

interface CreateSetupTokenResponse {
  success: boolean
  setupToken: string
  expiresAt: string
}

const TOKEN_EXPIRY_HOURS = 24

export default defineEventHandler(async (event): Promise<CreateSetupTokenResponse> => {
  const auth = await requireAuth(event)
  requireAdmin(auth)

  const body = await readBody<CreateSetupTokenRequest>(event)

  if (!body.userId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ユーザーIDは必須です'
    })
  }

  // 同一組織のユーザーか確認
  const user = await prisma.user.findFirst({
    where: {
      id: body.userId,
      organizationId: auth.organizationId
    }
  })

  if (!user) {
    throw createError({
      statusCode: 404,
      statusMessage: 'ユーザーが見つかりません'
    })
  }

  if (user.passwordHash) {
    throw createError({
      statusCode: 400,
      statusMessage: 'このユーザーは既にパスワードが設定されています'
    })
  }

  const setupToken = randomUUID()
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000)

  await prisma.user.update({
    where: { id: body.userId },
    data: {
      setupToken,
      setupTokenExpiry: expiresAt
    }
  })

  return {
    success: true,
    setupToken,
    expiresAt: expiresAt.toISOString()
  }
})
