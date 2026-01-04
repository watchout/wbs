/**
 * JWT認証ユーティリティ
 * 
 * SSOT準拠: JWT + Cookie認証
 * - ログイン時にJWT発行 → HttpOnly Cookie保持
 * - APIでは requireAuth(event) で検証
 */

import { SignJWT, jwtVerify, type JWTPayload } from 'jose'

// JWT設定
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'dev-secret-change-in-production'
)
const JWT_ISSUER = 'miel-plus'
const JWT_AUDIENCE = 'miel-plus-api'
const ACCESS_TOKEN_EXPIRY = '1h'  // アクセストークン: 1時間
const REFRESH_TOKEN_EXPIRY = '7d' // リフレッシュトークン: 7日

/**
 * JWTペイロード型
 */
export interface MielJWTPayload extends JWTPayload {
  organizationId: string
  userId: string
  email: string
  role: string
  type: 'access' | 'refresh'
}

/**
 * アクセストークンを生成
 */
export async function generateAccessToken(payload: {
  organizationId: string
  userId: string
  email: string
  role: string
}): Promise<string> {
  return await new SignJWT({
    organizationId: payload.organizationId,
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
    type: 'access'
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(JWT_SECRET)
}

/**
 * リフレッシュトークンを生成
 */
export async function generateRefreshToken(payload: {
  organizationId: string
  userId: string
}): Promise<string> {
  return await new SignJWT({
    organizationId: payload.organizationId,
    userId: payload.userId,
    type: 'refresh'
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .sign(JWT_SECRET)
}

/**
 * トークンを検証
 */
export async function verifyToken(token: string): Promise<MielJWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE
    })
    return payload as MielJWTPayload
  } catch {
    return null
  }
}

/**
 * Cookieオプション（HttpOnly, Secure）
 */
export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/'
}

/**
 * アクセストークン用Cookie設定
 */
export const accessTokenCookieOptions = {
  ...cookieOptions,
  maxAge: 60 * 60 // 1時間
}

/**
 * リフレッシュトークン用Cookie設定
 */
export const refreshTokenCookieOptions = {
  ...cookieOptions,
  maxAge: 60 * 60 * 24 * 7 // 7日
}

