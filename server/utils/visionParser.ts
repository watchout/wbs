// server/utils/visionParser.ts
// Vision AI パーサー - 工程表画像のAI読み取り

import fs from 'fs'
import path from 'path'
import Anthropic from '@anthropic-ai/sdk'
import logger from './logger'

/**
 * 工程表から抽出された需要情報
 */
export interface ExtractedDemand {
  taskName: string // 作業内容
  requiredCount: number // 必要人数
  priority: 'HIGH' | 'MEDIUM' | 'LOW' // 優先度
  timeSlots: Array<'ALL_DAY' | 'AM' | 'PM' | 'NIGHT'> // 必要な時間帯
  notes?: string // 特記事項
}

/**
 * 工程表解析結果
 */
export interface PlanningDocumentParseResult {
  projectName?: string // プロジェクト名
  duration?: {
    startDate?: string // ISO 8601形式
    endDate?: string // ISO 8601形式
  }
  demands: ExtractedDemand[]
  confidence: number // 0-1: 解析の信頼度
  warnings?: string[] // 注意情報
}

export class VisionParser {
  private client: Anthropic | null = null

  private getClient(): Anthropic {
    if (!this.client) {
      const apiKey = process.env.ANTHROPIC_API_KEY
      if (!apiKey) {
        throw new Error('ANTHROPIC_API_KEY is not set')
      }
      this.client = new Anthropic({ apiKey })
    }
    return this.client
  }

  /**
   * 工程表画像をAIで読み込んで需要情報を抽出
   *
   * @param imagePath - ローカルファイルパス or URL
   * @param isUrl - 引数がURLの場合 true
   * @returns 解析結果
   */
  async parseImage(
    imagePath: string,
    isUrl: boolean = false
  ): Promise<PlanningDocumentParseResult> {
    try {
      const imageBase64 = isUrl
        ? await this.fetchImageAsBase64(imagePath)
        : await this.readFileAsBase64(imagePath)

      const systemPrompt = `あなたは工程表（ガントチャート、スケジュール表）の画像をAIで読み取り、
必要な作業人数と内容を抽出するスペシャリストです。

日本語の工程表から以下の情報を JSON形式で正確に抽出してください：
1. プロジェクト名（あれば）
2. 工期（開始日、終了日）
3. 各作業の：
   - 作業内容（正確な日本語のまま）
   - 必要人数（明記されていなければ推測、保守的に）
   - 優先度（重要度が高い順に HIGH/MEDIUM/LOW）
   - 必要な時間帯（ALL_DAY/AM/PM/NIGHT）
4. 全体の信頼度（0-1）
5. 注意点や不確実な部分

**重要**：
- 数字の読み間違いに気をつけてください
- 不確実な場合は保守的に判断してください
- 提供する JSON は有効な形式にしてください`

      const userPrompt = `以下の工程表画像を読み取り、JSON形式で需要情報を抽出してください。

JSON形式は以下の通りです：
{
  "projectName": "プロジェクト名（あれば）",
  "duration": {
    "startDate": "YYYY-MM-DD",
    "endDate": "YYYY-MM-DD"
  },
  "demands": [
    {
      "taskName": "作業内容",
      "requiredCount": 3,
      "priority": "HIGH",
      "timeSlots": ["ALL_DAY"],
      "notes": "特記事項"
    }
  ],
  "confidence": 0.85,
  "warnings": ["注意点"]
}`

      const response = await this.getClient().messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        temperature: 0.2,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: imageBase64,
                },
              },
              {
                type: 'text',
                text: userPrompt,
              },
            ],
          },
        ],
      })

      // テキストレスポンスの抽出
      let responseText = ''
      for (const block of response.content) {
        if (block.type === 'text') {
          responseText += block.text
        }
      }

      // JSON抽出
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        logger.error('Failed to extract JSON from Vision AI response', {
          response: responseText,
        })
        throw new Error('Vision AI response did not contain valid JSON')
      }

      const result: PlanningDocumentParseResult = JSON.parse(jsonMatch[0])

      // バリデーション
      this.validateParseResult(result)

      return result
    } catch (error) {
      logger.error('Vision Parser error', {
        error: error instanceof Error ? error.message : String(error),
        imagePath,
      })
      throw error
    }
  }

  /**
   * ローカルファイルをBase64でエンコード
   */
  private async readFileAsBase64(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      fs.readFile(filePath, (err, data) => {
        if (err) reject(err)
        else resolve(data.toString('base64'))
      })
    })
  }

  /**
   * URLからの画像取得（Base64化）
   */
  private async fetchImageAsBase64(url: string): Promise<string> {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`)
    }
    const buffer = await response.arrayBuffer()
    return Buffer.from(buffer).toString('base64')
  }

  /**
   * 解析結果のバリデーション
   */
  private validateParseResult(result: PlanningDocumentParseResult): void {
    if (!result.demands || !Array.isArray(result.demands)) {
      throw new Error('Invalid parse result: demands must be an array')
    }

    for (const demand of result.demands) {
      if (!demand.taskName || typeof demand.taskName !== 'string') {
        throw new Error('Invalid demand: taskName must be a non-empty string')
      }
      if (
        typeof demand.requiredCount !== 'number' ||
        demand.requiredCount < 0
      ) {
        throw new Error('Invalid demand: requiredCount must be a non-negative number')
      }
      if (!['HIGH', 'MEDIUM', 'LOW'].includes(demand.priority)) {
        throw new Error('Invalid demand: priority must be HIGH, MEDIUM, or LOW')
      }
      if (!Array.isArray(demand.timeSlots)) {
        throw new Error('Invalid demand: timeSlots must be an array')
      }
    }

    if (
      typeof result.confidence !== 'number' ||
      result.confidence < 0 ||
      result.confidence > 1
    ) {
      throw new Error('Invalid parse result: confidence must be between 0 and 1')
    }
  }
}

export const visionParser = new VisionParser()
