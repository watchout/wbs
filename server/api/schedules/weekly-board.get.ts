/**
 * 週間ボードAPI
 * 
 * GET /api/schedules/weekly-board
 * 
 * 社員×曜日のマトリクス形式で週間スケジュールを取得
 * 
 * クエリパラメータ:
 * - startDate: 週の開始日（YYYY-MM-DD）
 * - departmentId: 部門ID（optional）
 */

import { createLogger } from '~/server/utils/logger'
import { requireAuth } from '~/server/utils/authMiddleware'
import { prisma } from '~/server/utils/prisma'
import {
  formatScheduleForDisplay,
  getWeekStart,
  getWeekEnd,
  isHoliday
} from '~/server/utils/scheduleFormatter'

const log = createLogger('weekly-board')

interface DaySchedule {
  scheduleId: string
  displayText: string
  start: string
  end: string
  title: string
  isHoliday: boolean
}

interface EmployeeSchedule {
  id: string
  name: string
  email: string
  department: string | null
  departmentId: string | null
  schedules: {
    monday?: DaySchedule
    tuesday?: DaySchedule
    wednesday?: DaySchedule
    thursday?: DaySchedule
    friday?: DaySchedule
    saturday?: DaySchedule
    sunday?: DaySchedule
  }
}

interface WeeklyBoardResponse {
  success: boolean
  weekStart: string
  weekEnd: string
  employees: EmployeeSchedule[]
  organizationId: string
}

export default defineEventHandler(async (event): Promise<WeeklyBoardResponse> => {
  try {
    // 認証チェックとテナントコンテキストの設定
    const authContext = await requireAuth(event)

    // クエリパラメータ取得
    const query = getQuery(event)
    const startDateParam = query.startDate as string | undefined
    const departmentId = query.departmentId as string | undefined

    // startDate のバリデーション
    let baseDate: Date
    if (startDateParam) {
      baseDate = new Date(startDateParam)
      if (isNaN(baseDate.getTime())) {
        throw createError({
          statusCode: 400,
          statusMessage: '有効な日付を指定してください（YYYY-MM-DD）'
        })
      }
    } else {
      // startDate が指定されていない場合は今週
      baseDate = new Date()
    }

    // 週の開始・終了日を計算（月曜開始）
    const weekStart = getWeekStart(baseDate)
    const weekEnd = getWeekEnd(baseDate)

    // スケジュールを取得（週の範囲内）
    const schedules = await prisma.schedule.findMany({
      where: {
        organizationId: authContext.organizationId,
        deletedAt: null,  // ソフトデリート済みは除外
        start: {
          gte: weekStart,
          lt: weekEnd
        }
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        start: 'asc'
      }
    })

    // 組織内の全ユーザーを取得
    const users = await prisma.user.findMany({
      where: {
        organizationId: authContext.organizationId,
        deletedAt: null,  // ソフトデリート済みは除外
        ...(departmentId && { departmentId })
      },
      include: {
        department: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    // 社員ごとにスケジュールをグルーピング
    const employeesMap = new Map<string, EmployeeSchedule>()

    // ユーザーを初期化
    users.forEach(user => {
      employeesMap.set(user.id, {
        id: user.id,
        name: user.name || 'Unknown',
        email: user.email,
        department: user.department?.name ?? null,
        departmentId: user.departmentId,
        schedules: {}
      })
    })

    // スケジュールを各ユーザーの曜日に割り当て
    schedules.forEach(schedule => {
      const userId = schedule.authorId
      if (!userId) return

      const employee = employeesMap.get(userId)
      if (!employee) return

      // スケジュールの開始日から曜日を判定
      const scheduleDate = new Date(schedule.start)
      const dayOfWeek = scheduleDate.getDay() // 0 (日) ~ 6 (土)

      // 曜日をキーに変換
      const dayKeys = [
        'sunday',
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday'
      ] as const
      const dayKey = dayKeys[dayOfWeek]

      // DaySchedule オブジェクトを作成
      const daySchedule: DaySchedule = {
        scheduleId: schedule.id,
        displayText: formatScheduleForDisplay({
          id: schedule.id,
          title: schedule.title,
          description: schedule.description,
          start: schedule.start,
          end: schedule.end
        }),
        start: schedule.start.toISOString(),
        end: schedule.end.toISOString(),
        title: schedule.title,
        isHoliday: isHoliday({
          id: schedule.id,
          title: schedule.title,
          description: schedule.description,
          start: schedule.start,
          end: schedule.end
        })
      }

      // 同じ日に複数のスケジュールがある場合は、最初のものを優先
      // （将来的には複数表示に対応する可能性あり）
      if (!employee.schedules[dayKey]) {
        employee.schedules[dayKey] = daySchedule
      }
    })

    // Map を配列に変換
    const employees = Array.from(employeesMap.values())

    return {
      success: true,
      weekStart: weekStart.toISOString().split('T')[0], // YYYY-MM-DD
      weekEnd: weekEnd.toISOString().split('T')[0],
      employees,
      organizationId: authContext.organizationId
    }

  } catch (error: any) {
    log.error('Failed to fetch weekly board', { error: error instanceof Error ? error : new Error(String(error)) })

    // 認証エラーの場合はそのまま返す
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: '週間ボードの取得に失敗しました'
    })
  }
})

