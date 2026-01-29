/**
 * ユーザー一覧取得API
 *
 * GET /api/users
 */

import { prisma } from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/authMiddleware'

interface UserResponse {
  id: string
  email: string
  name: string | null
  role: string
  department: { id: string; name: string } | null
  createdAt: string
}

interface GetUsersResponse {
  success: boolean
  users: UserResponse[]
}

export default defineEventHandler(async (event): Promise<GetUsersResponse> => {
  const auth = await requireAuth(event)

  const users = await prisma.user.findMany({
    where: {
      organizationId: auth.organizationId,
      deletedAt: null  // ソフトデリート済みは除外
    },
    include: {
      department: {
        select: { id: true, name: true }
      }
    },
    orderBy: [
      { role: 'asc' },
      { name: 'asc' }
    ]
  })

  return {
    success: true,
    users: users.map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      department: u.department,
      createdAt: u.createdAt.toISOString()
    }))
  }
})
