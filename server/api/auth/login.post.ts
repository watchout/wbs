/**
 * ログインAPI
 * 
 * POST /api/auth/login
 * 
 * メールアドレスでログイン（Phase 0: パスワードレス簡易認証）
 */

import { readBody, setCookie, createError } from 'h3'
import { prisma } from '~/server/utils/prisma'
import {
  generateAccessToken,
  generateRefreshToken,
  accessTokenCookieOptions,
  refreshTokenCookieOptions
} from '~/server/utils/jwt'

interface LoginRequest {
  email: string
  organizationSlug?: string
}

interface LoginResponse {
  success: boolean
  user: {
    id: string
    name: string | null
    email: string
    role: string
  }
  organization: {
    id: string
    name: string
  }
}

export default defineEventHandler(async (event): Promise<LoginResponse> => {
  const body = await readBody<LoginRequest>(event)

  if (!body.email) {
    throw createError({
      statusCode: 400,
      statusMessage: 'メールアドレスは必須です'
    })
  }

  // ユーザーを検索
  const user = await prisma.user.findUnique({
    where: { email: body.email },
    include: {
      organization: true
    }
  })

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'ユーザーが見つかりません'
    })
  }

  if (!user.organization) {
    throw createError({
      statusCode: 401,
      statusMessage: '組織が設定されていません'
    })
  }

  // JWTトークン生成
  const accessToken = await generateAccessToken({
    organizationId: user.organizationId!,
    userId: user.id,
    email: user.email,
    role: user.role
  })

  const refreshToken = await generateRefreshToken({
    organizationId: user.organizationId!,
    userId: user.id
  })

  // Cookieに設定
  setCookie(event, 'access_token', accessToken, accessTokenCookieOptions)
  setCookie(event, 'refresh_token', refreshToken, refreshTokenCookieOptions)

  return {
    success: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    },
    organization: {
      id: user.organization.id,
      name: user.organization.name
    }
  }
})

