// server/utils/llm/tools.ts
// AIアシスタントが使用するツール定義と実行ロジック

import type { LlmToolDefinition } from './provider'
import { prisma } from '../prisma'

// ===== ツール定義 =====

export const ASSISTANT_TOOLS: LlmToolDefinition[] = [
  {
    name: 'search_schedules',
    description: '指定した条件でスケジュールを検索する。日付範囲、社員名、キーワードで絞り込み可能。',
    parameters: {
      type: 'object',
      properties: {
        startDate: { type: 'string', description: '検索開始日（YYYY-MM-DD形式）' },
        endDate: { type: 'string', description: '検索終了日（YYYY-MM-DD形式）' },
        userName: { type: 'string', description: '社員名（部分一致）' },
        keyword: { type: 'string', description: 'タイトルまたは説明のキーワード' },
      },
    },
  },
  {
    name: 'search_users',
    description: '社員情報を検索する。名前や部署名で絞り込み可能。',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: '社員名（部分一致）' },
        departmentName: { type: 'string', description: '部署名' },
      },
    },
  },
  // ===== 現場配置AIツール（SSOT_SITE_ALLOCATION §AI-TOOLS, Phase 1） =====
  {
    name: 'search_site_demand',
    description: '現場×期間の必要人員（需要）を取得する。Sprint 1 では需要データ未導入のため現在の配置数を返す。',
    parameters: {
      type: 'object',
      properties: {
        siteId: { type: 'string', description: '現場ID（省略時は全現場）' },
        startDate: { type: 'string', description: '検索開始日（YYYY-MM-DD形式）' },
        endDate: { type: 'string', description: '検索終了日（YYYY-MM-DD形式）' },
      },
      required: ['startDate', 'endDate'],
    },
  },
  {
    name: 'search_site_allocation',
    description: '現場×期間の現在の配置状況を取得する。',
    parameters: {
      type: 'object',
      properties: {
        startDate: { type: 'string', description: '検索開始日（YYYY-MM-DD形式）' },
        endDate: { type: 'string', description: '検索終了日（YYYY-MM-DD形式）' },
        siteId: { type: 'string', description: '現場ID（省略時は全現場）' },
      },
      required: ['startDate', 'endDate'],
    },
  },
  {
    name: 'search_shortages',
    description: '期間内に人員不足が発生している現場一覧を取得する。Sprint 1 では配置0人の現場を不足として返す。',
    parameters: {
      type: 'object',
      properties: {
        startDate: { type: 'string', description: '検索開始日（YYYY-MM-DD形式）' },
        endDate: { type: 'string', description: '検索終了日（YYYY-MM-DD形式）' },
      },
      required: ['startDate', 'endDate'],
    },
  },
  {
    name: 'search_available_workers',
    description: '指定日に配置可能な人員（スケジュール未登録または別現場への変更が可能な人員）を検索する。',
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string', description: '対象日（YYYY-MM-DD形式）' },
        siteId: { type: 'string', description: '現場ID（省略時はフィルタなし）' },
      },
      required: ['date'],
    },
  },
  {
    name: 'propose_allocation',
    description: '不足現場に対する候補人員を提案する。実際の配置変更は行わない。',
    parameters: {
      type: 'object',
      properties: {
        siteName: { type: 'string', description: '現場名' },
        date: { type: 'string', description: '対象日（YYYY-MM-DD形式）' },
        requiredCount: { type: 'string', description: '必要人数' },
      },
      required: ['siteName', 'date'],
    },
  },
  {
    name: 'preview_assignment',
    description: '配置変更のプレビューを生成する。実際の変更は行わない（read-only）。',
    parameters: {
      type: 'object',
      properties: {
        assignments: {
          type: 'string',
          description: 'JSON文字列。配置変更リスト: [{userId, siteName, date}]',
        },
      },
      required: ['assignments'],
    },
  },
]

// ===== ツール実行 =====

interface ToolResult {
  success: boolean
  data: unknown
  message: string
}

