/**
 * Encryption utility test suite
 * Coverage focus: encrypt/decrypt edge cases and error handling
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { encrypt, decrypt, encryptWithKey, decryptWithKey } from './encryption'

// Valid 32-byte hex key for testing (64 hex chars = 32 bytes)
const TEST_KEY_HEX = '0'.repeat(64)

describe('Encryption Utils', () => {
  beforeAll(() => {
    // Set the encryption key env var for encrypt/decrypt functions
    process.env.CALENDAR_ENCRYPTION_KEY = TEST_KEY_HEX
  })

  describe('encrypt/decrypt', () => {
    it('encrypts and decrypts plaintext correctly', () => {
      const plaintext = 'secret-token-12345'
      const encrypted = encrypt(plaintext)
      const decrypted = decrypt(encrypted)

      expect(decrypted).toBe(plaintext)
      expect(encrypted).not.toBe(plaintext)
      expect(encrypted).toContain(':')
    })

    it('encrypts empty string to empty string', () => {
      expect(encrypt('')).toBe('')
    })

    it('decrypts empty string to empty string', () => {
      expect(decrypt('')).toBe('')
    })

    it('each encryption produces different ciphertext (IV randomization)', () => {
      const plaintext = 'same-text'
      const encrypted1 = encrypt(plaintext)
      const encrypted2 = encrypt(plaintext)

      expect(encrypted1).not.toBe(encrypted2)
      expect(decrypt(encrypted1)).toBe(plaintext)
      expect(decrypt(encrypted2)).toBe(plaintext)
    })

    it('handles unicode characters correctly', () => {
      const unicode = '日本語テキスト🔒'
      const encrypted = encrypt(unicode)
      const decrypted = decrypt(encrypted)

      expect(decrypted).toBe(unicode)
    })

    it('handles long strings', () => {
      const longText = 'x'.repeat(10000)
      const encrypted = encrypt(longText)
      const decrypted = decrypt(encrypted)

      expect(decrypted).toBe(longText)
    })
  })

  describe('encryptWithKey/decryptWithKey', () => {
    it('encrypts and decrypts with custom key', () => {
      const plaintext = 'custom-key-test'
      const customKey = 'b'.repeat(64)

      const encrypted = encryptWithKey(plaintext, customKey)
      const decrypted = decryptWithKey(encrypted, customKey)

      expect(decrypted).toBe(plaintext)
    })

    it('encrypts empty string with custom key', () => {
      const customKey = 'c'.repeat(64)
      expect(encryptWithKey('', customKey)).toBe('')
    })

    it('decrypts empty string with custom key', () => {
      const customKey = 'c'.repeat(64)
      expect(decryptWithKey('', customKey)).toBe('')
    })

    it('fails decryption with wrong key', () => {
      const plaintext = 'secret'
      const key1 = '1'.repeat(64)
      const key2 = '2'.repeat(64)

      const encrypted = encryptWithKey(plaintext, key1)

      expect(() => decryptWithKey(encrypted, key2)).toThrow()
    })

    it('rejects invalid key length (too short)', () => {
      const shortKey = '3'.repeat(32)

      expect(() => encryptWithKey('text', shortKey)).toThrow('64 hex characters')
    })

    it('rejects invalid key length (too long)', () => {
      const longKey = '4'.repeat(128)

      expect(() => encryptWithKey('text', longKey)).toThrow('64 hex characters')
    })

    it('rejects invalid key length on decrypt', () => {
      const invalidKey = '5'.repeat(50)

      expect(() => decryptWithKey('some:encrypted:data', invalidKey)).toThrow(
        '64 hex characters'
      )
    })
  })

  describe('error handling', () => {
    it('throws on invalid encrypted format (missing colons)', () => {
      const customKey = '6'.repeat(64)
      const invalidData = 'nodataformat'

      expect(() => decryptWithKey(invalidData, customKey)).toThrow(
        'Invalid encrypted data format'
      )
    })

    it('throws on too many colons in encrypted data', () => {
      const customKey = '7'.repeat(64)
      const invalidData = 'part1:part2:part3:part4'

      expect(() => decryptWithKey(invalidData, customKey)).toThrow(
        'Invalid encrypted data format'
      )
    })

    it('throws on invalid base64 IV', () => {
      const customKey = '8'.repeat(64)
      const invalidData = '!!!invalid!!!:validbase64==:validbase64=='

      expect(() => decryptWithKey(invalidData, customKey)).toThrow()
    })

    it('throws on invalid IV length', () => {
      const customKey = '9'.repeat(64)
      // 'AA==' is only 1 byte when base64-decoded, but IV must be 16
      const invalidData = 'AA==:' + 'a'.repeat(24) + ':' + 'b'.repeat(32)

      expect(() => decryptWithKey(invalidData, customKey)).toThrow('Invalid IV length')
    })

    it('throws on invalid auth tag length', () => {
      const customKey = 'a'.repeat(64)
      const validIv = Buffer.alloc(16).toString('base64')
      const invalidAuthTag = 'AA==' // 1 byte, need 16
      const ciphertext = 'c'.repeat(32)

      const invalidData = `${validIv}:${invalidAuthTag}:${ciphertext}`

      expect(() => decryptWithKey(invalidData, customKey)).toThrow('Invalid auth tag length')
    })

    it('throws on tampered ciphertext (auth tag mismatch)', () => {
      const customKey = 'b'.repeat(64)
      const plaintext = 'message'

      const encrypted = encryptWithKey(plaintext, customKey)
      const parts = encrypted.split(':')

      // Tamper with ciphertext
      parts[2] = Buffer.from('tampered').toString('base64')
      const tamperedData = parts.join(':')

      expect(() => decryptWithKey(tamperedData, customKey)).toThrow()
    })
  })

  describe('encryption key validation', () => {
    it('throws when CALENDAR_ENCRYPTION_KEY env var is not set', () => {
      const originalKey = process.env.CALENDAR_ENCRYPTION_KEY
      delete process.env.CALENDAR_ENCRYPTION_KEY

      expect(() => encrypt('test')).toThrow('CALENDAR_ENCRYPTION_KEY environment variable')

      // Restore
      process.env.CALENDAR_ENCRYPTION_KEY = originalKey
    })

    it('throws when key is wrong length', () => {
      const originalKey = process.env.CALENDAR_ENCRYPTION_KEY
      process.env.CALENDAR_ENCRYPTION_KEY = 'shortkey'

      expect(() => encrypt('test')).toThrow('64 hex characters')

      // Restore
      process.env.CALENDAR_ENCRYPTION_KEY = originalKey
    })
  })

  describe('round-trip tests', () => {
    it('survives multiple encrypt-decrypt cycles', () => {
      let text = 'original'

      for (let i = 0; i < 10; i++) {
        const encrypted = encryptWithKey(text, TEST_KEY_HEX)
        text = decryptWithKey(encrypted, TEST_KEY_HEX)
      }

      expect(text).toBe('original')
    })

    it('handles special characters', () => {
      const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`'
      const customKey = 'c'.repeat(64)

      const encrypted = encryptWithKey(specialChars, customKey)
      const decrypted = decryptWithKey(encrypted, customKey)

      expect(decrypted).toBe(specialChars)
    })
  })
})
