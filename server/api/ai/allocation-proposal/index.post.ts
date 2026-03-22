// server/api/ai/allocation-proposal/index.post.ts
// Sprint 5: AI配置提案 — 不足セルに対する候補人員提案（AC-S5-01〜03）

import { createError, readBody } from 'h3'
import { requireAuth } from '~/server/utils/authMiddleware'
import { prisma } from '~/server/utils/prisma'
import { useAiCredit } from '~/server/utils/aiCredits'
import { logger } from '~/server/utils/logger'

interface ProposalRequest {
  siteId: string
  date: string // YYYY-MM-DD
  tradeType?: string
}

interface CandidateScore {
  userId: string
  userName: string
  department: string
  score: number // 0-100
  reasons: string[]
  availability: 'free' | 'movable'
}

interface ProposalResponse {
  proposalId: string
  siteId: string
  siteName: string
  date: string
  tradeType: string
  required: number
  allocated: number
  shortage: number
  candidates: CandidateScore[]
}

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)

  // LEADER+ のみ（AC-S5 権限）
  if (auth.role === 'MEMBER') {
    throw createError({
      statusCode: 403,
      statusMessage: '配置提案にはリーダー以上の権限が必要です。',
    })
  }

  const body = await readBody<ProposalRequest>(event)

  if (!body.siteId || !body.date) {
    throw createError({
      statusCode: 400,
      statusMessage: 'siteId と date は必須です。',
    })
  }

  // 現場取得
  const site = await prisma.site.findUnique({
    where: { id: body.siteId },
    select: { id: true, name: true, organizationId: true },
  })

  if (!site || site.organizationId !== auth.organizationId) {
    throw createError({ statusCode: 404, statusMessage: '現場が見つかりません。' })
  }

  const targetDate = new Date(body.date)
  const dayStart = new Date(body.date + 'T00:00:00')
  const dayEnd = new Date(body.date + 'T23:59:59')

  // 需要取得
  const demandWhere: Record<string, unknown> = {
    organizationId: auth.organizationId,
    siteId: body.siteId,
    date: targetDate,
  }
  if (body.tradeType) demandWhere.tradeType = body.tradeType

  const demands = await prisma.siteDemand.findMany({ where: demandWhere })
  const totalRequired = demands.reduce((sum, d) => sum + d.requiredCount, 0)
  const tradeType = body.tradeType || demands[0]?.tradeType || '全般'

  // 現在の配置数（確定のみ）
  const currentAllocations = await prisma.schedule.findMany({
    where: {
      organizationId: auth.organizationId,
      siteId: body.siteId,
      deletedAt: null,
      isDraft: false,
      start: { gte: dayStart, lte: dayEnd },
    },
    select: { authorId: true },
  })
  const allocatedCount = currentAllocations.length
  const shortage = totalRequired - allocatedCount

  if (shortage <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'この現場・日付に人員不足はありません。',
    })
  }

  // 当日確定スケジュールのある人を取得（busy）
  const busySchedules = await prisma.schedule.findMany({
    where: {
      organizationId: auth.organizationId,
      deletedAt: null,
      isDraft: false,
      start: { gte: dayStart, lte: dayEnd },
    },
    select: { authorId: true, siteId: true },
  })

  const busyUserIds = new Set(
    busySchedules.map((s) => s.authorId).filter(Boolean)
  )
  const alreadyOnSite = new Set(
    currentAllocations.map((s) => s.authorId).filter(Boolean)
  )

  // 全社員取得
  const allUsers = await prisma.user.findMany({
    where: {
      organizationId: auth.organizationId,
      role: { not: 'DEVICE' },
    },
    select: {
      id: true,
      name: true,
      department: { select: { name: true } },
    },
  })

  // 前日・翌日の配置（連続性スコア用）
  const prevDayStr = new Date(targetDate.getTime() - 86400000).toISOString().split('T')[0]!
  const nextDayStr = new Date(targetDate.getTime() + 86400000).toISOString().split('T')[0]!

  const adjacentSchedules = await prisma.schedule.findMany({
    where: {
      organizationId: auth.organizationId,
      siteId: body.siteId,
      deletedAt: null,
      OR: [
        { start: { gte: new Date(prevDayStr + 'T00:00:00'), lte: new Date(prevDayStr + 'T23:59:59') } },
        { start: { gte: new Date(nextDayStr + 'T00:00:00'), lte: new Date(nextDayStr + 'T23:59:59') } },
      ],
    },
    select: { authorId: true },
  })
  const adjacentUserIds = new Set(adjacentSchedules.map((s) => s.authorId).filter(Boolean))

  // 候補者スコアリング
  const candidates: CandidateScore[] = []

  for (const user of allUsers) {
    if (alreadyOnSite.has(user.id)) continue

    const reasons: string[] = []
    let score = 0

    if (!busyUserIds.has(user.id)) {
      score += 50
      reasons.push('当日空き')
    } else {
      score += 10
      reasons.push('他現場配置中（移動可能）')
    }

    if (adjacentUserIds.has(user.id)) {
      score += 25
      reasons.push('前日/翌日に同現場配置（連続性◎）')
    }

    if (user.department?.name) {
      score += 10
      reasons.push(`所属: ${user.department.name}`)
    }

    candidates.push({
      userId: user.id,
      userName: user.name ?? '名前未設定',
      department: user.department?.name ?? '未所属',
      score,
      reasons,
      availability: busyUserIds.has(user.id) ? 'movable' : 'free',
    })
  }

  // スコア降順ソート、上位を返す
  candidates.sort((a, b) => b.score - a.score)
  const topCandidates = candidates.slice(0, Math.max(shortage * 3, 5))

  const proposalId = `proposal_${Date.now()}_${Math.random().toString(36).substring(7)}`

  // クレジット消費
  await useAiCredit(
    auth.organizationId,
    `AI配置提案: ${site.name} ${body.date}`
  )

  logger.info('AI allocation proposal generated', {
    proposalId,
    siteId: body.siteId,
    date: body.date,
    shortage,
    candidateCount: topCandidates.length,
    userId: auth.userId,
  })

  const response: ProposalResponse = {
    proposalId,
    siteId: site.id,
    siteName: site.name,
    date: body.date,
    tradeType,
    required: totalRequired,
    allocated: allocatedCount,
    shortage,
    candidates: topCandidates,
  }

  return response
})
