/**
 * ログインAPI
 *
 * POST /api/auth/login
 *
 * メール + パスワード認証
 * - passwordHash 未設定ユーザーはログイン不可（401）
 * - 初回パスワード設定は /api/auth/set-password を使用
 */

import { readBody, setCookie, createError } from 'h3'
import { prisma } from '~/server/utils/prisma'
import { createSession, sessionCookieOptions } from '~/server/utils/session'
import { verifyPassword } from '~/server/utils/password'

interface LoginRequest {
  email: string
  password?: string
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
    slug: string
  }
}

// 組織名からslugを生成（MVP: 簡易実装）
function generateSlug(name: string): string {
  if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(name)) {
    return 'demo'
  }
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

export default defineEventHandler(async (event): Promise<LoginResponse> => {
  const body = await readBody<LoginRequest>(event)

  if (!body.email) {
    throw createError({
      statusCode: 400,
      statusMessage: 'メールアドレスは必須です'
    })
  }

  const user = await prisma.user.findUnique({
    where: { email: body.email },
    include: {
      organization: true
    }
  })

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: '認証に失敗しました'
    })
  }

  if (!user.organization) {
    throw createError({
      statusCode: 401,
      statusMessage: '組織が設定されていません'
    })
  }

  // パスワード検証
  if (!user.passwordHash) {
    // 内部ログのみ（本番ではログレベル調整）
    console.info(`[login] User ${user.id} has no password set`)
    throw createError({
      statusCode: 401,
      statusMessage: '認証に失敗しました'
    })
  }

  if (!body.password) {
    throw createError({
      statusCode: 400,
      statusMessage: 'パスワードは必須です'
    })
  }

  const valid = await verifyPassword(body.password, user.passwordHash)
  if (!valid) {
    throw createError({
      statusCode: 401,
      statusMessage: '認証に失敗しました'
    })
  }

  const sessionId = createSession({
    userId: user.id,
    organizationId: user.organizationId!,
    email: user.email,
    role: user.role
  })

  setCookie(event, 'session_id', sessionId, sessionCookieOptions)

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
      name: user.organization.name,
      slug: generateSlug(user.organization.name)
    }
  }
})
