<template>
  <div class="shortages-page">
    <div class="page-header">
      <h1>不足一覧</h1>
      <div class="week-toggle">
        <button
          class="week-btn"
          :class="{ active: selectedWeek === 'this' }"
          @click="selectedWeek = 'this'"
        >
          今週
        </button>
        <button
          class="week-btn"
          :class="{ active: selectedWeek === 'next' }"
          @click="selectedWeek = 'next'"
        >
          来週
        </button>
      </div>
    </div>

    <!-- サマリー -->
    <div v-if="summary" class="summary-bar">
      <div class="summary-item summary-shortage">
        不足: {{ summary.shortageCount }}件
      </div>
      <div class="summary-item summary-sufficient">
        充足: {{ summary.sufficientCount }}件
      </div>
      <div class="summary-item summary-surplus">
        過剰: {{ summary.surplusCount }}件
      </div>
    </div>

    <!-- 不足一覧テーブル -->
    <table class="shortages-table">
      <thead>
        <tr>
          <th>現場名</th>
          <th>日付</th>
          <th>工種</th>
          <th>必要人数</th>
          <th>配置人数</th>
          <th>過不足</th>
          <th>優先度</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="item in items"
          :key="`${item.siteId}-${item.date}-${item.tradeType}`"
          :class="getRowClass(item.status)"
        >
          <td class="site-name">{{ item.siteName }}</td>
          <td>{{ formatDateDisplay(item.date) }}</td>
          <td>{{ item.tradeType }}</td>
          <td class="count-cell">{{ item.requiredCount }}</td>
          <td class="count-cell">{{ item.allocatedCount }}</td>
          <td class="gap-cell" :class="getGapClass(item.gap)">
            {{ item.gap > 0 ? '+' : '' }}{{ item.gap }}
          </td>
          <td>
            <span class="priority-badge" :class="getPriorityClass(item.priority)">
              {{ getPriorityLabel(item.priority) }}
            </span>
          </td>
        </tr>
        <tr v-if="items.length === 0">
          <td colspan="7" class="no-data">
            {{ loading ? '読み込み中...' : 'データがありません' }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'

interface ShortageItem {
  siteId: string
  siteName: string
  date: string
  tradeType: string
  requiredCount: number
  allocatedCount: number
  gap: number
  status: 'shortage' | 'sufficient' | 'surplus'
  priority: string
}

interface Summary {
  total: number
  shortageCount: number
  sufficientCount: number
  surplusCount: number
}

const selectedWeek = ref<'this' | 'next'>('this')
const items = ref<ShortageItem[]>([])
const summary = ref<Summary | null>(null)
const loading = ref(false)

function getWeekRange(week: 'this' | 'next'): { dateFrom: string; dateTo: string } {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))

  if (week === 'next') {
    monday.setDate(monday.getDate() + 7)
  }

  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  return {
    dateFrom: formatDate(monday),
    dateTo: formatDate(sunday),
  }
}

async function fetchShortages() {
  loading.value = true
  try {
    const { dateFrom, dateTo } = getWeekRange(selectedWeek.value)
    const response = await $fetch<{
      success: boolean
      data: { items: ShortageItem[]; summary: Summary }
    }>(`/api/site-allocation/shortages?dateFrom=${dateFrom}&dateTo=${dateTo}`)

    if (response.success) {
      items.value = response.data.items
      summary.value = response.data.summary
    }
  } catch {
    items.value = []
    summary.value = null
  } finally {
    loading.value = false
  }
}

function getRowClass(status: string): string {
  const classes: Record<string, string> = {
    shortage: 'row-shortage',
    sufficient: 'row-sufficient',
    surplus: 'row-surplus',
  }
  return classes[status] || ''
}

function getGapClass(gap: number): string {
  if (gap < 0) return 'gap-shortage'
  if (gap > 0) return 'gap-surplus'
  return 'gap-sufficient'
}

function getPriorityLabel(priority: string): string {
  const labels: Record<string, string> = { HIGH: '高', MEDIUM: '中', LOW: '低' }
  return labels[priority] || priority
}

function getPriorityClass(priority: string): string {
  const classes: Record<string, string> = {
    HIGH: 'priority-high',
    MEDIUM: 'priority-medium',
    LOW: 'priority-low',
  }
  return classes[priority] || ''
}

function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatDateDisplay(dateStr: string): string {
  const d = new Date(dateStr)
  const dayNames = ['日', '月', '火', '水', '木', '金', '土']
  return `${d.getMonth() + 1}/${d.getDate()}(${dayNames[d.getDay()]})`
}

watch(selectedWeek, () => fetchShortages())
onMounted(() => fetchShortages())
</script>

<style scoped>
.shortages-page {
  max-width: 1000px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.page-header h1 {
  font-size: 1.5rem;
  font-weight: bold;
}

.week-toggle {
  display: flex;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  overflow: hidden;
}

.week-btn {
  padding: 0.5rem 1rem;
  border: none;
  background: white;
  cursor: pointer;
  font-weight: 500;
}

.week-btn.active {
  background: #2563eb;
  color: white;
}

.summary-bar {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.summary-item {
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9rem;
}

.summary-shortage { background: #fef2f2; color: #dc2626; }
.summary-sufficient { background: #f0fdf4; color: #16a34a; }
.summary-surplus { background: #fefce8; color: #ca8a04; }

.shortages-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.shortages-table th,
.shortages-table td {
  padding: 0.75rem 1rem;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.shortages-table th {
  background: #f5f5f5;
  font-weight: 600;
  font-size: 0.85rem;
  color: #555;
}

.site-name { font-weight: 600; }

.count-cell { text-align: center; }

.gap-cell {
  text-align: center;
  font-weight: 700;
}

.gap-shortage { color: #dc2626; }
.gap-sufficient { color: #16a34a; }
.gap-surplus { color: #ca8a04; }

/* 行の背景色 */
.row-shortage { background: #fef2f2; }
.row-sufficient { background: #f0fdf4; }
.row-surplus { background: #fefce8; }

.priority-badge {
  padding: 0.15rem 0.5rem;
  border-radius: 10px;
  font-size: 0.75rem;
  font-weight: 500;
}

.priority-high { background: #fee2e2; color: #dc2626; }
.priority-medium { background: #fef3c7; color: #d97706; }
.priority-low { background: #e0f2fe; color: #0369a1; }

.no-data {
  text-align: center;
  color: #888;
  padding: 2rem !important;
}
</style>
