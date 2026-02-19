// server/utils/llm/llm-providers.test.ts
// LLM プロバイダー実装 + ツール ユニットテスト

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ===== SDK モック =====

const mockClaudeCreate = vi.hoisted(() =>
  vi.fn()
)

const mockOpenAiCreate = vi.hoisted(() =>
  vi.fn()
)

const mockGeminiSendMessage = vi.hoisted(() =>
  vi.fn()
)

const mockStartChat = vi.hoisted(() =>
  vi.fn().mockReturnValue({ sendMessage: mockGeminiSendMessage })
)

const mockGetGenerativeModel = vi.hoisted(() =>
  vi.fn().mockReturnValue({ startChat: mockStartChat })
)

const mockPrisma = vi.hoisted(() => ({
  schedule: {
    findMany: vi.fn(),
  },
  user: {
    findMany: vi.fn(),
  },
}))

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: mockClaudeCreate },
  })),
}))

vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: { completions: { create: mockOpenAiCreate } },
  })),
}))

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: mockGetGenerativeModel,
  })),
  SchemaType: {
    STRING: 'STRING',
    NUMBER: 'NUMBER',
    INTEGER: 'INTEGER',
    BOOLEAN: 'BOOLEAN',
    ARRAY: 'ARRAY',
    OBJECT: 'OBJECT',
  },
}))

vi.mock('~/server/utils/prisma', () => ({
  prisma: mockPrisma,
}))

// ===== インポート =====

import {
  DEFAULT_MODELS,
  PROVIDER_ENV_KEYS,
  type LlmMessage,
  type LlmChatOptions,
} from './provider'
import { ClaudeProvider } from './claude'
import { OpenAiProvider } from './openai'
import { GeminiProvider } from './gemini'
import {
  ASSISTANT_TOOLS,
  BUSINESS_SYSTEM_PROMPT,
  LP_SYSTEM_PROMPT,
  executeTool,
} from './tools'

// ===================================================================
//  provider.ts 定数
// ===================================================================
describe('provider.ts 定数', () => {
  describe('DEFAULT_MODELS', () => {
    it('claude のデフォルトモデルが定義されている', () => {
      expect(DEFAULT_MODELS.claude).toBeDefined()
      expect(typeof DEFAULT_MODELS.claude).toBe('string')
    })

    it('openai のデフォルトモデルが定義されている', () => {
      expect(DEFAULT_MODELS.openai).toBeDefined()
      expect(typeof DEFAULT_MODELS.openai).toBe('string')
    })

    it('gemini のデフォルトモデルが定義されている', () => {
      expect(DEFAULT_MODELS.gemini).toBeDefined()
      expect(typeof DEFAULT_MODELS.gemini).toBe('string')
    })

    it('3プロバイダー分のエントリが存在する', () => {
      expect(Object.keys(DEFAULT_MODELS)).toHaveLength(3)
    })
  })

  describe('PROVIDER_ENV_KEYS', () => {
    it('claude は ANTHROPIC_API_KEY にマッピングされる', () => {
      expect(PROVIDER_ENV_KEYS.claude).toBe('ANTHROPIC_API_KEY')
    })

    it('openai は OPENAI_API_KEY にマッピングされる', () => {
      expect(PROVIDER_ENV_KEYS.openai).toBe('OPENAI_API_KEY')
    })

    it('gemini は GOOGLE_AI_API_KEY にマッピングされる', () => {
      expect(PROVIDER_ENV_KEYS.gemini).toBe('GOOGLE_AI_API_KEY')
    })
  })
})

