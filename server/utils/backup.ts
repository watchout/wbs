/**
 * バックアップ・リストアユーティリティ（OPS-003）
 *
 * PostgreSQLのバックアップ管理
 * - pg_dump によるバックアップ実行
 * - バックアップファイルの一覧管理
 * - リストア機能（管理者のみ）
 */

import { execSync } from 'child_process'
import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'fs'
import { join, basename } from 'path'

const BACKUP_DIR = process.env.BACKUP_DIR || join(process.cwd(), 'backups')
const MAX_BACKUPS = parseInt(process.env.MAX_BACKUPS || '30', 10)

/**
 * バックアップディレクトリを確保
 */
function ensureBackupDir(): void {
  if (!existsSync(BACKUP_DIR)) {
    mkdirSync(BACKUP_DIR, { recursive: true })
  }
}

/**
 * タイムスタンプ付きファイル名を生成
 */
function generateBackupFilename(type: 'auto' | 'manual' = 'manual'): string {
  const now = new Date()
  const ts = now.toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19)
  return `backup_${type}_${ts}.sql.gz`
}

export interface BackupInfo {
  filename: string
  size: number
  sizeHuman: string
  createdAt: string
  type: 'auto' | 'manual'
}

/**
 * ファイルサイズを人間が読みやすい形式に変換
 */
function formatSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex++
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`
}

/**
 * データベースバックアップを実行
 */
export function createBackup(type: 'auto' | 'manual' = 'manual'): BackupInfo | null {
  ensureBackupDir()

  const filename = generateBackupFilename(type)
  const filepath = join(BACKUP_DIR, filename)
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not configured')
  }

  try {
    // pg_dump | gzip でバックアップ
    execSync(
      `pg_dump "${databaseUrl}" | gzip > "${filepath}"`,
      { timeout: 300000 } // 5分タイムアウト
    )

    const stat = statSync(filepath)

    return {
      filename,
      size: stat.size,
      sizeHuman: formatSize(stat.size),
      createdAt: stat.birthtime.toISOString(),
      type,
    }
  } catch (error) {
    // バックアップ失敗時はファイルがあれば削除
    if (existsSync(filepath)) {
      unlinkSync(filepath)
    }
    console.error('[Backup] Failed to create backup:', error)
    return null
  }
}

/**
 * バックアップファイル一覧を取得
 */
export function listBackups(): BackupInfo[] {
  ensureBackupDir()

  try {
    const files = readdirSync(BACKUP_DIR)
      .filter((f) => f.startsWith('backup_') && f.endsWith('.sql.gz'))
      .map((filename) => {
        const filepath = join(BACKUP_DIR, filename)
        const stat = statSync(filepath)
        const type = filename.includes('_auto_') ? 'auto' as const : 'manual' as const

        return {
          filename,
          size: stat.size,
          sizeHuman: formatSize(stat.size),
          createdAt: stat.birthtime.toISOString(),
          type,
        }
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return files
  } catch {
    return []
  }
}

/**
 * 古いバックアップを削除（MAX_BACKUPS を超えた分）
 */
export function pruneOldBackups(): number {
  const backups = listBackups()
  let removed = 0

  if (backups.length > MAX_BACKUPS) {
    const toRemove = backups.slice(MAX_BACKUPS)
    for (const backup of toRemove) {
      try {
        unlinkSync(join(BACKUP_DIR, backup.filename))
        removed++
      } catch {
        // ignore individual file deletion errors
      }
    }
  }

  return removed
}

/**
 * バックアップファイルの存在確認
 */
export function backupExists(filename: string): boolean {
  // パストラバーサル防止
  const safeName = basename(filename)
  if (safeName !== filename) return false
  if (!filename.startsWith('backup_') || !filename.endsWith('.sql.gz')) return false

  return existsSync(join(BACKUP_DIR, safeName))
}

/**
 * バックアップファイルのパスを取得
 */
export function getBackupPath(filename: string): string | null {
  if (!backupExists(filename)) return null
  return join(BACKUP_DIR, basename(filename))
}
