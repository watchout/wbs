/**
 * GET /api/billing/launch-status
 *
 * ローンチ割引の残り枠情報を取得（認証不要の公開API）
 * LP表示用
 */

import { defineEventHandler } from 'h3'
import { getLaunchDiscountStatus } from '~/server/utils/cohort'

export default defineEventHandler(async () => {
  const status = await getLaunchDiscountStatus()

  return {
    isAvailable: status.isAvailable,
    currentPaidOrgs: status.currentPaidOrgs,
    nextCohort: status.nextCohort
      ? {
          cohortNumber: status.nextCohort.cohortNumber,
          discountPercent: status.nextCohort.discountPercent,
          remainingSlots: status.nextCohort.remainingSlots,
        }
      : null,
    cohorts: status.cohorts.map((c) => ({
      cohortNumber: c.cohortNumber,
      discountPercent: c.discountPercent,
      remainingSlots: c.remainingSlots,
      isFull: c.isFull,
    })),
  }
})
