/**
 * Schedule Delete API Integration Tests
 *
 * DELETE /api/schedules/:id
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { createTestContext, cleanupTestData, createTestSchedule, cleanupSession } from '../../../tests/helpers'
import deleteHandler from './[id].delete'

function createMockEvent(options: {
  sessionId?: string
  routeParams?: Record<string, string>
}) {
  return {
    node: {
      req: {
        headers: {
          cookie: options.sessionId ? `session_id=${options.sessionId}` : '',
        },
        url: `/api/schedules/${options.routeParams?.id || ''}`
      },
      res: {
        setHeader: vi.fn(),
        getHeader: vi.fn()
      }
    },
    context: {
      params: options.routeParams || {}
    },
    _cookies: options.sessionId ? { session_id: options.sessionId } : {}
  } as any
}

vi.mock('h3', async () => {
  const actual = await vi.importActual<typeof import('h3')>('h3')
  return {
    ...actual,
    getRouterParam: (event: any, name: string) => event.context?.params?.[name]
  }
})

describe('DELETE /api/schedules/:id', () => {
  let ctxA: Awaited<ReturnType<typeof createTestContext>>
  let ctxB: Awaited<ReturnType<typeof createTestContext>>
  let scheduleB: Awaited<ReturnType<typeof createTestSchedule>>

  beforeAll(async () => {
    ctxA = await createTestContext('sched-del-a')
    ctxB = await createTestContext('sched-del-b')

    scheduleB = await createTestSchedule(ctxB.org.id, ctxB.user.id, {
      title: '他組織スケジュール'
    })
  })

  afterAll(async () => {
    cleanupSession(ctxA.sessionId)
    cleanupSession(ctxB.sessionId)
    await cleanupTestData(ctxA.org.id)
    await cleanupTestData(ctxB.org.id)
  })

  describe('正常系', () => {
    it('should delete own schedule', async () => {
      const schedule = await createTestSchedule(ctxA.org.id, ctxA.user.id, {
        title: '削除対象'
      })

      const event = createMockEvent({
        sessionId: ctxA.sessionId,
        routeParams: { id: schedule.id }
      })

      const response = await deleteHandler(event)

      expect(response.success).toBe(true)
      expect(response.message).toBe('スケジュールを削除しました')

      // ソフトデリートされたことを確認（レコードは残っている）
      const { prisma } = await import('~/server/utils/prisma')
      const deleted = await prisma.schedule.findUnique({
        where: { id: schedule.id }
      })
      expect(deleted).not.toBeNull()
      expect(deleted?.deletedAt).not.toBeNull()
    })

    it('ソフトデリート後はDBにレコードが残る', async () => {
      const schedule = await createTestSchedule(ctxA.org.id, ctxA.user.id, {
        title: 'ソフトデリート確認用'
      })

      const event = createMockEvent({
        sessionId: ctxA.sessionId,
        routeParams: { id: schedule.id }
      })

      await deleteHandler(event)

      // レコードが残っていることを確認
      const { prisma } = await import('~/server/utils/prisma')
      const softDeleted = await prisma.schedule.findUnique({
        where: { id: schedule.id }
      })
      expect(softDeleted).not.toBeNull()
      expect(softDeleted?.deletedAt).toBeInstanceOf(Date)
    })
  })

  describe('エラー系', () => {
    it('should return 404 for non-existent schedule', async () => {
      const event = createMockEvent({
        sessionId: ctxA.sessionId,
        routeParams: { id: 'non-existent-id' }
      })

      await expect(deleteHandler(event)).rejects.toMatchObject({
        statusCode: 404
      })
    })
  })

  describe('マルチテナント境界（最重要）', () => {
    it('should not allow deleting schedule from another organization', async () => {
      const event = createMockEvent({
        sessionId: ctxA.sessionId,
        routeParams: { id: scheduleB.id }
      })

      await expect(deleteHandler(event)).rejects.toMatchObject({
        statusCode: 404
      })
    })
  })
})
