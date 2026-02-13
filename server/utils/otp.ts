/**
 * OTP (ワンタイムパスワード) ユーティリティ
 *
 * ADMIN の課金操作時にメールベースの 2FA を提供する。
 * - 6桁数字コードを生成・ハッシュ化して DB に保存
 * - 5分間有効、3回まで試行可能
 * - 検証成功後セッションに otpVerifiedUntil を30分間保持
 */

import { randomInt, createHash } from 'crypto'
import { prisma } from '~/server/utils/prisma'
import { createLogger } from '~/server/utils/logger'

const log = createLogger('otp')

/** OTP 有効期限 (5分) */
const OTP_EXPIRY_MS = 5 * 60 * 1000

/** OTP 検証済みフラグの有効期限 (30分) */
export const OTP_VERIFIED_DURATION_MS = 30 * 60 * 1000

/** 最大試行回数 */
const MAX_ATTEMPTS = 3

/**
 * 6桁のランダムコードを生成
 */
export function generateOtpCode(): string {
  return String(randomInt(100000, 999999))
}

/**
 * OTP コードをハッシュ化（SHA-256）
 *
 * bcrypt は不要（短命トークン＋試行回数制限あり）
 */
export function hashOtpCode(code: string): string {
  return createHash('sha256').update(code).digest('hex')
}

/**
 * OTP を生成して DB に保存
 *
 * @returns 平文の6桁コード（メール送信用）
 */
export async function createOtp(params: {
  userId: string
  purpose: string
}): Promise<string> {
  const { userId, purpose } = params
  const code = generateOtpCode()
  const hashed = hashOtpCode(code)

  // 既存の未使用 OTP を無効化（同一 userId + purpose）
  await prisma.otpToken.updateMany({
    where: {
      userId,
      purpose,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    data: { expiresAt: new Date() },
  })

  await prisma.otpToken.create({
    data: {
      userId,
      code: hashed,
      purpose,
      expiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
    },
  })

  log.info('OTP created', { userId, purpose })
  return code
}

/**
 * OTP を検証
 *
 * @returns true=検証成功 / false=失敗
 */
export async function verifyOtp(params: {
  userId: string
  purpose: string
  code: string
}): Promise<boolean> {
  const { userId, purpose, code } = params
  const hashed = hashOtpCode(code)

  // 有効な OTP を検索
  const otp = await prisma.otpToken.findFirst({
    where: {
      userId,
      purpose,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  })

  if (!otp) {
    log.warn('OTP not found or expired', { userId, purpose })
    return false
  }

  // 試行回数チェック
  if (otp.attempts >= MAX_ATTEMPTS) {
    log.warn('OTP max attempts exceeded', { userId, purpose })
    // OTP を無効化
    await prisma.otpToken.update({
      where: { id: otp.id },
      data: { expiresAt: new Date() },
    })
    return false
  }

  // 試行回数インクリメント
  await prisma.otpToken.update({
    where: { id: otp.id },
    data: { attempts: otp.attempts + 1 },
  })

  // コード照合
  if (otp.code !== hashed) {
    log.warn('OTP code mismatch', {
      userId,
      purpose,
      attempt: otp.attempts + 1,
    })
    return false
  }

  // 検証成功 → 使用済みにする
  await prisma.otpToken.update({
    where: { id: otp.id },
    data: { usedAt: new Date() },
  })

  log.info('OTP verified successfully', { userId, purpose })
  return true
}

/**
 * 期限切れ OTP のクリーンアップ
 *
 * 定期実行を想定（cron / 起動時）
 */
export async function cleanupExpiredOtps(): Promise<number> {
  const result = await prisma.otpToken.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  })
  return result.count
}
