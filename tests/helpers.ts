/**
 * Integration Test Helpers
 *
 * テスト用のコンテキスト作成・クリーンアップ
 */

import { prisma } from '../server/utils/prisma'
import { createSession, deleteSession } from '../server/utils/session'

export interface TestContext {
  org: {
    id: string
    name: string
  }
  user: {
    id: string
    email: string
    name: string | null
    role: string
    organizationId: string
  }
  sessionId: string
}

/**
 * テスト用組織・ユーザー・セッションを作成
 */
export async function createTestContext(orgSuffix: string): Promise<TestContext> {
  const timestamp = Date.now()
  const uniqueSuffix = `${orgSuffix}-${timestamp}`

  const org = await prisma.organization.create({
    data: {
      name: `Test Org ${uniqueSuffix}`
    }
  })

  const user = await prisma.user.create({
    data: {
      email: `test-${uniqueSuffix}@example.com`,
      name: `Test User ${uniqueSuffix}`,
      role: 'ADMIN',
      organizationId: org.id
    }
  })

  const sessionId = createSession({
    userId: user.id,
    organizationId: org.id,
    email: user.email,
    role: user.role
  })

  return {
    org: {
      id: org.id,
      name: org.name
    },
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId
    },
    sessionId
  }
}

/**
 * テスト用部門を作成
 */
export async function createTestDepartment(
  organizationId: string,
  name: string
): Promise<{ id: string; name: string; organizationId: string }> {
  const department = await prisma.department.create({
    data: {
      organizationId,
      name
    }
  })
  return {
    id: department.id,
    name: department.name,
    organizationId: department.organizationId
  }
}

/**
 * テスト用スケジュールを作成
 */
export async function createTestSchedule(
  organizationId: string,
  authorId: string,
  options?: {
    title?: string
    start?: Date
    end?: Date
  }
): Promise<{ id: string; title: string; organizationId: string }> {
  const now = new Date()
  const schedule = await prisma.schedule.create({
    data: {
      organizationId,
      authorId,
      title: options?.title || 'Test Schedule',
      start: options?.start || now,
      end: options?.end || new Date(now.getTime() + 60 * 60 * 1000) // 1 hour later
    }
  })
  return {
    id: schedule.id,
    title: schedule.title,
    organizationId: schedule.organizationId
  }
}

/**
 * テスト用デバイスを作成
 */
export async function createTestDevice(
  organizationId: string,
  options?: {
    name?: string
    kioskSecret?: string
  }
): Promise<{ id: string; name: string; kioskSecret: string; organizationId: string }> {
  const timestamp = Date.now()
  const device = await prisma.device.create({
    data: {
      organizationId,
      name: options?.name || `Test Device ${timestamp}`,
      kioskSecret: options?.kioskSecret || `test-secret-${timestamp}`
    }
  })
  return {
    id: device.id,
    name: device.name,
    kioskSecret: device.kioskSecret,
    organizationId: device.organizationId
  }
}

/**
 * テストデータクリーンアップ
 */
export async function cleanupTestData(orgId: string): Promise<void> {
  // 依存関係の順序でdeleteする必要がある
  await prisma.schedule.deleteMany({ where: { organizationId: orgId } })
  await prisma.device.deleteMany({ where: { organizationId: orgId } })
  await prisma.user.deleteMany({ where: { organizationId: orgId } })
  await prisma.department.deleteMany({ where: { organizationId: orgId } })
  await prisma.auditLog.deleteMany({ where: { organizationId: orgId } })
  await prisma.organization.delete({ where: { id: orgId } }).catch(() => {
    // 既に削除されている場合は無視
  })
}

/**
 * セッションをクリーンアップ
 */
export function cleanupSession(sessionId: string): void {
  deleteSession(sessionId)
}
