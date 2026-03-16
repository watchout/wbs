// server/api/planning-documents/[id]/confirm.put.ts
// 工程表の解析結果を確定し、SiteDemand を生成

import { defineEventHandler, readBody } from 'h3'
import { prisma } from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/authMiddleware'
import { getUserOrganizationId } from '~/server/utils/authMiddleware'
import logger from '~/server/utils/logger'

interface ConfirmDemand {
  index: number
  taskName: string
  requiredCount: number
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  timeSlots: string[]
  date: string // YYYY-MM-DD format
  notes?: string
}

interface ConfirmRequest {
  siteId: string
  demands: ConfirmDemand[]
}

interface ConfirmResponse {
  documentId: string
  confirmedCount: number
  createdSiteDemands: string[]
  parseStatus: string
}

export default defineEventHandler(async (event) => {
  try {
    const user = await requireAuth(event)
    const organizationId = await getUserOrganizationId(user.id)

    if (!organizationId) {
      throw new Error('User organization not found')
    }

    const { id } = event.context.params as { id: string }
    const body = await readBody<ConfirmRequest>(event)

    if (!body.siteId || !Array.isArray(body.demands)) {
      throw new Error('Invalid request: siteId and demands array required')
    }

    // ドキュメント取得
    const planningDoc = await prisma.planningDocument.findUnique({
      where: { id },
      select: {
        id: true,
        organizationId: true,
        parseStatus: true,
        rawExtractJson: true,
      },
    })

    if (!planningDoc) {
      throw new Error(`Planning document not found: ${id}`)
    }

    // 組織権限チェック
    if (planningDoc.organizationId !== organizationId) {
      throw new Error('Access denied: Organization mismatch')
    }

    // 解析済みチェック
    if (planningDoc.parseStatus !== 'PARSED' && planningDoc.parseStatus !== 'NEEDS_REVIEW') {
      throw new Error(`Cannot confirm document with status: ${planningDoc.parseStatus}`)
    }

    // Site存在チェック
    const site = await prisma.site.findUnique({
      where: { id: body.siteId },
      select: { id: true, organizationId: true },
    })

    if (!site || site.organizationId !== organizationId) {
      throw new Error(`Site not found or access denied: ${body.siteId}`)
    }

    // SiteDemand を一括作成（トランザクション）
    const createdDemands: string[] = []

    const siteDemands = body.demands.map((demand) => ({
      organizationId,
      siteId: body.siteId,
      date: new Date(demand.date),
      tradeType: demand.taskName,
      requiredCount: demand.requiredCount,
      timeSlot: demand.timeSlots[0] || 'ALL_DAY', // 最初のタイムスロットを使用
      priority: demand.priority,
      sourceType: 'AI_PARSED' as const,
      sourceDocumentId: id,
      confidence: (planningDoc.rawExtractJson as any)?.confidence || 0.5,
      confirmationStatus: 'CONFIRMED' as const,
      note: demand.notes || null,
      createdBy: user.id,
    }))

    // 既存の同じドキュメントからの SiteDemand を削除
    await prisma.siteDemand.deleteMany({
      where: {
        sourceDocumentId: id,
      },
    })

    // 新規 SiteDemand を作成
    for (const demand of siteDemands) {
      const created = await prisma.siteDemand.create({
        data: demand,
        select: { id: true },
      })
      createdDemands.push(created.id)
    }

    // PlanningDocument のステータスを更新
    await prisma.planningDocument.update({
      where: { id },
      data: {
        parseStatus: 'CONFIRMED',
        siteId: body.siteId, // Site を紐付け
      },
    })

    logger.info('Planning document confirmed', {
      documentId: id,
      siteId: body.siteId,
      createdDemands: createdDemands.length,
      userId: user.id,
    })

    const response: ConfirmResponse = {
      documentId: id,
      confirmedCount: createdDemands.length,
      createdSiteDemands: createdDemands,
      parseStatus: 'CONFIRMED',
    }

    return response
  } catch (error) {
    logger.error('Planning document confirm error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    throw error
  }
})
