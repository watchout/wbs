/**
 * デバイスログインAPI
 * 
 * POST /api/auth/device-login
 * 
 * サイネージ等のデバイス向けログイン
 * kioskSecret（デバイス固有の秘密鍵）で認証
 */

import { readBody, setCookie, createError } from 'h3'
import { prisma } from '~/server/utils/prisma'
import {
  generateAccessToken,
  generateRefreshToken,
  accessTokenCookieOptions,
  refreshTokenCookieOptions
} from '~/server/utils/jwt'

interface DeviceLoginRequest {
  kioskSecret: string
}

interface DeviceLoginResponse {
  success: boolean
  device: {
    id: string
    name: string
  }
  organization: {
    id: string
    name: string
  }
}

export default defineEventHandler(async (event): Promise<DeviceLoginResponse> => {
  const body = await readBody<DeviceLoginRequest>(event)

  if (!body.kioskSecret) {
    throw createError({
      statusCode: 400,
      statusMessage: 'デバイスキーは必須です'
    })
  }

  // デバイスを検索
  const device = await prisma.device.findUnique({
    where: { kioskSecret: body.kioskSecret },
    include: {
      organization: true
    }
  })

  if (!device) {
    throw createError({
      statusCode: 401,
      statusMessage: 'デバイスが見つかりません'
    })
  }

  if (!device.organization) {
    throw createError({
      statusCode: 401,
      statusMessage: '組織が設定されていません'
    })
  }

  // JWTトークン生成（デバイス用）
  const accessToken = await generateAccessToken({
    organizationId: device.organizationId,
    userId: `device:${device.id}`,
    email: `device-${device.id}@miel.local`,
    role: 'DEVICE'
  })

  const refreshToken = await generateRefreshToken({
    organizationId: device.organizationId,
    userId: `device:${device.id}`
  })

  // Cookieに設定（デバイスは長期間有効）
  setCookie(event, 'access_token', accessToken, {
    ...accessTokenCookieOptions,
    maxAge: 60 * 60 * 24 // 24時間
  })

  setCookie(event, 'refresh_token', refreshToken, {
    ...refreshTokenCookieOptions,
    maxAge: 60 * 60 * 24 * 30 // 30日
  })

  return {
    success: true,
    device: {
      id: device.id,
      name: device.name
    },
    organization: {
      id: device.organization.id,
      name: device.organization.name
    }
  }
})

