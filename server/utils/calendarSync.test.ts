import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { syncCalendar, importFromGoogle, exportToGoogle } from './calendarSync'
import { prisma } from './prisma'
import type { UserCalendarConnection } from '@prisma/client'

// Mock the googleCalendar module
vi.mock('./googleCalendar', () => ({
  getCalendarClient: vi.fn().mockResolvedValue({
    events: {
      list: vi.fn(),
      insert: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn()
    }
  }),
  fetchEvents: vi.fn().mockResolvedValue([]),
  createEvent: vi.fn().mockResolvedValue({ id: 'new-google-event-id' }),
  updateEvent: vi.fn().mockResolvedValue({}),
  deleteEvent: vi.fn().mockResolvedValue(undefined),
  calculateSyncRange: vi.fn().mockReturnValue({
    timeMin: new Date('2026-01-01'),
    timeMax: new Date('2026-02-01')
  })
}))

// Get the mocked functions
import { fetchEvents, createEvent, updateEvent, getCalendarClient } from './googleCalendar'

describe('calendarSync utility', () => {
  const mockConnection: UserCalendarConnection = {
    id: 'test-connection-id',
    userId: 'test-user-id',
    organizationId: 'test-org-id',
    provider: 'google',
    accessToken: 'encrypted-access',
    refreshToken: 'encrypted-refresh',
    tokenExpiresAt: new Date(Date.now() + 3600 * 1000),
    calendarId: 'primary',
    webhookChannelId: null,
    webhookToken: null,
    webhookExpiration: null,
    syncRangeStart: -7,
    syncRangeEnd: 28,
    lastSyncedAt: null,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('importFromGoogle', () => {
    it('should import new events from Google Calendar', async () => {
      // Mock Google Calendar events
      const mockEvents = [
        {
          id: 'google-event-1',
          summary: 'Meeting',
          description: 'Team meeting',
          start: { dateTime: '2026-01-15T10:00:00+09:00' },
          end: { dateTime: '2026-01-15T11:00:00+09:00' },
          updated: '2026-01-15T09:00:00Z'
        }
      ]
      vi.mocked(fetchEvents).mockResolvedValueOnce(mockEvents)

      // Mock prisma.schedule.findFirst to return null (no existing)
      const findFirstSpy = vi.spyOn(prisma.schedule, 'findFirst').mockResolvedValueOnce(null)

      // Mock prisma.schedule.create
      const createSpy = vi.spyOn(prisma.schedule, 'create').mockResolvedValueOnce({
        id: 'new-schedule-id',
        organizationId: mockConnection.organizationId,
        authorId: mockConnection.userId,
        title: 'Meeting',
        description: 'Team meeting',
        start: new Date('2026-01-15T10:00:00+09:00'),
        end: new Date('2026-01-15T11:00:00+09:00'),
        color: null,
        source: 'GOOGLE',
        externalId: 'google-event-1',
        externalSource: 'google',
        externalUpdatedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null
      })

      const result = await importFromGoogle(mockConnection)

      expect(result.imported).toBe(1)
      expect(result.errors).toHaveLength(0)
      expect(findFirstSpy).toHaveBeenCalledWith({
        where: {
          organizationId: mockConnection.organizationId,
          externalId: 'google-event-1',
          externalSource: 'google',
          deletedAt: null
        }
      })
      expect(createSpy).toHaveBeenCalled()

      findFirstSpy.mockRestore()
      createSpy.mockRestore()
    })

    it('should skip events that have not been updated', async () => {
      const existingUpdatedAt = new Date('2026-01-15T12:00:00Z')
      const mockEvents = [
        {
          id: 'google-event-1',
          summary: 'Meeting',
          start: { dateTime: '2026-01-15T10:00:00+09:00' },
          end: { dateTime: '2026-01-15T11:00:00+09:00' },
          updated: '2026-01-15T10:00:00Z' // Earlier than existing
        }
      ]
      vi.mocked(fetchEvents).mockResolvedValueOnce(mockEvents)

      // Mock existing schedule with later externalUpdatedAt
      const findFirstSpy = vi.spyOn(prisma.schedule, 'findFirst').mockResolvedValueOnce({
        id: 'existing-schedule-id',
        organizationId: mockConnection.organizationId,
        authorId: mockConnection.userId,
        title: 'Old Meeting',
        description: null,
        start: new Date(),
        end: new Date(),
        color: null,
        source: 'GOOGLE',
        externalId: 'google-event-1',
        externalSource: 'google',
        externalUpdatedAt: existingUpdatedAt,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null
      })

      const updateSpy = vi.spyOn(prisma.schedule, 'update')

      const result = await importFromGoogle(mockConnection)

      // Should not update because Google hasn't changed
      expect(result.imported).toBe(0)
      expect(updateSpy).not.toHaveBeenCalled()

      findFirstSpy.mockRestore()
      updateSpy.mockRestore()
    })

    it('should handle empty event list', async () => {
      vi.mocked(fetchEvents).mockResolvedValueOnce([])

      const result = await importFromGoogle(mockConnection)

      expect(result.imported).toBe(0)
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('exportToGoogle', () => {
    it('should export internal schedules to Google', async () => {
      // Mock schedules to export
      const findManySpy = vi.spyOn(prisma.schedule, 'findMany').mockResolvedValueOnce([
        {
          id: 'schedule-to-export',
          organizationId: mockConnection.organizationId,
          authorId: mockConnection.userId,
          title: 'Local Meeting',
          description: 'Local only',
          start: new Date('2026-01-20T14:00:00+09:00'),
          end: new Date('2026-01-20T15:00:00+09:00'),
          color: null,
          source: 'INTERNAL',
          externalId: null,
          externalSource: null,
          externalUpdatedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null
        }
      ])

      vi.mocked(createEvent).mockResolvedValueOnce({
        id: 'new-google-event-id',
        summary: 'Local Meeting'
      })

      const updateSpy = vi.spyOn(prisma.schedule, 'update').mockResolvedValueOnce({} as any)

      const result = await exportToGoogle(mockConnection)

      expect(result.exported).toBe(1)
      expect(result.errors).toHaveLength(0)
      expect(createEvent).toHaveBeenCalled()
      expect(updateSpy).toHaveBeenCalledWith({
        where: { id: 'schedule-to-export' },
        data: expect.objectContaining({
          externalId: 'new-google-event-id',
          externalSource: 'google'
        })
      })

      findManySpy.mockRestore()
      updateSpy.mockRestore()
    })

    it('should handle no schedules to export', async () => {
      const findManySpy = vi.spyOn(prisma.schedule, 'findMany').mockResolvedValueOnce([])

      const result = await exportToGoogle(mockConnection)

      expect(result.exported).toBe(0)
      expect(result.errors).toHaveLength(0)

      findManySpy.mockRestore()
    })

    it('should only export schedules created by the user (authorId filter)', async () => {
      const findManySpy = vi.spyOn(prisma.schedule, 'findMany').mockResolvedValueOnce([])

      await exportToGoogle(mockConnection)

      // Verify the query includes authorId filter
      expect(findManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: mockConnection.organizationId,
            authorId: mockConnection.userId, // Critical: only user's own schedules
            source: 'INTERNAL',
            deletedAt: null
          })
        })
      )

      findManySpy.mockRestore()
    })
  })

  describe('syncCalendar', () => {
    it('should perform import only when direction is import', async () => {
      vi.mocked(fetchEvents).mockResolvedValueOnce([])
      const findManySpy = vi.spyOn(prisma.schedule, 'findMany').mockResolvedValueOnce([])
      const updateSpy = vi.spyOn(prisma.userCalendarConnection, 'update').mockResolvedValueOnce(
        {} as any
      )

      const result = await syncCalendar(mockConnection, 'import')

      expect(result.imported).toBe(0)
      expect(result.exported).toBe(0)
      expect(findManySpy).not.toHaveBeenCalled() // Export query not called
      expect(updateSpy).toHaveBeenCalled()

      findManySpy.mockRestore()
      updateSpy.mockRestore()
    })

    it('should perform export only when direction is export', async () => {
      const findManySpy = vi.spyOn(prisma.schedule, 'findMany').mockResolvedValueOnce([])
      const updateSpy = vi.spyOn(prisma.userCalendarConnection, 'update').mockResolvedValueOnce(
        {} as any
      )

      const result = await syncCalendar(mockConnection, 'export')

      expect(result.imported).toBe(0)
      expect(result.exported).toBe(0)
      expect(fetchEvents).not.toHaveBeenCalled() // Import not called
      expect(findManySpy).toHaveBeenCalled()
      expect(updateSpy).toHaveBeenCalled()

      findManySpy.mockRestore()
      updateSpy.mockRestore()
    })

    it('should update connection status to error on failure', async () => {
      vi.mocked(getCalendarClient).mockRejectedValueOnce(new Error('API Error'))

      const updateSpy = vi.spyOn(prisma.userCalendarConnection, 'update').mockResolvedValue(
        {} as any
      )

      const result = await syncCalendar(mockConnection, 'import')

      expect(result.errors.length).toBeGreaterThan(0)
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockConnection.id },
          data: expect.objectContaining({ status: 'error' })
        })
      )

      updateSpy.mockRestore()
    })
  })

  describe('無限ループ防止', () => {
    it('should not re-import unchanged events', async () => {
      // This tests the loop prevention logic:
      // When importing, if externalUpdatedAt >= Google's updated time, skip
      const existingUpdatedAt = new Date('2026-01-15T12:00:00Z')

      const mockEvents = [
        {
          id: 'google-event-1',
          summary: 'Meeting',
          start: { dateTime: '2026-01-15T10:00:00+09:00' },
          end: { dateTime: '2026-01-15T11:00:00+09:00' },
          // Same as or earlier than our recorded time
          updated: existingUpdatedAt.toISOString()
        }
      ]
      vi.mocked(fetchEvents).mockResolvedValueOnce(mockEvents)

      const findFirstSpy = vi.spyOn(prisma.schedule, 'findFirst').mockResolvedValueOnce({
        id: 'existing-schedule',
        organizationId: mockConnection.organizationId,
        authorId: mockConnection.userId,
        title: 'Meeting',
        description: null,
        start: new Date(),
        end: new Date(),
        color: null,
        source: 'GOOGLE',
        externalId: 'google-event-1',
        externalSource: 'google',
        externalUpdatedAt: existingUpdatedAt, // Same time
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null
      })

      const updateSpy = vi.spyOn(prisma.schedule, 'update')

      const result = await importFromGoogle(mockConnection)

      // Should skip since times are equal
      expect(result.imported).toBe(0)
      expect(updateSpy).not.toHaveBeenCalled()

      findFirstSpy.mockRestore()
      updateSpy.mockRestore()
    })
  })
})
