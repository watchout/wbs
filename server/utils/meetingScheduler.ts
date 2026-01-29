/**
 * 日程調整ロジック
 * 
 * 参加者全員の空き時間を検索し、候補日時を提案する
 */

import { prisma } from './prisma'

export interface TimeSlot {
  start: Date
  end: Date
}

export interface CandidateSlot extends TimeSlot {
  availableUserIds: string[]
  score: number  // 参加可能人数 / 招待人数
}

interface FindSlotsParams {
  organizationId: string
  userIds: string[]
  dateRangeStart: Date
  dateRangeEnd: Date
  duration: number  // 分
  workingHoursStart?: number  // デフォルト 9
  workingHoursEnd?: number    // デフォルト 18
  excludeWeekends?: boolean
}

/**
 * 指定された参加者全員の空き時間を検索
 */
export async function findAvailableSlots(params: FindSlotsParams): Promise<CandidateSlot[]> {
  const {
    organizationId,
    userIds,
    dateRangeStart,
    dateRangeEnd,
    duration,
    workingHoursStart = 9,
    workingHoursEnd = 18,
    excludeWeekends = true
  } = params

  if (userIds.length === 0) {
    return []
  }

  // 参加者全員のスケジュールを取得
  const schedules = await prisma.schedule.findMany({
    where: {
      organizationId,
      authorId: { in: userIds },
      deletedAt: null,
      OR: [
        {
          start: { gte: dateRangeStart, lt: dateRangeEnd }
        },
        {
          end: { gt: dateRangeStart, lte: dateRangeEnd }
        },
        {
          start: { lte: dateRangeStart },
          end: { gte: dateRangeEnd }
        }
      ]
    },
    select: {
      authorId: true,
      start: true,
      end: true
    }
  })

  // ユーザーごとのスケジュールをマップに整理
  const userSchedules = new Map<string, TimeSlot[]>()
  for (const userId of userIds) {
    userSchedules.set(userId, [])
  }
  for (const schedule of schedules) {
    if (schedule.authorId) {
      const slots = userSchedules.get(schedule.authorId) || []
      slots.push({ start: schedule.start, end: schedule.end })
      userSchedules.set(schedule.authorId, slots)
    }
  }

  // 候補時間帯を生成
  const candidates: CandidateSlot[] = []
  const durationMs = duration * 60 * 1000
  const slotInterval = 30 * 60 * 1000  // 30分刻みでチェック

  let current = new Date(dateRangeStart)
  
  while (current.getTime() + durationMs <= dateRangeEnd.getTime()) {
    const slotStart = new Date(current)
    const slotEnd = new Date(current.getTime() + durationMs)
    
    // 営業時間チェック
    const hours = slotStart.getHours()
    const endHours = slotEnd.getHours() + (slotEnd.getMinutes() > 0 ? 1 : 0)
    
    if (hours >= workingHoursStart && endHours <= workingHoursEnd) {
      // 週末チェック
      const dayOfWeek = slotStart.getDay()
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
      
      if (!excludeWeekends || !isWeekend) {
        // この時間帯に参加可能なユーザーを検索
        const availableUserIds: string[] = []
        
        for (const userId of userIds) {
          const userSlots = userSchedules.get(userId) || []
          const hasConflict = userSlots.some(schedule => 
            slotStart < schedule.end && slotEnd > schedule.start
          )
          
          if (!hasConflict) {
            availableUserIds.push(userId)
          }
        }
        
        if (availableUserIds.length > 0) {
          candidates.push({
            start: slotStart,
            end: slotEnd,
            availableUserIds,
            score: availableUserIds.length / userIds.length
          })
        }
      }
    }
    
    current = new Date(current.getTime() + slotInterval)
  }

  // スコア順にソート（参加可能人数が多い順）
  candidates.sort((a, b) => b.score - a.score)

  // 上位候補を返す（最大20件）
  return candidates.slice(0, 20)
}

/**
 * 全員参加可能な時間帯のみを検索
 */
export async function findAllAvailableSlots(params: FindSlotsParams): Promise<CandidateSlot[]> {
  const candidates = await findAvailableSlots(params)
  return candidates.filter(c => c.score === 1)
}

/**
 * 日付の翌営業日を取得
 */
export function getNextBusinessDay(date: Date): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + 1)
  
  while (result.getDay() === 0 || result.getDay() === 6) {
    result.setDate(result.getDate() + 1)
  }
  
  return result
}

/**
 * 営業時間内かどうかをチェック
 */
export function isWithinWorkingHours(
  date: Date,
  workingHoursStart = 9,
  workingHoursEnd = 18
): boolean {
  const hours = date.getHours()
  return hours >= workingHoursStart && hours < workingHoursEnd
}
