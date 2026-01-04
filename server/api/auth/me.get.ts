/**
 * 現在のユーザー情報取得API
 * 
 * GET /api/auth/me
 * 
 * 認証済みユーザーの情報を返す
 */

import { requireAuth } from '~/server/utils/authMiddleware'
import { prisma } from '~/server/utils/prisma'

interface MeResponse {
  success: boolean
  user: {
    id: string
    name: string | null
    email: string
    role: string
  } | null
  organization: {
    id: string
    name: string
  } | null
  isAuthenticated: boolean
}

export default defineEventHandler(async (event): Promise<MeResponse> => {
  try {
    const authContext = await requireAuth(event)

    // デバイスログインの場合
    if (authContext.userId?.startsWith('device:')) {
      const deviceId = authContext.userId.replace('device:', '')
      const device = await prisma.device.findUnique({
        where: { id: deviceId },
        include: { organization: true }
      })

      return {
        success: true,
        user: {
          id: authContext.userId,
          name: device?.name || 'デバイス',
          email: authContext.email || '',
          role: 'DEVICE'
        },
        organization: device?.organization ? {
          id: device.organization.id,
          name: device.organization.name
        } : null,
        isAuthenticated: true
      }
    }

    // 通常ユーザーの場合
    const user = await prisma.user.findUnique({
      where: { id: authContext.userId },
      include: { organization: true }
    })

    if (!user) {
      return {
        success: false,
        user: null,
        organization: null,
        isAuthenticated: false
      }
    }

    return {
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      organization: user.organization ? {
        id: user.organization.id,
        name: user.organization.name
      } : null,
      isAuthenticated: true
    }
  } catch {
    return {
      success: false,
      user: null,
      organization: null,
      isAuthenticated: false
    }
  }
})