// ===================================================================
//  ClaudeProvider
// ===================================================================
describe('ClaudeProvider', () => {
  let provider: ClaudeProvider

  beforeEach(() => {
    vi.clearAllMocks()
    provider = new ClaudeProvider('test-api-key')
  })

  it('type が "claude" に設定される', () => {
    expect(provider.type).toBe('claude')
  })

  it('カスタムモデルを指定できる', () => {
    const custom = new ClaudeProvider('key', 'claude-3-haiku')
    expect(custom.type).toBe('claude')
  })

  describe('chat()', () => {
    const baseResponse = {
      content: [{ type: 'text', text: 'こんにちは' }],
      usage: { input_tokens: 10, output_tokens: 20 },
    }

    beforeEach(() => {
      mockClaudeCreate.mockResolvedValue(baseResponse)
    })

    it('client.messages.create を正しいパラメータで呼び出す', async () => {
      const messages: LlmMessage[] = [
        { role: 'user', content: 'テスト' },
      ]

      await provider.chat(messages)

      expect(mockClaudeCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: DEFAULT_MODELS.claude,
          max_tokens: 1024,
          temperature: 0.7,
          messages: [{ role: 'user', content: 'テスト' }],
        })
      )
    })

    it('system メッセージは messages 配列から除外される', async () => {
      const messages: LlmMessage[] = [
        { role: 'system', content: 'あなたはアシスタントです' },
        { role: 'user', content: 'こんにちは' },
      ]

      await provider.chat(messages)

      const callArgs = mockClaudeCreate.mock.calls[0][0]
      const messageRoles = callArgs.messages.map(
        (m: { role: string }) => m.role
      )
      expect(messageRoles).not.toContain('system')
      expect(callArgs.messages).toHaveLength(1)
      expect(callArgs.messages[0].role).toBe('user')
    })

    it('system メッセージは system パラメータに統合される', async () => {
      const messages: LlmMessage[] = [
        { role: 'system', content: 'システム指示1' },
        { role: 'user', content: 'ユーザーメッセージ' },
      ]

      await provider.chat(messages)

      const callArgs = mockClaudeCreate.mock.calls[0][0]
      expect(callArgs.system).toContain('システム指示1')
    })

    it('options.systemPrompt と system メッセージが結合される', async () => {
      const messages: LlmMessage[] = [
        { role: 'system', content: 'メッセージ内システム' },
        { role: 'user', content: 'ユーザー' },
      ]
      const options: LlmChatOptions = {
        systemPrompt: 'オプションシステム',
      }

      await provider.chat(messages, options)

      const callArgs = mockClaudeCreate.mock.calls[0][0]
      expect(callArgs.system).toContain('オプションシステム')
      expect(callArgs.system).toContain('メッセージ内システム')
    })

    it('systemPrompt がオプションに含まれ、system メッセージがない場合', async () => {
      const messages: LlmMessage[] = [
        { role: 'user', content: 'テスト' },
      ]
      const options: LlmChatOptions = {
        systemPrompt: 'カスタムプロンプト',
      }

      await provider.chat(messages, options)

      const callArgs = mockClaudeCreate.mock.calls[0][0]
      expect(callArgs.system).toBe('カスタムプロンプト')
    })

    it('text ブロックが content に連結される', async () => {
      mockClaudeCreate.mockResolvedValue({
        content: [
          { type: 'text', text: 'パート1' },
          { type: 'text', text: 'パート2' },
        ],
        usage: { input_tokens: 5, output_tokens: 10 },
      })

      const result = await provider.chat([{ role: 'user', content: 'test' }])
      expect(result.content).toBe('パート1パート2')
    })

    it('tool_use ブロックが toolCalls にマッピングされる', async () => {
      mockClaudeCreate.mockResolvedValue({
        content: [
          {
            type: 'tool_use',
            name: 'search_schedules',
            input: { startDate: '2026-01-01' },
          },
        ],
        usage: { input_tokens: 15, output_tokens: 25 },
      })

      const result = await provider.chat([{ role: 'user', content: 'test' }])
      expect(result.toolCalls).toBeDefined()
      expect(result.toolCalls).toHaveLength(1)
      expect(result.toolCalls![0].name).toBe('search_schedules')
      expect(result.toolCalls![0].arguments).toEqual({ startDate: '2026-01-01' })
    })

    it('tool_use がない場合は toolCalls が undefined', async () => {
      const result = await provider.chat([{ role: 'user', content: 'test' }])
      expect(result.toolCalls).toBeUndefined()
    })

    it('text と tool_use が混在する場合に両方返される', async () => {
      mockClaudeCreate.mockResolvedValue({
        content: [
          { type: 'text', text: '検索します' },
          {
            type: 'tool_use',
            name: 'search_users',
            input: { name: '田中' },
          },
        ],
        usage: { input_tokens: 10, output_tokens: 20 },
      })

      const result = await provider.chat([{ role: 'user', content: 'test' }])
      expect(result.content).toBe('検索します')
      expect(result.toolCalls).toHaveLength(1)
      expect(result.toolCalls![0].name).toBe('search_users')
    })

    it('usage が input_tokens / output_tokens から正しくマッピングされる', async () => {
      const result = await provider.chat([{ role: 'user', content: 'test' }])
      expect(result.usage).toEqual({
        inputTokens: 10,
        outputTokens: 20,
      })
    })

    it('デフォルト maxTokens = 1024, temperature = 0.7', async () => {
      await provider.chat([{ role: 'user', content: 'test' }])

      const callArgs = mockClaudeCreate.mock.calls[0][0]
      expect(callArgs.max_tokens).toBe(1024)
      expect(callArgs.temperature).toBe(0.7)
    })

    it('カスタム maxTokens / temperature が渡される', async () => {
      await provider.chat([{ role: 'user', content: 'test' }], {
        maxTokens: 2048,
        temperature: 0.3,
      })

      const callArgs = mockClaudeCreate.mock.calls[0][0]
      expect(callArgs.max_tokens).toBe(2048)
      expect(callArgs.temperature).toBe(0.3)
    })

    it('tools が正しい形式で渡される', async () => {
      const tools = [
        {
          name: 'my_tool',
          description: 'テストツール',
          parameters: {
            type: 'object' as const,
            properties: {
              query: { type: 'string', description: '検索クエリ' },
            },
            required: ['query'],
          },
        },
      ]

      await provider.chat([{ role: 'user', content: 'test' }], { tools })

      const callArgs = mockClaudeCreate.mock.calls[0][0]
      expect(callArgs.tools).toBeDefined()
      expect(callArgs.tools[0].name).toBe('my_tool')
      expect(callArgs.tools[0].input_schema.type).toBe('object')
      expect(callArgs.tools[0].input_schema.required).toEqual(['query'])
    })

    it('tools が空配列の場合は undefined になる', async () => {
      await provider.chat([{ role: 'user', content: 'test' }], { tools: [] })

      const callArgs = mockClaudeCreate.mock.calls[0][0]
      expect(callArgs.tools).toBeUndefined()
    })

    it('system メッセージもオプション systemPrompt もない場合は system が undefined', async () => {
      await provider.chat([{ role: 'user', content: 'test' }])

      const callArgs = mockClaudeCreate.mock.calls[0][0]
      expect(callArgs.system).toBeUndefined()
    })
  })
})

