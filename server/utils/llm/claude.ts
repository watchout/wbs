// server/utils/llm/claude.ts
// Anthropic Claude プロバイダー実装

import Anthropic from '@anthropic-ai/sdk'
import type {
  LlmProvider,
  LlmMessage,
  LlmChatOptions,
  LlmResponse,
  LlmToolCall,
} from './provider'
import { DEFAULT_MODELS } from './provider'

export class ClaudeProvider implements LlmProvider {
  readonly type = 'claude' as const
  private client: Anthropic
  private model: string

  constructor(apiKey: string, model?: string) {
    this.client = new Anthropic({ apiKey })
    this.model = model ?? DEFAULT_MODELS.claude
  }

  async chat(
    messages: LlmMessage[],
    options?: LlmChatOptions
  ): Promise<LlmResponse> {
    // Claude はシステムプロンプトを別パラメータで渡す
    const claudeMessages: Anthropic.MessageParam[] = []

    for (const msg of messages) {
      if (msg.role === 'system') {
        // system メッセージは systemPrompt に統合（Claude API の仕様）
        continue
      }
      claudeMessages.push({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })
    }

    // system メッセージを結合
    const systemParts: string[] = []
    if (options?.systemPrompt) {
      systemParts.push(options.systemPrompt)
    }
    for (const msg of messages) {
      if (msg.role === 'system') {
        systemParts.push(msg.content)
      }
    }

    const tools: Anthropic.Tool[] | undefined = options?.tools?.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: {
        type: 'object' as const,
        properties: t.parameters.properties,
        required: t.parameters.required,
      },
    }))

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: options?.maxTokens ?? 1024,
      system: systemParts.length > 0 ? systemParts.join('\n\n') : undefined,
      messages: claudeMessages,
      tools: tools && tools.length > 0 ? tools : undefined,
      temperature: options?.temperature ?? 0.7,
    })

    let content = ''
    const toolCalls: LlmToolCall[] = []

    for (const block of response.content) {
      if (block.type === 'text') {
        content += block.text
      } else if (block.type === 'tool_use') {
        toolCalls.push({
          name: block.name,
          arguments: block.input as Record<string, unknown>,
        })
      }
    }

    return {
      content,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    }
  }
}
