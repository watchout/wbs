/**
 * セッション管理ユーティリティ
 * 
 * MVP向けシンプルなセッション方式
 * - サーバー側でセッション管理（インメモリ → 本番はRedis等に移行）
 * - ログアウト即時反映
 * - デバッグ容易
 */

import { randomUUID } from 'crypto'

// セッションデータ型
export interface SessionData {
  userId: string
  organizationId: string
  email: string
  role: string
  deviceId?: string  // デバイスログインの場合
  createdAt: Date
  expiresAt: Date
}

// インメモリセッションストア（開発用）
// 本番環境ではRedis等に置き換え
const sessions = new Map<string, SessionData>()

// セッション有効期限
const USER_SESSION_DURATION = 24 * 60 * 60 * 1000      // 24時間
const DEVICE_SESSION_DURATION = 30 * 24 * 60 * 60 * 1000  // 30日

/**
 * 新しいセッションを作成
 */
export function createSession(data: {
  userId: string
  organizationId: string
  email: string
  role: string
  deviceId?: string
}): string {
  const sessionId = randomUUID()
  const now = new Date()
  const duration = data.deviceId ? DEVICE_SESSION_DURATION : USER_SESSION_DURATION

  const session: SessionData = {
    ...data,
    createdAt: now,
    expiresAt: new Date(now.getTime() + duration)
  }

  sessions.set(sessionId, session)
  
  // 期限切れセッションのクリーンアップ（簡易版）
  cleanupExpiredSessions()

  return sessionId
}

/**
 * セッションを取得
 */
export function getSession(sessionId: string): SessionData | null {
  const session = sessions.get(sessionId)

  if (!session) {
    return null
  }

  // 期限切れチェック
  if (new Date() > session.expiresAt) {
    sessions.delete(sessionId)
    return null
  }

  return session
}

/**
 * セッションを延長（AUTH-010: Sliding Window方式）
 * 残り有効期限が50%未満の場合のみ延長
 * @returns 延長された場合はtrue、延長不要の場合はfalse
 */
export function refreshSessionIfNeeded(sessionId: string): boolean {
  const session = sessions.get(sessionId)

  if (!session) {
    return false
  }

  const now = new Date()

  // 期限切れチェック
  if (now > session.expiresAt) {
    sessions.delete(sessionId)
    return false
  }

  // セッション種別に応じた期間
  const duration = session.deviceId ? DEVICE_SESSION_DURATION : USER_SESSION_DURATION
  const halfDuration = duration / 2

  // 残り有効期限が50%未満の場合のみ延長
  const remainingTime = session.expiresAt.getTime() - now.getTime()
  if (remainingTime < halfDuration) {
    session.expiresAt = new Date(now.getTime() + duration)
    return true
  }

  return false
}

/**
 * セッションを削除（ログアウト）
 */
export function deleteSession(sessionId: string): boolean {
  return sessions.delete(sessionId)
}

/**
 * ユーザーの全セッションを削除
 */
export function deleteUserSessions(userId: string): number {
  let count = 0
  for (const [id, session] of sessions.entries()) {
    if (session.userId === userId) {
      sessions.delete(id)
      count++
    }
  }
  return count
}

/**
 * 期限切れセッションのクリーンアップ
 */
function cleanupExpiredSessions(): void {
  const now = new Date()
  for (const [id, session] of sessions.entries()) {
    if (now > session.expiresAt) {
      sessions.delete(id)
    }
  }
}

/**
 * Cookie設定オプション
 */
export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: USER_SESSION_DURATION / 1000  // 秒単位
}

export const deviceSessionCookieOptions = {
  ...sessionCookieOptions,
  maxAge: DEVICE_SESSION_DURATION / 1000
}

