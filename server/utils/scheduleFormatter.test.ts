/**
 * Schedule Formatter Unit Tests
 * 
 * scheduleFormatter.ts のユニットテスト
 */

import { describe, it, expect } from 'vitest'
import {
  formatTime,
  parseScheduleMetadata,
  formatScheduleForDisplay,
  createScheduleMetadata,
  isHoliday,
  getWeekStart,
  getWeekEnd
} from './scheduleFormatter'

describe('scheduleFormatter', () => {
  describe('formatTime', () => {
    it('should format time correctly', () => {
      const date1 = new Date('2025-01-15T09:00:00Z')
      const date2 = new Date('2025-01-15T18:30:00Z')
      const date3 = new Date('2025-01-15T00:00:00Z')

      expect(formatTime(date1)).toBe('9')
      expect(formatTime(date2)).toBe('18')
      expect(formatTime(date3)).toBe('0')
    })
  })

  describe('parseScheduleMetadata', () => {
    it('should parse JSON metadata correctly', () => {
      const jsonMetadata = JSON.stringify({
        siteName: '◯◯ホテル',
        activityType: '工事'
      })

      const result = parseScheduleMetadata(jsonMetadata)

      expect(result.siteName).toBe('◯◯ホテル')
      expect(result.activityType).toBe('工事')
    })

    it('should return empty object for plain text', () => {
      const plainText = 'これは通常のメモです'

      const result = parseScheduleMetadata(plainText)

      expect(result).toEqual({})
    })

    it('should return empty object for null or undefined', () => {
      expect(parseScheduleMetadata(null)).toEqual({})
      expect(parseScheduleMetadata(undefined)).toEqual({})
      expect(parseScheduleMetadata('')).toEqual({})
    })

    it('should handle invalid JSON gracefully', () => {
      const invalidJson = '{ invalid json }'

      const result = parseScheduleMetadata(invalidJson)

      expect(result).toEqual({})
    })
  })

  describe('formatScheduleForDisplay', () => {
    it('should format schedule with metadata', () => {
      const schedule = {
        id: 'test-1',
        title: '現場作業',
        description: JSON.stringify({
          siteName: '◯◯ホテル',
          activityType: '新館工事'
        }),
        start: new Date('2025-01-15T09:00:00Z'),
        end: new Date('2025-01-15T18:00:00Z')
      }

      const result = formatScheduleForDisplay(schedule)

      expect(result).toBe('9-18 ◯◯ホテル 新館工事')
    })

    it('should format schedule without metadata', () => {
      const schedule = {
        id: 'test-2',
        title: '会議',
        description: null,
        start: new Date('2025-01-15T10:00:00Z'),
        end: new Date('2025-01-15T11:00:00Z')
      }

      const result = formatScheduleForDisplay(schedule)

      expect(result).toBe('10-11 会議')
    })

    it('should format all-day schedule', () => {
      const schedule = {
        id: 'test-3',
        title: '研修',
        description: null,
        start: new Date('2025-01-15T00:00:00Z'),
        end: new Date('2025-01-16T00:00:00Z')
      }

      const result = formatScheduleForDisplay(schedule)

      expect(result).toBe('終日 研修')
    })

    it('should format same hour schedule', () => {
      const schedule = {
        id: 'test-4',
        title: '打合せ',
        description: null,
        start: new Date('2025-01-15T14:00:00Z'),
        end: new Date('2025-01-15T14:30:00Z')
      }

      const result = formatScheduleForDisplay(schedule)

      expect(result).toBe('14時 打合せ')
    })
  })

  describe('createScheduleMetadata', () => {
    it('should create metadata JSON string', () => {
      const result = createScheduleMetadata('◯◯ホテル', '工事')

      const parsed = JSON.parse(result)

      expect(parsed.siteName).toBe('◯◯ホテル')
      expect(parsed.activityType).toBe('工事')
    })

    it('should create metadata with only siteName', () => {
      const result = createScheduleMetadata('◯◯ホテル')

      const parsed = JSON.parse(result)

      expect(parsed.siteName).toBe('◯◯ホテル')
      expect(parsed.activityType).toBeUndefined()
    })

    it('should return empty string when no metadata', () => {
      const result = createScheduleMetadata()

      expect(result).toBe('')
    })
  })

  describe('isHoliday', () => {
    it('should detect holiday schedule', () => {
      const schedule = {
        id: 'test-5',
        title: '休み',
        description: null,
        start: new Date('2025-01-15T00:00:00Z'),
        end: new Date('2025-01-15T00:00:00Z')
      }

      expect(isHoliday(schedule)).toBe(true)
    })

    it('should detect non-holiday schedule', () => {
      const schedule = {
        id: 'test-6',
        title: '通常業務',
        description: null,
        start: new Date('2025-01-15T09:00:00Z'),
        end: new Date('2025-01-15T18:00:00Z')
      }

      expect(isHoliday(schedule)).toBe(false)
    })
  })

  describe('getWeekStart', () => {
    it('should get Monday of the week', () => {
      // 2025-01-15 は水曜日
      const date = new Date('2025-01-15T12:00:00Z')
      const weekStart = getWeekStart(date)

      // 2025-01-13 (月曜) の 00:00:00 になるはず
      expect(weekStart.getDay()).toBe(1) // 月曜日
      expect(weekStart.getHours()).toBe(0)
      expect(weekStart.getMinutes()).toBe(0)
      expect(weekStart.getSeconds()).toBe(0)
    })

    it('should handle Sunday correctly', () => {
      // 2025-01-19 は日曜日
      const date = new Date('2025-01-19T12:00:00Z')
      const weekStart = getWeekStart(date)

      // 2025-01-13 (月曜) の 00:00:00 になるはず
      expect(weekStart.getDay()).toBe(1) // 月曜日
    })

    it('should handle Monday correctly', () => {
      // 2025-01-13 は月曜日
      const date = new Date('2025-01-13T12:00:00Z')
      const weekStart = getWeekStart(date)

      // 同じ日（月曜）の 00:00:00 になるはず
      expect(weekStart.getDay()).toBe(1) // 月曜日
      expect(weekStart.getHours()).toBe(0)
    })
  })

  describe('getWeekEnd', () => {
    it('should get next Monday 00:00:00', () => {
      // 2025-01-15 は水曜日
      const date = new Date('2025-01-15T12:00:00Z')
      const weekEnd = getWeekEnd(date)

      // 2025-01-20 (次の月曜) の 00:00:00 になるはず
      expect(weekEnd.getDay()).toBe(1) // 月曜日
      expect(weekEnd.getHours()).toBe(0)
      expect(weekEnd.getMinutes()).toBe(0)
      expect(weekEnd.getSeconds()).toBe(0)

      // weekStart から 7日後
      const weekStart = getWeekStart(date)
      const diff = (weekEnd.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24)
      expect(diff).toBe(7)
    })
  })
})

