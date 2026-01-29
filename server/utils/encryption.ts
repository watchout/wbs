/**
 * AES-256-GCM encryption utility for secure token storage
 * Used for encrypting OAuth tokens before storing in database
 */
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16 // 128 bits
const AUTH_TAG_LENGTH = 16 // 128 bits

/**
 * Get encryption key from environment variable
 * Key must be 32 bytes (64 hex characters)
 */
function getEncryptionKey(): Buffer {
  const key = process.env.CALENDAR_ENCRYPTION_KEY
  if (!key) {
    throw new Error('CALENDAR_ENCRYPTION_KEY environment variable is not set')
  }

  // Key should be 32 bytes hex string (64 characters)
  if (key.length !== 64) {
    throw new Error('CALENDAR_ENCRYPTION_KEY must be 64 hex characters (32 bytes)')
  }

  return Buffer.from(key, 'hex')
}

/**
 * Encrypt a plaintext string using AES-256-GCM
 * @param plaintext - The string to encrypt
 * @returns Encrypted string in format: iv:authTag:ciphertext (all base64)
 */
export function encrypt(plaintext: string): string {
  if (plaintext === '') {
    return ''
  }

  const key = getEncryptionKey()
  const iv = randomBytes(IV_LENGTH)

  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH
  })

  let encrypted = cipher.update(plaintext, 'utf8', 'base64')
  encrypted += cipher.final('base64')

  const authTag = cipher.getAuthTag()

  // Format: iv:authTag:ciphertext (all base64 encoded)
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`
}

/**
 * Decrypt an encrypted string using AES-256-GCM
 * @param encryptedData - Encrypted string in format: iv:authTag:ciphertext
 * @returns Decrypted plaintext string
 */
export function decrypt(encryptedData: string): string {
  if (encryptedData === '') {
    return ''
  }

  const key = getEncryptionKey()

  const parts = encryptedData.split(':')
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format')
  }

  const [ivBase64, authTagBase64, ciphertext] = parts
  const iv = Buffer.from(ivBase64, 'base64')
  const authTag = Buffer.from(authTagBase64, 'base64')

  if (iv.length !== IV_LENGTH) {
    throw new Error('Invalid IV length')
  }

  if (authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error('Invalid auth tag length')
  }

  const decipher = createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH
  })

  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(ciphertext, 'base64', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

/**
 * Encrypt with a custom key (for testing purposes)
 * @param plaintext - The string to encrypt
 * @param keyHex - 64 character hex string (32 bytes)
 * @returns Encrypted string
 */
export function encryptWithKey(plaintext: string, keyHex: string): string {
  if (plaintext === '') {
    return ''
  }

  if (keyHex.length !== 64) {
    throw new Error('Key must be 64 hex characters (32 bytes)')
  }

  const key = Buffer.from(keyHex, 'hex')
  const iv = randomBytes(IV_LENGTH)

  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH
  })

  let encrypted = cipher.update(plaintext, 'utf8', 'base64')
  encrypted += cipher.final('base64')

  const authTag = cipher.getAuthTag()

  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`
}

/**
 * Decrypt with a custom key (for testing purposes)
 * @param encryptedData - Encrypted string
 * @param keyHex - 64 character hex string (32 bytes)
 * @returns Decrypted plaintext string
 */
export function decryptWithKey(encryptedData: string, keyHex: string): string {
  if (encryptedData === '') {
    return ''
  }

  if (keyHex.length !== 64) {
    throw new Error('Key must be 64 hex characters (32 bytes)')
  }

  const key = Buffer.from(keyHex, 'hex')

  const parts = encryptedData.split(':')
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format')
  }

  const [ivBase64, authTagBase64, ciphertext] = parts
  const iv = Buffer.from(ivBase64, 'base64')
  const authTag = Buffer.from(authTagBase64, 'base64')

  if (iv.length !== IV_LENGTH) {
    throw new Error('Invalid IV length')
  }

  if (authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error('Invalid auth tag length')
  }

  const decipher = createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH
  })

  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(ciphertext, 'base64', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}
