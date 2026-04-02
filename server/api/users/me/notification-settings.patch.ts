// server/api/users/me/notification-settings.patch.ts
// Sprint 6: 通知設定変更

import { readBody } from 'h3'
import { prisma } from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/authMiddleware'

interface NotificationSettingsBody {
  notifyEmail?: boolean
}

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)
  const body = await readBody<NotificationSettingsBody>(event)

  const updateData: Record<string, unknown> = {}
  if (typeof body.notifyEmail === 'boolean') {
    updateData.notifyEmail = body.notifyEmail
  }

  if (Object.keys(updateData).length === 0) {
    return { success: true, message: '変更なし' }
  }

  await prisma.user.update({
    where: { id: auth.userId! },
    data: updateData,
  })

  return {
    success: true,
    settings: updateData,
  }
})
