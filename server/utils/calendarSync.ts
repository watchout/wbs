/**
 * Calendar synchronization logic
 * Handles import from Google Calendar and export to Google Calendar
 */
import { calendar_v3 } from 'googleapis'
import { createLogger } from './logger'
import {
  getCalendarClient,
  fetchEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  calculateSyncRange
} from './googleCalendar'
import { prisma } from './prisma'
import type { Schedule, UserCalendarConnection } from '@prisma/client'

const log = createLogger('calendar-sync')

interface SyncResult {
  imported: number
  exported: number
  errors: string[]
}

/**
 * Import events from Google Calendar to Schedule
 * @param connection - Calendar connection with organizationId
 * @returns Number of imported events
 */
export async function importFromGoogle(
  connection: UserCalendarConnection
): Promise<{ imported: number; errors: string[] }> {
  const errors: string[] = []
  let imported = 0

  try {
    const calendar = await getCalendarClient(connection.id)
    const { timeMin, timeMax } = calculateSyncRange(
      connection.syncRangeStart,
      connection.syncRangeEnd
    )

    const events = await fetchEvents(
      calendar,
      connection.calendarId,
      timeMin,
      timeMax
    )

    for (const event of events) {
      if (!event.id || !event.start || !event.end) {
        continue
      }

      try {
        const startDate = event.start.dateTime
          ? new Date(event.start.dateTime)
          : event.start.date
            ? new Date(event.start.date)
            : null
        const endDate = event.end.dateTime
          ? new Date(event.end.dateTime)
          : event.end.date
            ? new Date(event.end.date)
            : null

        if (!startDate || !endDate) {
          continue
        }

        const googleUpdatedAt = event.updated ? new Date(event.updated) : new Date()

        // Check if schedule already exists with this external ID
        const existing = await prisma.schedule.findFirst({
          where: {
            organizationId: connection.organizationId,
            externalId: event.id,
            externalSource: 'google',
            deletedAt: null
          }
        })

        if (existing) {
          // Skip if Google hasn't updated since our last sync
          if (
            existing.externalUpdatedAt &&
            googleUpdatedAt <= existing.externalUpdatedAt
          ) {
            continue
          }

          // Update existing schedule
          await prisma.schedule.update({
            where: { id: existing.id },
            data: {
              title: event.summary || 'Untitled',
              description: event.description || null,
              start: startDate,
              end: endDate,
              externalUpdatedAt: googleUpdatedAt
            }
          })
        } else {
          // Create new schedule
          await prisma.schedule.create({
            data: {
              organizationId: connection.organizationId,
              authorId: connection.userId,
              title: event.summary || 'Untitled',
              description: event.description || null,
              start: startDate,
              end: endDate,
              source: 'GOOGLE',
              externalId: event.id,
              externalSource: 'google',
              externalUpdatedAt: googleUpdatedAt
            }
          })
        }

        imported++
      } catch (err) {
        errors.push(`Failed to import event ${event.id}: ${err}`)
      }
    }
  } catch (err) {
    errors.push(`Import failed: ${err}`)
  }

  return { imported, errors }
}

/**
 * Export schedules to Google Calendar
 * @param connection - Calendar connection with organizationId
 * @returns Number of exported schedules
 */
