// server/api/planning-documents/[id]/parse-results.get.ts
// 工程表の解析結果を取得し、修正用インターフェースを準備

import { defineEventHandler, getQuery } from 'h3'
import { prisma } from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/authMiddleware'
import { logger } from '~/server/utils/logger'

interface ParseResultItem {
  index: number
  taskName: string
  requiredCount: number
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  timeSlots: string[]
  notes?: string
  confidence?: number
}

interface ParseResultsResponse {
  documentId: string
  fileName: string
  projectName?: string
  duration?: {
    startDate?: string
    endDate?: string
  }
  demands: ParseResultItem[]
  overallConfidence: number
  parseStatus: string
  uploadedAt: string
  warnings?: string[]
}

export default defineEventHandler(async (event) => {
  try {
    const user = await requireAuth(event)
    const organizationId = user.organizationId

    if (!organizationId) {
      throw new Error('User organization not found')
    }

    const { id } = event.context.params as { id: string }

    // ドキュメント取得
    const planningDoc = await prisma.planningDocument.findUnique({
      where: { id },
      select: {
        id: true,
        organizationId: true,
        fileName: true,
        parseStatus: true,
        rawExtractJson: true,
        uploadedAt: true,
        summaryText: true,
      },
    })

    if (!planningDoc) {
      throw new Error(`Planning document not found: ${id}`)
    }

    // 組織権限チェック
    if (planningDoc.organizationId !== organizationId) {
      throw new Error('Access denied: Organization mismatch')
    }

    // 解析結果が存在しない場合
    if (!planningDoc.rawExtractJson) {
      throw new Error('No parsed data available for this document')
    }

    // rawExtractJson から構造化データを抽出
    const extractedData = planningDoc.rawExtractJson as any
    const demands: ParseResultItem[] = (extractedData.demands || []).map(
      (demand: any, index: number) => ({
        index,
        taskName: demand.taskName || '',
        requiredCount: demand.requiredCount || 0,
        priority: demand.priority || 'MEDIUM',
        timeSlots: demand.timeSlots || ['ALL_DAY'],
        notes: demand.notes,
        confidence: demand.confidence,
      })
    )

    const response: ParseResultsResponse = {
      documentId: planningDoc.id,
      fileName: planningDoc.fileName,
      projectName: extractedData.projectName,
      duration: extractedData.duration,
      demands,
      overallConfidence: extractedData.confidence || 0.5,
      parseStatus: planningDoc.parseStatus,
      uploadedAt: planningDoc.uploadedAt.toISOString(),
      warnings: extractedData.warnings,
    }

    logger.info('Planning document parse results retrieved', {
      documentId: id,
      demandsCount: demands.length,
    })

    return response
  } catch (error) {
    logger.error('Planning document parse results error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    throw error
  }
})
