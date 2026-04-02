/**
 * Database test helpers with optimizations
 * - Reuses prisma instance across tests
 * - Batches database operations
 * - Uses transactions where possible
 */

import { PrismaClient } from '@prisma/client'

// Singleton instance
let prismaInstance: PrismaClient | null = null

/**
 * Get or create prisma instance
 * Reusing the same instance avoids connection overhead per test
 */
export function getPrisma(): PrismaClient {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient({
      // Optimization: disable logging in tests
      log: process.env.DEBUG_PRISMA ? ['query', 'warn', 'error'] : [],
    })
  }
  return prismaInstance
}

/**
 * Reset database for a test
 * Uses transactions for faster cleanup
 */
export async function resetDatabase() {
  const prisma = getPrisma()
  
  try {
    // Use transaction for faster cleanup
    await prisma.$transaction(async (tx) => {
      // Clear tables in dependency order (reverse FK order)
      await tx.auditLog.deleteMany({})
      await tx.calendarWebhookChannel.deleteMany({})
      await tx.userCalendarConnection.deleteMany({})
      await tx.schedule.deleteMany({})
      await tx.sessionOtp.deleteMany({})
      await tx.session.deleteMany({})
      await tx.aiCreditHistory.deleteMany({})
      await tx.aiCreditBalance.deleteMany({})
      await tx.user.deleteMany({})
      await tx.department.deleteMany({})
      await tx.llmSetting.deleteMany({})
      await tx.organization.deleteMany({})
    })
  } catch (error) {
    console.warn('Warning: Could not fully reset database:', error)
  }
}

/**
 * Close database connection
 * Call in afterAll hook
 */
export async function closePrisma() {
  if (prismaInstance) {
    await prismaInstance.$disconnect()
    prismaInstance = null
  }
}

/**
 * Create test organization
 * Cached to avoid recreation
 */
const orgCache = new Map<string, any>()

export async function createTestOrganization(slug: string = 'test-org') {
  if (orgCache.has(slug)) {
    return orgCache.get(slug)!
  }

  const prisma = getPrisma()
  const org = await prisma.organization.upsert({
    where: { slug },
    update: {},
    create: {
      name: `Test Org ${slug}`,
      slug,
    },
  })

  orgCache.set(slug, org)
  return org
}

/**
 * Clear org cache between test files if needed
 */
export function clearOrgCache() {
  orgCache.clear()
}
