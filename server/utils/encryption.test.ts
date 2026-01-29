import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { encryptWithKey, decryptWithKey } from './encryption'

// Test key (32 bytes = 64 hex characters)
const TEST_KEY = 'a'.repeat(64)
const DIFFERENT_KEY = 'b'.repeat(64)

describe('encryption utility', () => {
  describe('encryptWithKey / decryptWithKey', () => {
    it('should encrypt and decrypt a simple string', () => {
      const plaintext = 'Hello, World!'
      const encrypted = encryptWithKey(plaintext, TEST_KEY)
      const decrypted = decryptWithKey(encrypted, TEST_KEY)

      expect(decrypted).toBe(plaintext)
      expect(encrypted).not.toBe(plaintext)
    })

    it('should encrypt and decrypt a long token string', () => {
      // Simulate OAuth token
      const token = 'ya29.a0AfH6SMBx' + 'x'.repeat(200)
      const encrypted = encryptWithKey(token, TEST_KEY)
      const decrypted = decryptWithKey(encrypted, TEST_KEY)

      expect(decrypted).toBe(token)
    })

    it('should encrypt and decrypt Japanese text', () => {
      const plaintext = 'こんにちは世界！日本語テスト'
      const encrypted = encryptWithKey(plaintext, TEST_KEY)
      const decrypted = decryptWithKey(encrypted, TEST_KEY)

      expect(decrypted).toBe(plaintext)
    })

    it('should return empty string for empty input', () => {
      const encrypted = encryptWithKey('', TEST_KEY)
      expect(encrypted).toBe('')

      const decrypted = decryptWithKey('', TEST_KEY)
      expect(decrypted).toBe('')
    })

    it('should produce different ciphertext for same plaintext (random IV)', () => {
      const plaintext = 'Test data'
      const encrypted1 = encryptWithKey(plaintext, TEST_KEY)
      const encrypted2 = encryptWithKey(plaintext, TEST_KEY)

      // Different IVs mean different ciphertexts
      expect(encrypted1).not.toBe(encrypted2)

      // But both decrypt to same plaintext
      expect(decryptWithKey(encrypted1, TEST_KEY)).toBe(plaintext)
      expect(decryptWithKey(encrypted2, TEST_KEY)).toBe(plaintext)
    })

    it('should produce ciphertext in correct format (iv:authTag:ciphertext)', () => {
      const plaintext = 'Test'
      const encrypted = encryptWithKey(plaintext, TEST_KEY)

      const parts = encrypted.split(':')
      expect(parts).toHaveLength(3)

      // IV should be 16 bytes = ~24 base64 chars (with padding)
      const iv = Buffer.from(parts[0], 'base64')
      expect(iv).toHaveLength(16)

      // Auth tag should be 16 bytes
      const authTag = Buffer.from(parts[1], 'base64')
      expect(authTag).toHaveLength(16)
    })
  })

  describe('decryption with wrong key', () => {
    it('should fail to decrypt with different key', () => {
      const plaintext = 'Secret data'
      const encrypted = encryptWithKey(plaintext, TEST_KEY)

      // Decrypting with different key should throw
      expect(() => {
        decryptWithKey(encrypted, DIFFERENT_KEY)
      }).toThrow()
    })
  })

  describe('invalid input handling', () => {
    it('should throw on invalid encrypted format (missing parts)', () => {
      expect(() => {
        decryptWithKey('invalid', TEST_KEY)
      }).toThrow('Invalid encrypted data format')
    })

    it('should throw on invalid encrypted format (too few parts)', () => {
      expect(() => {
        decryptWithKey('part1:part2', TEST_KEY)
      }).toThrow('Invalid encrypted data format')
    })

    it('should throw on invalid IV length', () => {
      // Create invalid encrypted data with short IV
      const shortIv = Buffer.from('short').toString('base64')
      const authTag = Buffer.alloc(16).toString('base64')
      const ciphertext = 'test'

      expect(() => {
        decryptWithKey(`${shortIv}:${authTag}:${ciphertext}`, TEST_KEY)
      }).toThrow('Invalid IV length')
    })

    it('should throw on invalid auth tag length', () => {
      // Create invalid encrypted data with short auth tag
      const iv = Buffer.alloc(16).toString('base64')
      const shortAuthTag = Buffer.from('short').toString('base64')
      const ciphertext = 'test'

      expect(() => {
        decryptWithKey(`${iv}:${shortAuthTag}:${ciphertext}`, TEST_KEY)
      }).toThrow('Invalid auth tag length')
    })

    it('should throw on invalid key length', () => {
      expect(() => {
        encryptWithKey('test', 'shortkey')
      }).toThrow('Key must be 64 hex characters')

      expect(() => {
        decryptWithKey('test:test:test', 'shortkey')
      }).toThrow('Key must be 64 hex characters')
    })
  })

  describe('special characters', () => {
    it('should handle special characters', () => {
      const plaintext = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/\\`~'
      const encrypted = encryptWithKey(plaintext, TEST_KEY)
      const decrypted = decryptWithKey(encrypted, TEST_KEY)

      expect(decrypted).toBe(plaintext)
    })

    it('should handle newlines and tabs', () => {
      const plaintext = 'line1\nline2\ttabbed'
      const encrypted = encryptWithKey(plaintext, TEST_KEY)
      const decrypted = decryptWithKey(encrypted, TEST_KEY)

      expect(decrypted).toBe(plaintext)
    })

    it('should handle unicode emoji', () => {
      const plaintext = 'Hello 🎉 World 🌍'
      const encrypted = encryptWithKey(plaintext, TEST_KEY)
      const decrypted = decryptWithKey(encrypted, TEST_KEY)

      expect(decrypted).toBe(plaintext)
    })
  })
})
