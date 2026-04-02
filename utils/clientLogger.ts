/**
 * クライアントサイド構造化ロガー
 *
 * プロダクションでは warn/error のみ出力。
 * development では全レベル出力。
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const isDev = process.env.NODE_ENV === 'development'

function log(level: LogLevel, module: string, message: string, data?: Record<string, unknown>): void {
  if (!isDev && (level === 'debug' || level === 'info')) return

  const entry = {
    level,
    module,
    message,
    ts: new Date().toISOString(),
    ...data,
  }

  switch (level) {
    case 'error':
      // eslint-disable-next-line no-console
      console.error(`[${module}]`, message, data ?? '')
      break
    case 'warn':
      // eslint-disable-next-line no-console
      console.warn(`[${module}]`, message, data ?? '')
      break
    default:
      // eslint-disable-next-line no-console
      console.log(`[${module}]`, message, data ?? '')
  }
}

export function createClientLogger(module: string) {
  return {
    debug: (message: string, data?: Record<string, unknown>) => log('debug', module, message, data),
    info: (message: string, data?: Record<string, unknown>) => log('info', module, message, data),
    warn: (message: string, data?: Record<string, unknown>) => log('warn', module, message, data),
    error: (message: string, data?: Record<string, unknown>) => log('error', module, message, data),
  }
}
