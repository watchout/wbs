/**
 * サクシード社向けシードデータ
 * 実地テスト用のリアルなデータセット
 *
 * 使用方法:
 *   npx tsx prisma/seed-succeed.ts
 */

import { PrismaClient, Role, Source } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

const DEFAULT_PASSWORD_HASH = await bcrypt.hash('password123', 10)

async function main() {
  console.log('🌱 サクシード社テストデータ投入開始...')

  // 1. サクシード組織
  const org = await prisma.organization.upsert({
    where: { id: 'succeed' },
    update: { slug: 'succeed' },
    create: {
      id: 'succeed',
      name: '株式会社サクシード',
      slug: 'succeed',
      timezone: 'Asia/Tokyo'
    }
  })
  console.log('✅ 組織作成:', org.name)

  // 2. 部署（3部門）
  const departmentsData = [
    { id: 'succeed-dept-001', name: '工事部', color: '#3B82F6', sortOrder: 1 },
    { id: 'succeed-dept-002', name: '営業部', color: '#10B981', sortOrder: 2 },
    { id: 'succeed-dept-003', name: '保守部', color: '#F59E0B', sortOrder: 3 }
  ]

  for (const deptData of departmentsData) {
    await prisma.department.upsert({
      where: {
        organizationId_name: {
          organizationId: org.id,
          name: deptData.name
        }
      },
      update: { color: deptData.color, sortOrder: deptData.sortOrder },
      create: {
        id: deptData.id,
        name: deptData.name,
        color: deptData.color,
        sortOrder: deptData.sortOrder,
        organizationId: org.id
      }
    })
  }
  console.log('✅ 部署作成:', departmentsData.length, '件')

  // 3. テストユーザー（8名）
  // Note: Role enum is ADMIN, MEMBER, DEVICE のみ
  const usersData = [
    // 工事部（4名）
    { id: 'succeed-user-001', email: 'yamamoto@succeed.co.jp', name: '山本一郎', role: Role.ADMIN, departmentId: 'succeed-dept-001' },
    { id: 'succeed-user-002', email: 'tanaka@succeed.co.jp', name: '田中太郎', role: Role.MEMBER, departmentId: 'succeed-dept-001' },
    { id: 'succeed-user-003', email: 'suzuki@succeed.co.jp', name: '鈴木次郎', role: Role.MEMBER, departmentId: 'succeed-dept-001' },
    { id: 'succeed-user-004', email: 'ito@succeed.co.jp', name: '伊藤三郎', role: Role.MEMBER, departmentId: 'succeed-dept-001' },
    // 営業部（2名）
    { id: 'succeed-user-005', email: 'sato@succeed.co.jp', name: '佐藤花子', role: Role.MEMBER, departmentId: 'succeed-dept-002' },
    { id: 'succeed-user-006', email: 'watanabe@succeed.co.jp', name: '渡辺美咲', role: Role.MEMBER, departmentId: 'succeed-dept-002' },
    // 保守部（2名）
    { id: 'succeed-user-007', email: 'takahashi@succeed.co.jp', name: '高橋健一', role: Role.MEMBER, departmentId: 'succeed-dept-003' },
    { id: 'succeed-user-008', email: 'kobayashi@succeed.co.jp', name: '小林誠', role: Role.MEMBER, departmentId: 'succeed-dept-003' }
  ]

  for (const userData of usersData) {
    await prisma.user.upsert({
      where: { email: userData.email },
      update: { name: userData.name, departmentId: userData.departmentId, passwordHash: DEFAULT_PASSWORD_HASH },
      create: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        organizationId: org.id,
        departmentId: userData.departmentId,
        passwordHash: DEFAULT_PASSWORD_HASH
      }
    })
  }
  console.log('✅ ユーザー作成:', usersData.length, '名')

  // 4. デバイス（サイネージ用）
  const device = await prisma.device.upsert({
    where: { kioskSecret: 'succeed-kiosk-secret-001' },
    update: {},
    create: {
      id: 'succeed-device-001',
      name: '事務所サイネージ',
      kioskSecret: 'succeed-kiosk-secret-001', // ⚠️ 本番運用前に必ず変更すること
      organizationId: org.id
    }
  })
  console.log('✅ デバイス作成:', device.name)

  // 5. 今週のスケジュール
  const today = new Date()
  const monday = new Date(today)
  const day = today.getDay()
  monday.setDate(today.getDate() - day + (day === 0 ? -6 : 1))
  monday.setHours(0, 0, 0, 0)

  // 既存スケジュールを削除（再シード用）
  await prisma.schedule.deleteMany({
    where: { organizationId: org.id }
  })

  // リアルな現場名と作業内容
  const sites = [
    { name: '品川グランドホテル', type: 'ホテル' },
    { name: '渋谷センタービル', type: 'オフィスビル' },
    { name: '新宿ターミナル', type: '商業施設' },
    { name: '横浜マリンタワー', type: '観光施設' },
    { name: '川崎テックセンター', type: 'データセンター' }
  ]

  const activities = ['LAN配線工事', 'Wi-Fi設置', '監視カメラ工事', '打合せ', 'サーバー設置', '定期点検']

  const schedulesData = [
    // 山本一郎（工事部リーダー）
    { authorId: 'succeed-user-001', site: sites[0], activity: activities[0], dayOffset: 0, startHour: 8, endHour: 17 },
    { authorId: 'succeed-user-001', site: sites[0], activity: activities[0], dayOffset: 1, startHour: 8, endHour: 17 },
    { authorId: 'succeed-user-001', site: sites[1], activity: activities[3], dayOffset: 2, startHour: 10, endHour: 12 },
    { authorId: 'succeed-user-001', site: sites[1], activity: activities[2], dayOffset: 3, startHour: 8, endHour: 17 },
    { authorId: 'succeed-user-001', title: '休み', dayOffset: 4 },

    // 田中太郎（工事部）
    { authorId: 'succeed-user-002', site: sites[2], activity: activities[1], dayOffset: 0, startHour: 9, endHour: 18 },
    { authorId: 'succeed-user-002', site: sites[2], activity: activities[1], dayOffset: 1, startHour: 9, endHour: 18 },
    { authorId: 'succeed-user-002', site: sites[2], activity: activities[1], dayOffset: 2, startHour: 9, endHour: 18 },
    { authorId: 'succeed-user-002', title: '社内作業', dayOffset: 3, startHour: 9, endHour: 17 },
    { authorId: 'succeed-user-002', site: sites[3], activity: activities[2], dayOffset: 4, startHour: 8, endHour: 17 },

    // 鈴木次郎（工事部）
    { authorId: 'succeed-user-003', site: sites[4], activity: activities[4], dayOffset: 0, startHour: 8, endHour: 20 },
    { authorId: 'succeed-user-003', site: sites[4], activity: activities[4], dayOffset: 1, startHour: 8, endHour: 20 },
    { authorId: 'succeed-user-003', title: '休み', dayOffset: 2 },
    { authorId: 'succeed-user-003', site: sites[0], activity: activities[0], dayOffset: 3, startHour: 8, endHour: 17 },
    { authorId: 'succeed-user-003', site: sites[0], activity: activities[0], dayOffset: 4, startHour: 8, endHour: 17 },

    // 伊藤三郎（工事部）
    { authorId: 'succeed-user-004', title: '研修', dayOffset: 0, startHour: 9, endHour: 17 },
    { authorId: 'succeed-user-004', site: sites[3], activity: activities[1], dayOffset: 1, startHour: 8, endHour: 17 },
    { authorId: 'succeed-user-004', site: sites[3], activity: activities[1], dayOffset: 2, startHour: 8, endHour: 17 },
    { authorId: 'succeed-user-004', site: sites[3], activity: activities[1], dayOffset: 3, startHour: 8, endHour: 17 },
    { authorId: 'succeed-user-004', title: '休み', dayOffset: 4 },

    // 佐藤花子（営業部）
    { authorId: 'succeed-user-005', site: sites[0], activity: activities[3], dayOffset: 0, startHour: 10, endHour: 12 },
    { authorId: 'succeed-user-005', title: '社内', dayOffset: 1, startHour: 9, endHour: 18 },
    { authorId: 'succeed-user-005', site: sites[1], activity: activities[3], dayOffset: 2, startHour: 14, endHour: 16 },
    { authorId: 'succeed-user-005', site: sites[2], activity: activities[3], dayOffset: 3, startHour: 10, endHour: 12 },
    { authorId: 'succeed-user-005', title: '社内', dayOffset: 4, startHour: 9, endHour: 18 },

    // 渡辺美咲（営業部）
    { authorId: 'succeed-user-006', title: '社内', dayOffset: 0, startHour: 9, endHour: 18 },
    { authorId: 'succeed-user-006', site: sites[4], activity: activities[3], dayOffset: 1, startHour: 13, endHour: 15 },
    { authorId: 'succeed-user-006', title: '社内', dayOffset: 2, startHour: 9, endHour: 18 },
    { authorId: 'succeed-user-006', title: '休み', dayOffset: 3 },
    { authorId: 'succeed-user-006', site: sites[3], activity: activities[3], dayOffset: 4, startHour: 10, endHour: 12 },

    // 高橋健一（保守部）
    { authorId: 'succeed-user-007', site: sites[1], activity: activities[5], dayOffset: 0, startHour: 9, endHour: 17 },
    { authorId: 'succeed-user-007', site: sites[2], activity: activities[5], dayOffset: 1, startHour: 9, endHour: 17 },
    { authorId: 'succeed-user-007', title: '社内作業', dayOffset: 2, startHour: 9, endHour: 17 },
    { authorId: 'succeed-user-007', site: sites[0], activity: activities[5], dayOffset: 3, startHour: 9, endHour: 17 },
    { authorId: 'succeed-user-007', site: sites[4], activity: activities[5], dayOffset: 4, startHour: 9, endHour: 17 },

    // 小林誠（保守部）
    { authorId: 'succeed-user-008', site: sites[3], activity: activities[5], dayOffset: 0, startHour: 8, endHour: 16 },
    { authorId: 'succeed-user-008', title: '休み', dayOffset: 1 },
    { authorId: 'succeed-user-008', site: sites[1], activity: activities[5], dayOffset: 2, startHour: 9, endHour: 17 },
    { authorId: 'succeed-user-008', site: sites[2], activity: activities[5], dayOffset: 3, startHour: 9, endHour: 17 },
    { authorId: 'succeed-user-008', site: sites[0], activity: activities[5], dayOffset: 4, startHour: 9, endHour: 17 }
  ]

  for (const scheduleData of schedulesData) {
    const startDate = new Date(monday)
    startDate.setDate(monday.getDate() + scheduleData.dayOffset)

    const endDate = new Date(monday)
    endDate.setDate(monday.getDate() + scheduleData.dayOffset)

    // 休みや終日の場合
    if (!scheduleData.startHour) {
      startDate.setHours(0, 0, 0, 0)
      endDate.setDate(endDate.getDate() + 1)
      endDate.setHours(0, 0, 0, 0)
    } else {
      startDate.setHours(scheduleData.startHour, 0, 0, 0)
      endDate.setHours(scheduleData.endHour || 17, 0, 0, 0)
    }

    // タイトルと説明の生成
    let title = scheduleData.title || ''
    let description: string | null = null

    if (scheduleData.site) {
      title = scheduleData.site.name
      description = JSON.stringify({
        siteName: scheduleData.site.name,
        activityType: scheduleData.activity
      })
    }

    await prisma.schedule.create({
      data: {
        organizationId: org.id,
        authorId: scheduleData.authorId,
        title,
        description,
        start: startDate,
        end: endDate,
        source: Source.INTERNAL
      }
    })
  }
  console.log('✅ スケジュール作成:', schedulesData.length, '件')

  console.log('')
  console.log('🎉 サクシード社テストデータ投入完了!')
  console.log('')
  console.log('📋 接続情報:')
  console.log('   組織ID: succeed')
  console.log('   キオスク: succeed-kiosk-secret-001')
  console.log('   URL: /org/succeed/weekly-board')
  console.log('   サイネージ: /org/succeed/display')
}

main()
  .catch((e) => {
    console.error('❌ シード失敗:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