/**
 * ツール名と引数から実行結果を返す
 * organizationId でマルチテナントスコープを保証
 */
export async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  organizationId: string
): Promise<ToolResult> {
  switch (toolName) {
    case 'search_schedules':
      return executeSearchSchedules(args, organizationId)
    case 'search_users':
      return executeSearchUsers(args, organizationId)
    // 現場配置AIツール（Phase 1）
    case 'search_site_demand':
      return executeSearchSiteDemand(args, organizationId)
    case 'search_site_allocation':
      return executeSearchSiteAllocation(args, organizationId)
    case 'search_shortages':
      return executeSearchShortages(args, organizationId)
    case 'search_available_workers':
      return executeSearchAvailableWorkers(args, organizationId)
    case 'propose_allocation':
      return executeProposeAllocation(args, organizationId)
    case 'preview_assignment':
      return executePreviewAssignment(args, organizationId)
    default:
      return {
        success: false,
        data: null,
        message: `未知のツール: ${toolName}`,
      }
  }
}

async function executeSearchSchedules(
  args: Record<string, unknown>,
  organizationId: string
): Promise<ToolResult> {
  const startDate = typeof args.startDate === 'string' ? args.startDate : undefined
  const endDate = typeof args.endDate === 'string' ? args.endDate : undefined
  const userName = typeof args.userName === 'string' ? args.userName : undefined
  const keyword = typeof args.keyword === 'string' ? args.keyword : undefined

  const where: Record<string, unknown> = {
    organizationId,
    deletedAt: null,
  }

  if (startDate || endDate) {
    const dateFilter: Record<string, Date> = {}
    if (startDate) dateFilter.gte = new Date(startDate)
    if (endDate) dateFilter.lte = new Date(endDate)
    where.start = dateFilter
  }

  if (keyword) {
    where.OR = [
      { title: { contains: keyword, mode: 'insensitive' } },
      { description: { contains: keyword, mode: 'insensitive' } },
    ]
  }

  if (userName) {
    where.author = {
      name: { contains: userName, mode: 'insensitive' },
    }
  }

  const schedules = await prisma.schedule.findMany({
    where,
    include: {
      author: { select: { name: true } },
    },
    take: 20,
    orderBy: { start: 'asc' },
  })

  const results = schedules.map((s) => ({
    id: s.id,
    title: s.title,
    start: s.start,
    end: s.end,
    userName: s.author?.name ?? '未割当',
    description: s.description ?? '',
  }))

  return {
    success: true,
    data: results,
    message: `${results.length}件のスケジュールが見つかりました`,
  }
}

async function executeSearchUsers(
  args: Record<string, unknown>,
  organizationId: string
): Promise<ToolResult> {
  const name = typeof args.name === 'string' ? args.name : undefined
  const departmentName = typeof args.departmentName === 'string' ? args.departmentName : undefined

  const where: Record<string, unknown> = {
    organizationId,
  }

  if (name) {
    where.name = { contains: name, mode: 'insensitive' }
  }

  if (departmentName) {
    where.department = {
      name: { contains: departmentName, mode: 'insensitive' },
    }
  }

  const users = await prisma.user.findMany({
    where,
    select: {
      name: true,
      role: true,
      department: { select: { name: true } },
    },
    take: 20,
    orderBy: { name: 'asc' },
  })

  const results = users.map((u) => ({
    name: u.name,
    role: u.role,
    department: u.department?.name ?? '未所属',
  }))

  return {
    success: true,
    data: results,
    message: `${results.length}名の社員が見つかりました`,
  }
}

// ===== 現場配置AIツール ハンドラー（Sprint 2: Site/SiteDemandテーブル活用） =====

