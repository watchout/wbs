// server/utils/llm/factory.ts
// 組織のDB設定に基づいてLLMプロバイダーを生成するファクトリー

import type { LlmProvider, LlmProviderType } from './provider'
import { PROVIDER_ENV_KEYS } from './provider'
import { ClaudeProvider } from './claude'
import { OpenAiProvider } from './openai'
import { GeminiProvider } from './gemini'
import { prisma } from '../prisma'

/** フォールバック優先順（コスト効率順） */
const FALLBACK_ORDER: LlmProviderType[] = ['openai', 'gemini', 'claude']

/** 指定プロバイダーのAPIキーが設定されているか確認 */
export function hasApiKey(providerType: LlmProviderType): boolean {
  const envKey = PROVIDER_ENV_KEYS[providerType]
  const value = process.env[envKey]
  return typeof value === 'string' && value.length > 0
}

/** 利用可能なプロバイダー一覧を返す */
export function getAvailableProviders(): LlmProviderType[] {
  return FALLBACK_ORDER.filter((p) => hasApiKey(p))
}

/** プロバイダーインスタンスを生成（APIキー検証済み前提） */
function instantiateProvider(
  providerType: LlmProviderType,
  model?: string | null
): LlmProvider {
  const envKey = PROVIDER_ENV_KEYS[providerType]
  const apiKey = process.env[envKey]

  if (!apiKey) {
    throw new Error(`APIキーが未設定です: ${envKey}`)
  }

  switch (providerType) {
    case 'openai':
      return new OpenAiProvider(apiKey, model ?? undefined)
    case 'claude':
      return new ClaudeProvider(apiKey, model ?? undefined)
    case 'gemini':
      return new GeminiProvider(apiKey, model ?? undefined)
    default: {
      // exhaustive check
      const _never: never = providerType
      throw new Error(`未知のプロバイダー: ${String(_never)}`)
    }
  }
}

/**
 * 組織IDからLLMプロバイダーを生成する
 * - DB設定のプロバイダーを優先
 * - APIキー未設定の場合はフォールバック
 */
export async function createLlmProvider(
  organizationId: string
): Promise<LlmProvider> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { llmProvider: true, llmModel: true },
  })

  const preferredType = (org?.llmProvider ?? 'openai') as LlmProviderType
  const customModel = org?.llmModel ?? null

  // 希望するプロバイダーのAPIキーがあればそれを使う
  if (hasApiKey(preferredType)) {
    return instantiateProvider(preferredType, customModel)
  }

  // フォールバック: 利用可能な最初のプロバイダーを使う
  for (const fallback of FALLBACK_ORDER) {
    if (hasApiKey(fallback)) {
      return instantiateProvider(fallback, null)
    }
  }

  throw new Error(
    'LLMプロバイダーのAPIキーが1つも設定されていません。' +
    'OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_AI_API_KEY のいずれかを設定してください。'
  )
}

/**
 * LP用（認証なし）のLLMプロバイダーを生成する
 * フォールバック順で最初に利用可能なプロバイダーを使用
 */
export function createLpLlmProvider(): LlmProvider {
  for (const provider of FALLBACK_ORDER) {
    if (hasApiKey(provider)) {
      return instantiateProvider(provider, null)
    }
  }

  throw new Error(
    'LLMプロバイダーのAPIキーが1つも設定されていません。'
  )
}
