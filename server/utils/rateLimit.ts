/**
 * レート制限ユーティリティ
 *
 * SEC-003: ブルートフォース対策
 * - インメモリ Map によるIPベースのレート制限
 * - 将来的に Redis 等への移行を考慮した設計
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

// インメモリストア（プロセス単位）
const rateLimitStore = new Map<string, RateLimitEntry>()

// 定期クリーンアップ（メモリリーク防止）
const CLEANUP_INTERVAL_MS = 60 * 1000 // 1分
let cleanupTimer: ReturnType<typeof setInterval> | null = null

function startCleanup() {
  if (cleanupTimer) return
  cleanupTimer = setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of rateLimitStore) {
      if (entry.resetAt <= now) {
        rateLimitStore.delete(key)
      }
    }
  }, CLEANUP_INTERVAL_MS)
  // Node.js プロセス終了を妨げない
  cleanupTimer.unref()
}

startCleanup()

interface RateLimitConfig {
  /** ウィンドウ内の最大リクエスト数 */
  maxRequests: number
  /** ウィンドウサイズ（ミリ秒） */
  windowMs: number
}

interface RateLimitResult {
  /** 許可されたか */
  allowed: boolean
  /** 現在のカウント */
  current: number
  /** 残り許可数 */
  remaining: number
  /** リセットまでの秒数（Retry-After用） */
  retryAfterSeconds: number
}

/**
 * レート制限チェック
 * @param identifier 識別子（通常はIPアドレス）
 * @param config 制限設定
 * @returns チェック結果
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now()
  const entry = rateLimitStore.get(identifier)

  // 新規 or ウィンドウ期限切れ
  if (!entry || entry.resetAt <= now) {
    const newEntry: RateLimitEntry = {
      count: 1,
      resetAt: now + config.windowMs
    }
    rateLimitStore.set(identifier, newEntry)
    return {
      allowed: true,
      current: 1,
      remaining: config.maxRequests - 1,
      retryAfterSeconds: 0
    }
  }

  // 既存エントリ
  entry.count++
  const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000)

  if (entry.count > config.maxRequests) {
    return {
      allowed: false,
      current: entry.count,
      remaining: 0,
      retryAfterSeconds
    }
  }

  return {
    allowed: true,
    current: entry.count,
    remaining: config.maxRequests - entry.count,
    retryAfterSeconds: 0
  }
}

/**
 * H3 イベントからクライアントIPを取得
 * X-Forwarded-For 対応（プロキシ/ロードバランサー環境）
 */
export function getClientIp(event: { node: { req: { headers: Record<string, string | string[] | undefined>; socket?: { remoteAddress?: string } } } }): string {
  const xForwardedFor = event.node.req.headers['x-forwarded-for']
  if (xForwardedFor) {
    // 複数IPの場合は最初のもの（オリジナルクライアント）
    const ips = Array.isArray(xForwardedFor)
      ? xForwardedFor[0]
      : xForwardedFor.split(',')[0]
    return ips.trim()
  }

  const xRealIp = event.node.req.headers['x-real-ip']
  if (xRealIp) {
    return Array.isArray(xRealIp) ? xRealIp[0] : xRealIp
  }

  return event.node.req.socket?.remoteAddress || 'unknown'
}

/**
 * レート制限エントリをリセット（テスト用）
 */
export function resetRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier)
}

/**
 * 全エントリをクリア（テスト用）
 */
export function clearAllRateLimits(): void {
  rateLimitStore.clear()
}

// ログインAPI用のデフォルト設定
export const LOGIN_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 10,
  windowMs: 60 * 1000 // 1分
}
