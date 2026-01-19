import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { email } = body

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    throw createError({
      statusCode: 400,
      statusMessage: '有効なメールアドレスを入力してください'
    })
  }

  try {
    // 1. Organizationの仮作成
    // 名前はメールアドレスのドメイン部分などを利用して仮設定
    const domain = email.split('@')[1]
    const orgName = `${domain.split('.')[0]} (仮)`
    
    const organization = await prisma.organization.create({
      data: {
        name: orgName
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
    console.log(`[LEAD] New lead acquired: ${email} (Org: ${organization.id})`)

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
