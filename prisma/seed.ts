import { PrismaClient, Role, Source } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 シードデータ投入開始...')

  // 1. デモ組織
  const org = await prisma.organization.upsert({
    where: { id: 'demo-org-001' },
    update: {},
    create: {
      id: 'demo-org-001',
      name: 'デモ建設株式会社',
      timezone: 'Asia/Tokyo'
    }
  })
  console.log('✅ 組織作成:', org.name)

  // 2. デモユーザー（3名）
  const usersData = [
    { id: 'user-001', email: 'tanaka@demo.com', name: '田中太郎', role: Role.ADMIN },
    { id: 'user-002', email: 'sato@demo.com', name: '佐藤花子', role: Role.MEMBER },
    { id: 'user-003', email: 'suzuki@demo.com', name: '鈴木一郎', role: Role.MEMBER }
  ]

  for (const userData of usersData) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        organizationId: org.id
      }
    })
    console.log('✅ ユーザー作成:', user.name)
  }

  // 3. デモデバイス（サイネージ用）
  const device = await prisma.device.upsert({
    where: { kioskSecret: 'demo-kiosk-secret-001' },
    update: {},
    create: {
      id: 'device-001',
      name: '事務所サイネージ',
      kioskSecret: 'demo-kiosk-secret-001',
      organizationId: org.id
    }
  })
  console.log('✅ デバイス作成:', device.name)

  // 4. 今週のスケジュール
  const today = new Date()
  const monday = new Date(today)
  const day = today.getDay()
  monday.setDate(today.getDate() - day + (day === 0 ? -6 : 1))
  monday.setHours(0, 0, 0, 0)

  // 既存スケジュールを削除（再シード用）
  await prisma.schedule.deleteMany({
    where: { organizationId: org.id }
  })

  const schedulesData = [
    // 田中太郎の予定
    { authorId: 'user-001', title: '◯◯ホテル', dayOffset: 0, startHour: 8, endHour: 17, description: '{"siteName":"◯◯ホテル","activityType":"新館配線工事"}' },
    { authorId: 'user-001', title: '◯◯ホテル', dayOffset: 1, startHour: 8, endHour: 17, description: '{"siteName":"◯◯ホテル","activityType":"新館配線工事"}' },
    { authorId: 'user-001', title: '打合せ', dayOffset: 2, startHour: 10, endHour: 12, description: '{"siteName":"△△ビル","activityType":"打合せ"}' },
    { authorId: 'user-001', title: '△△ビル', dayOffset: 3, startHour: 8, endHour: 17, description: '{"siteName":"△△ビル","activityType":"LAN工事"}' },
    { authorId: 'user-001', title: '休み', dayOffset: 4, startHour: 0, endHour: 0, description: null },

    // 佐藤花子の予定
    { authorId: 'user-002', title: '□□旅館', dayOffset: 0, startHour: 9, endHour: 18, description: '{"siteName":"□□旅館","activityType":"設備点検"}' },
    { authorId: 'user-002', title: '社内', dayOffset: 1, startHour: 9, endHour: 17, description: '{"siteName":"社内","activityType":"事務作業"}' },
    { authorId: 'user-002', title: '□□旅館', dayOffset: 2, startHour: 9, endHour: 18, description: '{"siteName":"□□旅館","activityType":"設備点検"}' },
    { authorId: 'user-002', title: '□□旅館', dayOffset: 3, startHour: 9, endHour: 18, description: '{"siteName":"□□旅館","activityType":"設備点検"}' },
    { authorId: 'user-002', title: '◇◇マンション', dayOffset: 4, startHour: 9, endHour: 17, description: '{"siteName":"◇◇マンション","activityType":"インターホン工事"}' },

    // 鈴木一郎の予定
    { authorId: 'user-003', title: '研修', dayOffset: 0, startHour: 0, endHour: 0, description: null },
    { authorId: 'user-003', title: '▽▽病院', dayOffset: 1, startHour: 8, endHour: 17, description: '{"siteName":"▽▽病院","activityType":"ナースコール工事"}' },
    { authorId: 'user-003', title: '▽▽病院', dayOffset: 2, startHour: 8, endHour: 17, description: '{"siteName":"▽▽病院","activityType":"ナースコール工事"}' },
    { authorId: 'user-003', title: '休み', dayOffset: 3, startHour: 0, endHour: 0, description: null },
    { authorId: 'user-003', title: '☆☆学校', dayOffset: 4, startHour: 8, endHour: 16, description: '{"siteName":"☆☆学校","activityType":"放送設備点検"}' }
  ]

  for (const scheduleData of schedulesData) {
    const startDate = new Date(monday)
    startDate.setDate(monday.getDate() + scheduleData.dayOffset)
    startDate.setHours(scheduleData.startHour, 0, 0, 0)

    const endDate = new Date(monday)
    endDate.setDate(monday.getDate() + scheduleData.dayOffset)

    if (scheduleData.endHour === 0 && scheduleData.startHour === 0) {
      // 終日（翌日0時）
      endDate.setDate(endDate.getDate() + 1)
      endDate.setHours(0, 0, 0, 0)
    } else {
      endDate.setHours(scheduleData.endHour, 0, 0, 0)
    }

    await prisma.schedule.create({
      data: {
        organizationId: org.id,
        authorId: scheduleData.authorId,
        title: scheduleData.title,
        description: scheduleData.description,
        start: startDate,
        end: endDate,
        source: Source.INTERNAL
      }
    })
  }
  console.log('✅ スケジュール作成:', schedulesData.length, '件')

  console.log('🎉 シードデータ投入完了!')
}

main()
  .catch((e) => {
    console.error('❌ シード失敗:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
