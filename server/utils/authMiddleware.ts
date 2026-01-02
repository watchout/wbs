import { createError, getQuery, getHeaders, type H3Event } from 'h3'

export interface AuthContext {
  /**
   * マルチテナント境界の要。全APIで必須。
   * 実装が整うまでは weekly-board 等を誤って公開しないため、requireAuth は 501 を返す。
   */
  organizationId: string
  userId?: string
  role?: string
}

/**
 * 認証必須API用。
 *
 * Phase 0: 開発/デモ用のシンプルな認証
 * - クエリパラメータまたはヘッダーでorganizationIdを受け取る
 * - 本番環境では適切なJWT/Session認証に置き換え予定
 */
export async function requireAuth(event: H3Event): Promise<AuthContext> {
  // 開発環境: クエリパラメータまたはヘッダーからorganizationIdを取得
  const query = getQuery(event)
  const headers = getHeaders(event)
  
  const organizationId = 
    (query.organizationId as string) ||
    (headers['x-organization-id'] as string) ||
    process.env.DEFAULT_ORGANIZATION_ID

  if (!organizationId) {
    throw createError({
      statusCode: 401,
      statusMessage: '認証が必要です。organizationIdを指定してください。'
    })
  }

  // 開発環境: userIdは任意
  const userId = 
    (query.userId as string) ||
    (headers['x-user-id'] as string) ||
    undefined

  return {
    organizationId,
    userId,
    role: 'MEMBER'
  }
}

/**
 * 認証任意API用（将来用）。
 */
export async function optionalAuth(_event: H3Event): Promise<AuthContext | null> {
  return null
}


