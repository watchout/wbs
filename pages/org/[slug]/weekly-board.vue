<template>
  <div class="weekly-board" :class="{ fullscreen: isFullscreen }">
    <!-- サブバー: 週切り替え・フィルター（フルスクリーン時は非表示） -->
    <div v-if="!isFullscreen" class="sub-bar">
      <div class="controls">
        <button @click="previousWeek" class="btn btn-secondary">◀ 前の週</button>
        <span class="current-week">{{ weekLabel }}</span>
        <button @click="nextWeek" class="btn btn-secondary">次の週 ▶</button>
      </div>
      <div class="filters">
        <select v-model="selectedDepartment" @change="fetchData">
          <option value="">全部門</option>
          <option v-for="dept in departments" :key="dept.id" :value="dept.id">
            {{ dept.name }}
          </option>
        </select>
        <button @click="toggleFullscreen" class="btn btn-primary">
          サイネージ表示
        </button>
      </div>
    </div>

    <!-- 週間マトリクス（コンポーネント） -->
    <main class="board-main">
      <WeeklyScheduleBoard
        :employees="employees"
        :week-days="weekDays"
        :loading="loading"
        :is-fullscreen="isFullscreen"
        @cell-click="handleCellClick"
      />
    </main>

    <!-- スケジュール入力モーダル -->
    <ScheduleFormModal
      v-if="showModal"
      :schedule="editingSchedule"
      :default-date="selectedDate"
      :default-author-id="selectedAuthorId"
      @close="closeModal"
      @saved="handleSaved"
    />

    <!-- フルスクリーン時のコントロール -->
    <div v-if="isFullscreen" class="fullscreen-controls">
      <button @click="toggleFullscreen" class="exit-fullscreen">✕</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import WeeklyScheduleBoard from '~/components/genba/WeeklyScheduleBoard.vue'
import ScheduleFormModal from '~/components/ScheduleFormModal.vue'

// defaultレイアウトを適用、認証必須
definePageMeta({
  layout: 'default',
  middleware: 'auth'
})

// Socket.IOプラグイン
const { $socketIO } = useNuxtApp()

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

// ルート情報
const route = useRoute()
const router = useRouter()
const slug = computed(() => route.params.slug as string)

// 状態
const loading = ref(false)
const employees = ref<Employee[]>([])
const departments = ref<Department[]>([])
const selectedDepartment = ref('')
const weekOffset = ref(0)
const showModal = ref(false)
const editingSchedule = ref<{
  id: string
  title: string
  start: string
  end: string
} | undefined>(undefined)
const selectedDate = ref('')
const selectedAuthorId = ref('')
const isFullscreen = computed(() => route.query.fullscreen === 'true')
const organizationId = ref<string | null>(null)
let refreshTimer: ReturnType<typeof setInterval> | null = null
let socketCleanup: (() => void) | null = null

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
      label: `${label} ${date.getMonth() + 1}/${date.getDate()}`,
      date: formatLocalDate(date)
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

// ローカル日付をYYYY-MM-DD形式に変換（タイムゾーン考慮）
function formatLocalDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// データ取得
async function fetchData() {
  loading.value = true
  try {
    const startDate = formatLocalDate(getWeekStart(weekOffset.value))
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
      // 組織IDを保存（Socket.IO接続用）
      if (response.organizationId && !organizationId.value) {
        organizationId.value = response.organizationId
        setupSocketIO()
      }
    }
  } catch (error) {
    console.error('データ取得エラー:', error)
  } finally {
    loading.value = false
  }
}

// 部署一覧取得
async function fetchDepartments() {
  try {
    const response = await $fetch<{
      success: boolean
      departments: Department[]
    }>('/api/departments')

    if (response.success) {
      departments.value = response.departments
    }
  } catch (error) {
    console.error('部署取得エラー:', error)
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

// スケジュールモーダル
function handleCellClick(payload: {
  employeeId: string
  authorId: string
  dayKey: string
  date: string
  schedule?: DaySchedule
}) {
  selectedDate.value = payload.date
  selectedAuthorId.value = payload.authorId

  if (payload.schedule) {
    editingSchedule.value = {
      id: payload.schedule.scheduleId,
      title: payload.schedule.title,
      start: payload.schedule.start,
      end: payload.schedule.end
    }
  } else {
    editingSchedule.value = undefined
  }

  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingSchedule.value = undefined
}

async function handleSaved() {
  closeModal()
  await fetchData()
}

// Socket.IO接続設定
function setupSocketIO() {
  if (!organizationId.value || !$socketIO) return

  // 組織ルームに参加
  $socketIO.joinOrganization(organizationId.value)

  // スケジュール変更イベントを監視
  socketCleanup = $socketIO.onScheduleChange(() => {
    fetchData()
  })
}

// Socket.IO切断
function cleanupSocketIO() {
  if (socketCleanup) {
    socketCleanup()
    socketCleanup = null
  }
  if (organizationId.value && $socketIO) {
    $socketIO.leaveOrganization(organizationId.value)
  }
}

// 5分間隔の自動更新（フォールバック: Socket.IO接続断時用）
function startAutoRefresh() {
  stopAutoRefresh()
  refreshTimer = setInterval(() => {
    fetchData()
  }, 5 * 60 * 1000)
}

function stopAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

// 初期化
onMounted(() => {
  fetchData()
  fetchDepartments()
  if (isFullscreen.value) {
    startAutoRefresh()
  }
})

watch(isFullscreen, (enabled) => {
  if (enabled) {
    startAutoRefresh()
  } else {
    stopAutoRefresh()
  }
})

onUnmounted(() => {
  stopAutoRefresh()
  cleanupSocketIO()
})

// ページタイトル
useHead({
  title: '週間スケジュール'
})
</script>

<style scoped>
.weekly-board {
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 60px); /* ヘッダー分を引く */
}

.weekly-board.fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  background: #1a1a2e;
  min-height: 100vh;
}

/* サブバー */
.sub-bar {
  padding: 0.75rem 1.5rem;
  background: var(--color-surface, #ffffff);
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.current-week {
  font-weight: bold;
  padding: 0 1rem;
  font-size: 0.95rem;
}

.filters {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.filters select {
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
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

.btn-primary:hover {
  background: #1557b0;
}

.btn-secondary {
  background: #e0e0e0;
  color: #333;
}

.btn-secondary:hover {
  background: #d0d0d0;
}

/* メインコンテンツ */
.board-main {
  flex: 1;
  padding: 1rem;
  overflow: auto;
}

/* フルスクリーンモード */
.fullscreen .board-main {
  padding: 2rem;
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

.exit-fullscreen:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* レスポンシブ対応 */
@media (max-width: 640px) {
  .sub-bar {
    padding: 0.5rem 1rem;
  }

  .controls {
    width: 100%;
    justify-content: center;
  }

  .filters {
    width: 100%;
    justify-content: center;
  }

  .current-week {
    padding: 0 0.5rem;
  }
}
</style>
