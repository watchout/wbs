<template>
  <div class="weekly-board" :class="{ fullscreen: isFullscreen }">
    <!-- ヘッダー（フルスクリーン時は非表示） -->
    <header v-if="!isFullscreen" class="board-header">
      <h1>{{ organization?.name || '' }} ミエルボード</h1>
      <div class="controls">
        <button @click="previousWeek" class="btn btn-secondary">◀ 前の週</button>
        <span class="current-week">{{ weekLabel }}</span>
        <button @click="nextWeek" class="btn btn-secondary">次の週 ▶</button>
        <button @click="toggleFullscreen" class="btn btn-primary">
          {{ isFullscreen ? '通常表示' : 'サイネージ表示' }}
        </button>
      </div>
      <div class="filters">
        <select v-model="selectedDepartment" @change="fetchData">
          <option value="">全部門</option>
          <option v-for="dept in departments" :key="dept.id" :value="dept.id">
            {{ dept.name }}
          </option>
        </select>
      </div>
    </header>

    <!-- 週間マトリクス -->
    <main class="board-main">
      <table class="schedule-matrix">
        <thead>
          <tr>
            <th class="employee-header">社員</th>
            <th v-for="day in weekDays" :key="day.key" class="day-header">
              <div class="day-name">{{ day.label }}</div>
              <div class="day-date">{{ day.date }}</div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="employee in employees" :key="employee.id" class="employee-row">
            <td class="employee-name">
              <div class="name">{{ employee.name }}</div>
              <div class="department" v-if="employee.department">{{ employee.department }}</div>
            </td>
            <td 
              v-for="day in weekDays" 
              :key="day.key" 
              class="schedule-cell"
              :class="{ holiday: employee.schedules[day.key]?.isHoliday }"
            >
              <div v-if="employee.schedules[day.key]" class="schedule-content">
                {{ employee.schedules[day.key]?.displayText }}
              </div>
              <div v-else class="no-schedule">-</div>
            </td>
          </tr>
          <tr v-if="employees.length === 0">
            <td :colspan="8" class="no-data">
              {{ loading ? '読み込み中...' : 'データがありません' }}
            </td>
          </tr>
        </tbody>
      </table>
    </main>

    <!-- フルスクリーン時のコントロール -->
    <div v-if="isFullscreen" class="fullscreen-controls">
      <button @click="toggleFullscreen" class="exit-fullscreen">✕</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

// 型定義
interface DaySchedule {
  scheduleId: string
  displayText: string
  start: string
  end: string
  title: string
  isHoliday: boolean
}

interface Employee {
  id: string
  name: string
  email: string
  department: string | null
  departmentId: string | null
  schedules: Record<string, DaySchedule | undefined>
}

interface Department {
  id: string
  name: string
}

interface Organization {
  id: string
  name: string
  slug: string
}

// ルート情報
const route = useRoute()
const router = useRouter()
const slug = computed(() => route.params.slug as string)

// 状態
const loading = ref(false)
const organization = ref<Organization | null>(null)
const employees = ref<Employee[]>([])
const departments = ref<Department[]>([])
const selectedDepartment = ref('')
const weekOffset = ref(0) // 0 = 今週, -1 = 先週, 1 = 来週
const isFullscreen = computed(() => route.query.fullscreen === 'true')

// 週の日付ラベル
const weekDays = computed(() => {
  const start = getWeekStart(weekOffset.value)
  const days = ['月', '火', '水', '木', '金', '土', '日']
  const keys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  
  return days.map((label, index) => {
    const date = new Date(start)
    date.setDate(date.getDate() + index)
    return {
      key: keys[index],
      label,
      date: `${date.getMonth() + 1}/${date.getDate()}`
    }
  })
})

// 週ラベル
const weekLabel = computed(() => {
  const start = getWeekStart(weekOffset.value)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  return `${start.getMonth() + 1}/${start.getDate()} - ${end.getMonth() + 1}/${end.getDate()}`
})

