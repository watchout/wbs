/**
 * プラットフォーム管理者権限チェック
 *
 * 全契約（Organization）を横断して管理できる権限。
 * 「ミエルプラス運営」Organization のプラットフォーム管理者のみ使用可能。
 */

import { createError, type H3Event } from 'h3'
import { requireAuth, type AuthContext } from './authMiddleware'
import { prisma } from './prisma'

export interface PlatformAdminContext extends AuthContext {
  isPlatformAdmin: true
}

/**
 * プラットフォーム管理者権限を要求する
 *
 * 1. requireAuth() で認証済みであることを確認
 * 2. User の isPlatformAdmin フラグを DB から確認
 * 3. isPlatformAdmin !== true → 403 エラー
 */
export async function requirePlatformAdmin(event: H3Event): Promise<PlatformAdminContext> {
  // 通常の認証チェック
  const authContext = await requireAuth(event)

  if (!authContext.userId) {
    throw createError({
      statusCode: 403,
      message: 'プラットフォーム管理者権限が必要です',
    })
  }

  // DB から isPlatformAdmin を確認
  const user = await prisma.user.findUnique({
    where: { id: authContext.userId },
    select: { isPlatformAdmin: true },
  })

  if (!user || user.isPlatformAdmin !== true) {
    throw createError({
      statusCode: 403,
      message: 'プラットフォーム管理者権限が必要です',
    })
  }

  return {
    ...authContext,
    isPlatformAdmin: true,
  }
}
