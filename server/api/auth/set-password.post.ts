/**
 * 初回パスワード設定API
 *
 * POST /api/auth/set-password
 *
 * 認証不要。email + setupToken で検証。
 */

import { readBody, createError } from 'h3'
import { prisma } from '~/server/utils/prisma'
import { hashPassword } from '~/server/utils/password'

interface SetPasswordRequest {
  email: string
  setupToken: string
  password: string
}

interface SetPasswordResponse {
  success: boolean
  message: string
}

export default defineEventHandler(async (event): Promise<SetPasswordResponse> => {
  const body = await readBody<SetPasswordRequest>(event)

  if (!body.email || !body.setupToken || !body.password) {
    throw createError({
      statusCode: 400,
      statusMessage: 'メールアドレス、セットアップトークン、パスワードは必須です'
    })
  }

  if (body.password.length < 8) {
    throw createError({
      statusCode: 400,
      statusMessage: 'パスワードは8文字以上で入力してください'
    })
  }

  const user = await prisma.user.findUnique({
    where: { email: body.email }
  })

  if (!user) {
    throw createError({
      statusCode: 400,
      statusMessage: 'トークンが無効です'
    })
  }

  // トークン検証
  if (!user.setupToken || user.setupToken !== body.setupToken) {
    throw createError({
      statusCode: 400,
      statusMessage: 'トークンが無効です'
    })
  }

  // 期限チェック
  if (!user.setupTokenExpiry || user.setupTokenExpiry < new Date()) {
    throw createError({
      statusCode: 400,
      statusMessage: 'トークンの有効期限が切れています'
    })
  }

  // パスワード設定（初回・リセット共通）
  // setupToken が有効であれば既存パスワードの有無に関わらず設定を許可する
  // （リセット用トークンは admin が forReset=true で発行）
  const passwordHash = await hashPassword(body.password)

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      setupToken: null,
      setupTokenExpiry: null
    }
  })

  return {
    success: true,
    message: 'パスワードを設定しました'
  }
})
