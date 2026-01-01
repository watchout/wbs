import { PrismaClient } from '@prisma/client'

/**
 * Prisma Client singleton
 *
 * NOTE:
 * - Nuxt dev のHMR/再起動で多重生成されるのを避けるため globalThis にキャッシュする
 * - スキーマ変更やマイグレーションはここでは行わない
 */
const globalForPrisma = globalThis as unknown as { __prisma?: PrismaClient }

export const prisma =
  globalForPrisma.__prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__prisma = prisma
}