/** Site/SiteDemandテーブルから現場×日の配置・需要データを取得 */
async function getSiteAllocationData(
  startDate: string,
  endDate: string,
  organizationId: string,
  siteId?: string
) {
  const siteWhere: Record<string, unknown> = {
    organizationId,
    status: 'ACTIVE',
    deletedAt: null,
  }
  if (siteId) siteWhere.id = siteId

  const sites = await prisma.site.findMany({
    where: siteWhere,
    select: { id: true, name: true },
  })

  const siteIds = sites.map((s) => s.id)
  const siteNameMap = new Map(sites.map((s) => [s.id, s.name]))

  // 配置（Schedule）を取得
  const schedules = await prisma.schedule.findMany({
    where: {
      organizationId,
      deletedAt: null,
      siteId: { in: siteIds },
      start: { gte: new Date(startDate) },
      end: { lte: new Date(`${endDate}T23:59:59`) },
    },
    include: {
      author: { select: { id: true, name: true } },
    },
    orderBy: { start: 'asc' },
  })

  // 需要（SiteDemand）を取得
  const demands = await prisma.siteDemand.findMany({
    where: {
      organizationId,
      siteId: { in: siteIds },
      date: { gte: new Date(startDate), lte: new Date(endDate) },
    },
  })

  return { sites, siteNameMap, schedules, demands }
}

async function executeSearchSiteDemand(
  args: Record<string, unknown>,
  organizationId: string
): Promise<ToolResult> {
  const startDate = typeof args.startDate === 'string' ? args.startDate : ''
  const endDate = typeof args.endDate === 'string' ? args.endDate : ''
  const siteId = typeof args.siteId === 'string' ? args.siteId : undefined

  if (!startDate || !endDate) {
    return { success: false, data: null, message: 'startDate と endDate は必須です' }
  }

  const { sites, schedules, demands } = await getSiteAllocationData(startDate, endDate, organizationId, siteId)

  // 現場ごとに集計
  const results = sites.map((site) => {
    const siteSchedules = schedules.filter((s) => s.siteId === site.id)
    const siteDemands = demands.filter((d) => d.siteId === site.id)
    const totalRequired = siteDemands.reduce((sum, d) => sum + d.requiredCount, 0)
    const totalAllocated = siteSchedules.length

    return {
      siteName: site.name,
      siteId: site.id,
      allocated: totalAllocated,
      required: totalRequired,
      shortage: totalRequired - totalAllocated,
    }
  })

  return {
    success: true,
    data: results,
    message: `${results.length}件の現場の需要・配置状況`,
  }
}

async function executeSearchSiteAllocation(
  args: Record<string, unknown>,
  organizationId: string
): Promise<ToolResult> {
  const startDate = typeof args.startDate === 'string' ? args.startDate : ''
  const endDate = typeof args.endDate === 'string' ? args.endDate : ''
  const siteId = typeof args.siteId === 'string' ? args.siteId : undefined

  if (!startDate || !endDate) {
    return { success: false, data: null, message: 'startDate と endDate は必須です' }
  }

  const { sites, schedules } = await getSiteAllocationData(startDate, endDate, organizationId, siteId)

  const results = sites
    .map((site) => {
      const siteSchedules = schedules.filter((s) => s.siteId === site.id)
      const byDate: Record<string, string[]> = {}
      for (const s of siteSchedules) {
        const dateStr = s.start.toISOString().split('T')[0]!
        if (!byDate[dateStr]) byDate[dateStr] = []
        byDate[dateStr].push(s.author?.name ?? '不明')
      }
      return {
        siteName: site.name,
        siteId: site.id,
        days: Object.entries(byDate).map(([date, names]) => ({
          date,
          allocated: names.length,
          workers: names,
        })),
      }
    })
    .filter((r) => r.days.length > 0)

  return {
    success: true,
    data: results,
    message: `${results.length}件の現場の配置状況`,
  }
}

