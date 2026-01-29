/**
 * Password utility unit tests
 */

import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword } from './password'

describe('password utils', () => {
  it('should hash and verify password', async () => {
    const password = 'testpassword123'
    const hash = await hashPassword(password)

    expect(hash).not.toBe(password)
    expect(await verifyPassword(password, hash)).toBe(true)
  })

  it('should reject wrong password', async () => {
    const hash = await hashPassword('correctpassword')
    expect(await verifyPassword('wrongpassword', hash)).toBe(false)
  })

  it('should generate different hashes for same password', async () => {
    const password = 'samepassword'
    const hash1 = await hashPassword(password)
    const hash2 = await hashPassword(password)

    expect(hash1).not.toBe(hash2)
    expect(await verifyPassword(password, hash1)).toBe(true)
    expect(await verifyPassword(password, hash2)).toBe(true)
  })
})
