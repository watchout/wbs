/**
 * 管理者ダッシュボードAPI（OPS-001）
 *
 * GET /api/admin/dashboard
 * ADMIN権限必須 — 組織の統計情報を返す
 */

import { requireAuth, requireAdmin } from '../../utils/authMiddleware'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)
  requireAdmin(auth)

  const orgId = auth.organizationId
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekAgo = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000)

  // 並列で統計情報を取得
  const [
    totalUsers,
    activeUsers,
    totalSchedules,
    todaySchedules,
    totalDepartments,
    recentAuditLogs,
  ] = await Promise.all([
    // ユーザー数
    prisma.user.count({
      where: { organizationId: orgId, deletedAt: null },
    }),
    // 7日以内にログインしたユーザー数（セッション管理はインメモリのためcreatedAtで近似）
    prisma.user.count({
      where: {
        organizationId: orgId,
        deletedAt: null,
        updatedAt: { gte: weekAgo },
      },
    }),
    // 全スケジュール数
    prisma.schedule.count({
      where: { organizationId: orgId, deletedAt: null },
    }),
    // 今日のスケジュール数
    prisma.schedule.count({
      where: {
        organizationId: orgId,
        deletedAt: null,
        start: { gte: todayStart },
        end: { lte: new Date(todayStart.getTime() + 24 * 60 * 60 * 1000) },
      },
    }),
    // 部署数
    prisma.department.count({
      where: { organizationId: orgId },
    }),
    // 直近5件の操作ログ
    prisma.auditLog.findMany({
      where: { organizationId: orgId },
      include: {
        user: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ])

  return {
    success: true,
    data: {
      stats: {
        totalUsers,
        activeUsers,
        totalSchedules,
        todaySchedules,
        totalDepartments,
      },
      recentActivity: recentAuditLogs.map((log) => ({
        id: log.id,
        action: log.action,
        userName: log.user?.name ?? 'システム',
        createdAt: log.createdAt.toISOString(),
      })),
    },
  }
})
