/**
 * ログインAPI
 * 
 * POST /api/auth/login
 * 
 * リクエストボディ:
 * - email: メールアドレス
 * - password: パスワード
 * - organizationSlug: 組織スラッグ
 * 
 * レスポンス:
 * - success: boolean
 * - user: ユーザー情報
 * - token: JWTトークン（Cookieにも設定）
 */

import { createError, setCookie, readBody } from 'h3'
import { prisma } from '~/server/utils/prisma'

interface LoginRequest {
  email: string
  password: string
  organizationSlug: string
}

interface LoginResponse {
  success: boolean
  user: {
    id: string
    email: string
    name: string | null
    role: string
    organizationId: string
    organizationName: string
  }
}

/**
 * 簡易的なJWTトークン生成
 * 
 * TODO: 本番では jose ライブラリを使用した署名付きJWTを生成
 */
function generateToken(payload: { userId: string; organizationId: string }): string {
  const header = { alg: 'HS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + 60 * 60 * 24 * 7 // 7日間有効
  }
  
  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url')
  const payloadB64 = Buffer.from(JSON.stringify(fullPayload)).toString('base64url')
  
  // TODO: 本番では秘密鍵で署名
  const signature = Buffer.from('dev-signature').toString('base64url')
  
  return `${headerB64}.${payloadB64}.${signature}`
}

export default defineEventHandler(async (event): Promise<LoginResponse> => {
  try {
    const body = await readBody<LoginRequest>(event)
    
    // バリデーション
    if (!body.email || !body.password || !body.organizationSlug) {
      throw createError({
        statusCode: 400,
        statusMessage: 'メールアドレス、パスワード、組織IDは必須です'
      })
    }
    
    // 組織を検索
    const organization = await prisma.organization.findUnique({
      where: { slug: body.organizationSlug }
    })
    
    if (!organization) {
      throw createError({
        statusCode: 404,
        statusMessage: '組織が見つかりません'
      })
    }
    
    // ユーザーを検索
    const user = await prisma.user.findFirst({
      where: {
        email: body.email,
        organizationId: organization.id,
        isActive: true
      },
      include: {
        organization: true
      }
    })
    
    if (!user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'メールアドレスまたはパスワードが正しくありません'
      })
    }
    
    // TODO: パスワード検証（本番では bcrypt 等でハッシュ比較）
    // 現時点ではパスワードフィールドがスキーマにないため、仮実装
    // if (!await bcrypt.compare(body.password, user.passwordHash)) {
    //   throw createError({
    //     statusCode: 401,
    //     statusMessage: 'メールアドレスまたはパスワードが正しくありません'
    //   })
    // }
    
    // JWTトークン生成
    const token = generateToken({
      userId: user.id,
      organizationId: user.organizationId
    })
    
    // Cookieにトークンを設定
    setCookie(event, 'auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7日間
      path: '/'
    })
    
    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: user.organizationId,
        organizationName: user.organization.name
      }
    }
    
  } catch (error: any) {
    console.error('ログインエラー:', error)
    
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'ログイン処理中にエラーが発生しました'
    })
  }
})



