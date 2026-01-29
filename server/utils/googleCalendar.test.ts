import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { generateAuthUrl, calculateSyncRange } from './googleCalendar'

// Mock environment variables
const originalEnv = process.env

describe('googleCalendar utility', () => {
  beforeEach(() => {
    process.env = {
      ...originalEnv,
      GOOGLE_CLIENT_ID: 'test-client-id',
      GOOGLE_CLIENT_SECRET: 'test-client-secret',
      GOOGLE_REDIRECT_URI: 'http://localhost:3000/api/calendar/google/callback',
      CALENDAR_ENCRYPTION_KEY: 'a'.repeat(64)
    }
  })

  afterEach(() => {
    process.env = originalEnv
    vi.restoreAllMocks()
  })

  describe('generateAuthUrl', () => {
    it('should generate OAuth URL with state parameter', () => {
      const state = 'test-state-123'
      const url = generateAuthUrl(state)

      expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth')
      expect(url).toContain('state=test-state-123')
      expect(url).toContain('client_id=test-client-id')
      expect(url).toContain('redirect_uri=')
      expect(url).toContain('scope=')
      expect(url).toContain('access_type=offline')
    })

    it('should include calendar scopes', () => {
      const url = generateAuthUrl('state')

      // URL encoded scopes
      expect(url).toContain('calendar.readonly')
      expect(url).toContain('calendar.events')
    })

    it('should throw error when environment variables are missing', () => {
      delete process.env.GOOGLE_CLIENT_ID

      expect(() => generateAuthUrl('state')).toThrow(
        'Google OAuth environment variables not configured'
      )
    })
  })

  describe('calculateSyncRange', () => {
    it('should calculate correct date range with default values', () => {
      const { timeMin, timeMax } = calculateSyncRange(-7, 28)

      const now = new Date()
      now.setHours(0, 0, 0, 0)

      const expectedMin = new Date(now)
      expectedMin.setDate(expectedMin.getDate() - 7)

      const expectedMax = new Date(now)
      expectedMax.setDate(expectedMax.getDate() + 28)
      expectedMax.setHours(23, 59, 59, 999)

      expect(timeMin.toDateString()).toBe(expectedMin.toDateString())
      expect(timeMax.toDateString()).toBe(expectedMax.toDateString())
    })

    it('should handle custom range values', () => {
      const { timeMin, timeMax } = calculateSyncRange(-30, 60)

      const now = new Date()
      now.setHours(0, 0, 0, 0)

      const expectedMin = new Date(now)
      expectedMin.setDate(expectedMin.getDate() - 30)

      const expectedMax = new Date(now)
      expectedMax.setDate(expectedMax.getDate() + 60)

      expect(timeMin.toDateString()).toBe(expectedMin.toDateString())
      expect(timeMax.toDateString()).toBe(expectedMax.toDateString())
    })

    it('should set timeMin to start of day', () => {
      const { timeMin } = calculateSyncRange(-7, 28)

      expect(timeMin.getHours()).toBe(0)
      expect(timeMin.getMinutes()).toBe(0)
      expect(timeMin.getSeconds()).toBe(0)
    })

    it('should set timeMax to end of day', () => {
      const { timeMax } = calculateSyncRange(-7, 28)

      expect(timeMax.getHours()).toBe(23)
      expect(timeMax.getMinutes()).toBe(59)
      expect(timeMax.getSeconds()).toBe(59)
    })
  })
})
