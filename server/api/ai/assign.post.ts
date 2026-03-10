// server/api/ai/assign.post.ts
// AIプレビュー確認済み配置変更実行API（Sprint 3: AC-S3-05, AC-S3-06, AC-S3-07）

import { createError, readBody } from 'h3'
import { requireAuth } from '../../utils/authMiddleware'
import { createAuditLog, AUDIT_ACTIONS } from '../../utils/auditLog'
import { prisma } from '../../utils/prisma'

interface AssignmentItem {
  userId: string
  siteName: string
  date: string
  action?: string
}

export default defineEventHandler(async (event) => {
  // 認証確認
  const auth = await requireAuth(event)

  // MEMBERロール拒否（AC-S3-07）
  if (auth.role === 'MEMBER') {
    throw createError({
      statusCode: 403,
      statusMessage: 'MEMBERロールは配置変更を実行できません。',
    })
  }

  const body = await readBody(event)
  const { assignments, organizationId } = body as {
    assignments: AssignmentItem[]
    organizationId: string
  }

  if (!assignments || !Array.isArray(assignments) || assignments.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'assignments が必要です。',
    })
  }

  if (!organizationId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'organizationId が必要です。',
    })
  }

  const results: { userId: string; siteName: string; date: string; success: boolean }[] = []

  for (const item of assignments) {
    try {
      const targetDate = new Date(item.date)

      // 既存スケジュールに siteName を設定（descriptionのmetadata更新）
      const existing = await prisma.schedule.findFirst({
        where: {
          authorId: item.userId,
          startTime: {
            gte: new Date(targetDate.setHours(0, 0, 0, 0)),
            lt: new Date(targetDate.setHours(23, 59, 59, 999)),
          },
          organization: { slug: organizationId },
        },
      })

      if (existing) {
        // 既存スケジュールのdescriptionにsiteNameを反映
        let meta: Record<string, unknown> = {}
        try {
          meta = existing.description ? JSON.parse(existing.description) : {}
        } catch {
          meta = {}
        }
        meta.siteName = item.siteName

        await prisma.schedule.update({
          where: { id: existing.id },
          data: { description: JSON.stringify(meta) },
        })
      } else {
        // スケジュールがない場合は現場配置スケジュールを新規作成
        const org = await prisma.organization.findUnique({
          where: { slug: organizationId },
        })
        if (org) {
          const start = new Date(item.date)
          start.setHours(8, 0, 0, 0)
          const end = new Date(item.date)
          end.setHours(17, 0, 0, 0)

          await prisma.schedule.create({
            data: {
              authorId: item.userId,
              organizationId: org.id,
              title: item.siteName,
              description: JSON.stringify({ siteName: item.siteName, source: 'ai_assign' }),
              startTime: start,
              endTime: end,
              isAllDay: false,
            },
          })
        }
      }

      results.push({ userId: item.userId, siteName: item.siteName, date: item.date, success: true })
    } catch {
      results.push({ userId: item.userId, siteName: item.siteName, date: item.date, success: false })
    }
  }

  // 監査ログ記録（AC-S3-06）
  createAuditLog({
    organizationId: auth.organizationId,
    userId: auth.userId,
    action: AUDIT_ACTIONS.AI_COMMAND,
    meta: {
      type: 'ai_assignment_execute',
      assignments: assignments.map(a => ({
        userId: a.userId,
        siteName: a.siteName,
        date: a.date,
      })),
      results,
    },
  })

  const successCount = results.filter(r => r.success).length

  return {
    success: successCount > 0,
    results,
    message: `${successCount}/${assignments.length} 件の配置変更を実行しました。`,
  }
})
