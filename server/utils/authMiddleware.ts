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
 * 管理者権限チェック
 */
export function requireAdmin(authContext: AuthContext): void {
  if (authContext.role !== 'ADMIN') {
    throw createError({
      statusCode: 403,
      statusMessage: '管理者権限が必要です'
    })
  }
}

/**
 * リーダー以上権限チェック
 */
export function requireLeader(authContext: AuthContext): void {
  const allowedRoles = ['LEADER', 'ADMIN']
  if (!authContext.role || !allowedRoles.includes(authContext.role)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'リーダー以上の権限が必要です'
    })
  }
}

/**
 * スケジュール編集権限チェック
 * 
 * 権限モデル:
 * - ADMIN: 全員のスケジュールを編集可能
 * - LEADER: 自分の部署メンバーのスケジュールを編集可能
 * - MEMBER: 自分のスケジュールのみ編集可能
 */
export interface ScheduleEditCheckParams {
  authContext: AuthContext
  scheduleAuthorId: string | null
  scheduleAuthorDepartmentId: string | null
  userDepartmentId: string | null
}

export function canEditSchedule(params: ScheduleEditCheckParams): boolean {
  const { authContext, scheduleAuthorId, scheduleAuthorDepartmentId, userDepartmentId } = params
  
  // ADMIN は全員のスケジュールを編集可能
  if (authContext.role === 'ADMIN') {
    return true
  }
  
  // 自分のスケジュールは編集可能
  if (scheduleAuthorId === authContext.userId) {
    return true
  }
  
  // LEADER は自分の部署メンバーのスケジュールを編集可能
  if (authContext.role === 'LEADER' && userDepartmentId) {
    if (scheduleAuthorDepartmentId === userDepartmentId) {
      return true
    }
  }
  
  return false
}

/**
 * スケジュール編集権限を要求
 */
export function requireScheduleEditPermission(params: ScheduleEditCheckParams): void {
  if (!canEditSchedule(params)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'このスケジュールを編集する権限がありません'
    })
  }
}