// ===================================================================
//  OpenAiProvider
// ===================================================================
describe('OpenAiProvider', () => {
  let provider: OpenAiProvider

  beforeEach(() => {
    vi.clearAllMocks()
    provider = new OpenAiProvider('test-api-key')
  })

  it('type が "openai" に設定される', () => {
    expect(provider.type).toBe('openai')
  })

  it('カスタムモデルを指定できる', () => {
    const custom = new OpenAiProvider('key', 'gpt-4-turbo')
    expect(custom.type).toBe('openai')
  })

  describe('chat()', () => {
    const baseResponse = {
      choices: [
        {
          message: {
            content: '応答テキスト',
            tool_calls: undefined,
          },
        },
      ],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 20,
      },
    }

    beforeEach(() => {
      mockOpenAiCreate.mockResolvedValue(baseResponse)
    })

    it('client.chat.completions.create を呼び出す', async () => {
      await provider.chat([{ role: 'user', content: 'テスト' }])

      expect(mockOpenAiCreate).toHaveBeenCalledTimes(1)
      expect(mockOpenAiCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: DEFAULT_MODELS.openai,
          max_tokens: 1024,
          temperature: 0.7,
        })
      )
    })

    it('system メッセージは messages 配列に残る', async () => {
      const messages: LlmMessage[] = [
        { role: 'system', content: 'システム指示' },
        { role: 'user', content: 'ユーザー' },
      ]

      await provider.chat(messages)

      const callArgs = mockOpenAiCreate.mock.calls[0][0]
      expect(callArgs.messages).toHaveLength(2)
      expect(callArgs.messages[0]).toEqual({
        role: 'system',
        content: 'システム指示',
      })
      expect(callArgs.messages[1]).toEqual({
        role: 'user',
        content: 'ユーザー',
      })
    })

    it('systemPrompt が messages の先頭に追加される', async () => {
      const messages: LlmMessage[] = [
        { role: 'user', content: 'ユーザー' },
      ]
      const options: LlmChatOptions = {
        systemPrompt: 'カスタムプロンプト',
      }

      await provider.chat(messages, options)

      const callArgs = mockOpenAiCreate.mock.calls[0][0]
      expect(callArgs.messages[0]).toEqual({
        role: 'system',
        content: 'カスタムプロンプト',
      })
    })

    it('systemPrompt と system メッセージの両方が messages に含まれる', async () => {
      const messages: LlmMessage[] = [
        { role: 'system', content: 'メッセージ内システム' },
        { role: 'user', content: 'ユーザー' },
      ]
      const options: LlmChatOptions = {
        systemPrompt: 'オプションシステム',
      }

      await provider.chat(messages, options)

      const callArgs = mockOpenAiCreate.mock.calls[0][0]
      // systemPrompt が先頭、続いて system メッセージ、user メッセージ
      expect(callArgs.messages[0].content).toBe('オプションシステム')
      expect(callArgs.messages[1].content).toBe('メッセージ内システム')
      expect(callArgs.messages[2].content).toBe('ユーザー')
    })

    it('function 型の tool_calls がパースされる', async () => {
      mockOpenAiCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: null,
              tool_calls: [
                {
                  type: 'function',
                  function: {
                    name: 'search_schedules',
                    arguments: '{"startDate":"2026-01-01"}',
                  },
                },
              ],
            },
          },
        ],
        usage: { prompt_tokens: 15, completion_tokens: 25 },
      })

      const result = await provider.chat([{ role: 'user', content: 'test' }])
      expect(result.toolCalls).toBeDefined()
      expect(result.toolCalls).toHaveLength(1)
      expect(result.toolCalls![0].name).toBe('search_schedules')
      expect(result.toolCalls![0].arguments).toEqual({
        startDate: '2026-01-01',
      })
    })

    it('arguments が JSON.parse される', async () => {
      mockOpenAiCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: '',
              tool_calls: [
                {
                  type: 'function',
                  function: {
                    name: 'search_users',
                    arguments: '{"name":"田中","departmentName":"営業部"}',
                  },
                },
              ],
            },
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 15 },
      })

      const result = await provider.chat([{ role: 'user', content: 'test' }])
      expect(result.toolCalls![0].arguments).toEqual({
        name: '田中',
        departmentName: '営業部',
      })
    })

    it('tool_calls がない場合は toolCalls が undefined', async () => {
      const result = await provider.chat([{ role: 'user', content: 'test' }])
      expect(result.toolCalls).toBeUndefined()
    })

    it('usage が prompt_tokens / completion_tokens からマッピングされる', async () => {
      const result = await provider.chat([{ role: 'user', content: 'test' }])
      expect(result.usage).toEqual({
        inputTokens: 10,
        outputTokens: 20,
      })
    })

    it('usage が undefined の場合は 0 が設定される', async () => {
      mockOpenAiCreate.mockResolvedValue({
        choices: [{ message: { content: 'ok' } }],
        usage: undefined,
      })

      const result = await provider.chat([{ role: 'user', content: 'test' }])
      expect(result.usage).toEqual({
        inputTokens: 0,
        outputTokens: 0,
      })
    })

    it('content が null の場合は空文字が返される', async () => {
      mockOpenAiCreate.mockResolvedValue({
        choices: [
          {
            message: { content: null },
          },
        ],
        usage: { prompt_tokens: 5, completion_tokens: 0 },
      })

      const result = await provider.chat([{ role: 'user', content: 'test' }])
      expect(result.content).toBe('')
    })

    it('assistant ロールが正しくマッピングされる', async () => {
      const messages: LlmMessage[] = [
        { role: 'user', content: 'こんにちは' },
        { role: 'assistant', content: 'はい' },
        { role: 'user', content: 'ありがとう' },
      ]

      await provider.chat(messages)

      const callArgs = mockOpenAiCreate.mock.calls[0][0]
      expect(callArgs.messages[0].role).toBe('user')
      expect(callArgs.messages[1].role).toBe('assistant')
      expect(callArgs.messages[2].role).toBe('user')
    })

    it('カスタム maxTokens / temperature が渡される', async () => {
      await provider.chat([{ role: 'user', content: 'test' }], {
        maxTokens: 4096,
        temperature: 0.1,
      })

      const callArgs = mockOpenAiCreate.mock.calls[0][0]
      expect(callArgs.max_tokens).toBe(4096)
      expect(callArgs.temperature).toBe(0.1)
    })

    it('tools が OpenAI 形式で渡される', async () => {
      const tools = [
        {
          name: 'my_tool',
          description: 'テストツール',
          parameters: {
            type: 'object' as const,
            properties: {
              query: { type: 'string', description: '検索' },
            },
          },
        },
      ]

      await provider.chat([{ role: 'user', content: 'test' }], { tools })

      const callArgs = mockOpenAiCreate.mock.calls[0][0]
      expect(callArgs.tools).toBeDefined()
      expect(callArgs.tools[0].type).toBe('function')
      expect(callArgs.tools[0].function.name).toBe('my_tool')
    })

    it('tools が空配列の場合は undefined になる', async () => {
      await provider.chat([{ role: 'user', content: 'test' }], { tools: [] })

      const callArgs = mockOpenAiCreate.mock.calls[0][0]
      expect(callArgs.tools).toBeUndefined()
    })
  })
})

