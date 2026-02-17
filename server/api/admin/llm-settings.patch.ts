// server/api/admin/llm-settings.patch.ts
// LLM設定更新API — ADMIN権限必須

import { createError, readBody } from 'h3'
import { requireAuth, requireAdmin } from '../../utils/authMiddleware'
import { prisma } from '../../utils/prisma'
import type { LlmProviderType } from '../../utils/llm/provider'

const VALID_PROVIDERS: LlmProviderType[] = ['claude', 'openai', 'gemini']

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)
  requireAdmin(auth)

  const body = await readBody(event)

  // バリデーション
  const llmProvider = body?.llmProvider
  if (!llmProvider || !VALID_PROVIDERS.includes(llmProvider as LlmProviderType)) {
    throw createError({
      statusCode: 400,
      statusMessage: `プロバイダーは ${VALID_PROVIDERS.join(', ')} のいずれかを指定してください`,
    })
  }

  const llmModel = typeof body?.llmModel === 'string' && body.llmModel.trim()
    ? body.llmModel.trim()
    : null

  // DB更新
  const updated = await prisma.organization.update({
    where: { id: auth.organizationId },
    data: {
      llmProvider: llmProvider as string,
      llmModel,
    },
    select: { llmProvider: true, llmModel: true },
  })

  return {
    success: true,
    data: {
      currentProvider: updated.llmProvider,
      currentModel: updated.llmModel,
    },
  }
})
