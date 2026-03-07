<template>
  <div class="site-allocation-board" :class="{ fullscreen: isFullscreen }" :aria-busy="loading">
    <!-- ソート切替 -->
    <div v-if="!isFullscreen" class="sort-controls">
      <label class="sort-label">
        並び替え:
        <select :value="sort" @change="$emit('update:sort', ($event.target as HTMLSelectElement).value)">
          <option value="name">現場名順</option>
          <option value="count">配置人数順</option>
        </select>
      </label>
      <span class="summary-text">
        {{ sites.length }}現場 / 延べ{{ totalAllocated }}名配置
      </span>
    </div>

    <!-- 現場×日ピボットテーブル -->
    <table class="site-matrix">
      <thead>
        <tr>
          <th class="site-header">現場</th>
          <th v-for="day in weekDays" :key="day.key" class="day-header">
            <div class="day-name">{{ day.label }}</div>
          </th>
        </tr>
      </thead>
      <tbody>
        <!-- 現場行 -->
        <tr v-for="site in sites" :key="site.siteName" class="site-row">
          <td class="site-name-cell">
            <div class="site-name">{{ site.siteName }}</div>
          </td>
          <td
            v-for="day in site.days"
            :key="day.dayKey"
            class="allocation-cell"
            :class="getAllocationCellClass(day)"
          >
            <div v-if="day.allocated > 0" class="allocation-content">
              <div class="worker-count">{{ day.allocated }}名</div>
              <div class="worker-names">
                {{ formatWorkerNames(day.workers) }}
              </div>
            </div>
            <div v-else class="no-allocation">-</div>
          </td>
        </tr>

        <!-- 未設定行（siteNameなし） -->
        <tr v-if="unassigned && hasUnassignedWorkers" class="site-row unassigned-row">
          <td class="site-name-cell unassigned-name">
            <div class="site-name">未設定</div>
          </td>
          <td
            v-for="day in unassigned.days"
            :key="day.dayKey"
            class="allocation-cell unassigned-cell"
          >
            <div v-if="day.allocated > 0" class="allocation-content">
              <div class="worker-count">{{ day.allocated }}名</div>
              <div class="worker-names">
                {{ formatWorkerNames(day.workers) }}
              </div>
            </div>
            <div v-else class="no-allocation">-</div>
          </td>
        </tr>

        <!-- データなし -->
        <tr v-if="sites.length === 0 && !hasUnassignedWorkers">
          <td :colspan="8" class="no-data">
            {{ loading ? '読み込み中...' : 'データがありません' }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { SiteRow, SiteDayData, SiteWorker } from '~/composables/useSiteAllocation'

interface WeekDay {
  key: string
  label: string
  date: string
}

interface Props {
  sites: SiteRow[]
  unassigned: SiteRow | null
  weekDays: WeekDay[]
  loading: boolean
  isFullscreen: boolean
  sort: string
  totalAllocated: number
}

const props = defineProps<Props>()

defineEmits<{
  'update:sort': [value: string]
}>()

/** 未設定行に配置者がいるか */
const hasUnassignedWorkers = computed(() => {
  if (!props.unassigned) return false
  return props.unassigned.days.some((d) => d.allocated > 0)
})

/** セルのクラス（Sprint 2 で色分け追加予定） */
function getAllocationCellClass(day: SiteDayData): Record<string, boolean> {
  return {
    'has-workers': day.allocated > 0,
    'no-workers': day.allocated === 0,
    // Sprint 2: 'shortage': day.gap !== null && day.gap < 0,
    // Sprint 2: 'fulfilled': day.gap !== null && day.gap >= 0,
  }
}

/** 配置者名をカンマ区切りで表示 */
function formatWorkerNames(workers: SiteWorker[]): string {
  if (workers.length === 0) return ''
  if (workers.length <= 3) {
    return workers.map((w) => w.name).join(', ')
  }
  // 4人以上は先頭3人 + 残り人数
  const first3 = workers.slice(0, 3).map((w) => w.name).join(', ')
  return `${first3} 他${workers.length - 3}名`
}
</script>

<style scoped>
.site-allocation-board {
  width: 100%;
  overflow: auto;
}

.sort-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  margin-bottom: 0.5rem;
}

.sort-label {
  font-size: 0.85rem;
  color: #555;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.sort-label select {
  padding: 0.35rem 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.85rem;
}

.summary-text {
  font-size: 0.85rem;
  color: #888;
}

/* テーブル */
.site-matrix {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.site-matrix th,
.site-matrix td {
  border: 1px solid #e0e0e0;
  padding: 0.75rem;
  text-align: center;
}

.site-header {
  background: #e8f5e9;
  font-weight: bold;
  width: 160px;
  min-width: 130px;
}

.day-header {
  background: #e8f5e9;
  font-weight: bold;
  min-width: 100px;
}

.day-name {
  font-size: 1.1rem;
}

/* 現場名セル */
.site-name-cell {
  text-align: left;
  background: #f1f8e9;
}

.site-name {
  font-weight: bold;
  font-size: 0.95rem;
}

/* 未設定行 */
.unassigned-name {
  background: #fff8e1;
}

.unassigned-cell {
  background: #fffde7;
}

/* 配置セル */
.allocation-cell {
  min-width: 120px;
  width: 120px;
  height: 80px;
  max-height: 80px;
  vertical-align: top;
  overflow: hidden;
}

.allocation-cell.has-workers {
  background: #f9fbe7;
}

.allocation-content {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.worker-count {
  font-weight: bold;
  font-size: 0.95rem;
  color: #2e7d32;
}

.worker-names {
  font-size: 0.8rem;
  color: #555;
  line-height: 1.3;
  white-space: pre-line;
}

.no-allocation {
  color: #ccc;
}

.no-data {
  text-align: center;
  color: #888;
  padding: 2rem !important;
}

/* フルスクリーン（サイネージ用） */
.site-allocation-board.fullscreen .site-matrix {
  font-size: 1.4rem;
  background: #16213e;
  color: #eee;
}

.site-allocation-board.fullscreen .site-matrix th,
.site-allocation-board.fullscreen .site-matrix td {
  border-color: #334;
  padding: 1rem 0.75rem;
}

.site-allocation-board.fullscreen .site-header,
.site-allocation-board.fullscreen .day-header {
  background: #1b5e20;
}

.site-allocation-board.fullscreen .site-name-cell {
  background: #1a1a2e;
}

.site-allocation-board.fullscreen .allocation-cell.has-workers {
  background: #1a2e1a;
}

.site-allocation-board.fullscreen .worker-count {
  color: #81c784;
  font-size: 1.2rem;
}

.site-allocation-board.fullscreen .worker-names {
  color: #aaa;
  font-size: 1rem;
}

.site-allocation-board.fullscreen .unassigned-name {
  background: #2e2a1a;
}

.site-allocation-board.fullscreen .unassigned-cell {
  background: #2a2a1a;
}

.site-allocation-board.fullscreen .no-allocation {
  color: #555;
}

/* モバイル対応 */
@media (max-width: 768px) {
  .site-allocation-board {
    overflow-x: auto;
  }

  .site-matrix {
    min-width: 900px;
  }

  .site-matrix th,
  .site-matrix td {
    padding: 0.5rem;
    font-size: 0.85rem;
  }

  .allocation-cell {
    min-width: 100px;
  }

  .sort-controls {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }
}

@media (max-width: 480px) {
  .site-matrix th,
  .site-matrix td {
    padding: 0.35rem;
    font-size: 0.75rem;
  }

  .allocation-cell {
    min-width: 80px;
  }

  .worker-names {
    font-size: 0.7rem;
  }
}
</style>
