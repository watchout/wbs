// server/utils/notification.ts
// Sprint 6: 通知基盤 — メール送信 + 通知ログ管理

import { prisma } from './prisma'
import { logger } from './logger'

// ---------- 型定義 ----------

interface SendNotificationParams {
  organizationId: string
  recipientId: string
  channel: 'EMAIL' | 'TOAST' | 'PUSH'
  eventType: string
  subject?: string
  body: string
}

interface EmailPayload {
  to: string
  subject: string
  body: string
  from?: string
}

// ---------- レート制限 ----------

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_PER_HOUR = 100

function checkEmailRateLimit(organizationId: string): boolean {
  const now = Date.now()
  const key = `email:${organizationId}`
  const entry = rateLimitMap.get(key)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + 3600000 })
    return true
  }

  if (entry.count >= RATE_LIMIT_PER_HOUR) return false
  entry.count++
  return true
}

// ---------- メール送信（Resend） ----------

async function sendEmailViaResend(payload: EmailPayload): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured')
  }

  const from = payload.from || process.env.RESEND_FROM_EMAIL || 'noreply@mielboard.com'

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [payload.to],
      subject: payload.subject,
      html: payload.body,
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Resend API error: ${response.status} ${errorBody}`)
  }
}

// ---------- リトライ付きメール送信 ----------

async function sendEmailWithRetry(
  payload: EmailPayload,
  maxRetries: number = 3
): Promise<{ success: boolean; failReason?: string }> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await sendEmailViaResend(payload)
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.warn('Email send attempt failed', {
        attempt,
        maxRetries,
        error: message,
        to: payload.to,
      })

      if (attempt < maxRetries) {
        // 指数バックオフ: 1分, 4分, 9分
        const delayMs = attempt * attempt * 60000
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      } else {
        return { success: false, failReason: message }
      }
    }
  }

  return { success: false, failReason: 'Max retries exceeded' }
}

// ---------- メインAPI ----------

/**
 * 通知を送信する
 * - メール: Resend経由で非同期送信（リトライ付き）
 * - ユーザーの通知設定を尊重（OFFならSKIP）
 * - NotificationLogに記録
 */
export async function sendNotification(params: SendNotificationParams): Promise<string> {
  const { organizationId, recipientId, channel, eventType, subject, body } = params

  // NotificationLogレコードを先に作成
  const notifLog = await prisma.notificationLog.create({
    data: {
      organizationId,
      recipientId,
      channel,
      eventType,
      subject,
      body,
      status: 'PENDING',
    },
  })

  if (channel === 'EMAIL') {
    // ユーザーの通知設定を確認
    const user = await prisma.user.findUnique({
      where: { id: recipientId },
      select: { email: true, notifyEmail: true, organizationId: true },
    })

    if (!user || user.organizationId !== organizationId) {
      await prisma.notificationLog.update({
        where: { id: notifLog.id },
        data: { status: 'FAILED', failReason: 'User not found or org mismatch' },
      })
      return notifLog.id
    }

    // 通知OFFならスキップ
    if (!user.notifyEmail) {
      await prisma.notificationLog.update({
        where: { id: notifLog.id },
        data: { status: 'SKIPPED' },
      })
      logger.info('Email notification skipped (user opted out)', {
        notifId: notifLog.id,
        recipientId,
        eventType,
      })
      return notifLog.id
    }

    // レート制限チェック
    if (!checkEmailRateLimit(organizationId)) {
      await prisma.notificationLog.update({
        where: { id: notifLog.id },
        data: { status: 'FAILED', failReason: 'Rate limit exceeded' },
      })
      logger.warn('Email rate limit exceeded', { organizationId })
      return notifLog.id
    }

    // 非同期でメール送信（fire-and-forget）
    sendEmailWithRetry({
      to: user.email,
      subject: subject || `【ミエルボード】${eventType}`,
      body,
    }).then(async (result) => {
      await prisma.notificationLog.update({
        where: { id: notifLog.id },
        data: {
          status: result.success ? 'SENT' : 'FAILED',
          sentAt: result.success ? new Date() : undefined,
          failReason: result.failReason,
        },
      })

      if (result.success) {
        logger.info('Email notification sent', { notifId: notifLog.id, recipientId, eventType })
      } else {
        logger.error('Email notification failed', { notifId: notifLog.id, failReason: result.failReason })
      }
    }).catch((error) => {
      logger.error('Email notification unexpected error', {
        notifId: notifLog.id,
        error: error instanceof Error ? error.message : String(error),
      })
    })
  }

  return notifLog.id
}

// ---------- メールテンプレート ----------

export function buildAssignmentChangeEmail(params: {
  recipientName: string
  siteName: string
  date: string
  isDraft: boolean
  appUrl: string
}): { subject: string; body: string } {
  const draftLabel = params.isDraft ? '（仮配置）' : ''
  return {
    subject: `【ミエルボード】配置変更のお知らせ`,
    body: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1f2937;">配置変更のお知らせ</h2>
        <p>${params.recipientName}さん</p>
        <p><strong>${params.date}</strong> の配置が <strong>「${params.siteName}」</strong> に変更されました${draftLabel}。</p>
        <p><a href="${params.appUrl}" style="display: inline-block; padding: 10px 20px; background: #6366f1; color: white; text-decoration: none; border-radius: 6px;">確認する</a></p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #9ca3af; font-size: 12px;">ミエルボード for 現場</p>
      </div>
    `,
  }
}

export function buildMeetingInviteEmail(params: {
  recipientName: string
  organizerName: string
  title: string
  proposedDates: string[]
  respondUrl: string
}): { subject: string; body: string } {
  const dateList = params.proposedDates.map((d) => `<li>${d}</li>`).join('')
  return {
    subject: `【ミエルボード】${params.organizerName}さんからの日程調整依頼`,
    body: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1f2937;">日程調整のお願い</h2>
        <p>${params.recipientName}さん</p>
        <p><strong>${params.organizerName}</strong>さんから「<strong>${params.title}</strong>」の日程調整依頼が届きました。</p>
        <p>候補日時:</p>
        <ul>${dateList}</ul>
        <p><a href="${params.respondUrl}" style="display: inline-block; padding: 10px 20px; background: #6366f1; color: white; text-decoration: none; border-radius: 6px;">回答する</a></p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #9ca3af; font-size: 12px;">ミエルボード for 現場</p>
      </div>
    `,
  }
}

export function buildPasswordResetEmail(params: {
  recipientName: string
  resetUrl: string
}): { subject: string; body: string } {
  return {
    subject: `【ミエルボード】パスワード設定のお知らせ`,
    body: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1f2937;">パスワード設定</h2>
        <p>${params.recipientName}さん</p>
        <p>パスワードの設定が必要です。以下のリンクから新しいパスワードを設定してください。</p>
        <p><a href="${params.resetUrl}" style="display: inline-block; padding: 10px 20px; background: #6366f1; color: white; text-decoration: none; border-radius: 6px;">パスワードを設定する</a></p>
        <p style="color: #6b7280; font-size: 13px;">※ このリンクは24時間有効です。</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #9ca3af; font-size: 12px;">ミエルボード for 現場</p>
      </div>
    `,
  }
}
