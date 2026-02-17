// server/utils/llm/openai.ts
// OpenAI GPT プロバイダー実装

import OpenAI from 'openai'
import type {
  LlmProvider,
  LlmMessage,
  LlmChatOptions,
  LlmResponse,
  LlmToolCall,
} from './provider'
import { DEFAULT_MODELS } from './provider'

export class OpenAiProvider implements LlmProvider {
  readonly type = 'openai' as const
  private client: OpenAI
  private model: string

  constructor(apiKey: string, model?: string) {
    this.client = new OpenAI({ apiKey })
    this.model = model ?? DEFAULT_MODELS.openai
  }

  async chat(
    messages: LlmMessage[],
    options?: LlmChatOptions
  ): Promise<LlmResponse> {
    const openaiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = []

    if (options?.systemPrompt) {
      openaiMessages.push({
        role: 'system' as const,
        content: options.systemPrompt,
      })
    }

    for (const msg of messages) {
      if (msg.role === 'system') {
        openaiMessages.push({ role: 'system' as const, content: msg.content })
      } else if (msg.role === 'assistant') {
        openaiMessages.push({ role: 'assistant' as const, content: msg.content })
      } else {
        openaiMessages.push({ role: 'user' as const, content: msg.content })
      }
    }

    const tools: OpenAI.Chat.Completions.ChatCompletionTool[] | undefined =
      options?.tools?.map((t) => ({
        type: 'function' as const,
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters as Record<string, unknown>,
        },
      }))

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: openaiMessages,
      tools: tools && tools.length > 0 ? tools : undefined,
      max_tokens: options?.maxTokens ?? 1024,
      temperature: options?.temperature ?? 0.7,
    })

    const choice = response.choices[0]
    const toolCalls: LlmToolCall[] = []

    if (choice?.message?.tool_calls) {
      for (const tc of choice.message.tool_calls) {
        // OpenAI v6: tool_call が function type の場合のみ処理
        if ('function' in tc && tc.function) {
          toolCalls.push({
            name: tc.function.name,
            arguments: JSON.parse(tc.function.arguments) as Record<string, unknown>,
          })
        }
      }
    }

    return {
      content: choice?.message?.content ?? '',
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage: {
        inputTokens: response.usage?.prompt_tokens ?? 0,
        outputTokens: response.usage?.completion_tokens ?? 0,
      },
    }
  }
}
