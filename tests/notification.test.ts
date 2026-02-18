/**
 * NOTIF-001: メール通知テスト
 */
import { describe, it, expect } from 'vitest'
import { scheduleChangeText, scheduleChangeHtml } from '~/server/utils/notificationTemplates'

describe('NOTIF-001: メール通知テンプレート', () => {
  const baseData = {
    scheduleTitle: '現場ミーティング',
    changedBy: '田中太郎',
    orgName: 'テスト電気工事',
    boardUrl: 'https://app.mielboard.jp/org/test/weekly-board',
  }

  describe('scheduleChangeText', () => {
    it('should generate text email for created schedule', () => {
      const text = scheduleChangeText({
        ...baseData,
        changeType: 'created',
        start: '2025-06-01 09:00',
        end: '2025-06-01 10:00',
      })

      expect(text).toContain('新規作成')
      expect(text).toContain('田中太郎')
      expect(text).toContain('現場ミーティング')
      expect(text).toContain('2025-06-01 09:00')
      expect(text).toContain('テスト電気工事')
      expect(text).toContain(baseData.boardUrl)
    })

    it('should generate text email for updated schedule', () => {
      const text = scheduleChangeText({
        ...baseData,
        changeType: 'updated',
      })

      expect(text).toContain('更新')
      expect(text).toContain('田中太郎')
    })

    it('should generate text email for deleted schedule', () => {
      const text = scheduleChangeText({
        ...baseData,
        changeType: 'deleted',
      })

      expect(text).toContain('削除')
    })

    it('should not include date section when start/end not provided', () => {
      const text = scheduleChangeText({
        ...baseData,
        changeType: 'deleted',
      })

      expect(text).not.toContain('■ 日時:')
    })
  })

  describe('scheduleChangeHtml', () => {
    it('should generate HTML email for created schedule', () => {
      const html = scheduleChangeHtml({
        ...baseData,
        changeType: 'created',
        start: '2025-06-01 09:00',
        end: '2025-06-01 10:00',
      })

      expect(html).toContain('<!DOCTYPE html>')
      expect(html).toContain('新規作成')
      expect(html).toContain('現場ミーティング')
      expect(html).toContain('#388e3c') // green for created
      expect(html).toContain(baseData.boardUrl)
    })

    it('should use blue color for updated', () => {
      const html = scheduleChangeHtml({
        ...baseData,
        changeType: 'updated',
      })

      expect(html).toContain('#1a73e8') // blue for updated
      expect(html).toContain('更新')
    })

    it('should use red color for deleted', () => {
      const html = scheduleChangeHtml({
        ...baseData,
        changeType: 'deleted',
      })

      expect(html).toContain('#d32f2f') // red for deleted
      expect(html).toContain('削除')
    })

    it('should include ミエルボード branding', () => {
      const html = scheduleChangeHtml({
        ...baseData,
        changeType: 'created',
      })

      expect(html).toContain('ミエルボード for 現場')
    })

    it('should not include date section when no start/end', () => {
      const html = scheduleChangeHtml({
        ...baseData,
        changeType: 'deleted',
      })

      expect(html).not.toContain('📅')
    })
  })
})
