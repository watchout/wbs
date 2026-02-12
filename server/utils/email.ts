/**
 * メール送信ユーティリティ
 *
 * Resend を使用した構造化メール送信基盤。
 * 環境変数 RESEND_API_KEY が未設定の場合はログ出力のみ行う（開発環境用）。
 *
 * @see https://resend.com/docs
 */

import { Resend } from 'resend'
import { createLogger } from '~/server/utils/logger'

const log = createLogger('email')

// ================================================================
// 設定
// ================================================================

const RESEND_API_KEY = process.env.RESEND_API_KEY || ''
const FROM_ADDRESS = process.env.EMAIL_FROM || 'ミエルプラス <noreply@mieruplus.jp>'
const APP_BASE_URL = process.env.APP_BASE_URL || 'https://mieruplus.jp'

/** Resend クライアント（APIキーが設定されている場合のみ有効） */
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null

// ================================================================
// 型定義
// ================================================================

interface SendEmailOptions {
  to: string
  subject: string
  html: string
  /** テキスト版（省略時はHTMLからタグを除去） */
  text?: string
}

interface SendEmailResult {
  success: boolean
  messageId?: string
  error?: string
}

// ================================================================
// メール送信
// ================================================================

/**
 * メールを送信する
 *
 * RESEND_API_KEY が未設定の場合はログ出力のみ（開発用）
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const { to, subject, html, text } = options

  // APIキー未設定の場合はログ出力のみ
  if (!resend) {
    log.warn('RESEND_API_KEY not configured, email not sent', {
      to: maskEmail(to),
      subject,
    })
    return { success: true, messageId: 'dev-mode-skipped' }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject,
      html,
      text: text || stripHtml(html),
    })

    if (error) {
      log.error('Failed to send email', {
        to: maskEmail(to),
        subject,
        error: new Error(error.message),
      })
      return { success: false, error: error.message }
    }

    log.info('Email sent successfully', {
      to: maskEmail(to),
      subject,
      messageId: data?.id,
    })

    return { success: true, messageId: data?.id }
  } catch (error: unknown) {
    log.error('Email send exception', {
      to: maskEmail(to),
      subject,
      error: error instanceof Error ? error : new Error(String(error)),
    })
    return { success: false, error: String(error) }
  }
}

// ================================================================
// メールテンプレート
// ================================================================

/**
 * トライアル申込完了メール
 *
 * セットアップURL付きのウェルカムメール
 */
export function buildTrialWelcomeEmail(params: {
  orgName: string
  setupToken: string
}): { subject: string; html: string } {
  const { orgName, setupToken } = params
  const setupUrl = `${APP_BASE_URL}/setup?token=${setupToken}`

  const subject = '【ミエルプラス】トライアルへようこそ！パスワードを設定してください'

  const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:'Noto Sans JP',-apple-system,BlinkMacSystemFont,sans-serif;background:#f5f5f5;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
    <div style="background:white;border-radius:12px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
      <!-- ヘッダー -->
      <div style="text-align:center;margin-bottom:24px;">
        <h1 style="font-size:24px;color:#1a1a2e;margin:0;">🤖 ミエルプラス</h1>
        <p style="color:#666;margin:8px 0 0;">現場がぜんぶミエル。</p>
      </div>

      <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">

      <!-- 本文 -->
      <h2 style="font-size:20px;color:#333;margin:0 0 16px;">トライアルへようこそ！</h2>
      <p style="color:#555;line-height:1.7;">
        <strong>${escapeHtml(orgName)}</strong> 様、ミエルプラスにご登録いただきありがとうございます。
      </p>
      <p style="color:#555;line-height:1.7;">
        14日間の無料トライアルをお楽しみください。まずはパスワードの設定をお願いいたします。
      </p>

      <!-- CTAボタン -->
      <div style="text-align:center;margin:32px 0;">
        <a href="${setupUrl}" style="display:inline-block;background:#1a1a2e;color:white;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:16px;font-weight:bold;">
          パスワードを設定する
        </a>
      </div>

      <p style="color:#888;font-size:13px;line-height:1.6;">
        ※ このリンクは24時間有効です。<br>
        ※ ボタンが動作しない場合は、以下のURLをブラウザに貼り付けてください：<br>
        <a href="${setupUrl}" style="color:#4a90d9;word-break:break-all;">${setupUrl}</a>
      </p>

      <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">

      <!-- トライアル情報 -->
      <h3 style="font-size:16px;color:#333;margin:0 0 12px;">📋 トライアルに含まれるもの</h3>
      <ul style="color:#555;line-height:1.8;padding-left:20px;">
        <li>ミエルボード（週間スケジュールボード）</li>
        <li>サイネージモード</li>
        <li>AIコンシェルジュ</li>
        <li>Googleカレンダー連携</li>
      </ul>

      <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">

      <!-- フッター -->
      <div style="text-align:center;color:#999;font-size:12px;">
        <p>ご不明な点がございましたら、お気軽にお問い合わせください。</p>
        <p>
          <a href="https://mieruplus.jp" style="color:#4a90d9;">mieruplus.jp</a>
        </p>
        <p style="margin-top:16px;">
          © ${new Date().getFullYear()} ミエルプラス / 有限会社IYASAKA
        </p>
      </div>
    </div>
  </div>
</body>
</html>`.trim()

  return { subject, html }
}

// ================================================================
// ヘルパー
// ================================================================

/** メールアドレスをマスク化（PII保護） */
function maskEmail(email: string): string {
  const parts = email.split('@')
  if (parts.length !== 2) return '***'
  return `***@${parts[1]}`
}

/** HTMLタグを除去してプレーンテキストに変換 */
function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/** HTML エスケープ */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