// 週の開始日を計算（月曜日）
function getWeekStart(offset: number = 0): Date {
  const today = new Date()
  const day = today.getDay()
  const diff = today.getDate() - day + (day === 0 ? -6 : 1) + (offset * 7)
  const start = new Date(today.setDate(diff))
  start.setHours(0, 0, 0, 0)
  return start
}

// データ取得
async function fetchData() {
  loading.value = true
  try {
    const startDate = getWeekStart(weekOffset.value).toISOString().split('T')[0]
    const params = new URLSearchParams({ startDate })
    if (selectedDepartment.value) {
      params.append('departmentId', selectedDepartment.value)
    }

    const response = await $fetch<{
      success: boolean
      employees: Employee[]
      organizationId: string
    }>(`/api/schedules/weekly-board?${params}`)

    if (response.success) {
      employees.value = response.employees
    }
  } catch (error) {
    console.error('データ取得エラー:', error)
  } finally {
    loading.value = false
  }
}

// 週の切り替え
function previousWeek() {
  weekOffset.value--
  fetchData()
}

function nextWeek() {
  weekOffset.value++
  fetchData()
}

// フルスクリーン切り替え
function toggleFullscreen() {
  const newQuery = { ...route.query }
  if (isFullscreen.value) {
    delete newQuery.fullscreen
  } else {
    newQuery.fullscreen = 'true'
  }
  router.push({ query: newQuery })
}

// 初期化
onMounted(() => {
  fetchData()
})

// ページタイトル
useHead({
  title: 'ミエルボード - 週間スケジュール'
})
</script>

<style scoped>
.weekly-board {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--color-background, #f8f9fa);
}

.weekly-board.fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  background: #1a1a2e;
}

/* ヘッダー */
.board-header {
  padding: 1rem 2rem;
  background: var(--color-surface, #ffffff);
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.board-header h1 {
  font-size: 1.5rem;
  color: #333;
}

.controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.current-week {
  font-weight: bold;
  padding: 0 1rem;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.2s;
}

.btn-primary {
  background: var(--color-primary, #1a73e8);
  color: white;
}

.btn-secondary {
  background: #e0e0e0;
  color: #333;
}

.filters select {
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
}

/* メインコンテンツ */
.board-main {
  flex: 1;
  padding: 1rem;
  overflow: auto;
}

.schedule-matrix {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.schedule-matrix th,
.schedule-matrix td {
  border: 1px solid #e0e0e0;
  padding: 0.75rem;
  text-align: center;
}

.employee-header {
  background: #f5f5f5;
  font-weight: bold;
  width: 150px;
}

.day-header {
  background: #f5f5f5;
  font-weight: bold;
}

.day-name {
  font-size: 1.1rem;
}

.day-date {
  font-size: 0.8rem;
  color: #666;
}

.employee-name {
  text-align: left;
  background: #fafafa;
}

.employee-name .name {
  font-weight: bold;
}

.employee-name .department {
  font-size: 0.75rem;
  color: #888;
}

.schedule-cell {
  min-width: 120px;
  vertical-align: top;
}

.schedule-cell.holiday {
  background: #fff3e0;
}

.schedule-content {
  font-size: 0.85rem;
  line-height: 1.4;
}

.no-schedule {
  color: #ccc;
}

.no-data {
  text-align: center;
  color: #888;
  padding: 2rem !important;
}

/* フルスクリーンモード */
.fullscreen .board-main {
  padding: 2rem;
}

.fullscreen .schedule-matrix {
  font-size: 1.2rem;
  background: #16213e;
  color: #eee;
}

.fullscreen .schedule-matrix th,
.fullscreen .schedule-matrix td {
  border-color: #334;
}

.fullscreen .employee-header,
.fullscreen .day-header {
  background: #0f3460;
}

.fullscreen .employee-name {
  background: #1a1a2e;
}

.fullscreen .schedule-cell.holiday {
  background: #3d2c1f;
}

.fullscreen-controls {
  position: fixed;
  top: 1rem;
  right: 1rem;
}

.exit-fullscreen {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: none;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  font-size: 1.2rem;
  cursor: pointer;
}
</style>

