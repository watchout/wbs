// server/api/planning-documents/[id]/demands.post.ts
// 工程表の修正内容を記録し、SiteDemand に反映

import { defineEventHandler, readBody } from 'h3'
import { prisma } from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/authMiddleware'
import { getUserOrganizationId } from '~/server/utils/authMiddleware'
import { logger } from '~/server/utils/logger'

interface DemandRevision {
  demandId: string // 既存 SiteDemand ID
  fieldPath: string // 修正箇所（例: "requiredCount"）
  beforeValue: string | number
  afterValue: string | number
}

interface DemandsUpdateRequest {
  revisions: DemandRevision[]
}

interface DemandsUpdateResponse {
  documentId: string
  updatedDemands: number
  reviews: string[] // PlanningParseReview ID
}

export default defineEventHandler(async (event) => {
  try {
    const user = await requireAuth(event)
    const organizationId = user.organizationId

    if (!organizationId) {
      throw new Error('User organization not found')
    }

    const { id } = event.context.params as { id: string }
    const body = await readBody<DemandsUpdateRequest>(event)

    if (!Array.isArray(body.revisions) || body.revisions.length === 0) {
      throw new Error('Revisions array is required and must not be empty')
    }

    // ドキュメント取得
    const planningDoc = await prisma.planningDocument.findUnique({
      where: { id },
      select: {
        id: true,
        organizationId: true,
        parseStatus: true,
      },
    })

    if (!planningDoc) {
      throw new Error(`Planning document not found: ${id}`)
    }

    // 組織権限チェック
    if (planningDoc.organizationId !== organizationId) {
      throw new Error('Access denied: Organization mismatch')
    }

    // 確定前のみ修正可能
    if (planningDoc.parseStatus === 'PARSED') {
      throw new Error('Cannot modify confirmed document')
    }

    const updatedDemandIds: string[] = []
    const reviewIds: string[] = []

    // 各修正を処理
    for (const revision of body.revisions) {
      // SiteDemand 取得
      const siteDemand = await prisma.siteDemand.findUnique({
        where: { id: revision.demandId },
        select: {
          id: true,
          organizationId: true,
          sourceDocumentId: true,
        },
      })

      if (!siteDemand) {
        logger.warn('SiteDemand not found', { demandId: revision.demandId })
        continue
      }

      // 権限チェック（同一組織のドキュメント由来）
      if (siteDemand.organizationId !== organizationId || siteDemand.sourceDocumentId !== id) {
        logger.warn('SiteDemand access denied', { demandId: revision.demandId })
        continue
      }

      // SiteDemand を更新
      const updateData: any = {}
      const fieldMap: { [key: string]: string } = {
        requiredCount: 'requiredCount',
        taskName: 'tradeType',
        priority: 'priority',
        timeSlot: 'timeSlot',
        notes: 'note',
      }

      const dbField = fieldMap[revision.fieldPath]
      if (!dbField) {
        logger.warn('Unknown field path', { fieldPath: revision.fieldPath })
        continue
      }

      // 型変換
      let parsedValue: any = revision.afterValue
      if (dbField === 'requiredCount') {
        parsedValue = parseInt(String(revision.afterValue), 10)
        if (isNaN(parsedValue) || parsedValue < 0) {
          logger.warn('Invalid requiredCount', { value: revision.afterValue })
          continue
        }
      }

      updateData[dbField] = parsedValue
      updateData.updatedBy = user.userId || ''

      // SiteDemand 更新
      await prisma.siteDemand.update({
        where: { id: revision.demandId },
        data: updateData,
      })

      updatedDemandIds.push(revision.demandId)

      // PlanningParseReview に記録
      const review = await prisma.planningParseReview.create({
        data: {
          documentId: id,
          fieldPath: revision.fieldPath,
          beforeValue: String(revision.beforeValue),
          afterValue: String(revision.afterValue),
          reviewedBy: user.userId || '',
        },
        select: { id: true },
      })

      reviewIds.push(review.id)
    }

    logger.info('Planning document demands updated', {
      documentId: id,
      updatedCount: updatedDemandIds.length,
      reviewCount: reviewIds.length,
      userId: user.userId,
    })

    const response: DemandsUpdateResponse = {
      documentId: id,
      updatedDemands: updatedDemandIds.length,
      reviews: reviewIds,
    }

    return response
  } catch (error) {
    logger.error('Planning document demands update error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    throw error
  }
})
