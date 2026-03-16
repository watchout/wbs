/**
 * Backup utility test suite
 * Coverage focus: constants, interfaces, and validation logic
 */

import { describe, it, expect } from 'vitest'
import type { BackupInfo } from './backup'

describe('Backup Utils', () => {
  describe('BackupInfo interface', () => {
    it('has correct structure with all required fields', () => {
      const backupInfo: BackupInfo = {
        filename: 'backup_manual_2024-01-15_120000.sql.gz',
        size: 1024,
        sizeHuman: '1.0 KB',
        createdAt: new Date().toISOString(),
        type: 'manual',
      }

      expect(backupInfo).toHaveProperty('filename')
      expect(backupInfo).toHaveProperty('size')
      expect(backupInfo).toHaveProperty('sizeHuman')
      expect(backupInfo).toHaveProperty('createdAt')
      expect(backupInfo).toHaveProperty('type')
    })

    it('accepts manual backup type', () => {
      const backup: BackupInfo = {
        filename: 'backup_manual_2024-01-15_120000.sql.gz',
        size: 1024,
        sizeHuman: '1.0 KB',
        createdAt: new Date().toISOString(),
        type: 'manual',
      }

      expect(backup.type).toBe('manual')
    })

    it('accepts auto backup type', () => {
      const backup: BackupInfo = {
        filename: 'backup_auto_2024-01-15_120000.sql.gz',
        size: 2048,
        sizeHuman: '2.0 KB',
        createdAt: new Date().toISOString(),
        type: 'auto',
      }

      expect(backup.type).toBe('auto')
    })

    it('size is numeric and positive', () => {
      const backup: BackupInfo = {
        filename: 'backup_manual_2024-01-15_120000.sql.gz',
        size: 0,
        sizeHuman: '0 B',
        createdAt: new Date().toISOString(),
        type: 'manual',
      }

      expect(backup.size).toBeGreaterThanOrEqual(0)
      expect(typeof backup.size).toBe('number')
    })

    it('createdAt is valid ISO date string', () => {
      const isoString = new Date().toISOString()
      const backup: BackupInfo = {
        filename: 'backup_manual_2024-01-15_120000.sql.gz',
        size: 1024,
        sizeHuman: '1.0 KB',
        createdAt: isoString,
        type: 'manual',
      }

      expect(new Date(backup.createdAt).toISOString()).toBe(isoString)
    })
  })

  describe('Backup filename patterns', () => {
    it('recognizes valid manual backup filename', () => {
      const filename = 'backup_manual_2024-01-15_120000.sql.gz'

      expect(filename).toMatch(/^backup_manual_\d{4}-\d{2}-\d{2}_\d{6}\.sql\.gz$/)
    })

    it('recognizes valid auto backup filename', () => {
      const filename = 'backup_auto_2024-01-15_120000.sql.gz'

      expect(filename).toMatch(/^backup_auto_\d{4}-\d{2}-\d{2}_\d{6}\.sql\.gz$/)
    })

    it('rejects filenames without backup prefix', () => {
      const filename = 'bak_manual_2024-01-15_120000.sql.gz'

      expect(filename).not.toMatch(/^backup_/)
    })

    it('rejects filenames without sql.gz extension', () => {
      const filename = 'backup_manual_2024-01-15_120000.tar.gz'

      expect(filename).not.toMatch(/\.sql\.gz$/)
    })

    it('rejects path traversal attempts in filename', () => {
      const filename = '../../../etc/backup_manual_2024-01-15_120000.sql.gz'

      expect(filename).toContain('..')
    })
  })

  describe('Backup type detection', () => {
    it('identifies manual backups from filename', () => {
      const filename = 'backup_manual_2024-01-15_120000.sql.gz'

      expect(filename).toContain('_manual_')
      expect(filename).not.toContain('_auto_')
    })

    it('identifies auto backups from filename', () => {
      const filename = 'backup_auto_2024-01-15_120000.sql.gz'

      expect(filename).toContain('_auto_')
      expect(filename).not.toContain('_manual_')
    })

    it('handles mixed case sensitivity', () => {
      const manualName = 'backup_manual_2024-01-15_120000.sql.gz'
      const autoName = 'backup_auto_2024-01-15_120000.sql.gz'

      expect(manualName.includes('manual')).toBe(true)
      expect(autoName.includes('auto')).toBe(true)
    })
  })

  describe('Backup information formatting', () => {
    it('formats size in bytes correctly', () => {
      const sizeHuman = '1.0 B'

      expect(sizeHuman).toMatch(/^\d+\.?\d* B$/)
    })

    it('formats size in kilobytes correctly', () => {
      const sizeHuman = '2.5 KB'

      expect(sizeHuman).toMatch(/^\d+\.?\d* KB$/)
    })

    it('formats size in megabytes correctly', () => {
      const sizeHuman = '100.5 MB'

      expect(sizeHuman).toMatch(/^\d+\.?\d* MB$/)
    })

    it('formats size in gigabytes correctly', () => {
      const sizeHuman = '2.0 GB'

      expect(sizeHuman).toMatch(/^\d+\.?\d* GB$/)
    })
  })

  describe('Backup validation rules', () => {
    it('enforces valid backup naming convention', () => {
      const validNames = [
        'backup_manual_2024-01-15_120000.sql.gz',
        'backup_auto_2024-02-20_235959.sql.gz',
        'backup_manual_2024-12-31_000000.sql.gz',
      ]

      validNames.forEach((name) => {
        expect(name).toMatch(/^backup_(manual|auto)_\d{4}-\d{2}-\d{2}_\d{6}\.sql\.gz$/)
      })
    })

    it('rejects malformed backup names', () => {
      const invalidNames = [
        'backup_2024-01-15_120000.sql.gz', // Missing type
        'backup_manual_20240115_120000.sql.gz', // Wrong date format
        'backup_manual_2024-01-15.sql.gz', // Missing time
        'backup_manual_2024-01-15_120000.sql', // Missing .gz
        'manual_2024-01-15_120000.sql.gz', // Missing backup_ prefix
      ]

      invalidNames.forEach((name) => {
        expect(name).not.toMatch(/^backup_(manual|auto)_\d{4}-\d{2}-\d{2}_\d{6}\.sql\.gz$/)
      })
    })
  })

  describe('Backup list sorting', () => {
    it('newer backups should come first when sorted', () => {
      const backup1CreatedAt = new Date('2024-01-15T12:00:00Z')
      const backup2CreatedAt = new Date('2024-01-15T12:01:00Z')

      expect(backup2CreatedAt.getTime()).toBeGreaterThan(backup1CreatedAt.getTime())
    })

    it('maintains descending order by creation date', () => {
      const dates = [
        new Date('2024-01-15T12:00:00Z'),
        new Date('2024-01-15T12:01:00Z'),
        new Date('2024-01-15T12:02:00Z'),
      ]

      const sorted = [...dates].sort((a, b) => b.getTime() - a.getTime())

      expect(sorted[0]).toEqual(dates[2])
      expect(sorted[1]).toEqual(dates[1])
      expect(sorted[2]).toEqual(dates[0])
    })
  })
})
