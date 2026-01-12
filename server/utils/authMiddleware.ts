/**
 * 認証ミドルウェア
 * 
 * MVP向けシンプルなセッションCookie認証
 * - サーバー側でセッション管理
 * - ログアウト即時反映
 * - 開発モードではクエリパラメータでバイパス可能
 */

import { createError, getQuery, getHeaders, getCookie, type H3Event } from 'h3'
import { getSession } from './session'

export interface AuthContext {
  /**
   * マルチテナント境界の要。全APIで必須。
   */
  organizationId: string
  userId?: string
  email?: string
  role?: string
  isDevice?: boolean
}

/**
 * 認証必須API用。
 * 
 * 認証順序:
 * 1. セッションCookie (session_id)
 * 2. 開発モード: クエリパラメータ/ヘッダー (organizationId)
 */
export async function requireAuth(event: H3Event): Promise<AuthContext> {
  // 1. セッションCookieから認証
  const sessionId = getCookie(event, 'session_id')
  if (sessionId) {
    const session = getSession(sessionId)
    if (session) {
      return {
        organizationId: session.organizationId,
        userId: session.userId,
        email: session.email,
        role: session.role,
        isDevice: !!session.deviceId
      }
    }
  }

  // 2. 開発モード: クエリパラメータまたはヘッダーからorganizationIdを取得
  if (process.env.NODE_ENV !== 'production') {
    const query = getQuery(event)
    const headers = getHeaders(event)
    
    const organizationId = 
      (query.organizationId as string) ||
      (headers['x-organization-id'] as string) ||
      process.env.DEFAULT_ORGANIZATION_ID

    if (organizationId) {
      return {
        organizationId,
        userId: (query.userId as string) || undefined,
        role: 'MEMBER'
      }
    }
  }

  // 認証失敗
  throw createError({
    statusCode: 401,
    statusMessage: '認証が必要です'
  })
}

/**
 * 認証任意API用。
 * 認証されていればAuthContextを返し、されていなければnullを返す。
 */
export async function optionalAuth(event: H3Event): Promise<AuthContext | null> {
  try {
    return await requireAuth(event)
  } catch {
    return null
  }
}

/**
 * 管理者権限チェック（レベル5）
 */
export function requireAdmin(authContext: AuthContext): void {
  if (authContext.role !== 'ADMIN' && authContext.role !== 'SUPER_ADMIN') {
    throw createError({
      statusCode: 403,
      statusMessage: '管理者権限が必要です'
    })
  }
}

/**
 * リーダー以上権限チェック（レベル3+）
 */
export function requireLeader(authContext: AuthContext): void {
  const allowedRoles = ['LEADER', 'MANAGER', 'ADMIN', 'SUPER_ADMIN']
  if (!authContext.role || !allowedRoles.includes(authContext.role)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'リーダー以上の権限が必要です'
    })
  }
}