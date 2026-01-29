<template>
  <div class="signage-page">
    <SignageHeader
      :organization-name="organizationName"
      :week-label="weekLabel"
    />
    
    <SignageBoard
      :employees="employees"
      :week-days="weekDays"
      :auto-scroll="autoScroll"
      :scroll-interval="scrollInterval"
      :rows-per-page="rowsPerPage"
      @cell-click="handleCellClick"
    />
    
    <SignageAlerts
      :employees="employees"
      :today-key="todayKey"
    />
    
    <!-- タッチ編集モーダル -->
    <ScheduleFormModal
      v-if="showModal"
      :schedule="editingSchedule"
      :default-date="selectedDate"
      :default-author-id="selectedAuthorId"
      @close="closeModal"
      @saved="handleSaved"
    />
    
    <!-- 設定パネル（タッチで表示） -->
    <div class="settings-toggle" @click="showSettings = !showSettings">
      ⚙️
    </div>
    
    <div v-if="showSettings" class="settings-panel">
      <h3>表示設定</h3>
      <div class="setting-item">
        <label>自動スクロール</label>
        <input type="checkbox" v-model="autoScroll" />
      </div>
      <div class="setting-item">
        <label>スクロール間隔（秒）</label>
        <input type="number" v-model.number="scrollInterval" min="5" max="60" />
      </div>
      <div class="setting-item">
        <label>1ページの行数</label>
        <input type="number" v-model.number="rowsPerPage" min="4" max="20" />
      </div>
      <div class="setting-item">
        <label>部門フィルタ</label>
        <select v-model="selectedDepartment">
          <option value="">全員</option>
          <option v-for="dept in departments" :key="dept.id" :value="dept.id">
            {{ dept.name }}
          </option>
        </select>
      </div>
      <button class="btn" @click="showSettings = false">閉じる</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import SignageHeader from '~/components/signage/SignageHeader.vue'
import SignageBoard from '~/components/signage/SignageBoard.vue'
import SignageAlerts from '~/components/signage/SignageAlerts.vue'
import ScheduleFormModal from '~/components/ScheduleFormModal.vue'

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

const route = useRoute()

const employees = ref<Employee[]>([])
const departments = ref<Department[]>([])
const organizationName = ref('')
const loading = ref(false)
const showModal = ref(false)
const showSettings = ref(false)
const editingSchedule = ref<{ id: string; title: string; start: string; end: string } | undefined>(undefined)
const selectedDate = ref('')
const selectedAuthorId = ref('')

// 設定
const autoScroll = ref(true)
const scrollInterval = ref(10)
const rowsPerPage = ref(8)
const selectedDepartment = ref('')
const weekOffset = ref(0)

let refreshTimer: ReturnType<typeof setInterval> | null = null

// 週の日付情報
const weekDays = computed(() => {
  const start = getWeekStart(weekOffset.value)
  const days = ['月', '火', '水', '木', '金', '土', '日']
  const keys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  return days.map((label, index) => {
    const date = new Date(start)
    date.setDate(date.getDate() + index)
    const isToday = date.getTime() === today.getTime()
    return {
      key: keys[index],
      label: `${label} ${date.getMonth() + 1}/${date.getDate()}`,
      date: formatLocalDate(date),
      isToday
    }
  })
})

const todayKey = computed(() => {
  const today = new Date()
  const dayOfWeek = today.getDay()
  const keys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  return keys[dayOfWeek]
})

const weekLabel = computed(() => {
  const start = getWeekStart(weekOffset.value)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  return `${start.getMonth() + 1}/${start.getDate()} - ${end.getMonth() + 1}/${end.getDate()}`
})

function getWeekStart(offset: number = 0): Date {
  const today = new Date()
  const day = today.getDay()
  const diff = today.getDate() - day + (day === 0 ? -6 : 1) + (offset * 7)
  const start = new Date(today.setDate(diff))
  start.setHours(0, 0, 0, 0)
  return start
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

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
    }>(`/api/schedules/weekly-board?${params}`)

    if (response.success) {
      employees.value = response.employees
    }

    // 部門一覧取得
    const deptResponse = await $fetch<{ success: boolean; departments: Department[] }>('/api/departments')
    if (deptResponse.success) {
      departments.value = deptResponse.departments
    }
  } catch (error) {
    console.error('[signage] Fetch error')
  } finally {
    loading.value = false
  }
}

function handleCellClick(payload: {
  employeeId: string
  dayKey: string
  date: string
  schedule?: DaySchedule
}) {
  selectedDate.value = payload.date
  selectedAuthorId.value = payload.employeeId

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

onMounted(() => {
  fetchData()
  // 5分ごとに自動更新
  refreshTimer = setInterval(fetchData, 5 * 60 * 1000)
})

onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
  }
})

// 組織名を取得（本来はAPIから）
organizationName.value = route.params.slug === 'succeed' ? '株式会社サクシード' : 'デモ建設株式会社'

useHead({ title: 'サイネージ表示 | ミエルプラス' })
</script>

<style scoped>
.signage-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #16213e;
  overflow: hidden;
}

.settings-toggle {
  position: fixed;
  top: 1rem;
  right: 1rem;
  width: 50px;
  height: 50px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  cursor: pointer;
  z-index: 100;
  opacity: 0.3;
  transition: opacity 0.3s;
}

.settings-toggle:hover {
  opacity: 1;
}

.settings-panel {
  position: fixed;
  top: 4rem;
  right: 1rem;
  background: #fff;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  z-index: 101;
  min-width: 250px;
}

.settings-panel h3 {
  margin-bottom: 1rem;
  color: #333;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.setting-item label {
  color: #555;
  font-size: 0.9rem;
}

.setting-item input[type="number"],
.setting-item select {
  width: 80px;
  padding: 0.4rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.setting-item input[type="checkbox"] {
  width: 20px;
  height: 20px;
}

.btn {
  width: 100%;
  padding: 0.6rem;
  background: #1a73e8;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  margin-top: 0.5rem;
}

.btn:hover {
  background: #1557b0;
}
</style>
