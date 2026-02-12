/**
 * 構造化ロガーユーティリティ
 *
 * プロダクションコードでの console.log 使用を排除し、
 * 構造化された JSON ログを出力する。
 *
 * ログレベル:
 * - info: 正常系の動作記録
 * - warn: 注意すべき事象（動作に問題なし）
 * - error: エラー（要対応）
 * - debug: デバッグ情報（NODE_ENV=development のみ出力）
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogEntry {
  level: LogLevel
  module: string
  message: string
  timestamp: string
  data?: Record<string, unknown>
}

function createLogEntry(
  level: LogLevel,
  module: string,
  message: string,
  data?: Record<string, unknown>
): LogEntry {
  return {
    level,
    module,
    message,
    timestamp: new Date().toISOString(),
    ...(data && { data }),
  }
}

function sendToSentry(entry: LogEntry): void {
  try {
    import('@sentry/nuxt').then((Sentry) => {
      if (entry.data?.error instanceof Error) {
        Sentry.captureException(entry.data.error, {
          tags: { module: entry.module },
          extra: entry.data,
        })
      } else {
        Sentry.captureMessage(`[${entry.module}] ${entry.message}`, {
          level: 'error',
          tags: { module: entry.module },
          extra: entry.data,
        })
      }
    }).catch(() => {
      // Sentry 未初期化時は何もしない
    })
  } catch {
    // Sentry import 失敗時は何もしない
  }
}

function writeLog(entry: LogEntry): void {
  const output = JSON.stringify(entry)
  switch (entry.level) {
    case 'error':
      // eslint-disable-next-line no-console
      console.error(output)
      sendToSentry(entry)
      break
    case 'warn':
      // eslint-disable-next-line no-console
      console.warn(output)
      break
    case 'debug':
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.debug(output)
      }
      break
    default:
      // eslint-disable-next-line no-console
      console.info(output)
  }
}

/**
 * モジュール固有のロガーを作成する
 *
 * @example
 * const log = createLogger('stripe-webhook')
 * log.info('Received event', { type: 'checkout.session.completed' })
 * log.error('Signature verification failed', { error: message })
 */
export function createLogger(module: string) {
  return {
    info(message: string, data?: Record<string, unknown>) {
      writeLog(createLogEntry('info', module, message, data))
    },
    warn(message: string, data?: Record<string, unknown>) {
      writeLog(createLogEntry('warn', module, message, data))
    },
    error(message: string, data?: Record<string, unknown>) {
      writeLog(createLogEntry('error', module, message, data))
    },
    debug(message: string, data?: Record<string, unknown>) {
      writeLog(createLogEntry('debug', module, message, data))
    },
  }
}

/**
 * デフォルトロガー（モジュール名 = 'app'）
 */
export const logger = createLogger('app')
