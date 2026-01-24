import { prisma } from '~/server/utils/prisma'

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  checks: {
    database: boolean
    api: boolean
  }
}

/**
 * ヘルスチェックAPI
 * 認証不要 - システム状態の確認用
 */
export default defineEventHandler(async (): Promise<HealthResponse> => {
  const checks = {
    database: false,
    api: true
  }

  // データベース接続チェック（Prisma ORMを使用、生SQL禁止）
  try {
    // 単純なcount操作でDB接続を確認
    await prisma.organization.count()
    checks.database = true
  } catch {
    checks.database = false
  }

  // 全体ステータスの判定
  const allHealthy = Object.values(checks).every(Boolean)
  const anyHealthy = Object.values(checks).some(Boolean)

  let status: 'healthy' | 'degraded' | 'unhealthy'
  if (allHealthy) {
    status = 'healthy'
  } else if (anyHealthy) {
    status = 'degraded'
  } else {
    status = 'unhealthy'
  }

  return {
    status,
    timestamp: new Date().toISOString(),
    checks
  }
})
