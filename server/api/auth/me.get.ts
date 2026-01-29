/**
 * 現在のユーザー情報取得API
 * 
 * GET /api/auth/me
 * 
 * 認証済みユーザーの情報を返す
 */

import { getCookie } from 'h3'
import { getSession } from '~/server/utils/session'
import { prisma } from '~/server/utils/prisma'

interface MeResponse {
  success: boolean
  user: {
    id: string
    name: string | null
    email: string
    role: string
    department?: {
      id: string
      name: string
    } | null
  } | null
  organization: {
    id: string
    name: string
  } | null
  isAuthenticated: boolean
  isDevice: boolean
}

export default defineEventHandler(async (event): Promise<MeResponse> => {
  const sessionId = getCookie(event, 'session_id')
  
  if (!sessionId) {
    return {
      success: false,
      user: null,
      organization: null,
      isAuthenticated: false,
      isDevice: false
    }
  }

  const session = getSession(sessionId)
  
  if (!session) {
    return {
      success: false,
      user: null,
      organization: null,
      isAuthenticated: false,
      isDevice: false
    }
  }

  // デバイスログインの場合
  if (session.deviceId) {
    const device = await prisma.device.findUnique({
      where: { id: session.deviceId },
      include: { organization: true }
    })

    return {
      success: true,
      user: {
        id: session.userId,
        name: device?.name || 'デバイス',
        email: session.email,
        role: 'DEVICE'
      },
      organization: device?.organization ? {
        id: device.organization.id,
        name: device.organization.name
      } : null,
      isAuthenticated: true,
      isDevice: true
    }
  }

  // 通常ユーザーの場合
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { organization: true, department: true }
  })

  if (!user) {
    return {
      success: false,
      user: null,
      organization: null,
      isAuthenticated: false,
      isDevice: false
    }
  }

  return {
    success: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department ? {
        id: user.department.id,
        name: user.department.name
      } : null
    },
    organization: user.organization ? {
      id: user.organization.id,
      name: user.organization.name
    } : null,
    isAuthenticated: true,
    isDevice: false
  }
})
