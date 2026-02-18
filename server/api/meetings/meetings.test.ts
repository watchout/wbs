/**
 * Meetings API Integration Tests
 *
 * GET /api/meetings (一覧)
 * POST /api/meetings (作成)
 * GET /api/meetings/:id (詳細)
 * POST /api/meetings/suggest-slots (候補取得)
 * POST /api/meetings/:id/confirm (確定)
 * POST /api/meetings/:id/respond (回答)
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { createTestContext, cleanupTestData, cleanupSession } from '../../../tests/helpers'
import { prisma } from '~/server/utils/prisma'

// readBody / getRouterParam のモック
vi.mock('h3', async () => {
  const actual = await vi.importActual<typeof import('h3')>('h3')
  return {
    ...actual,
    readBody: (event: unknown) => Promise.resolve((event as { _body: unknown })._body),
    getRouterParam: (event: unknown, param: string) => (event as { _params: Record<string, string> })._params?.[param],
  }
})

// meetingScheduler のモック（DBアクセスを避ける）
vi.mock('~/server/utils/meetingScheduler', () => ({
  findAvailableSlots: vi.fn().mockResolvedValue([
    {
      start: new Date('2026-03-01T10:00:00Z'),
      end: new Date('2026-03-01T11:00:00Z'),
      availableUserIds: [],
      score: 1.0,
    },
  ]),
  findAllAvailableSlots: vi.fn().mockResolvedValue([]),
}))

function createMockEvent(options: {
  sessionId?: string
  body?: Record<string, unknown>
  params?: Record<string, string>
  headers?: Record<string, string>
}) {
  return {
    node: {
      req: {
        headers: {
          cookie: options.sessionId ? `session_id=${options.sessionId}` : '',
          'content-type': 'application/json',
          ...(options.headers || {}),
        },
        url: '/api/meetings',
      },
      res: {
        setHeader: vi.fn(),
        getHeader: vi.fn(),
      },
    },
    context: {},
    _cookies: options.sessionId ? { session_id: options.sessionId } : {},
    _body: options.body || {},
    _requestBody: options.body || {},
    _params: options.params || {},
  } as unknown
}

describe('Meetings API', () => {
  let ctxAdmin: Awaited<ReturnType<typeof createTestContext>>
  let ctxMember: Awaited<ReturnType<typeof createTestContext>>
  let inviteeUser: { id: string; email: string }

  beforeAll(async () => {
    ctxAdmin = await createTestContext('meeting-admin')

    // MEMBER ユーザーを同じ組織に作成
    const memberUser = await prisma.user.create({
      data: {
        email: `meeting-member-${Date.now()}@example.com`,
        name: 'Meeting Member',
        role: 'MEMBER',
        organizationId: ctxAdmin.org.id,
      },
    })
    inviteeUser = { id: memberUser.id, email: memberUser.email }

    // 別テナントコンテキスト
    ctxMember = await createTestContext('meeting-other')
  })

  afterAll(async () => {
    cleanupSession(ctxAdmin.sessionId)
    cleanupSession(ctxMember.sessionId)
    // ミーティング関連データのクリーンアップ
    await prisma.meetingInvitee.deleteMany({ where: { meetingRequest: { organizationId: ctxAdmin.org.id } } })
    await prisma.meetingCandidate.deleteMany({ where: { meetingRequest: { organizationId: ctxAdmin.org.id } } })
    await prisma.meetingRequest.deleteMany({ where: { organizationId: ctxAdmin.org.id } })
    await cleanupTestData(ctxAdmin.org.id)
    await cleanupTestData(ctxMember.org.id)
  })

  describe('GET /api/meetings', () => {
    it('認証済みで空の一覧を返す', async () => {
      const handler = (await import('./index.get')).default
      const event = createMockEvent({ sessionId: ctxAdmin.sessionId })
      const result = await handler(event as Parameters<typeof handler>[0])

      expect(result).toHaveProperty('success', true)
      expect(result).toHaveProperty('meetings')
      expect(Array.isArray(result.meetings)).toBe(true)
    })

    it('未認証で401エラーを返す', async () => {
      const handler = (await import('./index.get')).default
      const event = createMockEvent({})

      await expect(handler(event as Parameters<typeof handler>[0])).rejects.toMatchObject({
        statusCode: 401,
      })
    })
  })

  describe('POST /api/meetings', () => {
    it('LEADER以上でリクエストを作成できる', async () => {
      const handler = (await import('./index.post')).default
      const event = createMockEvent({
        sessionId: ctxAdmin.sessionId,
        body: {
          title: 'テスト会議',
          duration: 60,
          dateRangeStart: '2026-03-01T00:00:00Z',
          dateRangeEnd: '2026-03-07T00:00:00Z',
          inviteeUserIds: [inviteeUser.id],
        },
      })

      const result = await handler(event as Parameters<typeof handler>[0])
      expect(result).toHaveProperty('success', true)
      expect(result.meeting).toHaveProperty('title', 'テスト会議')
      expect(result.meeting).toHaveProperty('status', 'OPEN')
    })

    it('タイトルなしで400エラー', async () => {
      const handler = (await import('./index.post')).default
      const event = createMockEvent({
        sessionId: ctxAdmin.sessionId,
        body: {
          title: '',
          duration: 60,
          dateRangeStart: '2026-03-01T00:00:00Z',
          dateRangeEnd: '2026-03-07T00:00:00Z',
          inviteeUserIds: [inviteeUser.id],
        },
      })

      await expect(handler(event as Parameters<typeof handler>[0])).rejects.toMatchObject({
        statusCode: 400,
      })
    })

    it('招待者なしで400エラー', async () => {
      const handler = (await import('./index.post')).default
      const event = createMockEvent({
        sessionId: ctxAdmin.sessionId,
        body: {
          title: 'テスト',
          duration: 60,
          dateRangeStart: '2026-03-01T00:00:00Z',
          dateRangeEnd: '2026-03-07T00:00:00Z',
          inviteeUserIds: [],
        },
      })

      await expect(handler(event as Parameters<typeof handler>[0])).rejects.toMatchObject({
        statusCode: 400,
      })
    })

    it('会議時間15分未満で400エラー', async () => {
      const handler = (await import('./index.post')).default
      const event = createMockEvent({
        sessionId: ctxAdmin.sessionId,
        body: {
          title: 'テスト',
          duration: 10,
          dateRangeStart: '2026-03-01T00:00:00Z',
          dateRangeEnd: '2026-03-07T00:00:00Z',
          inviteeUserIds: [inviteeUser.id],
        },
      })

      await expect(handler(event as Parameters<typeof handler>[0])).rejects.toMatchObject({
        statusCode: 400,
      })
    })
  })

  describe('GET /api/meetings/:id', () => {
    it('存在するリクエストの詳細を取得できる', async () => {
      // 先にリクエストを作成
      const meeting = await prisma.meetingRequest.create({
        data: {
          organizationId: ctxAdmin.org.id,
          organizerId: ctxAdmin.user.id,
          title: '詳細テスト会議',
          duration: 30,
          dateRangeStart: new Date('2026-03-01'),
          dateRangeEnd: new Date('2026-03-07'),
          status: 'OPEN',
        },
      })

      const handler = (await import('./[id].get')).default
      const event = createMockEvent({
        sessionId: ctxAdmin.sessionId,
        params: { id: meeting.id },
      })

      const result = await handler(event as Parameters<typeof handler>[0])
      expect(result).toHaveProperty('success', true)
      expect(result.meeting.title).toBe('詳細テスト会議')
    })

    it('他テナントのリクエストは404', async () => {
      const meeting = await prisma.meetingRequest.create({
        data: {
          organizationId: ctxAdmin.org.id,
          organizerId: ctxAdmin.user.id,
          title: 'テナント境界テスト',
          duration: 30,
          dateRangeStart: new Date('2026-03-01'),
          dateRangeEnd: new Date('2026-03-07'),
          status: 'OPEN',
        },
      })

      const handler = (await import('./[id].get')).default
      const event = createMockEvent({
        sessionId: ctxMember.sessionId,
        params: { id: meeting.id },
      })

      await expect(handler(event as Parameters<typeof handler>[0])).rejects.toMatchObject({
        statusCode: 404,
      })
    })
  })

  describe('POST /api/meetings/suggest-slots', () => {
    it('参加者の空き時間候補を取得できる', async () => {
      const handler = (await import('./suggest-slots.post')).default
      const event = createMockEvent({
        sessionId: ctxAdmin.sessionId,
        body: {
          userIds: [ctxAdmin.user.id, inviteeUser.id],
          dateRangeStart: '2026-03-01T00:00:00Z',
          dateRangeEnd: '2026-03-07T00:00:00Z',
          duration: 60,
        },
      })

      const result = await handler(event as Parameters<typeof handler>[0])
      expect(result).toHaveProperty('success', true)
      expect(Array.isArray(result.candidates)).toBe(true)
    })

    it('参加者なしで400エラー', async () => {
      const handler = (await import('./suggest-slots.post')).default
      const event = createMockEvent({
        sessionId: ctxAdmin.sessionId,
        body: {
          userIds: [],
          dateRangeStart: '2026-03-01T00:00:00Z',
          dateRangeEnd: '2026-03-07T00:00:00Z',
          duration: 60,
        },
      })

      await expect(handler(event as Parameters<typeof handler>[0])).rejects.toMatchObject({
        statusCode: 400,
      })
    })
  })

  describe('POST /api/meetings/:id/confirm', () => {
    it('主催者が日程を確定できる', async () => {
      // ミーティングと候補日時を作成
      const meeting = await prisma.meetingRequest.create({
        data: {
          organizationId: ctxAdmin.org.id,
          organizerId: ctxAdmin.user.id,
          title: '確定テスト',
          duration: 60,
          dateRangeStart: new Date('2026-03-01'),
          dateRangeEnd: new Date('2026-03-07'),
          status: 'OPEN',
          invitees: {
            create: { userId: inviteeUser.id, status: 'PENDING' },
          },
        },
      })

      const candidate = await prisma.meetingCandidate.create({
        data: {
          meetingRequestId: meeting.id,
          start: new Date('2026-03-03T10:00:00Z'),
          end: new Date('2026-03-03T11:00:00Z'),
        },
      })

      const handler = (await import('./[id]/confirm.post')).default
      const event = createMockEvent({
        sessionId: ctxAdmin.sessionId,
        params: { id: meeting.id },
        body: { candidateId: candidate.id },
      })

      const result = await handler(event as Parameters<typeof handler>[0])
      expect(result).toHaveProperty('success', true)
      expect(result).toHaveProperty('confirmedStart')
    })

    it('候補IDなしで400エラー', async () => {
      const meeting = await prisma.meetingRequest.create({
        data: {
          organizationId: ctxAdmin.org.id,
          organizerId: ctxAdmin.user.id,
          title: '確定テスト2',
          duration: 60,
          dateRangeStart: new Date('2026-03-01'),
          dateRangeEnd: new Date('2026-03-07'),
          status: 'OPEN',
        },
      })

      const handler = (await import('./[id]/confirm.post')).default
      const event = createMockEvent({
        sessionId: ctxAdmin.sessionId,
        params: { id: meeting.id },
        body: { candidateId: '' },
      })

      await expect(handler(event as Parameters<typeof handler>[0])).rejects.toMatchObject({
        statusCode: 400,
      })
    })
  })

  describe('POST /api/meetings/:id/respond', () => {
    it('招待者が回答できる', async () => {
      // MEMBER用のセッションを作成
      const { createSession } = await import('~/server/utils/session')
      const memberSessionId = createSession({
        userId: inviteeUser.id,
        organizationId: ctxAdmin.org.id,
        email: inviteeUser.email,
        role: 'MEMBER',
      })

      const meeting = await prisma.meetingRequest.create({
        data: {
          organizationId: ctxAdmin.org.id,
          organizerId: ctxAdmin.user.id,
          title: '回答テスト',
          duration: 60,
          dateRangeStart: new Date('2026-03-01'),
          dateRangeEnd: new Date('2026-03-07'),
          status: 'OPEN',
          invitees: {
            create: { userId: inviteeUser.id, status: 'PENDING' },
          },
        },
      })

      const candidate = await prisma.meetingCandidate.create({
        data: {
          meetingRequestId: meeting.id,
          start: new Date('2026-03-04T10:00:00Z'),
          end: new Date('2026-03-04T11:00:00Z'),
        },
      })

      const handler = (await import('./[id]/respond.post')).default
      const event = createMockEvent({
        sessionId: memberSessionId,
        params: { id: meeting.id },
        body: { candidateIds: [candidate.id] },
      })

      const result = await handler(event as Parameters<typeof handler>[0])
      expect(result).toHaveProperty('success', true)

      // クリーンアップ
      const { deleteSession } = await import('~/server/utils/session')
      deleteSession(memberSessionId)
    })

    it('候補なしで400エラー', async () => {
      const { createSession } = await import('~/server/utils/session')
      const memberSessionId = createSession({
        userId: inviteeUser.id,
        organizationId: ctxAdmin.org.id,
        email: inviteeUser.email,
        role: 'MEMBER',
      })

      const meeting = await prisma.meetingRequest.create({
        data: {
          organizationId: ctxAdmin.org.id,
          organizerId: ctxAdmin.user.id,
          title: '回答テスト2',
          duration: 60,
          dateRangeStart: new Date('2026-03-01'),
          dateRangeEnd: new Date('2026-03-07'),
          status: 'OPEN',
          invitees: {
            create: { userId: inviteeUser.id, status: 'PENDING' },
          },
        },
      })

      const handler = (await import('./[id]/respond.post')).default
      const event = createMockEvent({
        sessionId: memberSessionId,
        params: { id: meeting.id },
        body: { candidateIds: [] },
      })

      await expect(handler(event as Parameters<typeof handler>[0])).rejects.toMatchObject({
        statusCode: 400,
      })

      const { deleteSession } = await import('~/server/utils/session')
      deleteSession(memberSessionId)
    })
  })

  describe('マルチテナント境界', () => {
    it('他テナントのミーティング一覧にはアクセスできない', async () => {
      // ctxAdmin に会議を作成
      await prisma.meetingRequest.create({
        data: {
          organizationId: ctxAdmin.org.id,
          organizerId: ctxAdmin.user.id,
          title: 'テナントAの会議',
          duration: 60,
          dateRangeStart: new Date('2026-03-01'),
          dateRangeEnd: new Date('2026-03-07'),
          status: 'OPEN',
        },
      })

      // ctxMember（別テナント）で一覧取得
      const handler = (await import('./index.get')).default
      const event = createMockEvent({ sessionId: ctxMember.sessionId })
      const result = await handler(event as Parameters<typeof handler>[0])

      // ctxAdmin の会議は見えない
      const meetings = result.meetings
      const found = meetings.some(
        (m: { title: string }) => m.title === 'テナントAの会議'
      )
      expect(found).toBe(false)
    })
  })
})
