import { createError, type H3Event } from 'h3'

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
 * NOTE:
 * - 現状は認証基盤が未実装/別PRで設計予定のため、ここで安易にダミー認証は入れない
 * - 代わりに明示的に 501 で落として安全側に倒す（UI/LPの起動を妨げないためのスタブ）
 */
export async function requireAuth(_event: H3Event): Promise<AuthContext> {
  throw createError({
    statusCode: 501,
    statusMessage: 'Auth is not implemented yet'
  })
}

/**
 * 認証任意API用（将来用）。
 */
export async function optionalAuth(_event: H3Event): Promise<AuthContext | null> {
  return null
}