// ===================================================================
//  GeminiProvider
// ===================================================================
describe('GeminiProvider', () => {
  let provider: GeminiProvider

  beforeEach(() => {
    vi.clearAllMocks()
    provider = new GeminiProvider('test-api-key')
  })

  it('type が "gemini" に設定される', () => {
    expect(provider.type).toBe('gemini')
  })

  it('カスタムモデルを指定できる', () => {
    const custom = new GeminiProvider('key', 'gemini-1.5-pro')
    expect(custom.type).toBe('gemini')
  })

  describe('chat()', () => {
    const baseGeminiResponse = {
      response: {
        candidates: [
          {
            content: {
              parts: [{ text: 'Gemini 応答' }],
            },
          },
        ],
        usageMetadata: {
          promptTokenCount: 12,
          candidatesTokenCount: 18,
        },
      },
    }

    beforeEach(() => {
      mockGeminiSendMessage.mockResolvedValue(baseGeminiResponse)
    })

    it('getGenerativeModel を正しい設定で呼び出す', async () => {
      await provider.chat(
        [{ role: 'user', content: 'テスト' }],
        { systemPrompt: 'システム指示' }
      )

      expect(mockGetGenerativeModel).toHaveBeenCalledWith(
        expect.objectContaining({
          model: DEFAULT_MODELS.gemini,
          systemInstruction: 'システム指示',
          generationConfig: {
            maxOutputTokens: 1024,
            temperature: 0.7,
          },
        })
      )
    })

    it('history から最後のメッセージが除外される', async () => {
      const messages: LlmMessage[] = [
        { role: 'user', content: 'メッセージ1' },
        { role: 'assistant', content: 'メッセージ2' },
        { role: 'user', content: 'メッセージ3' },
      ]

      await provider.chat(messages)

      expect(mockStartChat).toHaveBeenCalledWith({
        history: [
          { role: 'user', parts: [{ text: 'メッセージ1' }] },
          { role: 'model', parts: [{ text: 'メッセージ2' }] },
        ],
      })
    })

    it('assistant ロールが model ロールに変換される', async () => {
      const messages: LlmMessage[] = [
        { role: 'user', content: '質問' },
        { role: 'assistant', content: '回答' },
        { role: 'user', content: '最後の質問' },
      ]

      await provider.chat(messages)

      const historyArg = mockStartChat.mock.calls[0][0].history
      expect(historyArg[1].role).toBe('model')
    })

    it('最後のメッセージが sendMessage に渡される', async () => {
      await provider.chat([
        { role: 'user', content: '最初' },
        { role: 'user', content: '最後のメッセージ' },
      ])

      expect(mockGeminiSendMessage).toHaveBeenCalledWith('最後のメッセージ')
    })

    it('text パーツが content に連結される', async () => {
      mockGeminiSendMessage.mockResolvedValue({
        response: {
          candidates: [
            {
              content: {
                parts: [
                  { text: 'パートA' },
                  { text: 'パートB' },
                ],
              },
            },
          ],
          usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 10 },
        },
      })

      const result = await provider.chat([{ role: 'user', content: 'test' }])
      expect(result.content).toBe('パートAパートB')
    })

    it('functionCall パーツが toolCalls にマッピングされる', async () => {
      mockGeminiSendMessage.mockResolvedValue({
        response: {
          candidates: [
            {
              content: {
                parts: [
                  {
                    functionCall: {
                      name: 'search_schedules',
                      args: { startDate: '2026-02-01' },
                    },
                  },
                ],
              },
            },
          ],
          usageMetadata: { promptTokenCount: 8, candidatesTokenCount: 12 },
        },
      })

      const result = await provider.chat([{ role: 'user', content: 'test' }])
      expect(result.toolCalls).toBeDefined()
      expect(result.toolCalls).toHaveLength(1)
      expect(result.toolCalls![0].name).toBe('search_schedules')
      expect(result.toolCalls![0].arguments).toEqual({ startDate: '2026-02-01' })
    })

    it('functionCall.args が null の場合は空オブジェクトになる', async () => {
      mockGeminiSendMessage.mockResolvedValue({
        response: {
          candidates: [
            {
              content: {
                parts: [
                  {
                    functionCall: {
                      name: 'search_users',
                      args: null,
                    },
                  },
                ],
              },
            },
          ],
          usageMetadata: { promptTokenCount: 3, candidatesTokenCount: 5 },
        },
      })

      const result = await provider.chat([{ role: 'user', content: 'test' }])
      expect(result.toolCalls![0].arguments).toEqual({})
    })

    it('toolCalls がない場合は undefined', async () => {
      const result = await provider.chat([{ role: 'user', content: 'test' }])
      expect(result.toolCalls).toBeUndefined()
    })

    it('usageMetadata から promptTokenCount / candidatesTokenCount がマッピングされる', async () => {
      const result = await provider.chat([{ role: 'user', content: 'test' }])
      expect(result.usage).toEqual({
        inputTokens: 12,
        outputTokens: 18,
      })
    })

    it('usageMetadata が undefined の場合は 0 が設定される', async () => {
      mockGeminiSendMessage.mockResolvedValue({
        response: {
          candidates: [{ content: { parts: [{ text: 'ok' }] } }],
          usageMetadata: undefined,
        },
      })

      const result = await provider.chat([{ role: 'user', content: 'test' }])
      expect(result.usage).toEqual({
        inputTokens: 0,
        outputTokens: 0,
      })
    })

    it('systemPrompt が undefined の場合、systemInstruction も undefined', async () => {
      await provider.chat([{ role: 'user', content: 'test' }])

      const callArgs = mockGetGenerativeModel.mock.calls[0][0]
      expect(callArgs.systemInstruction).toBeUndefined()
    })

    it('カスタム maxOutputTokens / temperature が渡される', async () => {
      await provider.chat([{ role: 'user', content: 'test' }], {
        maxTokens: 8192,
        temperature: 0.5,
      })

      const callArgs = mockGetGenerativeModel.mock.calls[0][0]
      expect(callArgs.generationConfig.maxOutputTokens).toBe(8192)
      expect(callArgs.generationConfig.temperature).toBe(0.5)
    })

    it('tools が Gemini 形式の functionDeclarations で渡される', async () => {
      const tools = [
        {
          name: 'test_tool',
          description: 'テスト',
          parameters: {
            type: 'object' as const,
            properties: {
              query: { type: 'string', description: '検索' },
              count: { type: 'number', description: '件数' },
            },
            required: ['query'],
          },
        },
      ]

      await provider.chat([{ role: 'user', content: 'test' }], { tools })

      const callArgs = mockGetGenerativeModel.mock.calls[0][0]
      expect(callArgs.tools).toBeDefined()
      expect(callArgs.tools[0].functionDeclarations[0].name).toBe('test_tool')
    })

    it('tools が空配列の場合は undefined になる', async () => {
      await provider.chat([{ role: 'user', content: 'test' }], { tools: [] })

      const callArgs = mockGetGenerativeModel.mock.calls[0][0]
      expect(callArgs.tools).toBeUndefined()
    })

    it('candidates が空の場合は content が空文字', async () => {
      mockGeminiSendMessage.mockResolvedValue({
        response: {
          candidates: [],
          usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 0 },
        },
      })

      const result = await provider.chat([{ role: 'user', content: 'test' }])
      expect(result.content).toBe('')
    })

    it('メッセージが1つのみの場合、history は空配列', async () => {
      await provider.chat([{ role: 'user', content: '唯一のメッセージ' }])

      expect(mockStartChat).toHaveBeenCalledWith({ history: [] })
      expect(mockGeminiSendMessage).toHaveBeenCalledWith('唯一のメッセージ')
    })
  })
})

