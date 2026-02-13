/**
 * OTP ユーティリティのユニットテスト
 */

import { describe, it, expect } from 'vitest'
import { generateOtpCode, hashOtpCode } from './otp'

describe('OTP ユーティリティ', () => {
  describe('generateOtpCode', () => {
    it('6桁の数字コードを生成する', () => {
      const code = generateOtpCode()
      expect(code).toMatch(/^\d{6}$/)
    })

    it('100000 以上 999999 以下の値を返す', () => {
      for (let i = 0; i < 100; i++) {
        const code = generateOtpCode()
        const num = parseInt(code, 10)
        expect(num).toBeGreaterThanOrEqual(100000)
        expect(num).toBeLessThanOrEqual(999999)
      }
    })

    it('異なるコードを生成する（確率的テスト）', () => {
      const codes = new Set<string>()
      for (let i = 0; i < 50; i++) {
        codes.add(generateOtpCode())
      }
      // 50回生成して少なくとも2種類以上あること
      expect(codes.size).toBeGreaterThan(1)
    })
  })

  describe('hashOtpCode', () => {
    it('SHA-256 ハッシュを返す', () => {
      const hash = hashOtpCode('123456')
      // SHA-256 は64文字の16進数
      expect(hash).toMatch(/^[0-9a-f]{64}$/)
    })

    it('同じコードには同じハッシュを返す', () => {
      const hash1 = hashOtpCode('654321')
      const hash2 = hashOtpCode('654321')
      expect(hash1).toBe(hash2)
    })

    it('異なるコードには異なるハッシュを返す', () => {
      const hash1 = hashOtpCode('123456')
      const hash2 = hashOtpCode('654321')
      expect(hash1).not.toBe(hash2)
    })
  })
})
