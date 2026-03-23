/**
 * セットアップトークン発行API
 *
 * POST /api/auth/create-setup-token
 *
 * ADMIN専用。指定ユーザーに初回パスワード設定用トークンを発行する。
 * - AUTH-006: forReset=true でパスワードリセット用トークンも発行可能
 */

import { readBody, createError } from 'h3'
import { prisma } from '~/server/utils/prisma'
import { requireAuth, requireAdmin } from '~/server/utils/authMiddleware'
import { randomUUID } from 'crypto'
import { sendNotification, buildPasswordResetEmail } from '~/server/utils/notification'

interface CreateSetupTokenRequest {
  userId: string
  /** パスワードリセット用（既存パスワードありでも発行可能） */
  forReset?: boolean
}

interface CreateSetupTokenResponse {
  success: boolean
  setupToken: string
  expiresAt: string
  /** パスワードリセット用かどうか */
  isReset: boolean
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

  // パスワードリセットモードでない場合は、既存パスワードがあればエラー
  if (!body.forReset && user.passwordHash) {
    throw createError({
      statusCode: 400,
      statusMessage: 'このユーザーは既にパスワードが設定されています。リセットする場合は forReset=true を指定してください'
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

  // パスワードリセット通知メール（Sprint 6: AC-N1-03）
  if (body.forReset) {
    const appUrl = process.env.NUXT_PUBLIC_APP_URL || 'https://app.mielboard.com'
    const email = buildPasswordResetEmail({
      recipientName: user.name || 'ユーザー',
      resetUrl: `${appUrl}/setup?token=${setupToken}`,
    })
    sendNotification({
      organizationId: auth.organizationId,
      recipientId: body.userId,
      channel: 'EMAIL',
      eventType: 'password_reset',
      subject: email.subject,
      body: email.body,
    })
  }

  return {
    success: true,
    setupToken,
    expiresAt: expiresAt.toISOString(),
    isReset: !!body.forReset
  }
})
