/**
 * メール送信ユーティリティ（NOTIF-001）
 *
 * nodemailer をラップして組織単位のメール送信を提供
 * 環境変数でSMTP設定を管理
 */

import nodemailer from 'nodemailer'
import { createLogger } from './logger'

const log = createLogger('mailer')

interface MailOptions {
  to: string | string[]
  subject: string
  text: string
  html?: string
}

interface MailResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * SMTP トランスポーターを作成
 */
function createTransporter() {
  const host = process.env.SMTP_HOST
  const port = parseInt(process.env.SMTP_PORT || '587', 10)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!host || !user || !pass) {
    return null
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  })
}

/**
 * メールを送信
 *
 * SMTP設定がない場合はログ出力のみ（開発環境対応）
 */
export async function sendMail(options: MailOptions): Promise<MailResult> {
  const from = process.env.SMTP_FROM || 'noreply@mielboard.jp'
  const transporter = createTransporter()

  if (!transporter) {
    // SMTP未設定 → 開発環境ではログのみ
    if (process.env.NODE_ENV !== 'production') {
      log.info('SMTP not configured, skipping email', {
        subject: options.subject,
      })
      return { success: true, messageId: 'dev-skip' }
    }
    return { success: false, error: 'SMTP not configured' }
  }

  try {
    const result = await transporter.sendMail({
      from,
      to: Array.isArray(options.to) ? options.to.join(',') : options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    })

    return { success: true, messageId: result.messageId }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    log.error('Failed to send email', { error: new Error(message) })
    return { success: false, error: message }
  }
}
