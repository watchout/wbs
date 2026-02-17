// server/utils/llm/factory.test.ts
// LLM ファクトリー ユニットテスト

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { hasApiKey, getAvailableProviders } from './factory'

describe('LLM Factory', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('hasApiKey', () => {
    it('APIキーが設定されていればtrueを返す', () => {
      process.env.OPENAI_API_KEY = 'sk-test-key'
      expect(hasApiKey('openai')).toBe(true)
    })

    it('APIキーが未設定ならfalseを返す', () => {
      delete process.env.OPENAI_API_KEY
      expect(hasApiKey('openai')).toBe(false)
    })

    it('APIキーが空文字ならfalseを返す', () => {
      process.env.OPENAI_API_KEY = ''
      expect(hasApiKey('openai')).toBe(false)
    })

    it('Claude APIキーの確認', () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test'
      expect(hasApiKey('claude')).toBe(true)
    })

    it('Gemini APIキーの確認', () => {
      process.env.GOOGLE_AI_API_KEY = 'AItest'
      expect(hasApiKey('gemini')).toBe(true)
    })
  })

  describe('getAvailableProviders', () => {
    it('利用可能なプロバイダーのみ返す', () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      process.env.GOOGLE_AI_API_KEY = 'AItest'
      delete process.env.ANTHROPIC_API_KEY

      const available = getAvailableProviders()
      expect(available).toContain('openai')
      expect(available).toContain('gemini')
      expect(available).not.toContain('claude')
    })

    it('何も設定されていなければ空配列を返す', () => {
      delete process.env.OPENAI_API_KEY
      delete process.env.ANTHROPIC_API_KEY
      delete process.env.GOOGLE_AI_API_KEY

      const available = getAvailableProviders()
      expect(available).toHaveLength(0)
    })

    it('フォールバック順序に従う（openai > gemini > claude）', () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test'
      process.env.GOOGLE_AI_API_KEY = 'AItest'

      const available = getAvailableProviders()
      expect(available[0]).toBe('openai')
      expect(available[1]).toBe('gemini')
      expect(available[2]).toBe('claude')
    })
  })
})
