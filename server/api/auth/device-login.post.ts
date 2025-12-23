/**
 * デバイスログインAPI
 * 
 * POST /api/auth/device-login
 * 
 * ホワイトボード/サイネージデバイス用の認証
 * 
 * リクエストボディ:
 * - deviceKey: デバイス認証キー（kioskSecret）
 * - organizationSlug: 組織スラッグ
 * 
 * レスポンス:
 * - success: boolean
 * - device: デバイス情報
 */

import { createError, setCookie, readBody } from 'h3'
import { prisma } from '~/server/utils/prisma'

interface DeviceLoginRequest {
  deviceKey: string
  organizationSlug: string
}

interface DeviceLoginResponse {
  success: boolean
  device: {
    id: string
    name: string
    organizationId: string
    organizationName: string
  }
}

/**
 * デバイス用JWTトークン生成
 */
function generateDeviceToken(payload: { 
  deviceId: string
  organizationId: string 
}): string {
  const header = { alg: 'HS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const fullPayload = {
    ...payload,
    type: 'device', // デバイストークンであることを明示
    iat: now,
    exp: now + 60 * 60 * 24 * 30 // 30日間有効（デバイスは長期）
  }
  
  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url')
  const payloadB64 = Buffer.from(JSON.stringify(fullPayload)).toString('base64url')
  
  // TODO: 本番では秘密鍵で署名
  const signature = Buffer.from('dev-device-signature').toString('base64url')
  
  return `${headerB64}.${payloadB64}.${signature}`
}

export default defineEventHandler(async (event): Promise<DeviceLoginResponse> => {
  try {
    const body = await readBody<DeviceLoginRequest>(event)
    
    // バリデーション
    if (!body.deviceKey || !body.organizationSlug) {
      throw createError({
        statusCode: 400,
        statusMessage: 'デバイスキーと組織IDは必須です'
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
    
    // デバイスを検索（kioskSecretで認証）
    const device = await prisma.device.findFirst({
      where: {
        kioskSecret: body.deviceKey,
        organizationId: organization.id
      },
      include: {
        organization: true
      }
    })
    
    if (!device) {
      throw createError({
        statusCode: 401,
        statusMessage: 'デバイスキーが正しくありません'
      })
    }
    
    // 最終接続時刻を更新
    await prisma.device.update({
      where: { id: device.id },
      data: { lastHeartbeat: new Date() }
    })
    
    // JWTトークン生成
    const token = generateDeviceToken({
      deviceId: device.id,
      organizationId: device.organizationId
    })
    
    // Cookieにトークンを設定
    setCookie(event, 'auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30日間
      path: '/'
    })
    
    return {
      success: true,
      device: {
        id: device.id,
        name: device.name,
        organizationId: device.organizationId,
        organizationName: device.organization.name
      }
    }
    
  } catch (error: any) {
    console.error('デバイスログインエラー:', error)
    
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'ログイン処理中にエラーが発生しました'
    })
  }
})



