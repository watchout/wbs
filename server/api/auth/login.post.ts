/**
 * ログインAPI
 *
 * POST /api/auth/login
 *
 * メール + パスワード認証
 * - passwordHash 未設定ユーザーはログイン不可（401）
 * - 初回パスワード設定は /api/auth/set-password を使用
 * - AUTH-001 AC5: ログイン失敗5回でアカウントロック（15分間）
 * - SEC-003: IPベースのレート制限（10 req/分）
 */

import { readBody, setCookie, createError, setHeader } from 'h3'
import { prisma } from '~/server/utils/prisma'
import { createSession, sessionCookieOptions } from '~/server/utils/session'
import { verifyPassword } from '~/server/utils/password'
import { checkRateLimit, getClientIp, LOGIN_RATE_LIMIT } from '~/server/utils/rateLimit'

// アカウントロック設定
const MAX_LOGIN_ATTEMPTS = 5
const LOCK_DURATION_MINUTES = 15

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
  // SEC-003: レート制限チェック（ブルートフォース対策）
  const clientIp = getClientIp(event)
  const rateLimitResult = checkRateLimit(clientIp, LOGIN_RATE_LIMIT)

  if (!rateLimitResult.allowed) {
    setHeader(event, 'Retry-After', rateLimitResult.retryAfterSeconds)
    console.warn(`[login] Rate limit exceeded for IP: ${clientIp}`)
    throw createError({
      statusCode: 429,
      statusMessage: `リクエストが多すぎます。${rateLimitResult.retryAfterSeconds}秒後に再試行してください`
    })
  }

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

  // アカウントロックチェック
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const remainingMinutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000)
    throw createError({
      statusCode: 423,
      statusMessage: `アカウントがロックされています。${remainingMinutes}分後に再試行してください`
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
    // ログイン失敗: 試行回数をインクリメント
    const newAttempts = user.loginAttempts + 1
    const updateData: { loginAttempts: number; lockedUntil?: Date } = {
      loginAttempts: newAttempts
    }

    // 5回目の失敗でアカウントロック
    if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
      updateData.lockedUntil = new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000)
      console.warn(`[login] Account locked: ${user.email} after ${newAttempts} failed attempts`)
    }

    await prisma.user.update({
      where: { id: user.id },
      data: updateData
    })

    if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
      throw createError({
        statusCode: 423,
        statusMessage: `アカウントがロックされました。${LOCK_DURATION_MINUTES}分後に再試行してください`
      })
    }

    throw createError({
      statusCode: 401,
      statusMessage: '認証に失敗しました'
    })
  }

  // ログイン成功: 試行回数をリセット
  if (user.loginAttempts > 0 || user.lockedUntil) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        loginAttempts: 0,
        lockedUntil: null
      }
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
