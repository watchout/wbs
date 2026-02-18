/**
 * OPS-003: バックアップユーティリティテスト
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// fs と child_process をモック
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  readdirSync: vi.fn(),
  statSync: vi.fn(),
  unlinkSync: vi.fn(),
}))

vi.mock('child_process', () => ({
  execSync: vi.fn(),
}))

import { existsSync, readdirSync, statSync } from 'fs'
import { listBackups, backupExists } from '~/server/utils/backup'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockReaddirSync = readdirSync as any

describe('OPS-003: バックアップユーティリティ', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('listBackups', () => {
    it('should return empty array when no backups exist', () => {
      vi.mocked(existsSync).mockReturnValue(true)
      mockReaddirSync.mockReturnValue([])

      const result = listBackups()
      expect(result).toEqual([])
    })

    it('should list and sort backups by date descending', () => {
      vi.mocked(existsSync).mockReturnValue(true)
      mockReaddirSync.mockReturnValue([
        'backup_manual_2025-06-01_09-00-00.sql.gz',
        'backup_auto_2025-06-02_09-00-00.sql.gz',
      ])
      vi.mocked(statSync).mockImplementation((filepath) => {
        const fname = String(filepath)
        if (fname.includes('06-01')) {
          return {
            size: 1024,
            birthtime: new Date('2025-06-01T09:00:00Z'),
          } as import('fs').Stats
        }
        return {
          size: 2048,
          birthtime: new Date('2025-06-02T09:00:00Z'),
        } as import('fs').Stats
      })

      const result = listBackups()

      expect(result).toHaveLength(2)
      // Newer first
      expect(result[0].filename).toBe('backup_auto_2025-06-02_09-00-00.sql.gz')
      expect(result[0].type).toBe('auto')
      expect(result[1].filename).toBe('backup_manual_2025-06-01_09-00-00.sql.gz')
      expect(result[1].type).toBe('manual')
    })

    it('should filter non-backup files', () => {
      vi.mocked(existsSync).mockReturnValue(true)
      mockReaddirSync.mockReturnValue([
        'backup_manual_2025-06-01_09-00-00.sql.gz',
        'random-file.txt',
        'README.md',
      ])
      vi.mocked(statSync).mockReturnValue({
        size: 1024,
        birthtime: new Date('2025-06-01T09:00:00Z'),
      } as import('fs').Stats)

      const result = listBackups()
      expect(result).toHaveLength(1)
    })

    it('should include human-readable size', () => {
      vi.mocked(existsSync).mockReturnValue(true)
      mockReaddirSync.mockReturnValue([
        'backup_manual_2025-06-01_09-00-00.sql.gz',
      ])
      vi.mocked(statSync).mockReturnValue({
        size: 1048576, // 1 MB
        birthtime: new Date('2025-06-01T09:00:00Z'),
      } as import('fs').Stats)

      const result = listBackups()
      expect(result[0].sizeHuman).toBe('1.0 MB')
    })
  })

  describe('backupExists', () => {
    it('should return true for valid existing backup', () => {
      vi.mocked(existsSync).mockReturnValue(true)

      expect(backupExists('backup_manual_2025-06-01_09-00-00.sql.gz')).toBe(true)
    })

    it('should reject path traversal attempts', () => {
      expect(backupExists('../../../etc/passwd')).toBe(false)
      expect(backupExists('../../backup_manual_2025-06-01.sql.gz')).toBe(false)
    })

    it('should reject invalid filenames', () => {
      expect(backupExists('notabackup.txt')).toBe(false)
      expect(backupExists('backup_manual_2025.tar.gz')).toBe(false)
    })

    it('should return false for non-existing backup', () => {
      vi.mocked(existsSync).mockReturnValue(false)

      expect(backupExists('backup_manual_2025-06-01_09-00-00.sql.gz')).toBe(false)
    })
  })
})
