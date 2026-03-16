// server/utils/visionParser.test.ts
// Vision AI パーサーのテスト

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { VisionParser, type PlanningDocumentParseResult } from './visionParser'

// Anthropic クライアントのモック
const mockCreate = vi.fn()
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: vi.fn(() => ({
      messages: {
        create: mockCreate,
      },
    })),
  }
})

// Logger のモック
vi.mock('./logger', () => ({
  default: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

// Mock fs with default export
vi.mock('fs', async () => {
  return {
    default: {
      readFile: vi.fn((path, cb) => {
        cb(null, Buffer.from('mock-image-data'))
      }),
      writeFile: vi.fn((path, data, cb) => {
        cb(null)
      }),
      unlink: vi.fn((path, cb) => {
        cb(null)
      }),
    },
    readFile: vi.fn((path, cb) => {
      cb(null, Buffer.from('mock-image-data'))
    }),
    writeFile: vi.fn((path, data, cb) => {
      cb(null)
    }),
    unlink: vi.fn((path, cb) => {
      cb(null)
    }),
  }
})

describe('VisionParser', () => {
  let parser: VisionParser

  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = 'test-api-key'
    mockCreate.mockClear()
    parser = new VisionParser()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('parseImage', () => {
    it('should parse a planning document image and extract demands', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: `{
              "projectName": "外壁修繕工事",
              "duration": {
                "startDate": "2026-04-01",
                "endDate": "2026-06-30"
              },
              "demands": [
                {
                  "taskName": "足場組立",
                  "requiredCount": 5,
                  "priority": "HIGH",
                  "timeSlots": ["ALL_DAY"],
                  "notes": "安全管理員1名必須"
                },
                {
                  "taskName": "壁面清掃",
                  "requiredCount": 3,
                  "priority": "MEDIUM",
                  "timeSlots": ["AM", "PM"]
                },
                {
                  "taskName": "補修作業",
                  "requiredCount": 4,
                  "priority": "HIGH",
                  "timeSlots": ["ALL_DAY"]
                }
              ],
              "confidence": 0.92,
              "warnings": []
            }`,
          },
        ],
      }

      mockCreate.mockResolvedValueOnce(mockResponse)

      const result = await parser.parseImage('/path/to/image.jpg', false)

      expect(result.projectName).toBe('外壁修繕工事')
      expect(result.duration?.startDate).toBe('2026-04-01')
      expect(result.duration?.endDate).toBe('2026-06-30')
      expect(result.demands).toHaveLength(3)
      expect(result.confidence).toBe(0.92)

      expect(result.demands[0].taskName).toBe('足場組立')
      expect(result.demands[0].requiredCount).toBe(5)
      expect(result.demands[0].priority).toBe('HIGH')
      expect(result.demands[0].timeSlots).toContain('ALL_DAY')

      expect(mockCreate).toHaveBeenCalledTimes(1)
      const callArgs = mockCreate.mock.calls[0][0]
      expect(callArgs.model).toBe('claude-sonnet-4-20250514')
      expect(callArgs.max_tokens).toBe(2000)
      expect(callArgs.temperature).toBe(0.2)
    })

    it('should handle warnings in the response', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: `{
              "demands": [
                {
                  "taskName": "作業A",
                  "requiredCount": 2,
                  "priority": "MEDIUM",
                  "timeSlots": ["ALL_DAY"]
                }
              ],
              "confidence": 0.65,
              "warnings": ["画質が低いため数字の判読が不確実", "日付が不明瞭"]
            }`,
          },
        ],
      }

      mockCreate.mockResolvedValueOnce(mockResponse)

      const result = await parser.parseImage('/test.jpg', false)

      expect(result.warnings).toHaveLength(2)
      expect(result.warnings?.[0]).toContain('画質が低い')
      expect(result.confidence).toBe(0.65)
    })

    it('should throw error when API response has no valid JSON', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: 'Unable to parse the image. Please provide a clearer image.',
          },
        ],
      }

      mockCreate.mockResolvedValueOnce(mockResponse)

      await expect(
        parser.parseImage('/invalid.jpg', false)
      ).rejects.toThrow('Vision AI response did not contain valid JSON')
    })

    it('should validate parsed results', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: `{
              "demands": [
                {
                  "taskName": "作業",
                  "requiredCount": 2,
                  "priority": "INVALID",
                  "timeSlots": ["ALL_DAY"]
                }
              ],
              "confidence": 0.5
            }`,
          },
        ],
      }

      mockCreate.mockResolvedValueOnce(mockResponse)

      await expect(
        parser.parseImage('/test.jpg', false)
      ).rejects.toThrow('priority must be HIGH, MEDIUM, or LOW')
    })

    it('should validate confidence is between 0 and 1', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: `{
              "demands": [],
              "confidence": 1.5
            }`,
          },
        ],
      }

      mockCreate.mockResolvedValueOnce(mockResponse)

      await expect(
        parser.parseImage('/test.jpg', false)
      ).rejects.toThrow('confidence must be between 0 and 1')
    })

    it('should require valid demands array', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: `{
              "demands": "not an array",
              "confidence": 0.5
            }`,
          },
        ],
      }

      mockCreate.mockResolvedValueOnce(mockResponse)

      await expect(
        parser.parseImage('/test.jpg', false)
      ).rejects.toThrow('demands must be an array')
    })

    it('should extract JSON from complex responses', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: `Based on the planning document, here are the extracted demands:

{
  "projectName": "複合工事",
  "demands": [
    {
      "taskName": "測量",
      "requiredCount": 2,
      "priority": "HIGH",
      "timeSlots": ["AM"]
    }
  ],
  "confidence": 0.88
}

Please review the extracted data for accuracy.`,
          },
        ],
      }

      mockCreate.mockResolvedValueOnce(mockResponse)

      const result = await parser.parseImage('/test.jpg', false)

      expect(result.projectName).toBe('複合工事')
      expect(result.demands).toHaveLength(1)
      expect(result.confidence).toBe(0.88)
    })

    it('should handle multiple time slots', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: `{
              "demands": [
                {
                  "taskName": "夜間作業",
                  "requiredCount": 3,
                  "priority": "MEDIUM",
                  "timeSlots": ["PM", "NIGHT"],
                  "notes": "照明必須"
                }
              ],
              "confidence": 0.75
            }`,
          },
        ],
      }

      mockCreate.mockResolvedValueOnce(mockResponse)

      const result = await parser.parseImage('/test.jpg', false)

      expect(result.demands[0].timeSlots).toEqual(['PM', 'NIGHT'])
    })

    it('should handle missing optional fields', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: `{
              "demands": [
                {
                  "taskName": "基本作業",
                  "requiredCount": 1,
                  "priority": "LOW",
                  "timeSlots": ["ALL_DAY"]
                }
              ],
              "confidence": 0.8
            }`,
          },
        ],
      }

      mockCreate.mockResolvedValueOnce(mockResponse)

      const result = await parser.parseImage('/test.jpg', false)

      expect(result.projectName).toBeUndefined()
      expect(result.duration).toBeUndefined()
      expect(result.demands[0].notes).toBeUndefined()
      expect(result.warnings).toBeUndefined()
    })
  })

  describe('error handling', () => {
    it('should log and rethrow API errors', async () => {
      const apiError = new Error('API rate limit exceeded')
      mockCreate.mockRejectedValueOnce(apiError)

      await expect(
        parser.parseImage('/test.jpg', false)
      ).rejects.toThrow()
    })

    it('should validate required demand fields', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: `{
              "demands": [
                {
                  "taskName": "",
                  "requiredCount": 1,
                  "priority": "HIGH",
                  "timeSlots": ["ALL_DAY"]
                }
              ],
              "confidence": 0.5
            }`,
          },
        ],
      }

      mockCreate.mockResolvedValueOnce(mockResponse)

      await expect(
        parser.parseImage('/test.jpg', false)
      ).rejects.toThrow('taskName must be a non-empty string')
    })

    it('should validate requiredCount is non-negative', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: `{
              "demands": [
                {
                  "taskName": "作業",
                  "requiredCount": -1,
                  "priority": "HIGH",
                  "timeSlots": ["ALL_DAY"]
                }
              ],
              "confidence": 0.5
            }`,
          },
        ],
      }

      mockCreate.mockResolvedValueOnce(mockResponse)

      await expect(
        parser.parseImage('/test.jpg', false)
      ).rejects.toThrow('requiredCount must be a non-negative number')
    })
  })
})