async function executeSearchShortages(
  args: Record<string, unknown>,
  organizationId: string
): Promise<ToolResult> {
  const startDate = typeof args.startDate === 'string' ? args.startDate : ''
  const endDate = typeof args.endDate === 'string' ? args.endDate : ''

  if (!startDate || !endDate) {
    return { success: false, data: null, message: 'startDate と endDate は必須です' }
  }

  const { sites, siteNameMap, schedules, demands } = await getSiteAllocationData(startDate, endDate, organizationId)

  // SiteDemand ベースで不足を検出
  const shortages: Array<{
    siteName: string
    siteId: string
    date: string
    tradeType: string
    required: number
    allocated: number
    shortage: number
  }> = []

  for (const demand of demands) {
    const dateStr = demand.date.toISOString().split('T')[0]!
    // 同じ現場・同日の配置数をカウント
    const allocated = schedules.filter(
      (s) => s.siteId === demand.siteId && s.start.toISOString().split('T')[0] === dateStr
    ).length
    const shortage = demand.requiredCount - allocated

    if (shortage > 0) {
      shortages.push({
        siteName: siteNameMap.get(demand.siteId) ?? '不明',
        siteId: demand.siteId,
        date: dateStr,
        tradeType: demand.tradeType,
        required: demand.requiredCount,
        allocated,
        shortage,
      })
    }
  }

  // 不足数の大きい順にソート
  shortages.sort((a, b) => b.shortage - a.shortage)

  return {
    success: true,
    data: shortages,
    message: shortages.length > 0
      ? `${shortages.length}件の人員不足が見つかりました`
      : '指定期間に人員不足は検出されませんでした',
  }
}

async function executeSearchAvailableWorkers(
  args: Record<string, unknown>,
  organizationId: string
): Promise<ToolResult> {
  const date = typeof args.date === 'string' ? args.date : ''

  if (!date) {
    return { success: false, data: null, message: 'date は必須です' }
  }

  const dayStart = new Date(`${date}T00:00:00`)
  const dayEnd = new Date(`${date}T23:59:59`)

  // その日にスケジュールがある人を取得
  const busySchedules = await prisma.schedule.findMany({
    where: {
      organizationId,
      deletedAt: null,
      start: { gte: dayStart, lte: dayEnd },
    },
    select: { authorId: true },
  })

  const busyUserIds = new Set(busySchedules.map((s) => s.authorId).filter(Boolean))

  // 全社員から busy を除く
  const availableUsers = await prisma.user.findMany({
    where: {
      organizationId,
      id: { notIn: [...busyUserIds] as string[] },
    },
    select: {
      id: true,
      name: true,
      department: { select: { name: true } },
    },
    orderBy: { name: 'asc' },
    take: 30,
  })

  const results = availableUsers.map((u) => ({
    userId: u.id,
    name: u.name,
    department: u.department?.name ?? '未所属',
    status: 'available',
  }))

  return {
    success: true,
    data: results,
    message: `${date} に配置可能な人員: ${results.length}名`,
  }
}

async function executeProposeAllocation(
  args: Record<string, unknown>,
  organizationId: string
): Promise<ToolResult> {
  const siteName = typeof args.siteName === 'string' ? args.siteName : ''
  const date = typeof args.date === 'string' ? args.date : ''
  const requiredCount = typeof args.requiredCount === 'string' ? parseInt(args.requiredCount, 10) : 1

  if (!siteName || !date) {
    return { success: false, data: null, message: 'siteName と date は必須です' }
  }

  // 利用可能な人員を取得して提案する（実際の配置は行わない）
  const availableResult = await executeSearchAvailableWorkers({ date }, organizationId)

  if (!availableResult.success) {
    return availableResult
  }

  const available = availableResult.data as Array<{ userId: string; name: string; department: string }>
  const candidates = available.slice(0, Math.max(requiredCount * 2, 3)) // 候補は必要数の2倍（最低3名）

  return {
    success: true,
    data: {
      siteName,
      date,
      requiredCount,
      candidates,
      note: 'これは提案です。実際の配置変更はUIから確定操作が必要です。',
    },
    message: `「${siteName}」${date} の配置候補: ${candidates.length}名を提案します`,
  }
}

