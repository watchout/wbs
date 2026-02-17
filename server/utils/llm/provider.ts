// server/utils/llm/provider.ts
// LLM プロバイダー共通インターフェース定義

export type LlmProviderType = 'claude' | 'openai' | 'gemini'

export interface LlmMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface LlmToolDefinition {
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, {
      type: string
      description: string
    }>
    required?: string[]
  }
}

export interface LlmToolCall {
  name: string
  arguments: Record<string, unknown>
}

export interface LlmResponse {
  content: string
  toolCalls?: LlmToolCall[]
  usage: {
    inputTokens: number
    outputTokens: number
  }
}

export interface LlmChatOptions {
  systemPrompt?: string
  tools?: LlmToolDefinition[]
  maxTokens?: number
  temperature?: number
}

export interface LlmProvider {
  readonly type: LlmProviderType

  chat(
    messages: LlmMessage[],
    options?: LlmChatOptions
  ): Promise<LlmResponse>
}

/** 利用可能なプロバイダーのデフォルトモデル */
export const DEFAULT_MODELS: Record<LlmProviderType, string> = {
  openai: 'gpt-4o-mini',
  claude: 'claude-sonnet-4-20250514',
  gemini: 'gemini-2.0-flash',
}

/** 利用可能なプロバイダーの環境変数キー */
export const PROVIDER_ENV_KEYS: Record<LlmProviderType, string> = {
  claude: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
  gemini: 'GOOGLE_AI_API_KEY',
}
