/**
 * Security Tests（SEC-001, SEC-002, SEC-006）
 *
 * CSRF対策・CORS設定・XSS対策のテスト
 */

import { describe, it, expect, vi } from 'vitest'
import { sanitizeHtml, escapeHtml } from '../utils/sanitize'

describe('SEC-006: XSS対策 - sanitizeHtml', () => {
  describe('スクリプト除去', () => {
    it('should remove script tags', () => {
      const result = sanitizeHtml('<p>Hello</p><script>alert("xss")</script>')
      expect(result).not.toContain('<script')
      expect(result).toContain('<p>Hello</p>')
    })

    it('should remove inline event handlers', () => {
      const result = sanitizeHtml('<img onerror="alert(1)" src="x" />')
      expect(result).not.toContain('onerror')
      expect(result).not.toContain('alert')
    })

    it('should remove javascript: URLs', () => {
      const result = sanitizeHtml('<a href="javascript:alert(1)">click</a>')
      expect(result).not.toContain('javascript:')
    })

    it('should remove onclick handlers', () => {
      const result = sanitizeHtml('<button onclick="steal()">Click</button>')
      expect(result).not.toContain('onclick')
    })
  })

  describe('許可タグ', () => {
    it('should keep allowed tags', () => {
      const html = '<p>text <strong>bold</strong> <em>italic</em></p>'
      const result = sanitizeHtml(html)
      expect(result).toContain('<p>')
      expect(result).toContain('<strong>')
      expect(result).toContain('<em>')
    })

    it('should remove iframe tags', () => {
      const result = sanitizeHtml('<iframe src="evil.com"></iframe>')
      expect(result).not.toContain('<iframe')
    })

    it('should remove form tags', () => {
      const result = sanitizeHtml('<form action="evil.com"><input type="text" /></form>')
      expect(result).not.toContain('<form')
    })
  })

  describe('属性フィルタ', () => {
    it('should keep href on anchor tags', () => {
      const result = sanitizeHtml('<a href="https://example.com">link</a>')
      expect(result).toContain('href="https://example.com"')
    })

    it('should add rel="noopener noreferrer" to links', () => {
      const result = sanitizeHtml('<a href="https://example.com">link</a>')
      expect(result).toContain('rel="noopener noreferrer"')
    })

    it('should strip dangerous attributes from allowed tags', () => {
      const result = sanitizeHtml('<p style="background:url(javascript:void(0))">text</p>')
      expect(result).not.toContain('style')
    })
  })

  describe('エッジケース', () => {
    it('should handle empty string', () => {
      expect(sanitizeHtml('')).toBe('')
    })

    it('should handle plain text', () => {
      const result = sanitizeHtml('Hello World')
      expect(result).toBe('Hello World')
    })

    it('should handle nested malicious content', () => {
      const result = sanitizeHtml('<div><script>alert(1)</script><p>safe</p></div>')
      expect(result).not.toContain('<script')
      expect(result).toContain('<p>safe</p>')
    })
  })
})

describe('SEC-006: XSS対策 - escapeHtml', () => {
  it('should escape HTML entities', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;')
  })

  it('should escape quotes', () => {
    expect(escapeHtml('"hello" & \'world\'')).toBe('&quot;hello&quot; &amp; &#39;world&#39;')
  })

  it('should handle empty string', () => {
    expect(escapeHtml('')).toBe('')
  })
})

describe('SEC-001: CSRF - ミドルウェア', () => {
  // Note: ミドルウェアの統合テストはE2Eで行う
  // ここでは設計の正しさのみ確認

  it('should have csrf middleware file', async () => {
    const fs = await import('fs')
    const exists = fs.existsSync('server/middleware/csrf.ts')
    expect(exists).toBe(true)
  })
})

describe('SEC-002: CORS - 設定', () => {
  it('should have cors middleware file', async () => {
    const fs = await import('fs')
    const exists = fs.existsSync('server/middleware/cors.ts')
    expect(exists).toBe(true)
  })

  it('should not have wildcard origin in socket.io plugin', async () => {
    const fs = await import('fs')
    const content = fs.readFileSync('server/plugins/socket.io.ts', 'utf-8')
    expect(content).not.toContain("origin: '*'")
  })
})
