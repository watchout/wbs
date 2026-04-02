// server/api/planning-documents/[id].delete.ts
// 工程表ドキュメント削除

import { defineEventHandler } from 'h3'
import { prisma } from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/authMiddleware'
import { logger } from '~/server/utils/logger'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const organizationId = user.organizationId

  if (!organizationId) {
    throw new Error('User organization not found')
  }

  const { id } = event.context.params as { id: string }

  // ドキュメント取得＆組織権限チェック
  const planningDoc = await prisma.planningDocument.findUnique({
    where: { id },
    select: { id: true, organizationId: true },
  })

  if (!planningDoc) {
    throw new Error(`Planning document not found: ${id}`)
  }

  if (planningDoc.organizationId !== organizationId) {
    throw new Error('Access denied: Organization mismatch')
  }

  // 関連する PlanningParseReview を先に削除（FK制約）
  await prisma.planningParseReview.deleteMany({
    where: { documentId: id },
  })

  // 関連する SiteDemand の sourceDocumentId をクリア
  await prisma.siteDemand.updateMany({
    where: { sourceDocumentId: id },
    data: { sourceDocumentId: null },
  })

  // ドキュメント削除
  await prisma.planningDocument.delete({
    where: { id },
  })

  logger.info('Planning document deleted', {
    documentId: id,
    organizationId,
    userId: user.userId,
  })

  return { success: true, deletedId: id }
})
