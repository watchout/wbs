// server/api/planning-documents/index.get.ts
// 工程表ドキュメント一覧取得

import { defineEventHandler } from 'h3'
import { prisma } from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/authMiddleware'
import { getUserOrganizationId } from '~/server/utils/authMiddleware'
import logger from '~/server/utils/logger'

interface DocumentListResponse {
  id: string
  fileName: string
  fileType: string
  fileSize: number
  parseStatus: string
  siteId?: string
  uploadedAt: string
  parsedAt?: string
  summaryText?: string
  confidence?: number
}

export default defineEventHandler(async (event) => {
  try {
    const user = await requireAuth(event)
    const organizationId = await getUserOrganizationId(user.id)

    if (!organizationId) {
      throw new Error('User organization not found')
    }

    // クエリパラメータ取得
    const query = getQuery(event)
    const siteId = query.siteId as string | undefined
    const status = query.status as string | undefined
    const limit = Math.min(parseInt(query.limit as string) || 20, 100)
    const offset = parseInt(query.offset as string) || 0

    // 条件を構築
    const where: any = { organizationId }
    if (siteId) {
      where.siteId = siteId
    }
    if (status) {
      where.parseStatus = status
    }

    // ドキュメント取得
    const documents = await prisma.planningDocument.findMany({
      where,
      select: {
        id: true,
        fileName: true,
        fileType: true,
        fileSize: true,
        parseStatus: true,
        siteId: true,
        uploadedAt: true,
        parsedAt: true,
        summaryText: true,
        rawExtractJson: true,
      },
      orderBy: { uploadedAt: 'desc' },
      take: limit,
      skip: offset,
    })

    // 総数取得
    const total = await prisma.planningDocument.count({ where })

    const response = {
      data: documents.map(
        (doc): DocumentListResponse => {
          let confidence: number | undefined
          if (doc.rawExtractJson && typeof doc.rawExtractJson === 'object') {
            confidence = (doc.rawExtractJson as any).confidence
          }

          return {
            id: doc.id,
            fileName: doc.fileName,
            fileType: doc.fileType,
            fileSize: doc.fileSize,
            parseStatus: doc.parseStatus,
            siteId: doc.siteId || undefined,
            uploadedAt: doc.uploadedAt.toISOString(),
            parsedAt: doc.parsedAt?.toISOString(),
            summaryText: doc.summaryText || undefined,
            confidence,
          }
        }
      ),
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + limit < total,
      },
    }

    logger.info('Planning documents retrieved', {
      organizationId,
      count: documents.length,
      total,
    })

    return response
  } catch (error) {
    logger.error('Planning documents list error', {
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
})
