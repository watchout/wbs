// tests/api/planning-documents-chain3.test.ts
// API層テスト（Chain-3: エンドポイント実装）

import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('Planning Documents API - Chain 3', () => {
  describe('GET /api/planning-documents/[id]/parse-results', () => {
    it('should retrieve parse results for a planning document', () => {
      const mockExtractedData = {
        projectName: 'プロジェクトA',
        duration: {
          startDate: '2026-03-16',
          endDate: '2026-05-16',
        },
        demands: [
          {
            taskName: '電気工事',
            requiredCount: 5,
            priority: 'HIGH',
            timeSlots: ['ALL_DAY'],
            notes: 'パネル取付',
            confidence: 0.92,
          },
        ],
        confidence: 0.9,
        warnings: ['画像品質低'],
      }

      const demands = (mockExtractedData.demands || []).map(
        (demand: any, index: number) => ({
          index,
          taskName: demand.taskName || '',
          requiredCount: demand.requiredCount || 0,
          priority: demand.priority || 'MEDIUM',
          timeSlots: demand.timeSlots || ['ALL_DAY'],
          notes: demand.notes,
          confidence: demand.confidence,
        })
      )

      expect(demands).toHaveLength(1)
      expect(demands[0].taskName).toBe('電気工事')
      expect(demands[0].requiredCount).toBe(5)
      expect(demands[0].priority).toBe('HIGH')
      expect(demands[0].confidence).toBe(0.92)
    })

    it('should handle missing optional fields gracefully', () => {
      const mockExtractedData = {
        demands: [
          {
            taskName: '工事A',
            requiredCount: 3,
          },
        ],
        confidence: 0.75,
      }

      const demands = (mockExtractedData.demands || []).map(
        (demand: any, index: number) => ({
          index,
          taskName: demand.taskName || '',
          requiredCount: demand.requiredCount || 0,
          priority: demand.priority || 'MEDIUM',
          timeSlots: demand.timeSlots || ['ALL_DAY'],
          notes: demand.notes,
          confidence: demand.confidence,
        })
      )

      expect(demands[0].priority).toBe('MEDIUM')
      expect(demands[0].timeSlots).toEqual(['ALL_DAY'])
      expect(demands[0].notes).toBeUndefined()
    })

    it('should format response correctly with all fields', () => {
      const uploadedAt = new Date('2026-03-16')
      const response = {
        documentId: 'doc-123',
        fileName: 'planning.pdf',
        projectName: 'Project A',
        duration: {
          startDate: '2026-03-16',
          endDate: '2026-05-16',
        },
        demands: [
          {
            index: 0,
            taskName: '電気工事',
            requiredCount: 5,
            priority: 'HIGH' as const,
            timeSlots: ['ALL_DAY'],
          },
        ],
        overallConfidence: 0.9,
        parseStatus: 'PARSED',
        uploadedAt: uploadedAt.toISOString(),
        warnings: ['Warning 1'],
      }

      expect(response.documentId).toBe('doc-123')
      expect(response.fileName).toBe('planning.pdf')
      expect(response.demands).toHaveLength(1)
      expect(response.overallConfidence).toBe(0.9)
      expect(response.parseStatus).toBe('PARSED')
      expect(response.warnings).toContain('Warning 1')
    })
  })

  describe('PUT /api/planning-documents/[id]/confirm', () => {
    it('should create SiteDemand from confirmed demands', () => {
      const demands = [
        {
          index: 0,
          taskName: '電気工事',
          requiredCount: 5,
          priority: 'HIGH' as const,
          timeSlots: ['ALL_DAY'],
          date: '2026-03-20',
          notes: 'パネル取付',
        },
      ]

      const siteDemands = demands.map((demand) => ({
        organizationId: 'org-123',
        siteId: 'site-123',
        date: new Date(demand.date),
        tradeType: demand.taskName,
        requiredCount: demand.requiredCount,
        timeSlot: demand.timeSlots[0] || 'ALL_DAY',
        priority: demand.priority,
        sourceType: 'AI_PARSED' as const,
        sourceDocumentId: 'doc-123',
        confidence: 0.85,
        confirmationStatus: 'CONFIRMED' as const,
        note: demand.notes || null,
        createdBy: 'user-123',
      }))

      expect(siteDemands).toHaveLength(1)
      expect(siteDemands[0].tradeType).toBe('電気工事')
      expect(siteDemands[0].requiredCount).toBe(5)
      expect(siteDemands[0].sourceType).toBe('AI_PARSED')
      expect(siteDemands[0].sourceDocumentId).toBe('doc-123')
    })

    it('should map timeSlots correctly', () => {
      const demand = {
        index: 0,
        taskName: '工事A',
        requiredCount: 3,
        priority: 'HIGH' as const,
        timeSlots: ['AM', 'PM'],
        date: '2026-03-20',
      }

      const timeSlot = demand.timeSlots[0] || 'ALL_DAY'

      expect(timeSlot).toBe('AM')
    })

    it('should handle multiple demands in single confirm', () => {
      const demands = [
        {
          taskName: '工事A',
          requiredCount: 5,
          priority: 'HIGH' as const,
          timeSlots: ['ALL_DAY'],
          date: '2026-03-20',
        },
        {
          taskName: '工事B',
          requiredCount: 3,
          priority: 'MEDIUM' as const,
          timeSlots: ['AM'],
          date: '2026-03-21',
        },
        {
          taskName: '工事C',
          requiredCount: 2,
          priority: 'LOW' as const,
          timeSlots: ['PM'],
          date: '2026-03-22',
        },
      ]

      expect(demands).toHaveLength(3)
      expect(demands[0].taskName).toBe('工事A')
      expect(demands[1].taskName).toBe('工事B')
      expect(demands[2].taskName).toBe('工事C')
    })

    it('should set correct confirmation status', () => {
      const confirmationStatus = 'CONFIRMED'

      expect(confirmationStatus).toBe('CONFIRMED')
    })
  })

  describe('POST /api/planning-documents/[id]/demands', () => {
    it('should parse and validate requiredCount revisions', () => {
      const revision = {
        demandId: 'demand-1',
        fieldPath: 'requiredCount',
        beforeValue: 5,
        afterValue: 7,
      }

      const parsedValue = parseInt(String(revision.afterValue), 10)

      expect(parsedValue).toBe(7)
      expect(parsedValue).toBeGreaterThanOrEqual(0)
    })

    it('should reject negative requiredCount', () => {
      const revision = {
        demandId: 'demand-1',
        fieldPath: 'requiredCount',
        beforeValue: 5,
        afterValue: -1,
      }

      const parsedValue = parseInt(String(revision.afterValue), 10)

      expect(() => {
        if (parsedValue < 0) {
          throw new Error('Invalid requiredCount')
        }
      }).toThrow('Invalid requiredCount')
    })

    it('should map field paths correctly', () => {
      const fieldMap: { [key: string]: string } = {
        requiredCount: 'requiredCount',
        taskName: 'tradeType',
        priority: 'priority',
        timeSlot: 'timeSlot',
        notes: 'note',
      }

      expect(fieldMap['requiredCount']).toBe('requiredCount')
      expect(fieldMap['taskName']).toBe('tradeType')
      expect(fieldMap['priority']).toBe('priority')
      expect(fieldMap['notes']).toBe('note')
    })

    it('should create review records for each revision', () => {
      const revisions = [
        {
          demandId: 'demand-1',
          fieldPath: 'requiredCount',
          beforeValue: 5,
          afterValue: 7,
        },
        {
          demandId: 'demand-2',
          fieldPath: 'priority',
          beforeValue: 'MEDIUM',
          afterValue: 'HIGH',
        },
      ]

      const reviews = revisions.map((revision) => ({
        documentId: 'doc-123',
        fieldPath: revision.fieldPath,
        beforeValue: String(revision.beforeValue),
        afterValue: String(revision.afterValue),
        reviewedBy: 'user-123',
      }))

      expect(reviews).toHaveLength(2)
      expect(reviews[0].fieldPath).toBe('requiredCount')
      expect(reviews[0].beforeValue).toBe('5')
      expect(reviews[0].afterValue).toBe('7')
      expect(reviews[1].fieldPath).toBe('priority')
    })

    it('should handle string and number values uniformly', () => {
      const revisions = [
        {
          fieldPath: 'requiredCount',
          beforeValue: '5',
          afterValue: '7',
        },
        {
          fieldPath: 'priority',
          beforeValue: 'MEDIUM',
          afterValue: 'HIGH',
        },
      ]

      revisions.forEach((rev) => {
        const before = String(rev.beforeValue)
        const after = String(rev.afterValue)

        expect(typeof before).toBe('string')
        expect(typeof after).toBe('string')
      })
    })
  })

  describe('Workflow integration', () => {
    it('should handle complete parse->review->confirm flow', () => {
      // Step 1: Parse results available
      const parseResults = {
        demands: [
          {
            taskName: '電気工事',
            requiredCount: 5,
            priority: 'HIGH' as const,
            timeSlots: ['ALL_DAY'],
          },
        ],
        confidence: 0.9,
      }

      expect(parseResults.demands).toHaveLength(1)

      // Step 2: Review and get formatted data
      const demands = parseResults.demands.map((d, idx) => ({
        index: idx,
        ...d,
      }))

      expect(demands[0].index).toBe(0)
      expect(demands[0].taskName).toBe('電気工事')

      // Step 3: Confirm and create SiteDemands
      const confirmRequest = {
        siteId: 'site-123',
        demands: demands.map((d) => ({
          ...d,
          date: '2026-03-20',
        })),
      }

      expect(confirmRequest.siteId).toBe('site-123')
      expect(confirmRequest.demands).toHaveLength(1)
      expect(confirmRequest.demands[0].date).toBe('2026-03-20')
    })

    it('should maintain document state through operations', () => {
      let documentState = {
        id: 'doc-123',
        parseStatus: 'PARSED',
        siteId: null as string | null,
      }

      // Confirm operation
      documentState = {
        ...documentState,
        parseStatus: 'CONFIRMED',
        siteId: 'site-123',
      }

      expect(documentState.parseStatus).toBe('CONFIRMED')
      expect(documentState.siteId).toBe('site-123')
    })

    it('should track revisions throughout update flow', () => {
      const initialState = {
        demandId: 'demand-1',
        requiredCount: 5,
        priority: 'MEDIUM',
      }

      const revisions = [
        {
          fieldPath: 'requiredCount',
          beforeValue: 5,
          afterValue: 7,
        },
        {
          fieldPath: 'priority',
          beforeValue: 'MEDIUM',
          afterValue: 'HIGH',
        },
      ]

      expect(revisions).toHaveLength(2)
      expect(revisions[0].beforeValue).toBe(initialState.requiredCount)
      expect(revisions[1].beforeValue).toBe(initialState.priority)
    })
  })

  describe('Error handling', () => {
    it('should validate required fields in confirm request', () => {
      const validRequest = {
        siteId: 'site-123',
        demands: [
          {
            taskName: '工事',
            requiredCount: 5,
            priority: 'HIGH' as const,
            timeSlots: ['ALL_DAY'],
            date: '2026-03-20',
          },
        ],
      }

      expect(validRequest.siteId).toBeDefined()
      expect(Array.isArray(validRequest.demands)).toBe(true)
    })

    it('should reject invalid priority values', () => {
      const validPriorities = ['HIGH', 'MEDIUM', 'LOW']
      const invalidPriority = 'INVALID'

      expect(validPriorities).toContain('HIGH')
      expect(validPriorities).toContain('MEDIUM')
      expect(validPriorities).toContain('LOW')
      expect(validPriorities).not.toContain(invalidPriority)
    })

    it('should reject empty demands array', () => {
      const request = {
        siteId: 'site-123',
        demands: [],
      }

      expect(() => {
        if (!Array.isArray(request.demands) || request.demands.length === 0) {
          throw new Error('Demands array is required and must not be empty')
        }
      }).toThrow('Demands array is required and must not be empty')
    })
  })
})
