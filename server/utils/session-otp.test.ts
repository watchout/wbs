/**
 * セッション OTP フラグのユニットテスト
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  createSession,
  setOtpVerified,
  isOtpVerified,
  deleteSession,
} from './session'

describe('セッション OTP フラグ', () => {
  let sessionId: string

  beforeEach(() => {
    sessionId = createSession({
      userId: 'test-user-1',
      organizationId: 'test-org-1',
      email: 'admin@test.com',
      role: 'ADMIN',
    })
  })

  it('初期状態では OTP 未検証', () => {
    expect(isOtpVerified(sessionId)).toBe(false)
  })

  it('setOtpVerified で検証済みフラグを設定できる', () => {
    const result = setOtpVerified(sessionId, 30 * 60 * 1000)
    expect(result).toBe(true)
    expect(isOtpVerified(sessionId)).toBe(true)
  })

  it('存在しないセッションには設定できない', () => {
    const result = setOtpVerified('nonexistent', 30 * 60 * 1000)
    expect(result).toBe(false)
  })

  it('存在しないセッションは未検証', () => {
    expect(isOtpVerified('nonexistent')).toBe(false)
  })

  it('有効期限が過ぎると未検証になる', () => {
    // 1ms の有効期限で設定
    setOtpVerified(sessionId, 1)

    // 少し待ってから確認
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(isOtpVerified(sessionId)).toBe(false)
        resolve()
      }, 10)
    })
  })

  it('セッション削除後は未検証', () => {
    setOtpVerified(sessionId, 30 * 60 * 1000)
    deleteSession(sessionId)
    expect(isOtpVerified(sessionId)).toBe(false)
  })
})