export async function exportToGoogle(
  connection: UserCalendarConnection
): Promise<{ exported: number; errors: string[] }> {
  const errors: string[] = []
  let exported = 0

  try {
    const calendar = await getCalendarClient(connection.id)
    const { timeMin, timeMax } = calculateSyncRange(
      connection.syncRangeStart,
      connection.syncRangeEnd
    )

    // Find schedules that need to be exported:
    // 1. Created by this user (authorId = connection.userId)
    // 2. Created internally (source = INTERNAL)
    // 3. Updated after last external sync (or never synced)
    // 4. Within sync range
    // NOTE: Prisma does not support field-to-field comparison in where clause,
    //       so we fetch candidates and filter in application code.
    const candidates = await prisma.schedule.findMany({
      where: {
        organizationId: connection.organizationId,
        authorId: connection.userId,
        source: 'INTERNAL',
        deletedAt: null,
        start: { gte: timeMin },
        end: { lte: timeMax },
        OR: [
          { externalId: null },
          { externalUpdatedAt: { not: null } }
        ]
      }
    })

    // Filter: never exported OR updatedAt > externalUpdatedAt (modified since last export)
    const schedulesToExport = candidates.filter(s =>
      !s.externalId || (s.externalUpdatedAt && s.updatedAt > s.externalUpdatedAt)
    )

    for (const schedule of schedulesToExport) {
      try {
        const now = new Date()

        if (schedule.externalId) {
          // Update existing Google event
          await updateEvent(calendar, connection.calendarId, schedule.externalId, {
            summary: schedule.title,
            description: schedule.description || undefined,
            start: schedule.start,
            end: schedule.end
          })

          await prisma.schedule.update({
            where: { id: schedule.id },
            data: { externalUpdatedAt: now }
          })
        } else {
          // Create new Google event
          const createdEvent = await createEvent(
            calendar,
            connection.calendarId,
            {
              summary: schedule.title,
              description: schedule.description || undefined,
              start: schedule.start,
              end: schedule.end
            }
          )

          await prisma.schedule.update({
            where: { id: schedule.id },
            data: {
              externalId: createdEvent.id,
              externalSource: 'google',
              externalUpdatedAt: now
            }
          })
        }

        exported++
      } catch (err) {
        errors.push(`Failed to export schedule ${schedule.id}: ${err}`)
      }
    }
  } catch (err) {
    errors.push(`Export failed: ${err}`)
  }

  return { exported, errors }
}

/**
 * Perform full bidirectional sync
 * @param connection - Calendar connection
 * @param direction - Sync direction: 'import', 'export', or 'both'
 * @returns Sync results
 */
export async function syncCalendar(
  connection: UserCalendarConnection,
  direction: 'import' | 'export' | 'both' = 'both'
): Promise<SyncResult> {
  const result: SyncResult = {
    imported: 0,
    exported: 0,
    errors: []
  }

  try {
    if (direction === 'import' || direction === 'both') {
      const importResult = await importFromGoogle(connection)
      result.imported = importResult.imported
      result.errors.push(...importResult.errors)
    }

    if (direction === 'export' || direction === 'both') {
      const exportResult = await exportToGoogle(connection)
      result.exported = exportResult.exported
      result.errors.push(...exportResult.errors)
    }

    // Update last synced timestamp
    await prisma.userCalendarConnection.update({
      where: { id: connection.id },
      data: {
        lastSyncedAt: new Date(),
        status: result.errors.length > 0 ? 'error' : 'active'
      }
    })
  } catch (err) {
    result.errors.push(`Sync failed: ${err}`)

    // Update connection status
    await prisma.userCalendarConnection.update({
      where: { id: connection.id },
      data: { status: 'error' }
    })
  }

  return result
}

/**
 * Handle deletion of a schedule
 * If it was synced to Google, delete from Google too
 * @param scheduleId - Schedule ID
 * @param connectionId - Calendar connection ID
 */
export async function handleScheduleDeleted(
  scheduleId: string,
  connectionId: string
): Promise<void> {
  const schedule = await prisma.schedule.findUnique({
    where: { id: scheduleId }
  })

  if (!schedule || !schedule.externalId || schedule.externalSource !== 'google') {
    return
  }

  try {
    const calendar = await getCalendarClient(connectionId)
    await deleteEvent(calendar, 'primary', schedule.externalId)
  } catch (err) {
    log.error('Failed to delete Google event', { externalId: schedule.externalId, error: err instanceof Error ? err : new Error(String(err)) })
  }
}
