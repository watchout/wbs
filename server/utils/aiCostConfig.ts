/**
 * AI機能のコストテーブル方式
 * SSOT_PRICING.md v2.0 Section 2-5 準拠
 *
 * 各AI機能の原価を定義し、環境変数でオーバーライド可能
 * 目標粗利率: 85%
 */

// ================================================================
// AI機能の種別
// ================================================================

export type AiFeatureType =
  | 'voice_input'   // AI音声入力
  | 'text_parse'    // AI自然文入力
  | 'schedule_ai'   // AI日程調整（消費なし）
  | 'summary'       // AI予定要約
  | 'consult'       // AI現場相談

// ================================================================
// デフォルト原価（円）
// ================================================================

const DEFAULT_COSTS: Record<AiFeatureType, number> = {
  voice_input: 0.5,   // Whisper API + GPT-4o mini
  text_parse: 0.1,    // GPT-4o mini のみ
  schedule_ai: 0.0,   // DB検索のみ、LLM不使用
  summary: 0.3,       // GPT-4o mini
  consult: 1.0,       // Claude Haiku or GPT-4o mini
}

// ================================================================
// クレジット消費数
// ================================================================

const CREDIT_CONSUMPTION: Record<AiFeatureType, number> = {
  voice_input: 1,
  text_parse: 1,
  schedule_ai: 0,  // 消費なし
  summary: 1,
  consult: 1,
}

// ================================================================
// 環境変数キーのマッピング
// ================================================================

const ENV_KEYS: Record<AiFeatureType, string> = {
  voice_input: 'AI_COST_VOICE_INPUT',
  text_parse: 'AI_COST_TEXT_PARSE',
  schedule_ai: 'AI_COST_SCHEDULE_AI',
  summary: 'AI_COST_SUMMARY',
  consult: 'AI_COST_CONSULT',
}

// ================================================================
// コスト設定取得
// ================================================================

export interface AiCostConfig {
  feature: AiFeatureType
  cost: number
  credits: number
  targetMargin: number
}

/**
 * 全AI機能のコスト設定を取得
 */
export function getAiCostConfig(): Record<AiFeatureType, AiCostConfig> {
  const config: Partial<Record<AiFeatureType, AiCostConfig>> = {}

  for (const feature of Object.keys(DEFAULT_COSTS) as AiFeatureType[]) {
    const envKey = ENV_KEYS[feature]
    const envValue = process.env[envKey]
    const cost = envValue ? parseFloat(envValue) : DEFAULT_COSTS[feature]

    config[feature] = {
      feature,
      cost,
      credits: CREDIT_CONSUMPTION[feature],
      targetMargin: 0.85, // 85%
    }
  }

  return config as Record<AiFeatureType, AiCostConfig>
}

/**
 * 特定機能のコストを取得
 */
export function getFeatureCost(feature: AiFeatureType): number {
  const envKey = ENV_KEYS[feature]
  const envValue = process.env[envKey]
  return envValue ? parseFloat(envValue) : DEFAULT_COSTS[feature]
}

/**
 * 特定機能がクレジットを消費するかどうか
 */
export function doesConsumeCredit(feature: AiFeatureType): boolean {
  return CREDIT_CONSUMPTION[feature] > 0
}

/**
 * 特定機能のクレジット消費数を取得
 */
export function getCreditsToConsume(feature: AiFeatureType): number {
  return CREDIT_CONSUMPTION[feature]
}

// ================================================================
// ユーティリティ
// ================================================================

/**
 * 機能名からAiFeatureTypeに変換
 */
export function toAiFeatureType(name: string): AiFeatureType | null {
  const validTypes: AiFeatureType[] = [
    'voice_input',
    'text_parse',
    'schedule_ai',
    'summary',
    'consult',
  ]
  return validTypes.includes(name as AiFeatureType)
    ? (name as AiFeatureType)
    : null
}

/**
 * 月間のAI利用コスト概算を計算
 */
export function estimateMonthlyAiCost(
  usageByFeature: Partial<Record<AiFeatureType, number>>
): number {
  let totalCost = 0
  for (const [feature, count] of Object.entries(usageByFeature)) {
    const featureType = toAiFeatureType(feature)
    if (featureType && count) {
      totalCost += getFeatureCost(featureType) * count
    }
  }
  return totalCost
}
