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
        <select v-model="selectedDepartment" @change="handleDepartmentChange">
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

    <!-- タブ切替: 人ベース / 現場ベース -->
    <div v-if="!isFullscreen" class="view-tabs">
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'person' }"
        @click="switchTab('person')"
      >
        人ベース
      </button>
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'site' }"
        @click="switchTab('site')"
      >
        現場ベース
      </button>
    </div>

    <!-- 権限エラーメッセージ -->
    <div v-if="permissionError" class="permission-error">
      {{ permissionError }}
    </div>

    <!-- 週間マトリクス -->
    <main class="board-main">
      <!-- 人ベース（既存） -->
      <WeeklyScheduleBoard
        v-if="activeTab === 'person'"
        :employees="employees"
        :week-days="weekDays"
        :loading="loading"
        :is-fullscreen="isFullscreen"
        @cell-click="handleCellClick"
      />

      <!-- 現場ベース（Sprint 1 新機能） -->
      <SiteAllocationBoard
        v-if="activeTab === 'site'"
        :sites="siteAllocation.sites.value"
        :unassigned="siteAllocation.unassigned.value"
        :week-days="weekDays"
        :loading="siteAllocation.loading.value"
        :is-fullscreen="isFullscreen"
        :sort="siteSort"
        :total-allocated="siteAllocation.totalAllocated.value"
        @update:sort="handleSiteSortChange"
      />
    </main>

    <!-- スケジュール入力モーダル（人ベースのみ） -->
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
import SiteAllocationBoard from '~/components/genba/SiteAllocationBoard.vue'
import ScheduleFormModal from '~/components/ScheduleFormModal.vue'
import { useSiteAllocation } from '~/composables/useSiteAllocation'

// defaultレイアウトを適用、認証必須
definePageMeta({
  layout: 'default',
  middleware: 'auth'
})

// 認証情報（ロール判定用）
const { user: authUser, canEditScheduleFor, fetchMe } = useAuth()

// Socket.IOプラグイン
const { $socketIO } = useNuxtApp()

// 現場配置データ
const siteAllocation = useSiteAllocation()

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

// タブ型
type ViewTab = 'person' | 'site'

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

// タブ状態
const activeTab = ref<ViewTab>('person')
const siteSort = ref<string>('name')

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

// タブ切替ハンドラ
function switchTab(tab: ViewTab) {
  activeTab.value = tab
  if (tab === 'site') {
    fetchSiteData()
  }
}

// 部門変更ハンドラ
function handleDepartmentChange() {
  fetchData()
  if (activeTab.value === 'site') {
    fetchSiteData()
  }
}

// ソート変更ハンドラ
function handleSiteSortChange(newSort: string) {
  siteSort.value = newSort
  fetchSiteData()
}

// 人ベースのデータ取得
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
    // エラーはUIに表示（本番では console.error 除去済み）
    loading.value = false
  } finally {
    loading.value = false
  }
}

// 現場ベースのデータ取得
async function fetchSiteData() {
  const weekStart = formatLocalDate(getWeekStart(weekOffset.value))
  await siteAllocation.fetchSiteAllocationWeekly({
    weekStart,
    departmentId: selectedDepartment.value || undefined,
    sort: siteSort.value as 'name' | 'count',
  })
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
  } catch (_error) {
    // 部署取得失敗は致命的ではない
  }
}

// 週の切り替え
function previousWeek() {
  weekOffset.value--
  fetchData()
  if (activeTab.value === 'site') {
    fetchSiteData()
  }
}

function nextWeek() {
  weekOffset.value++
  fetchData()
  if (activeTab.value === 'site') {
    fetchSiteData()
  }
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

// 権限なしメッセージ
const permissionError = ref('')

// スケジュールモーダル
function handleCellClick(payload: {
  employeeId: string
  authorId: string
  dayKey: string
  date: string
  schedule?: DaySchedule
}) {
  permissionError.value = ''

  // 対象社員の部署IDを取得
  const targetEmployee = employees.value.find(e => e.id === payload.employeeId)
  const targetDeptId = targetEmployee?.departmentId ?? null

  // ロール別権限チェック
  if (!canEditScheduleFor(payload.authorId, targetDeptId)) {
    permissionError.value = 'この社員の予定を編集する権限がありません'
    setTimeout(() => { permissionError.value = '' }, 3000)
    return
  }

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
  // 現場ビューが表示されている場合はそちらも更新
  if (activeTab.value === 'site') {
    await fetchSiteData()
  }
}

// Socket.IO接続設定
function setupSocketIO() {
  if (!organizationId.value || !$socketIO) return

  // 組織ルームに参加
  $socketIO.joinOrganization(organizationId.value)

  // スケジュール変更イベントを監視
  socketCleanup = $socketIO.onScheduleChange(() => {
    fetchData()
    if (activeTab.value === 'site') {
      fetchSiteData()
    }
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
    if (activeTab.value === 'site') {
      fetchSiteData()
    }
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
  fetchMe() // 認証情報を取得（ロール判定用）
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
.permission-error {
  padding: 0.6rem 1.5rem;
  background: #fff3e0;
  color: #e65100;
  font-size: 0.9rem;
  text-align: center;
  border-bottom: 1px solid #ffcc80;
}

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

/* タブ切替 */
.view-tabs {
  display: flex;
  padding: 0 1.5rem;
  background: var(--color-surface, #ffffff);
  border-bottom: 2px solid #e0e0e0;
}

.tab-btn {
  padding: 0.6rem 1.5rem;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 500;
  color: #666;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: color 0.2s, border-color 0.2s;
}

.tab-btn:hover {
  color: #333;
}

.tab-btn.active {
  color: var(--color-primary, #1a73e8);
  border-bottom-color: var(--color-primary, #1a73e8);
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

  .view-tabs {
    padding: 0 1rem;
  }

  .tab-btn {
    padding: 0.5rem 1rem;
    font-size: 0.85rem;
  }
}
</style>
