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

// ===== システムプロンプト =====

export const BUSINESS_SYSTEM_PROMPT = `あなたは「ミエルボード」のAIアシスタントです。
建設・設備業の現場管理を支援するSaaSのサポートを行います。

できること:
- スケジュールの検索・確認
- 社員情報の検索
- ミエルボードの使い方の案内
- 一般的な業務相談

できないこと:
- スケジュールの作成・変更・削除（今後対応予定）
- 外部サービスへのアクセス
- 個人情報の保存

回答ルール:
- 日本語で簡潔に回答
- 敬語を使用
- 不明な場合は「わかりません」と正直に伝える
- スケジュールや社員の情報が必要な場合はツールを使用する`

export const LP_SYSTEM_PROMPT = `あなたは「ミエルボード for 現場」の案内AIです。
製品の特徴、料金、導入について質問にお答えします。

回答ルール:
- 日本語で簡潔に回答
- 敬語を使用
- 料金の具体的な数字はプランページへ誘導
- 技術的な詳細は問い合わせフォームへ誘導
- 最大3文で回答`