// ===================================================================
//  tools.ts
// ===================================================================
describe('tools.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('ASSISTANT_TOOLS 定義', () => {
    it('search_schedules ツールが含まれる', () => {
      const tool = ASSISTANT_TOOLS.find((t) => t.name === 'search_schedules')
      expect(tool).toBeDefined()
      expect(tool!.description).toBeTruthy()
      expect(tool!.parameters.type).toBe('object')
    })

    it('search_users ツールが含まれる', () => {
      const tool = ASSISTANT_TOOLS.find((t) => t.name === 'search_users')
      expect(tool).toBeDefined()
      expect(tool!.description).toBeTruthy()
      expect(tool!.parameters.type).toBe('object')
    })

    it('search_schedules に startDate, endDate, userName, keyword プロパティがある', () => {
      const tool = ASSISTANT_TOOLS.find((t) => t.name === 'search_schedules')!
      const props = tool.parameters.properties
      expect(props.startDate).toBeDefined()
      expect(props.endDate).toBeDefined()
      expect(props.userName).toBeDefined()
      expect(props.keyword).toBeDefined()
    })

    it('search_users に name, departmentName プロパティがある', () => {
      const tool = ASSISTANT_TOOLS.find((t) => t.name === 'search_users')!
      const props = tool.parameters.properties
      expect(props.name).toBeDefined()
      expect(props.departmentName).toBeDefined()
    })
  })

  describe('システムプロンプト', () => {
    it('BUSINESS_SYSTEM_PROMPT が空でない文字列', () => {
      expect(typeof BUSINESS_SYSTEM_PROMPT).toBe('string')
      expect(BUSINESS_SYSTEM_PROMPT.length).toBeGreaterThan(0)
    })

    it('LP_SYSTEM_PROMPT が空でない文字列', () => {
      expect(typeof LP_SYSTEM_PROMPT).toBe('string')
      expect(LP_SYSTEM_PROMPT.length).toBeGreaterThan(0)
    })
  })

  describe('executeTool', () => {
    const ORG_ID = 'org-test-001'

    describe('unknown_tool', () => {
      it('未知のツール名で success: false を返す', async () => {
        const result = await executeTool('unknown_tool', {}, ORG_ID)
        expect(result.success).toBe(false)
        expect(result.data).toBeNull()
        expect(result.message).toContain('未知のツール')
      })
    })

    describe('search_schedules', () => {
      it('prisma.schedule.findMany を organizationId 付きで呼び出す', async () => {
        mockPrisma.schedule.findMany.mockResolvedValue([])

        await executeTool('search_schedules', {}, ORG_ID)

        expect(mockPrisma.schedule.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              organizationId: ORG_ID,
              deletedAt: null,
            }),
          })
        )
      })

      it('日付範囲フィルターが適用される', async () => {
        mockPrisma.schedule.findMany.mockResolvedValue([])

        await executeTool(
          'search_schedules',
          { startDate: '2026-01-01', endDate: '2026-01-31' },
          ORG_ID
        )

        const callArgs = mockPrisma.schedule.findMany.mock.calls[0][0]
        expect(callArgs.where.start).toBeDefined()
        expect(callArgs.where.start.gte).toEqual(new Date('2026-01-01'))
        expect(callArgs.where.start.lte).toEqual(new Date('2026-01-31'))
      })

      it('startDate のみ指定された場合', async () => {
        mockPrisma.schedule.findMany.mockResolvedValue([])

        await executeTool(
          'search_schedules',
          { startDate: '2026-03-01' },
          ORG_ID
        )

        const callArgs = mockPrisma.schedule.findMany.mock.calls[0][0]
        expect(callArgs.where.start.gte).toEqual(new Date('2026-03-01'))
        expect(callArgs.where.start.lte).toBeUndefined()
      })

      it('endDate のみ指定された場合', async () => {
        mockPrisma.schedule.findMany.mockResolvedValue([])

        await executeTool(
          'search_schedules',
          { endDate: '2026-06-30' },
          ORG_ID
        )

        const callArgs = mockPrisma.schedule.findMany.mock.calls[0][0]
        expect(callArgs.where.start.lte).toEqual(new Date('2026-06-30'))
        expect(callArgs.where.start.gte).toBeUndefined()
      })

      it('keyword フィルターが OR 条件で title と description に適用される', async () => {
        mockPrisma.schedule.findMany.mockResolvedValue([])

        await executeTool(
          'search_schedules',
          { keyword: '会議' },
          ORG_ID
        )

        const callArgs = mockPrisma.schedule.findMany.mock.calls[0][0]
        expect(callArgs.where.OR).toEqual([
          { title: { contains: '会議', mode: 'insensitive' } },
          { description: { contains: '会議', mode: 'insensitive' } },
        ])
      })

      it('userName フィルターが author.name に適用される', async () => {
        mockPrisma.schedule.findMany.mockResolvedValue([])

        await executeTool(
          'search_schedules',
          { userName: '田中' },
          ORG_ID
        )

        const callArgs = mockPrisma.schedule.findMany.mock.calls[0][0]
        expect(callArgs.where.author).toEqual({
          name: { contains: '田中', mode: 'insensitive' },
        })
      })

      it('結果が正しい形式にマッピングされる', async () => {
        mockPrisma.schedule.findMany.mockResolvedValue([
          {
            id: 'sch-1',
            title: '定例会議',
            start: new Date('2026-02-20T10:00:00Z'),
            end: new Date('2026-02-20T11:00:00Z'),
            description: '月例',
            author: { name: '田中太郎' },
          },
          {
            id: 'sch-2',
            title: '現場点検',
            start: new Date('2026-02-21T09:00:00Z'),
            end: new Date('2026-02-21T12:00:00Z'),
            description: null,
            author: null,
          },
        ])

        const result = await executeTool('search_schedules', {}, ORG_ID)

        expect(result.success).toBe(true)
        expect(result.message).toContain('2件')

        const data = result.data as Array<{
          id: string
          title: string
          userName: string
          description: string
        }>
        expect(data).toHaveLength(2)
        expect(data[0].id).toBe('sch-1')
        expect(data[0].title).toBe('定例会議')
        expect(data[0].userName).toBe('田中太郎')
        expect(data[0].description).toBe('月例')
        expect(data[1].userName).toBe('未割当')
        expect(data[1].description).toBe('')
      })

      it('take: 20 と orderBy: start asc が設定される', async () => {
        mockPrisma.schedule.findMany.mockResolvedValue([])

        await executeTool('search_schedules', {}, ORG_ID)

        expect(mockPrisma.schedule.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            take: 20,
            orderBy: { start: 'asc' },
          })
        )
      })

      it('author の name が include に含まれる', async () => {
        mockPrisma.schedule.findMany.mockResolvedValue([])

        await executeTool('search_schedules', {}, ORG_ID)

        expect(mockPrisma.schedule.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            include: {
              author: { select: { name: true } },
            },
          })
        )
      })

      it('フィルターなしの場合、日付・keyword・author フィルターが where に含まれない', async () => {
        mockPrisma.schedule.findMany.mockResolvedValue([])

        await executeTool('search_schedules', {}, ORG_ID)

        const callArgs = mockPrisma.schedule.findMany.mock.calls[0][0]
        expect(callArgs.where.start).toBeUndefined()
        expect(callArgs.where.OR).toBeUndefined()
        expect(callArgs.where.author).toBeUndefined()
      })

      it('数値型の引数は無視される（型ガード）', async () => {
        mockPrisma.schedule.findMany.mockResolvedValue([])

        await executeTool(
          'search_schedules',
          { startDate: 12345, keyword: 999 },
          ORG_ID
        )

        const callArgs = mockPrisma.schedule.findMany.mock.calls[0][0]
        expect(callArgs.where.start).toBeUndefined()
        expect(callArgs.where.OR).toBeUndefined()
      })
    })

    describe('search_users', () => {
      it('prisma.user.findMany を organizationId 付きで呼び出す', async () => {
        mockPrisma.user.findMany.mockResolvedValue([])

        await executeTool('search_users', {}, ORG_ID)

        expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              organizationId: ORG_ID,
            }),
          })
        )
      })

      it('name フィルターが適用される', async () => {
        mockPrisma.user.findMany.mockResolvedValue([])

        await executeTool('search_users', { name: '佐藤' }, ORG_ID)

        const callArgs = mockPrisma.user.findMany.mock.calls[0][0]
        expect(callArgs.where.name).toEqual({
          contains: '佐藤',
          mode: 'insensitive',
        })
      })

      it('departmentName フィルターが department.name に適用される', async () => {
        mockPrisma.user.findMany.mockResolvedValue([])

        await executeTool(
          'search_users',
          { departmentName: '営業部' },
          ORG_ID
        )

        const callArgs = mockPrisma.user.findMany.mock.calls[0][0]
        expect(callArgs.where.department).toEqual({
          name: { contains: '営業部', mode: 'insensitive' },
        })
      })

      it('結果が正しい形式にマッピングされる', async () => {
        mockPrisma.user.findMany.mockResolvedValue([
          {
            name: '田中太郎',
            role: 'ADMIN',
            department: { name: '管理部' },
          },
          {
            name: '佐藤花子',
            role: 'MEMBER',
            department: null,
          },
        ])

        const result = await executeTool('search_users', {}, ORG_ID)

        expect(result.success).toBe(true)
        expect(result.message).toContain('2名')

        const data = result.data as Array<{
          name: string
          role: string
          department: string
        }>
        expect(data).toHaveLength(2)
        expect(data[0].name).toBe('田中太郎')
        expect(data[0].role).toBe('ADMIN')
        expect(data[0].department).toBe('管理部')
        expect(data[1].department).toBe('未所属')
      })

      it('take: 20 と orderBy: name asc が設定される', async () => {
        mockPrisma.user.findMany.mockResolvedValue([])

        await executeTool('search_users', {}, ORG_ID)

        expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            take: 20,
            orderBy: { name: 'asc' },
          })
        )
      })

      it('select に name, role, department.name が含まれる', async () => {
        mockPrisma.user.findMany.mockResolvedValue([])

        await executeTool('search_users', {}, ORG_ID)

        expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            select: {
              name: true,
              role: true,
              department: { select: { name: true } },
            },
          })
        )
      })

      it('フィルターなしの場合、name・department フィルターが where に含まれない', async () => {
        mockPrisma.user.findMany.mockResolvedValue([])

        await executeTool('search_users', {}, ORG_ID)

        const callArgs = mockPrisma.user.findMany.mock.calls[0][0]
        expect(callArgs.where.name).toBeUndefined()
        expect(callArgs.where.department).toBeUndefined()
      })

      it('数値型の引数は無視される（型ガード）', async () => {
        mockPrisma.user.findMany.mockResolvedValue([])

        await executeTool(
          'search_users',
          { name: 123, departmentName: true },
          ORG_ID
        )

        const callArgs = mockPrisma.user.findMany.mock.calls[0][0]
        expect(callArgs.where.name).toBeUndefined()
        expect(callArgs.where.department).toBeUndefined()
      })

      it('name と departmentName 両方のフィルターが同時に適用される', async () => {
        mockPrisma.user.findMany.mockResolvedValue([])

        await executeTool(
          'search_users',
          { name: '田中', departmentName: '開発部' },
          ORG_ID
        )

        const callArgs = mockPrisma.user.findMany.mock.calls[0][0]
        expect(callArgs.where.name).toEqual({
          contains: '田中',
          mode: 'insensitive',
        })
        expect(callArgs.where.department).toEqual({
          name: { contains: '開発部', mode: 'insensitive' },
        })
      })
    })
  })
})
