/**
 * Password utility unit tests
 */

import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword } from './password'

// テスト用パスワードは環境変数から取得（ハードコード禁止）
const TEST_PASSWORD_A = process.env.TEST_PASSWORD_A ?? 'test-pw-alpha'
const TEST_PASSWORD_B = process.env.TEST_PASSWORD_B ?? 'test-pw-beta'
const TEST_PASSWORD_WRONG = process.env.TEST_PASSWORD_WRONG ?? 'test-pw-wrong'

describe('password utils', () => {
  it('should hash and verify password', async () => {
    const hash = await hashPassword(TEST_PASSWORD_A)

    expect(hash).not.toBe(TEST_PASSWORD_A)
    expect(await verifyPassword(TEST_PASSWORD_A, hash)).toBe(true)
  })

  it('should reject wrong password', async () => {
    const hash = await hashPassword(TEST_PASSWORD_A)
    expect(await verifyPassword(TEST_PASSWORD_WRONG, hash)).toBe(false)
  })

  it('should generate different hashes for same password', async () => {
    const hash1 = await hashPassword(TEST_PASSWORD_B)
    const hash2 = await hashPassword(TEST_PASSWORD_B)

    expect(hash1).not.toBe(hash2)
    expect(await verifyPassword(TEST_PASSWORD_B, hash1)).toBe(true)
    expect(await verifyPassword(TEST_PASSWORD_B, hash2)).toBe(true)
  })
})
