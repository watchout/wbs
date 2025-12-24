/**
 * 認証ミドルウェア
 * 
 * すべての認証済みAPIで使用する認証・認可ユーティリティ
 * 
 * 使用方法:
 * ```typescript
 * import { requireAuth } from '~/server/utils/authMiddleware'
 * 
 * export default defineEventHandler(async (event) => {
 *   const auth = await requireAuth(event)
 *   // auth.userId, auth.organizationId が取得可能
 * })
 * ```
 */

import type { H3Event } from 'h3'
import { createError, getCookie } from 'h3'
import { prisma } from './prisma'

/**
 * 認証コンテキスト
 */
export interface AuthContext {
  // 共通フィールド
  organizationId: string
  authType: 'user' | 'device'
  
  // ユーザー認証時のみ
  userId?: string
  email?: string
  name?: string | null
  role?: string
  departmentId?: string | null
  departmentName?: string | null
  
  // デバイス認証時のみ
  deviceId?: string
  deviceName?: string
}

/**
 * JWTペイロード（簡易版）
 * 
 * 本番環境では jose や jsonwebtoken を使用して検証
 */
interface JWTPayload {
  // 共通
  organizationId: string
  exp: number
  type?: 'user' | 'device'
  
  // ユーザートークン
  userId?: string
  
  // デバイストークン
  deviceId?: string
}

/**
 * JWTトークンを検証（簡易版）
 * 
 * TODO: 本番では jose ライブラリを使用した署名検証を実装
 */
async function verifyJWT(token: string): Promise<JWTPayload> {
  try {
    // 簡易実装: Base64デコードのみ（本番では署名検証必須）
    const parts = token.split('.')
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format')
    }
    
    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf-8')
    )
    
    // 有効期限チェック
    if (payload.exp && payload.exp < Date.now() / 1000) {
      throw new Error('Token expired')
    }
    
    return {
      organizationId: payload.organizationId || payload.org,
      exp: payload.exp,
      type: payload.type || 'user',
      userId: payload.userId || payload.sub,
      deviceId: payload.deviceId
    }
  } catch (error) {
    throw new Error('Invalid token')
  }
}

/**
 * 認証を要求する
 * 
 * Cookie から JWT を取得し、ユーザーまたはデバイス情報を検証して返す
 * 認証に失敗した場合は 401 エラーを投げる
 * 
 * @param event - H3Event
 * @returns AuthContext - 認証済み情報
 * @throws 401 Unauthorized - 認証に失敗した場合
 */
export async function requireAuth(event: H3Event): Promise<AuthContext> {
  // Cookie から JWT を取得
  const token = getCookie(event, 'auth_token')
  
  if (!token) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized: No token provided'
    })
  }
  
  // JWT を検証
  let payload: JWTPayload
  try {
    payload = await verifyJWT(token)
  } catch (error) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized: Invalid token'
    })
  }
  
  let authContext: AuthContext
  
  // デバイストークンの場合
  if (payload.type === 'device' && payload.deviceId) {
    const device = await prisma.device.findUnique({
      where: { id: payload.deviceId },
      include: {
        organization: true
      }
    })
    
    if (!device) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized: Device not found'
      })
    }
    
    // organizationId の整合性チェック
    if (device.organizationId !== payload.organizationId) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden: Organization mismatch'
      })
    }
    
    // 最終接続時刻を更新
    await prisma.device.update({
      where: { id: device.id },
      data: { lastHeartbeat: new Date() }
    })
    
    authContext = {
      organizationId: device.organizationId,
      authType: 'device',
      deviceId: device.id,
      deviceName: device.name
    }
  } 
  // ユーザートークンの場合
  else if (payload.userId) {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        organization: true,
        department: true
      }
    })
    
    if (!user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized: User not found'
      })
    }
    
    // ユーザーがアクティブかチェック
    if (!user.isActive) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized: User is inactive'
      })
    }
    
    // organizationId の整合性チェック
    if (user.organizationId !== payload.organizationId) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden: Organization mismatch'
      })
    }
    
    authContext = {
      organizationId: user.organizationId,
      authType: 'user',
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      departmentId: user.departmentId,
      departmentName: user.department?.name || null
    }
  } else {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized: Invalid token payload'
    })
  }
  
  // event.context に保存（他の場所からアクセス可能にする）
  event.context.auth = authContext
  
  return authContext
}

/**
 * 認証をオプショナルで取得
 * 
 * 認証に失敗してもエラーを投げず、null を返す
 * 
 * @param event - H3Event
 * @returns AuthContext | null
 */
export async function optionalAuth(event: H3Event): Promise<AuthContext | null> {
  try {
    return await requireAuth(event)
  } catch {
    return null
  }
}

/**
 * 特定の権限レベルを要求
 * 
 * @param event - H3Event
 * @param requiredRole - 必要な権限（ADMIN, MEMBER など）
 * @returns AuthContext
 * @throws 403 Forbidden - 権限が不足している場合
 */
export async function requireRole(
  event: H3Event, 
  requiredRole: 'ADMIN' | 'MEMBER' | 'DEVICE'
): Promise<AuthContext> {
  const auth = await requireAuth(event)
  
  // 権限階層: ADMIN > MEMBER > DEVICE
  const roleHierarchy = { ADMIN: 3, MEMBER: 2, DEVICE: 1 }
  
  if (roleHierarchy[auth.role as keyof typeof roleHierarchy] < roleHierarchy[requiredRole]) {
    throw createError({
      statusCode: 403,
      statusMessage: `Forbidden: Requires ${requiredRole} role`
    })
  }
  
  return auth
}

export default requireAuth

