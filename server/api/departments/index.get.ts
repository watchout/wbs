/**
 * 部署一覧取得API
 * 
 * GET /api/departments
 */

import { prisma } from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/authMiddleware'

interface DepartmentResponse {
  id: string
  name: string
  color: string | null
  sortOrder: number
  userCount: number
}

interface GetDepartmentsResponse {
  success: boolean
  departments: DepartmentResponse[]
}

export default defineEventHandler(async (event): Promise<GetDepartmentsResponse> => {
  const auth = await requireAuth(event)

  const departments = await prisma.department.findMany({
    where: {
      organizationId: auth.organizationId,
      deletedAt: null  // ソフトデリート済みは除外
    },
    include: {
      _count: {
        select: { users: { where: { deletedAt: null } } }
      }
    },
    orderBy: [
      { sortOrder: 'asc' },
      { name: 'asc' }
    ]
  })

  return {
    success: true,
    departments: departments.map(dept => ({
      id: dept.id,
      name: dept.name,
      color: dept.color,
      sortOrder: dept.sortOrder,
      userCount: dept._count.users
    }))
  }
})
