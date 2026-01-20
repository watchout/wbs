/**
 * Session Management Unit Tests
 *
 * session.ts のユニットテスト
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  createSession,
  getSession,
  deleteSession,
  deleteUserSessions
} from './session'

describe('session', () => {
  describe('createSession', () => {
    it('should create a session and return sessionId', () => {
      const sessionId = createSession({
        userId: 'user-001',
        organizationId: 'org-001',
        email: 'test@example.com',
        role: 'MEMBER'
      })

      expect(sessionId).toBeDefined()
      expect(typeof sessionId).toBe('string')
      expect(sessionId.length).toBeGreaterThan(0)
    })

    it('should create unique sessionIds for multiple sessions', () => {
      const sessionId1 = createSession({
        userId: 'user-001',
        organizationId: 'org-001',
        email: 'test@example.com',
        role: 'MEMBER'
      })
      const sessionId2 = createSession({
        userId: 'user-001',
        organizationId: 'org-001',
        email: 'test@example.com',
        role: 'MEMBER'
      })

      expect(sessionId1).not.toBe(sessionId2)
    })
  })

  describe('getSession', () => {
    it('should return session data for valid sessionId', () => {
      const sessionId = createSession({
        userId: 'user-001',
        organizationId: 'org-001',
        email: 'test@example.com',
        role: 'MEMBER'
      })

      const session = getSession(sessionId)

      expect(session).not.toBeNull()
      expect(session?.userId).toBe('user-001')
      expect(session?.organizationId).toBe('org-001')
      expect(session?.email).toBe('test@example.com')
      expect(session?.role).toBe('MEMBER')
    })

    it('should return null for invalid sessionId', () => {
      const session = getSession('invalid-session-id')
      expect(session).toBeNull()
    })

    it('should return null for empty sessionId', () => {
      const session = getSession('')
      expect(session).toBeNull()
    })

    it('should include createdAt and expiresAt dates', () => {
      const sessionId = createSession({
        userId: 'user-001',
        organizationId: 'org-001',
        email: 'test@example.com',
        role: 'MEMBER'
      })

      const session = getSession(sessionId)

      expect(session?.createdAt).toBeInstanceOf(Date)
      expect(session?.expiresAt).toBeInstanceOf(Date)
      expect(session!.expiresAt.getTime()).toBeGreaterThan(session!.createdAt.getTime())
    })
  })

  describe('deleteSession', () => {
    it('should delete session and return true', () => {
      const sessionId = createSession({
        userId: 'user-001',
        organizationId: 'org-001',
        email: 'test@example.com',
        role: 'MEMBER'
      })

      const result = deleteSession(sessionId)
      expect(result).toBe(true)

      const session = getSession(sessionId)
      expect(session).toBeNull()
    })

    it('should return false for non-existent sessionId', () => {
      const result = deleteSession('non-existent-session-id')
      expect(result).toBe(false)
    })
  })

  describe('deleteUserSessions', () => {
    it('should delete all sessions for a user', () => {
      const sessionId1 = createSession({
        userId: 'user-delete-test',
        organizationId: 'org-001',
        email: 'test@example.com',
        role: 'MEMBER'
      })
      const sessionId2 = createSession({
        userId: 'user-delete-test',
        organizationId: 'org-001',
        email: 'test@example.com',
        role: 'MEMBER'
      })

      const count = deleteUserSessions('user-delete-test')
      expect(count).toBe(2)

      expect(getSession(sessionId1)).toBeNull()
      expect(getSession(sessionId2)).toBeNull()
    })

    it('should return 0 for user with no sessions', () => {
      const count = deleteUserSessions('user-with-no-sessions')
      expect(count).toBe(0)
    })

    it('should not delete sessions of other users', () => {
      const sessionId1 = createSession({
        userId: 'user-A',
        organizationId: 'org-001',
        email: 'a@example.com',
        role: 'MEMBER'
      })
      const sessionId2 = createSession({
        userId: 'user-B',
        organizationId: 'org-001',
        email: 'b@example.com',
        role: 'MEMBER'
      })

      deleteUserSessions('user-A')

      expect(getSession(sessionId1)).toBeNull()
      expect(getSession(sessionId2)).not.toBeNull()

      // cleanup
      deleteSession(sessionId2)
    })
  })

  describe('device session', () => {
    it('should create device session with longer expiration', () => {
      const userSessionId = createSession({
        userId: 'user-001',
        organizationId: 'org-001',
        email: 'test@example.com',
        role: 'MEMBER'
      })

      const deviceSessionId = createSession({
        userId: 'user-001',
        organizationId: 'org-001',
        email: 'test@example.com',
        role: 'MEMBER',
        deviceId: 'device-001'
      })

      const userSession = getSession(userSessionId)
      const deviceSession = getSession(deviceSessionId)

      expect(deviceSession?.deviceId).toBe('device-001')
      // デバイスセッションはユーザーセッションより長い有効期限を持つ
      expect(deviceSession!.expiresAt.getTime()).toBeGreaterThan(userSession!.expiresAt.getTime())

      // cleanup
      deleteSession(userSessionId)
      deleteSession(deviceSessionId)
    })
  })
})
