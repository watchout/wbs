/**
 * メールアドレスベースのログインAPI
 * 
 * POST /api/auth/login-by-email
 * 
 * メールアドレスからテナントを自動判定してログイン
 * URLにテナント情報を露出しないセキュアな方式
 * 
 * リクエストボディ:
 * - email: メールアドレス
 * - password: パスワード
 * 
 * レスポンス:
 * - success: boolean
 * - user: ユーザー情報
 * - organizationSlug: テナントのslug（リダイレクト用）
 */

import { createError, setCookie, readBody } from 'h3'
import { prisma } from '~/server/utils/prisma'

interface LoginByEmailRequest {
  email: string
  password: string
}

interface LoginByEmailResponse {
  success: boolean
  user: {
    id: string
    email: string
    name: string | null
    role: string
    organizationId: string
    organizationName: string
  }
  organizationSlug: string
}

/**
 * JWTトークン生成
 */
function generateToken(payload: { userId: string; organizationId: string }): string {
  const header = { alg: 'HS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const fullPayload = {
    ...payload,
    type: 'user',
    iat: now,
    exp: now + 60 * 60 * 24 * 7 // 7日間有効
  }
  
  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url')
  const payloadB64 = Buffer.from(JSON.stringify(fullPayload)).toString('base64url')
  
  // TODO: 本番では秘密鍵で署名
  const signature = Buffer.from('dev-signature').toString('base64url')
  
  return `${headerB64}.${payloadB64}.${signature}`
}

export default defineEventHandler(async (event): Promise<LoginByEmailResponse> => {
  try {
    const body = await readBody<LoginByEmailRequest>(event)
    
    // バリデーション
    if (!body.email || !body.password) {
      throw createError({
        statusCode: 400,
        statusMessage: 'メールアドレスとパスワードは必須です'
      })
    }
    
    // メールアドレスでユーザーを検索（テナント自動判定）
    const user = await prisma.user.findUnique({
      where: { email: body.email },
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
    
    // ユーザーがアクティブかチェック
    if (!user.isActive) {
      throw createError({
        statusCode: 401,
        statusMessage: 'このアカウントは無効化されています'
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
      },
      organizationSlug: user.organization.slug
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



