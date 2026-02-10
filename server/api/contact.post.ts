import { prisma } from '~/server/utils/prisma'
import { randomUUID } from 'crypto'

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
  const body = await readBody(event)
  const { email, companyName } = body

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  if (!email || !emailRegex.test(email)) {
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
    // 既に存在する場合はスキップするなどの制御が必要だが、
    // 今回はシンプルに新規作成を試みる（Unique制約でエラーになる場合はキャッチ）
    const user = await prisma.user.create({
      data: {
        email: email,
        organizationId: organization.id,
        role: 'ADMIN',
        name: '管理者(未設定)'
      }
    })

    // 3. ログ出力（本来はメール送信やPlane連携）
    // メールアドレスをマスク化してログ出力（PII保護）
    console.log(`[LEAD] New lead acquired: ***@${email.split('@')[1]} (Org: ${organization.id})`)

    return {
      success: true,
      message: 'トライアルの申し込みを受け付けました',
      organizationId: organization.id
    }

  } catch (error: any) {
    console.error('Lead generation error:', error)
    
    // 既に登録済みの場合などのハンドリング
    if (error.code === 'P2002') {
      throw createError({
        statusCode: 409,
        statusMessage: 'このメールアドレスは既に登録されています'
      })
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'サーバーエラーが発生しました'
    })
  }
})
