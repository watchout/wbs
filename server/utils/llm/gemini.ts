// server/utils/llm/gemini.ts
// Google Gemini プロバイダー実装

import {
  GoogleGenerativeAI,
  SchemaType,
  type FunctionDeclaration,
  type FunctionDeclarationSchema,
} from '@google/generative-ai'
import type {
  LlmProvider,
  LlmMessage,
  LlmChatOptions,
  LlmResponse,
  LlmToolCall,
} from './provider'
import { DEFAULT_MODELS } from './provider'

/** LlmToolDefinition のプロパティ型を Gemini SchemaType に変換 */
function toSchemaType(typeStr: string): SchemaType {
  switch (typeStr.toLowerCase()) {
    case 'string': return SchemaType.STRING
    case 'number': return SchemaType.NUMBER
    case 'integer': return SchemaType.INTEGER
    case 'boolean': return SchemaType.BOOLEAN
    case 'array': return SchemaType.ARRAY
    case 'object': return SchemaType.OBJECT
    default: return SchemaType.STRING
  }
}

export class GeminiProvider implements LlmProvider {
  readonly type = 'gemini' as const
  private genAI: GoogleGenerativeAI
  private model: string

  constructor(apiKey: string, model?: string) {
    this.genAI = new GoogleGenerativeAI(apiKey)
    this.model = model ?? DEFAULT_MODELS.gemini
  }

  async chat(
    messages: LlmMessage[],
    options?: LlmChatOptions
  ): Promise<LlmResponse> {
    const toolDeclarations: FunctionDeclaration[] | undefined =
      options?.tools?.map((t) => ({
        name: t.name,
        description: t.description,
        parameters: {
          type: SchemaType.OBJECT,
          properties: Object.fromEntries(
            Object.entries(t.parameters.properties).map(([key, val]) => [
              key,
              { type: toSchemaType(val.type), description: val.description },
            ])
          ),
          required: t.parameters.required ?? [],
        } as FunctionDeclarationSchema,
      }))

    const generativeModel = this.genAI.getGenerativeModel({
      model: this.model,
      systemInstruction: options?.systemPrompt ?? undefined,
      tools: toolDeclarations && toolDeclarations.length > 0
        ? [{ functionDeclarations: toolDeclarations }]
        : undefined,
      generationConfig: {
        maxOutputTokens: options?.maxTokens ?? 1024,
        temperature: options?.temperature ?? 0.7,
      },
    })

    // Gemini の会話形式に変換
    const history = messages.slice(0, -1).map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }))

    const lastMessage = messages[messages.length - 1]
    const chat = generativeModel.startChat({ history })
    const result = await chat.sendMessage(lastMessage?.content ?? '')

    const response = result.response
    const toolCalls: LlmToolCall[] = []
    let content = ''

    for (const candidate of response.candidates ?? []) {
      for (const part of candidate.content?.parts ?? []) {
        if ('text' in part && part.text) {
          content += part.text
        }
        if ('functionCall' in part && part.functionCall) {
          toolCalls.push({
            name: part.functionCall.name,
            arguments: (part.functionCall.args ?? {}) as Record<string, unknown>,
          })
        }
      }
    }

    // Gemini は usage metadata が異なる
    const usageMetadata = response.usageMetadata

    return {
      content,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage: {
        inputTokens: usageMetadata?.promptTokenCount ?? 0,
        outputTokens: usageMetadata?.candidatesTokenCount ?? 0,
      },
    }
  }
}
