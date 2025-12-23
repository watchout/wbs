/**
 * Prisma Client インスタンス
 * 
 * シングルトンパターンでPrisma Clientを管理
 * 開発時のホットリロードでの接続リーク防止
 */

import { PrismaClient } from '@prisma/client'

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined
}

// 開発環境ではグローバル変数にキャッシュしてホットリロード時の接続リークを防ぐ
export const prisma = globalThis.__prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'info', 'warn', 'error']
    : ['error']
})

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma
}

export default prisma



