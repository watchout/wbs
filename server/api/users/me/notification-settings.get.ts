// server/api/users/me/notification-settings.get.ts
// Sprint 6: 通知設定取得

import { prisma } from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/authMiddleware'

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)

  const user = await prisma.user.findUnique({
    where: { id: auth.userId! },
    select: { notifyEmail: true },
  })

  return {
    success: true,
    settings: {
      notifyEmail: user?.notifyEmail ?? true,
    },
  }
})
