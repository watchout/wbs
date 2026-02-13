import { prisma } from '~/server/utils/prisma'
import { randomUUID } from 'crypto'
import { createLogger } from '~/server/utils/logger'
import { checkRateLimit, getClientIp } from '~/server/utils/rateLimit'
import { sendEmail, buildTrialWelcomeEmail } from '~/server/utils/email'

const log = createLogger('contact')

/** 申込APIのレート制限: 1IPあたり5回/10分 */
const CONTACT_RATE_LIMIT = {
  maxRequests: 5,
  windowMs: 10 * 60 * 1000,
}

/** セットアップトークンの有効期限（時間） */
const TOKEN_EXPIRY_HOURS = 24

/**
 * 組織名からslugを生成する
 * ASCII英数字とハイフンのみ。常にランダムサフィックスを付与してユニーク性を担保。
 */
function generateOrgSlug(name: string): string {
  const suffix = randomUUID().split('-')[0] // 8文字のランダム値
  // ASCII英数字部分を抽出
  const ascii = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+$/, '')
  if (ascii.length >= 3) {
    return `${ascii}-${suffix}`
  }
  // 日本語名やASCII部分が短い場合はUUIDベースのみ
  return `org-${suffix}`
}

export default defineEventHandler(async (event) => {
  // レート制限チェック
  const clientIp = getClientIp(event)
  const rateCheck = checkRateLimit(`contact:${clientIp}`, CONTACT_RATE_LIMIT)
  if (!rateCheck.allowed) {
    log.warn('Rate limit exceeded', { ip: clientIp, retryAfter: rateCheck.retryAfterSeconds })
    throw createError({
      statusCode: 429,
      statusMessage: `リクエストが多すぎます。${rateCheck.retryAfterSeconds}秒後に再試行してください`
    })
  }

  const body = await readBody(event)
  const { email, companyName } = body

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  if (!email || typeof email !== 'string' || !emailRegex.test(email)) {
    throw createError({
      statusCode: 400,
      statusMessage: '有効なメールアドレスを入力してください'
    })
  }

  try {
    // 1. Organizationの作成
    // 会社名が提供されればそれを使用、なければメールドメインから生成
    const domain = email.split('@')[1]
    const orgName = companyName?.trim() || `${domain.split('.')[0]} (仮)`

    const slug = generateOrgSlug(orgName)

    const organization = await prisma.organization.create({
      data: {
        name: orgName,
        slug
      }
    })

    // 2. Userの作成（管理者）
    const user = await prisma.user.create({
      data: {
        email,
        organizationId: organization.id,
        role: 'ADMIN',
        name: '管理者(未設定)'
      }
    })

    // 3. セットアップトークン発行（パスワード設定用）
    const setupToken = randomUUID()
    const setupTokenExpiry = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        setupToken,
        setupTokenExpiry
      }
    })

    // 4. ウェルカムメール送信（非同期、失敗してもリード作成は成功）
    const welcomeEmail = buildTrialWelcomeEmail({
      orgName,
      setupToken,
    })
    const emailResult = await sendEmail({
      to: email,
      subject: welcomeEmail.subject,
      html: welcomeEmail.html,
    })

    // 5. 構造化ログ（PII保護: メールアドレスはマスク化）
    log.info('New lead acquired', {
      maskedEmail: `***@${domain}`,
      organizationId: organization.id,
      orgName,
      emailSent: emailResult.success,
    })

    return {
      success: true,
      message: 'トライアルの申し込みを受け付けました。メールをご確認ください。',
      organizationId: organization.id,
      setupToken,
    }

  } catch (error: unknown) {
    const prismaError = error as { code?: string }

    // 既に登録済みの場合のハンドリング
    if (prismaError.code === 'P2002') {
      log.warn('Duplicate email registration attempt', {
        maskedEmail: `***@${email.split('@')[1]}`,
      })
      throw createError({
        statusCode: 409,
        statusMessage: 'このメールアドレスは既に登録されています'
      })
    }

    log.error('Lead generation failed', {
      error: error instanceof Error ? error : new Error(String(error)),
    })

    throw createError({
      statusCode: 500,
      statusMessage: 'サーバーエラーが発生しました'
    })
  }
})
