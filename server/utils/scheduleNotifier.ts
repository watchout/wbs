/**
 * スケジュール変更通知（NOTIF-001）
 *
 * スケジュールCRUD時に関係者にメール通知を送信する
 * - 作成: 同部署メンバーに通知
 * - 更新: 同部署メンバー + 担当者に通知（自分は除く）
 * - 削除: 同部署メンバー + 担当者に通知（自分は除く）
 */

import { prisma } from './prisma'
import { sendMail } from './mailer'
import { scheduleChangeText, scheduleChangeHtml } from './notificationTemplates'
import { createLogger } from './logger'

const log = createLogger('notification')

interface NotifyScheduleChangeParams {
  scheduleId: string
  scheduleTitle: string
  changeType: 'created' | 'updated' | 'deleted'
  changedByUserId: string | undefined
  organizationId: string
  start?: string
  end?: string
}

/**
 * スケジュール変更通知を送信（非ブロッキング）
 */
export async function notifyScheduleChange(params: NotifyScheduleChangeParams): Promise<void> {
  try {
    if (!params.changedByUserId) return

    // 変更したユーザーの情報を取得
    const changedByUser = await prisma.user.findUnique({
      where: { id: params.changedByUserId },
      select: { name: true, email: true, departmentId: true },
    })

    if (!changedByUser) return

    // 組織情報を取得
    const org = await prisma.organization.findUnique({
      where: { id: params.organizationId },
      select: { name: true, slug: true },
    })

    if (!org) return

    // 通知対象のユーザーを取得（同部署のメンバー、自分は除外）
    const notifyUsers = await prisma.user.findMany({
      where: {
        organizationId: params.organizationId,
        deletedAt: null,
        // 自分以外
        id: { not: params.changedByUserId },
        // 同部署がある場合はそのメンバー、なければ ADMIN / LEADER
        ...(changedByUser.departmentId
          ? { departmentId: changedByUser.departmentId }
          : { role: { in: ['ADMIN', 'LEADER'] } }
        ),
      },
      select: { email: true },
    })

    if (notifyUsers.length === 0) return

    const appUrl = process.env.APP_URL || 'http://localhost:6001'
    const boardUrl = `${appUrl}/org/${org.slug}/weekly-board`

    const templateData = {
      scheduleTitle: params.scheduleTitle,
      changedBy: changedByUser.name || changedByUser.email,
      changeType: params.changeType,
      start: params.start,
      end: params.end,
      orgName: org.name,
      boardUrl,
    }

    const recipients = notifyUsers.map((u) => u.email)
    const subject = `【${org.name}】スケジュール${params.changeType === 'created' ? '新規作成' : params.changeType === 'updated' ? '更新' : '削除'}: ${params.scheduleTitle}`

    await sendMail({
      to: recipients,
      subject,
      text: scheduleChangeText(templateData),
      html: scheduleChangeHtml(templateData),
    })
  } catch (error) {
    // 通知失敗は業務フローを止めない
    log.error('Failed to send schedule change notification', { error: error instanceof Error ? error : new Error(String(error)) })
  }
}
