/**
 * プラットフォーム管理用シードデータ
 *
 * PlanConfig, CreditPackConfig, CohortConfig の初期データ
 * および ミエルプラス運営 Organization + Platform Admin ユーザーを作成
 *
 * 使用方法:
 *   npx tsx prisma/seed-platform.ts
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

// Prisma enum 型定義（prisma generate が未実行でもビルド可能にする）
type PlanType = 'STARTER' | 'BUSINESS' | 'ENTERPRISE'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 プラットフォーム管理データ投入開始...')

  // 1. ミエルプラス運営 Organization
  const systemOrg = await prisma.organization.upsert({
    where: { id: 'mielplus-system' },
    update: { isSystemOrg: true, slug: 'mielplus-system' },
    create: {
      id: 'mielplus-system',
      name: 'ミエルプラス運営',
      slug: 'mielplus-system',
      isSystemOrg: true,
    },
  })
  console.log('✅ システム組織作成:', systemOrg.name)

  // 2. Platform Admin ユーザー
  const platformAdminHash = await bcrypt.hash('platformadmin123', 10)
  const platformAdmin = await prisma.user.upsert({
    where: { email: 'admin@mieruplus.jp' },
    update: { isPlatformAdmin: true },
    create: {
      organizationId: systemOrg.id,
      email: 'admin@mieruplus.jp',
      name: 'プラットフォーム管理者',
      role: 'ADMIN',
      isPlatformAdmin: true,
      passwordHash: platformAdminHash,
    },
  })
  console.log('✅ プラットフォーム管理者作成:', platformAdmin.email)

  // 3. PlanConfig 初期データ（SSOT_PRICING.md v2.0 準拠）
  const plans: Array<{
    planType: PlanType
    name: string
    description: string
    monthlyPrice: number
    annualPrice: number | null
    maxUsers: number
    monthlyAiCredits: number
    features: string[]
    featureLabels: string[]
    isRecommended: boolean
    sortOrder: number
  }> = [
    {
      planType: 'STARTER',
      name: 'スターター',
      description: '小規模チーム向け。10名まで、AIクレジット150回/月',
      monthlyPrice: 14800,
      annualPrice: 148000,
      maxUsers: 10,
      monthlyAiCredits: 150,
      features: ['weekly_board', 'department_filter', 'realtime_sync', 'ai_voice_input', 'ai_text_input', 'ai_schedule'],
      featureLabels: ['週間ボード', '部門フィルタ', 'リアルタイム更新', 'AI音声入力', 'AI自然文入力', 'AI日程調整'],
      isRecommended: false,
      sortOrder: 1,
    },
    {
      planType: 'BUSINESS',
      name: 'ビジネス',
      description: '中規模企業向け。30名まで、AIクレジット400回/月、全機能',
      monthlyPrice: 39800,
      annualPrice: 398000,
      maxUsers: 30,
      monthlyAiCredits: 400,
      features: ['weekly_board', 'department_filter', 'realtime_sync', 'ai_voice_input', 'ai_text_input', 'ai_schedule', 'signage_mode', 'calendar_sync', 'history_export'],
      featureLabels: ['週間ボード', '部門フィルタ', 'リアルタイム更新', 'AI音声入力', 'AI自然文入力', 'AI日程調整', 'サイネージモード', 'カレンダー連携', '履歴エクスポート'],
      isRecommended: true,
      sortOrder: 2,
    },
    {
      planType: 'ENTERPRISE',
      name: 'エンタープライズ',
      description: '大規模企業向け。100名まで、AI無制限、全モジュール',
      monthlyPrice: 79800,
      annualPrice: null,
      maxUsers: 100,
      monthlyAiCredits: -1,
      features: ['weekly_board', 'department_filter', 'realtime_sync', 'ai_voice_input', 'ai_text_input', 'ai_schedule', 'signage_mode', 'calendar_sync', 'history_export', 'api_access', 'sso_saml', 'multi_site', 'custom'],
      featureLabels: ['週間ボード', '部門フィルタ', 'リアルタイム更新', 'AI音声入力', 'AI自然文入力', 'AI日程調整', 'サイネージモード', 'カレンダー連携', '履歴エクスポート', 'API連携', 'SSO/SAML', '複数拠点', 'カスタマイズ'],
      isRecommended: false,
      sortOrder: 3,
    },
  ]

  for (const plan of plans) {
    await prisma.planConfig.upsert({
      where: { planType: plan.planType },
      update: plan,
      create: plan,
    })
  }
  console.log('✅ プラン設定作成:', plans.length, '件')

  // 4. CreditPackConfig 初期データ
  const packs = [
    { name: 'ライト', credits: 100, price: 1500, sortOrder: 1 },
    { name: 'スタンダード', credits: 300, price: 3500, sortOrder: 2 },
    { name: 'プロ', credits: 1000, price: 9800, sortOrder: 3 },
  ]

  // 既存のパックを削除して再作成
  await prisma.creditPackConfig.deleteMany({})
  for (const pack of packs) {
    await prisma.creditPackConfig.create({ data: pack })
  }
  console.log('✅ クレジットパック設定作成:', packs.length, '件')

  // 5. CohortConfig 初期データ
  const cohorts = [
    { cohortNumber: 1, maxOrgs: 10, discountPercent: 40, stripeCouponId: 'cohort_1_40off' },
    { cohortNumber: 2, maxOrgs: 20, discountPercent: 25, stripeCouponId: 'cohort_2_25off' },
    { cohortNumber: 3, maxOrgs: 30, discountPercent: 10, stripeCouponId: 'cohort_3_10off' },
  ]

  for (const cohort of cohorts) {
    await prisma.cohortConfig.upsert({
      where: { cohortNumber: cohort.cohortNumber },
      update: cohort,
      create: cohort,
    })
  }
  console.log('✅ コホート設定作成:', cohorts.length, '件')

  console.log('')
  console.log('🎉 プラットフォーム管理データ投入完了!')
  console.log('')
  console.log('📋 プラットフォーム管理者ログイン情報:')
  console.log('   Email: admin@mieruplus.jp')
  console.log('   Password: platformadmin123')
  console.log('   URL: /platform/')
}

main()
  .catch((e) => {
    console.error('❌ シード失敗:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