async function executePreviewAssignment(
  args: Record<string, unknown>,
  organizationId: string
): Promise<ToolResult> {
  const assignmentsRaw = typeof args.assignments === 'string' ? args.assignments : '[]'

  let assignments: Array<{ userId: string; siteName: string; date: string }> = []
  try {
    assignments = JSON.parse(assignmentsRaw)
  } catch {
    return { success: false, data: null, message: 'assignments の JSON パースに失敗しました' }
  }

  if (!Array.isArray(assignments) || assignments.length === 0) {
    return { success: false, data: null, message: 'assignments は空でない配列を指定してください' }
  }

  // ユーザー名を解決（read-only、DB変更なし）
  const userIds = assignments.map((a) => a.userId).filter(Boolean)
  const users = await prisma.user.findMany({
    where: { organizationId, id: { in: userIds } },
    select: { id: true, name: true },
  })
  const userMap = new Map(users.map((u) => [u.id, u.name]))

  const preview = assignments.map((a) => ({
    userId: a.userId,
    userName: userMap.get(a.userId) ?? '不明',
    siteName: a.siteName,
    date: a.date,
    action: 'assign', // read-onlyプレビュー
  }))

  return {
    success: true,
    data: {
      preview,
      count: preview.length,
      note: 'これはプレビューです。実際の変更は行われていません。確定するにはUIの「この提案を確定する」ボタンを使用してください。',
    },
    message: `${preview.length}件の配置変更プレビューを生成しました`,
  }
}

// ===== システムプロンプト =====

export const BUSINESS_SYSTEM_PROMPT = `あなたは「ミエルボード」のAIアシスタントです。
建設・設備業の現場管理を支援するSaaSのサポートを行います。

できること:
- スケジュールの検索・確認
- 社員情報の検索
- 現場×期間の配置状況確認（search_site_allocation）
- 配置可能な人員の検索（search_available_workers）
- 人員不足現場の検出（search_shortages）
- 現場配置の提案（propose_allocation）
- 配置変更のプレビュー生成（preview_assignment）
- ミエルボードの使い方の案内
- 一般的な業務相談

できないこと:
- スケジュールの作成・変更・削除（配置確定はUIから操作）
- 外部サービスへのアクセス
- 個人情報の保存

回答ルール:
- 日本語で簡潔に回答
- 敬語を使用
- 不明な場合は「わかりません」と正直に伝える
- 現場配置に関する質問はツールを使用して情報を収集してから回答する
- 配置提案は必ずプレビューを生成し、確定操作はUIで行うよう案内する`

/** AIコマンドバー用のシステムプロンプト（Sprint 3） */
export const COMMAND_BAR_SYSTEM_PROMPT = `あなたは「ミエルボード」のAIコマンドバーアシスタントです。
ヘッダーのコマンドバーから呼び出され、現場配置に関する質問にすばやく回答します。

できること:
- 現場別照会（「品川に誰がいる？」）→ search_site_allocation
- 空き人員検索（「水曜空いてる人」）→ search_available_workers
- 不足現場一覧（「来週の不足現場」）→ search_shortages
- 必要人員照会（「品川の来週の必要人数」）→ search_site_demand
- 配置変更プレビュー（「田中を新宿に移して」）→ preview_assignment

書き込み系操作ルール:
- 配置変更は必ずプレビューを先に生成する
- プレビュー結果にはJSONデータを含め、UIが確定操作を表示できるようにする
- 配置変更プレビュー時は以下のJSON形式を返答に含めること:
  \`\`\`preview_assignment
  {"assignments": [{"userId": "...", "userName": "...", "siteName": "...", "date": "..."}]}
  \`\`\`

回答ルール:
- 日本語で簡潔に回答（コマンドバーなので短めに）
- 敬語を使用
- 不明確な指示は実行拒否し、候補を提示して確認を求める
- 今日の日付を基準に「来週」「今週」等を解釈する`

export const LP_SYSTEM_PROMPT = `あなたは「ミエルボード for 現場」の案内AIです。
製品の特徴、料金、導入について質問にお答えします。

回答ルール:
- 日本語で簡潔に回答
- 敬語を使用
- 料金の具体的な数字はプランページへ誘導
- 技術的な詳細は問い合わせフォームへ誘導
- 最大3文で回答`
