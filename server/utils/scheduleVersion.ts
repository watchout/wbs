/**
 * スケジュール変更履歴ユーティリティ（AUDIT-003）
 *
 * スケジュールの更新時にdiff（before/after）を ScheduleVersion に記録する
 */

import { createLogger } from './logger'
import { prisma } from './prisma'

const log = createLogger('schedule-version')

interface ScheduleSnapshot {
  title: string
  description: string | null
  start: string  // ISO string
  end: string    // ISO string
  authorId: string | null
  color: string | null
}

interface DiffEntry {
  field: string
  before: string | null
  after: string | null
}

/**
 * 2つのスナップショットを比較してdiffを生成
 */
export function computeScheduleDiff(
  before: ScheduleSnapshot,
  after: ScheduleSnapshot
): DiffEntry[] {
  const fields: (keyof ScheduleSnapshot)[] = ['title', 'description', 'start', 'end', 'authorId', 'color']
  const diffs: DiffEntry[] = []

  for (const field of fields) {
    const beforeVal = before[field] ?? null
    const afterVal = after[field] ?? null
    if (beforeVal !== afterVal) {
      diffs.push({
        field,
        before: beforeVal,
        after: afterVal,
      })
    }
  }

  return diffs
}

/**
 * スケジュールのスナップショットを作成
 */
export function createScheduleSnapshot(schedule: {
  title: string
  description: string | null
  start: Date
  end: Date
  authorId: string | null
  color: string | null
}): ScheduleSnapshot {
  return {
    title: schedule.title,
    description: schedule.description,
    start: schedule.start.toISOString(),
    end: schedule.end.toISOString(),
    authorId: schedule.authorId,
    color: schedule.color,
  }
}

/**
 * 変更履歴バージョンを作成
 *
 * 非ブロッキング: 失敗しても業務フローを止めない
 */
export async function createScheduleVersion(
  scheduleId: string,
  diff: DiffEntry[]
): Promise<void> {
  if (diff.length === 0) return

  try {
    // 現在の最大バージョン番号を取得
    const latest = await prisma.scheduleVersion.findFirst({
      where: { scheduleId },
      orderBy: { version: 'desc' },
      select: { version: true },
    })

    const nextVersion = (latest?.version ?? 0) + 1

    await prisma.scheduleVersion.create({
      data: {
        scheduleId,
        version: nextVersion,
        diffJson: JSON.parse(JSON.stringify(diff)),
      },
    })
  } catch (error) {
    log.error('Failed to create version', { error: error instanceof Error ? error : new Error(String(error)) })
  }
}

/**
 * スケジュールの変更履歴を取得
 */
export async function getScheduleVersions(
  scheduleId: string,
  organizationId: string,
  options: { page?: number; limit?: number } = {}
) {
  const { page = 1, limit = 20 } = options

  // スケジュールが対象組織に属しているか確認
  const schedule = await prisma.schedule.findFirst({
    where: {
      id: scheduleId,
      organizationId,
    },
    select: { id: true, title: true },
  })

  if (!schedule) {
    return null
  }

  const [versions, total] = await Promise.all([
    prisma.scheduleVersion.findMany({
      where: { scheduleId },
      orderBy: { version: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.scheduleVersion.count({ where: { scheduleId } }),
  ])

  return {
    scheduleId,
    scheduleTitle: schedule.title,
    versions: versions.map((v) => ({
      id: v.id,
      version: v.version,
      diff: v.diffJson as unknown as DiffEntry[],
      createdAt: v.createdAt.toISOString(),
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  }
}
