/**
 * 現場配置データ取得 Composable（Sprint 1）
 *
 * 現場ベースの週間配置サマリーを取得・管理する。
 * SSOT参照: SSOT_SITE_ALLOCATION.md §10.3
 */

import { ref, type Ref } from 'vue'

/** 配置者 */
export interface SiteWorker {
  userId: string
  name: string
  status: 'CONFIRMED'
}

/** 1日分の配置データ */
export interface SiteDayData {
  date: string
  dayKey: string
  allocated: number
  required: null       // Sprint 1: null
  gap: null            // Sprint 1: null
  workers: SiteWorker[]
}

/** 1現場分のデータ */
export interface SiteRow {
  siteId: null          // Sprint 1: null
  siteName: string
  days: SiteDayData[]
}

/** APIレスポンス */
interface SiteAllocationWeeklyResponse {
  success: boolean
  data: {
    weekStart: string
    weekEnd: string
    sites: SiteRow[]
    unassigned: SiteRow
    summary: {
      totalSites: number
      totalAllocated: number
    }
  }
  organizationId: string
}

export function useSiteAllocation() {
  const loading = ref(false)
  const error: Ref<string> = ref('')
  const sites: Ref<SiteRow[]> = ref([])
  const unassigned: Ref<SiteRow | null> = ref(null)
  const totalSites = ref(0)
  const totalAllocated = ref(0)

  /**
   * 現場別週間配置を取得
   */
  async function fetchSiteAllocationWeekly(params: {
    weekStart: string
    departmentId?: string
    sort?: 'name' | 'count'
  }): Promise<void> {
    loading.value = true
    error.value = ''

    try {
      const searchParams = new URLSearchParams({
        weekStart: params.weekStart,
      })
      if (params.departmentId) {
        searchParams.append('departmentId', params.departmentId)
      }
      if (params.sort) {
        searchParams.append('sort', params.sort)
      }

      const response = await $fetch<SiteAllocationWeeklyResponse>(
        `/api/site-allocation/weekly?${searchParams}`
      )

      if (response.success) {
        sites.value = response.data.sites
        unassigned.value = response.data.unassigned
        totalSites.value = response.data.summary.totalSites
        totalAllocated.value = response.data.summary.totalAllocated
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '現場配置データの取得に失敗しました'
      error.value = message
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    sites,
    unassigned,
    totalSites,
    totalAllocated,
    fetchSiteAllocationWeekly,
  }
}
