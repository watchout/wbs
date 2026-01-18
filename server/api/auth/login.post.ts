/**
 * ログインAPI
 * 
 * POST /api/auth/login
 * 
 * メールアドレスでログイン（MVP: パスワードレス簡易認証）
 */

import { readBody, setCookie, createError } from 'h3'
import { prisma } from '~/server/utils/prisma'
import { createSession, sessionCookieOptions } from '~/server/utils/session'

interface LoginRequest {
  email: string
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
  // 日本語名の場合は "demo" を返す（デモ用途）
  if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(name)) {
    return 'demo'
  }
  // 英語名の場合はkebab-caseに変換
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

  // セッション作成
  const sessionId = createSession({
    userId: user.id,
    organizationId: user.organizationId!,
    email: user.email,
    role: user.role
  })

  // セッションCookieを設定
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
