// server/api/admin/llm-settings.get.ts
// LLM設定取得API — ADMIN権限必須

import { requireAuth, requireAdmin } from '../../utils/authMiddleware'
import { prisma } from '../../utils/prisma'
import { getAvailableProviders } from '../../utils/llm/factory'
import { DEFAULT_MODELS, PROVIDER_ENV_KEYS } from '../../utils/llm/provider'
import type { LlmProviderType } from '../../utils/llm/provider'

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)
  requireAdmin(auth)

  const org = await prisma.organization.findUnique({
    where: { id: auth.organizationId },
    select: { llmProvider: true, llmModel: true },
  })

  const available = getAvailableProviders()
  const providerType = (org?.llmProvider ?? 'openai') as LlmProviderType

  // 各プロバイダーの状態を構築
  const providers = (['openai', 'claude', 'gemini'] as LlmProviderType[]).map((type) => ({
    type,
    name: type === 'openai' ? 'OpenAI (GPT-4o mini)' :
          type === 'claude' ? 'Claude (Sonnet)' :
          'Gemini (Flash)',
    defaultModel: DEFAULT_MODELS[type],
    envKey: PROVIDER_ENV_KEYS[type],
    isConfigured: available.includes(type),
  }))

  return {
    success: true,
    data: {
      currentProvider: providerType,
      currentModel: org?.llmModel ?? null,
      providers,
    },
  }
})
