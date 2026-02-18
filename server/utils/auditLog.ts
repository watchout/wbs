/**
 * 操作ログユーティリティ（AUDIT-001）
 *
 * APIエンドポイントから呼び出して操作を記録する
 * 全ログは organizationId でスコープされる
 */

import { createLogger } from './logger'
import { prisma } from './prisma'

const log = createLogger('audit-log')

// 操作アクション定義
export const AUDIT_ACTIONS = {
  // 認証系
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',
  DEVICE_LOGIN: 'DEVICE_LOGIN',
  PASSWORD_CHANGED: 'PASSWORD_CHANGED',

  // スケジュール系
  SCHEDULE_CREATE: 'SCHEDULE_CREATE',
  SCHEDULE_UPDATE: 'SCHEDULE_UPDATE',
  SCHEDULE_DELETE: 'SCHEDULE_DELETE',

  // ユーザー管理系
  USER_CREATE: 'USER_CREATE',
  USER_UPDATE: 'USER_UPDATE',
  USER_DELETE: 'USER_DELETE',

  // 部署管理系
  DEPARTMENT_CREATE: 'DEPARTMENT_CREATE',
  DEPARTMENT_UPDATE: 'DEPARTMENT_UPDATE',
  DEPARTMENT_DELETE: 'DEPARTMENT_DELETE',

  // 設定系
  LLM_SETTINGS_UPDATE: 'LLM_SETTINGS_UPDATE',
  ORGANIZATION_UPDATE: 'ORGANIZATION_UPDATE',

  // カレンダー連携
  CALENDAR_CONNECT: 'CALENDAR_CONNECT',
  CALENDAR_DISCONNECT: 'CALENDAR_DISCONNECT',
  CALENDAR_SYNC: 'CALENDAR_SYNC',
} as const

export type AuditAction = typeof AUDIT_ACTIONS[keyof typeof AUDIT_ACTIONS]

interface CreateAuditLogParams {
  organizationId: string
  userId?: string | null
  action: AuditAction
  targetId?: string | null
  meta?: Record<string, unknown> | null
}

/**
 * 操作ログを記録
 *
 * 非同期で記録し、失敗してもエラーを投げない（ログ記録失敗が業務を止めてはならない）
 */
export async function createAuditLog(params: CreateAuditLogParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        organizationId: params.organizationId,
        userId: params.userId ?? null,
        action: params.action,
        targetId: params.targetId ?? null,
        meta: params.meta ? (params.meta as Record<string, string>) : undefined,
      },
    })
  } catch (error) {
    // ログ記録失敗は握り潰さず stderr に出力（本番は Sentry に送信）
    log.error('Failed to create audit log', { error: error instanceof Error ? error : new Error(String(error)) })
  }
}

/**
 * 操作ログを取得（管理者用）
 */
export async function getAuditLogs(
  organizationId: string,
  options: {
    page?: number
    limit?: number
    action?: string
    userId?: string
    from?: Date
    to?: Date
  } = {}
) {
  const { page = 1, limit = 50, action, userId, from, to } = options

  const where: Record<string, unknown> = {
    organizationId,
  }

  if (action) {
    where.action = action
  }

  if (userId) {
    where.userId = userId
  }

  if (from || to) {
    const createdAt: Record<string, Date> = {}
    if (from) createdAt.gte = from
    if (to) createdAt.lte = to
    where.createdAt = createdAt
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ])

  return {
    logs: logs.map((entry) => ({
      id: entry.id,
      action: entry.action,
      targetId: entry.targetId,
      meta: entry.meta,
      userName: entry.user?.name ?? 'システム',
      createdAt: entry.createdAt.toISOString(),
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  }
}
