/**
 * AUDIT-003: スケジュール変更履歴テスト
 */
import { describe, it, expect } from 'vitest'
import { computeScheduleDiff, createScheduleSnapshot } from '~/server/utils/scheduleVersion'

describe('AUDIT-003: スケジュール変更履歴', () => {
  describe('createScheduleSnapshot', () => {
    it('should create a snapshot from schedule object', () => {
      const schedule = {
        title: 'テスト予定',
        description: '説明',
        start: new Date('2025-06-01T09:00:00Z'),
        end: new Date('2025-06-01T10:00:00Z'),
        authorId: 'user-1',
        color: 'blue',
      }

      const snapshot = createScheduleSnapshot(schedule)

      expect(snapshot).toEqual({
        title: 'テスト予定',
        description: '説明',
        start: '2025-06-01T09:00:00.000Z',
        end: '2025-06-01T10:00:00.000Z',
        authorId: 'user-1',
        color: 'blue',
      })
    })

    it('should handle null values', () => {
      const schedule = {
        title: 'テスト',
        description: null,
        start: new Date('2025-06-01T09:00:00Z'),
        end: new Date('2025-06-01T10:00:00Z'),
        authorId: null,
        color: null,
      }

      const snapshot = createScheduleSnapshot(schedule)

      expect(snapshot.description).toBeNull()
      expect(snapshot.authorId).toBeNull()
      expect(snapshot.color).toBeNull()
    })
  })

  describe('computeScheduleDiff', () => {
    const baseBefore = {
      title: 'ミーティング',
      description: '定例',
      start: '2025-06-01T09:00:00.000Z',
      end: '2025-06-01T10:00:00.000Z',
      authorId: 'user-1',
      color: 'blue',
    }

    it('should detect title change', () => {
      const after = { ...baseBefore, title: '変更後のタイトル' }
      const diff = computeScheduleDiff(baseBefore, after)

      expect(diff).toHaveLength(1)
      expect(diff[0]).toEqual({
        field: 'title',
        before: 'ミーティング',
        after: '変更後のタイトル',
      })
    })

    it('should detect multiple changes', () => {
      const after = {
        ...baseBefore,
        title: '新タイトル',
        start: '2025-06-02T09:00:00.000Z',
        color: 'red',
      }
      const diff = computeScheduleDiff(baseBefore, after)

      expect(diff).toHaveLength(3)
      expect(diff.map((d) => d.field).sort()).toEqual(['color', 'start', 'title'])
    })

    it('should return empty array when no changes', () => {
      const diff = computeScheduleDiff(baseBefore, { ...baseBefore })
      expect(diff).toHaveLength(0)
    })

    it('should detect null to value change', () => {
      const before = { ...baseBefore, description: null }
      const after = { ...baseBefore, description: '新しい説明' }
      const diff = computeScheduleDiff(before, after)

      expect(diff).toHaveLength(1)
      expect(diff[0]).toEqual({
        field: 'description',
        before: null,
        after: '新しい説明',
      })
    })

    it('should detect value to null change', () => {
      const after = { ...baseBefore, color: null }
      const diff = computeScheduleDiff(baseBefore, after)

      expect(diff).toHaveLength(1)
      expect(diff[0]).toEqual({
        field: 'color',
        before: 'blue',
        after: null,
      })
    })

    it('should detect authorId change', () => {
      const after = { ...baseBefore, authorId: 'user-2' }
      const diff = computeScheduleDiff(baseBefore, after)

      expect(diff).toHaveLength(1)
      expect(diff[0]).toEqual({
        field: 'authorId',
        before: 'user-1',
        after: 'user-2',
      })
    })
  })
})
