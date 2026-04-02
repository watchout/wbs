// server/api/planning-documents/parse.post.ts
// 工程表画像をアップロードしてAI解析するエンドポイント

import { defineEventHandler, readMultipartFormData, sendError } from 'h3'
import { prisma } from '~/server/utils/prisma'
import { visionParser } from '~/server/utils/visionParser'
import { logger } from '~/server/utils/logger'
import { requireAuth } from '~/server/utils/authMiddleware'
import type { PlanningDocumentParseResult } from '~/server/utils/visionParser'
import * as fs from 'fs'
import * as path from 'path'

interface ParseRequest {
  organizationId: string
  siteId?: string
  fileName: string
  fileSize: number
  fileData: Buffer
}

interface ParseResponse {
  documentId: string
  parseStatus: string
  extractedData: PlanningDocumentParseResult
  warnings?: string[]
}

export default defineEventHandler(async (event) => {
  try {
    // 認証チェック
    const user = await requireAuth(event)

    // フォームデータを読み込む
    const form = await readMultipartFormData(event)
    if (!form) {
      return sendError(event, new Error('No form data provided'))
    }

    // 必須フィールドを取得
    const organizationIdField = form.find((f) => f.name === 'organizationId')
    const fileField = form.find((f) => f.name === 'file')
    const siteIdField = form.find((f) => f.name === 'siteId')

    if (!organizationIdField || !fileField) {
      return sendError(
        event,
        new Error('Missing required fields: organizationId, file')
      )
    }

    const organizationId = organizationIdField.data?.toString()
    const siteId = siteIdField?.data?.toString()
    const fileName = fileField.filename || 'planning_document'
    const fileData = fileField.data as Buffer
    const fileSize = fileData.length

    if (fileSize === 0) {
      return sendError(event, new Error('File is empty'))
    }

    // ファイルタイプをチェック
    const fileExt = path.extname(fileName).toLowerCase()
    const supportedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf']
    if (!supportedExts.includes(fileExt)) {
      return sendError(
        event,
        new Error(
          `Unsupported file type: ${fileExt}. Supported: ${supportedExts.join(', ')}`
        )
      )
    }

    // ファイルサイズチェック（最大20MB）
    const MAX_FILE_SIZE = 20 * 1024 * 1024
    if (fileSize > MAX_FILE_SIZE) {
      return sendError(
        event,
        new Error(`File size exceeds limit: ${fileSize} > ${MAX_FILE_SIZE}`)
      )
    }

    logger.info('Planning document parse request', {
      organizationId,
      siteId,
      fileName,
      fileSize,
      userId: user.userId,
    })

    // 一時ファイルに保存
    const tempDir = process.env.TEMP_DIR || '/tmp'
    const tempFileName = `planning_${Date.now()}_${Math.random().toString(36).substring(7)}${fileExt}`
    const tempPath = path.join(tempDir, tempFileName)

    await new Promise<void>((resolve, reject) => {
      fs.writeFile(tempPath, fileData, (err) => {
        if (err) reject(err)
        else resolve()
      })
    })

    try {
      // Vision AIで解析
      const parseResult = await visionParser.parseImage(tempPath, false)

      // DBに PlanningDocument レコードを作成
      const storageSubdir = `planning_documents/${organizationId}`
      const storagePath = path.join(storageSubdir, `${Date.now()}_${fileName}`)

      const planningDoc = await prisma.planningDocument.create({
        data: {
          organizationId,
          siteId: siteId || undefined,
          fileName,
          fileType: fileExt.toLowerCase().includes('pdf') ? 'PDF' : 'IMAGE',
          storagePath,
          fileSize,
          parseStatus: 'PARSED',
          parserVersion: 'claude-sonnet-4-vision-v1',
          rawExtractJson: JSON.parse(JSON.stringify(parseResult)),
          summaryText: generateSummary(parseResult),
          uploadedBy: user.userId || '',
          parsedAt: new Date(),
        },
      })

      logger.info('Planning document parsed successfully', {
        documentId: planningDoc.id,
        extractedDemands: parseResult.demands.length,
        confidence: parseResult.confidence,
      })

      const response: ParseResponse = {
        documentId: planningDoc.id,
        parseStatus: planningDoc.parseStatus,
        extractedData: parseResult,
      }

      return response
    } finally {
      // 一時ファイルを削除
      fs.unlink(tempPath, (err) => {
        if (err) {
          logger.warn('Failed to delete temp file', { tempPath, error: err.message })
        }
      })
    }
  } catch (error) {
    logger.error('Planning document parse error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    return sendError(event, error as Error)
  }
})

/**
 * 解析結果から人が読みやすい要約を生成
 */
function generateSummary(result: PlanningDocumentParseResult): string {
  const lines: string[] = []

  if (result.projectName) {
    lines.push(`プロジェクト：${result.projectName}`)
  }

  if (result.duration?.startDate && result.duration?.endDate) {
    lines.push(`工期：${result.duration.startDate} ～ ${result.duration.endDate}`)
  }

  lines.push(`\n【抽出された作業（${result.demands.length}件）】`)
  for (const demand of result.demands) {
    lines.push(
      `・${demand.taskName}（必要人数：${demand.requiredCount}名、優先度：${demand.priority}）`
    )
    if (demand.notes) {
      lines.push(`  ${demand.notes}`)
    }
  }

  if (result.warnings && result.warnings.length > 0) {
    lines.push(`\n【注意事項】`)
    for (const warning of result.warnings) {
      lines.push(`・${warning}`)
    }
  }

  lines.push(`\n信頼度：${(result.confidence * 100).toFixed(1)}%`)

  return lines.join('\n')
}
