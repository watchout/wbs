/**
 * 認証ミドルウェア
 * 
 * SSOT準拠: JWT + Cookie認証
 * - ログイン時にJWT発行 → HttpOnly Cookie保持
 * - APIでは requireAuth(event) で検証
 */

import { createError, getQuery, getHeaders, getCookie, type H3Event } from 'h3'
import { verifyToken, type MielJWTPayload } from './jwt'

export interface AuthContext {
  /**
   * マルチテナント境界の要。全APIで必須。
   */
  organizationId: string
  userId?: string
  email?: string
  role?: string
}

/**
 * 認証必須API用。
 * 
 * 認証順序:
 * 1. Cookie (access_token) - 本番推奨
 * 2. Authorization ヘッダー (Bearer token)
 * 3. 開発モード: クエリパラメータ/ヘッダー (organizationId)
 */
export async function requireAuth(event: H3Event): Promise<AuthContext> {
  // 1. Cookie からトークン取得
  const accessToken = getCookie(event, 'access_token')
  if (accessToken) {
    const payload = await verifyToken(accessToken)
    if (payload && payload.type === 'access') {
      return {
        organizationId: payload.organizationId,
        userId: payload.userId,
        email: payload.email,
        role: payload.role
      }
    }
  }

  // 2. Authorization ヘッダーから取得
  const headers = getHeaders(event)
  const authHeader = headers['authorization']
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    const payload = await verifyToken(token)
    if (payload && payload.type === 'access') {
      return {
        organizationId: payload.organizationId,
        userId: payload.userId,
        email: payload.email,
        role: payload.role
      }
    }
  }

  // 3. 開発モード: クエリパラメータまたはヘッダーからorganizationIdを取得
  if (process.env.NODE_ENV !== 'production') {
    const query = getQuery(event)
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
