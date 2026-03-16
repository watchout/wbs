/**
 * Audit log utility test suite
 * Coverage focus: action constants and utility functions
 */

import { describe, it, expect } from 'vitest'
import { AUDIT_ACTIONS, type AuditAction } from './auditLog'

describe('Audit Log Utils', () => {
  describe('AUDIT_ACTIONS constants', () => {
    it('defines all authentication actions', () => {
      expect(AUDIT_ACTIONS.USER_LOGIN).toBe('USER_LOGIN')
      expect(AUDIT_ACTIONS.USER_LOGOUT).toBe('USER_LOGOUT')
      expect(AUDIT_ACTIONS.DEVICE_LOGIN).toBe('DEVICE_LOGIN')
      expect(AUDIT_ACTIONS.PASSWORD_CHANGED).toBe('PASSWORD_CHANGED')
    })

    it('defines all schedule actions', () => {
      expect(AUDIT_ACTIONS.SCHEDULE_CREATE).toBe('SCHEDULE_CREATE')
      expect(AUDIT_ACTIONS.SCHEDULE_UPDATE).toBe('SCHEDULE_UPDATE')
      expect(AUDIT_ACTIONS.SCHEDULE_DELETE).toBe('SCHEDULE_DELETE')
    })

    it('defines all user management actions', () => {
      expect(AUDIT_ACTIONS.USER_CREATE).toBe('USER_CREATE')
      expect(AUDIT_ACTIONS.USER_UPDATE).toBe('USER_UPDATE')
      expect(AUDIT_ACTIONS.USER_DELETE).toBe('USER_DELETE')
    })

    it('defines all department management actions', () => {
      expect(AUDIT_ACTIONS.DEPARTMENT_CREATE).toBe('DEPARTMENT_CREATE')
      expect(AUDIT_ACTIONS.DEPARTMENT_UPDATE).toBe('DEPARTMENT_UPDATE')
      expect(AUDIT_ACTIONS.DEPARTMENT_DELETE).toBe('DEPARTMENT_DELETE')
    })

    it('defines all configuration actions', () => {
      expect(AUDIT_ACTIONS.LLM_SETTINGS_UPDATE).toBe('LLM_SETTINGS_UPDATE')
      expect(AUDIT_ACTIONS.ORGANIZATION_UPDATE).toBe('ORGANIZATION_UPDATE')
    })

    it('defines all calendar integration actions', () => {
      expect(AUDIT_ACTIONS.CALENDAR_CONNECT).toBe('CALENDAR_CONNECT')
      expect(AUDIT_ACTIONS.CALENDAR_DISCONNECT).toBe('CALENDAR_DISCONNECT')
      expect(AUDIT_ACTIONS.CALENDAR_SYNC).toBe('CALENDAR_SYNC')
    })

    it('defines all AI operation actions', () => {
      expect(AUDIT_ACTIONS.AI_COMMAND).toBe('AI_COMMAND')
      expect(AUDIT_ACTIONS.AI_ASSIGNMENT).toBe('AI_ASSIGNMENT')
    })

    it('has no duplicate values', () => {
      const values = Object.values(AUDIT_ACTIONS)
      const uniqueValues = new Set(values)

      expect(uniqueValues.size).toBe(values.length)
    })

    it('all action keys are uppercase', () => {
      Object.keys(AUDIT_ACTIONS).forEach((key) => {
        expect(key).toMatch(/^[A-Z_]+$/)
      })
    })

    it('all action values are uppercase', () => {
      Object.values(AUDIT_ACTIONS).forEach((value) => {
        expect(value).toMatch(/^[A-Z_]+$/)
      })
    })
  })

  describe('AuditAction type', () => {
    it('accepts valid audit action constants', () => {
      const validActions: AuditAction[] = [
        AUDIT_ACTIONS.USER_LOGIN,
        AUDIT_ACTIONS.SCHEDULE_CREATE,
        AUDIT_ACTIONS.USER_UPDATE,
        AUDIT_ACTIONS.CALENDAR_CONNECT,
        AUDIT_ACTIONS.AI_COMMAND,
      ]

      expect(validActions).toHaveLength(5)
      validActions.forEach((action) => {
        expect(action).toBeDefined()
        expect(typeof action).toBe('string')
      })
    })
  })

  describe('AUDIT_ACTIONS completeness', () => {
    it('has at least 4 authentication actions', () => {
      const authActions = [
        AUDIT_ACTIONS.USER_LOGIN,
        AUDIT_ACTIONS.USER_LOGOUT,
        AUDIT_ACTIONS.DEVICE_LOGIN,
        AUDIT_ACTIONS.PASSWORD_CHANGED,
      ]

      expect(authActions).toHaveLength(4)
      authActions.forEach((action) => expect(action).toBeTruthy())
    })

    it('has at least 3 schedule actions', () => {
      const scheduleActions = [
        AUDIT_ACTIONS.SCHEDULE_CREATE,
        AUDIT_ACTIONS.SCHEDULE_UPDATE,
        AUDIT_ACTIONS.SCHEDULE_DELETE,
      ]

      expect(scheduleActions).toHaveLength(3)
      scheduleActions.forEach((action) => expect(action).toBeTruthy())
    })

    it('has at least 3 user management actions', () => {
      const userActions = [
        AUDIT_ACTIONS.USER_CREATE,
        AUDIT_ACTIONS.USER_UPDATE,
        AUDIT_ACTIONS.USER_DELETE,
      ]

      expect(userActions).toHaveLength(3)
      userActions.forEach((action) => expect(action).toBeTruthy())
    })

    it('has at least 3 department actions', () => {
      const deptActions = [
        AUDIT_ACTIONS.DEPARTMENT_CREATE,
        AUDIT_ACTIONS.DEPARTMENT_UPDATE,
        AUDIT_ACTIONS.DEPARTMENT_DELETE,
      ]

      expect(deptActions).toHaveLength(3)
      deptActions.forEach((action) => expect(action).toBeTruthy())
    })

    it('has at least 2 configuration actions', () => {
      const configActions = [
        AUDIT_ACTIONS.LLM_SETTINGS_UPDATE,
        AUDIT_ACTIONS.ORGANIZATION_UPDATE,
      ]

      expect(configActions).toHaveLength(2)
      configActions.forEach((action) => expect(action).toBeTruthy())
    })

    it('has at least 3 calendar actions', () => {
      const calendarActions = [
        AUDIT_ACTIONS.CALENDAR_CONNECT,
        AUDIT_ACTIONS.CALENDAR_DISCONNECT,
        AUDIT_ACTIONS.CALENDAR_SYNC,
      ]

      expect(calendarActions).toHaveLength(3)
      calendarActions.forEach((action) => expect(action).toBeTruthy())
    })

    it('has at least 2 AI actions', () => {
      const aiActions = [AUDIT_ACTIONS.AI_COMMAND, AUDIT_ACTIONS.AI_ASSIGNMENT]

      expect(aiActions).toHaveLength(2)
      aiActions.forEach((action) => expect(action).toBeTruthy())
    })
  })

  describe('Audit action enumeration', () => {
    it('can iterate over all actions', () => {
      const allActions = Object.entries(AUDIT_ACTIONS)

      expect(allActions.length).toBeGreaterThanOrEqual(20)
    })

    it('can check if an action exists', () => {
      const checkAction = (key: string): boolean => {
        return key in AUDIT_ACTIONS
      }

      expect(checkAction('USER_LOGIN')).toBe(true)
      expect(checkAction('INVALID_ACTION')).toBe(false)
    })

    it('can get action value by key', () => {
      const getAction = (key: keyof typeof AUDIT_ACTIONS): string => {
        return AUDIT_ACTIONS[key]
      }

      expect(getAction('USER_LOGIN')).toBe('USER_LOGIN')
      expect(getAction('SCHEDULE_CREATE')).toBe('SCHEDULE_CREATE')
    })
  })

  describe('Action grouping', () => {
    it('authentication actions have consistent naming', () => {
      const authActions = [
        AUDIT_ACTIONS.USER_LOGIN,
        AUDIT_ACTIONS.USER_LOGOUT,
        AUDIT_ACTIONS.DEVICE_LOGIN,
        AUDIT_ACTIONS.PASSWORD_CHANGED,
      ]

      authActions.forEach((action) => {
        expect(action).toMatch(/^(USER|DEVICE|PASSWORD)_/)
      })
    })

    it('CRUD actions follow naming pattern', () => {
      const crudPatterns = [
        AUDIT_ACTIONS.SCHEDULE_CREATE,
        AUDIT_ACTIONS.SCHEDULE_UPDATE,
        AUDIT_ACTIONS.SCHEDULE_DELETE,
        AUDIT_ACTIONS.USER_CREATE,
        AUDIT_ACTIONS.USER_UPDATE,
        AUDIT_ACTIONS.USER_DELETE,
        AUDIT_ACTIONS.DEPARTMENT_CREATE,
        AUDIT_ACTIONS.DEPARTMENT_UPDATE,
        AUDIT_ACTIONS.DEPARTMENT_DELETE,
      ]

      crudPatterns.forEach((action) => {
        expect(action).toMatch(/_(?:CREATE|UPDATE|DELETE)$/)
      })
    })

    it('integration actions have descriptive names', () => {
      const integrationActions = [
        AUDIT_ACTIONS.CALENDAR_CONNECT,
        AUDIT_ACTIONS.CALENDAR_DISCONNECT,
        AUDIT_ACTIONS.CALENDAR_SYNC,
      ]

      integrationActions.forEach((action) => {
        expect(action).toMatch(/^[A-Z]+_/)
      })
    })
  })
})
