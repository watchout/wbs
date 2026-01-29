<template>
  <div class="signage-board" ref="boardRef">
    <table class="board-table">
      <thead>
        <tr>
          <th class="name-header">社員</th>
          <th v-for="day in weekDays" :key="day.key" class="day-header" :class="{ today: day.isToday }">
            <div class="day-name">{{ day.label }}</div>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="employee in visibleEmployees" :key="employee.id" class="employee-row">
          <td class="name-cell">
            <div class="employee-name">{{ employee.name }}</div>
            <div class="department" v-if="employee.department">{{ employee.department }}</div>
          </td>
          <td
            v-for="day in weekDays"
            :key="day.key"
            class="schedule-cell"
            :class="getCellClass(employee.schedules[day.key], day.isToday)"
            @click="handleCellClick(employee, day)"
          >
            <div v-if="employee.schedules[day.key]" class="schedule-content">
              <div class="schedule-time">{{ getTimeDisplay(employee.schedules[day.key]!) }}</div>
              <div class="schedule-title">{{ employee.schedules[day.key]!.title }}</div>
            </div>
            <div v-else class="empty-cell">-</div>
          </td>
        </tr>
      </tbody>
    </table>
    
    <!-- 自動スクロール時のページ表示 -->
    <div v-if="totalPages > 1" class="page-indicator">
      {{ currentPage + 1 }} / {{ totalPages }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

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

interface WeekDay {
  key: string
  label: string
  date: string
  isToday: boolean
}

interface Props {
  employees: Employee[]
  weekDays: WeekDay[]
  autoScroll?: boolean
  scrollInterval?: number  // 秒
  rowsPerPage?: number
}

const props = withDefaults(defineProps<Props>(), {
  autoScroll: true,
  scrollInterval: 10,
  rowsPerPage: 8
})

const emit = defineEmits<{
  cellClick: [payload: { employeeId: string; dayKey: string; date: string; schedule?: DaySchedule }]
}>()

const boardRef = ref<HTMLElement | null>(null)
const currentPage = ref(0)
let scrollTimer: ReturnType<typeof setInterval> | null = null

const totalPages = computed(() => Math.ceil(props.employees.length / props.rowsPerPage))

const visibleEmployees = computed(() => {
  if (!props.autoScroll || totalPages.value <= 1) {
    return props.employees
  }
  const start = currentPage.value * props.rowsPerPage
  return props.employees.slice(start, start + props.rowsPerPage)
})

function nextPage() {
  if (totalPages.value <= 1) return
  currentPage.value = (currentPage.value + 1) % totalPages.value
}

function getCellClass(schedule: DaySchedule | undefined, isToday: boolean) {
  const classes: string[] = []
  if (isToday) classes.push('today')
  if (schedule?.isHoliday) classes.push('holiday')
  if (schedule && !schedule.isHoliday) classes.push('has-schedule')
  return classes
}

function getTimeDisplay(schedule: DaySchedule): string {
  const start = new Date(schedule.start)
  const end = new Date(schedule.end)
  return `${start.getHours()}-${end.getHours()}`
}

function handleCellClick(employee: Employee, day: WeekDay) {
  emit('cellClick', {
    employeeId: employee.id,
    dayKey: day.key,
    date: day.date,
    schedule: employee.schedules[day.key]
  })
}

watch(() => props.autoScroll, (enabled) => {
  if (enabled) {
    startAutoScroll()
  } else {
    stopAutoScroll()
  }
})

function startAutoScroll() {
  if (scrollTimer) return
  if (totalPages.value <= 1) return
  scrollTimer = setInterval(nextPage, props.scrollInterval * 1000)
}

function stopAutoScroll() {
  if (scrollTimer) {
    clearInterval(scrollTimer)
    scrollTimer = null
  }
}

onMounted(() => {
  if (props.autoScroll && totalPages.value > 1) {
    startAutoScroll()
  }
})

onUnmounted(() => {
  stopAutoScroll()
})
</script>

<style scoped>
.signage-board {
  flex: 1;
  overflow: hidden;
  padding: 1rem 2rem;
  background: #16213e;
  position: relative;
}

.board-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.board-table th,
.board-table td {
  padding: 0.75rem 0.5rem;
  text-align: center;
  border: 1px solid #2a3f5f;
}

.name-header,
.name-cell {
  width: 150px;
  text-align: left;
  padding-left: 1rem !important;
}

.day-header {
  background: #0f3460;
  color: #fff;
  font-size: 1.2rem;
  font-weight: 600;
}

.day-header.today {
  background: #1a73e8;
}

.day-name {
  font-size: 1.1rem;
}

.employee-row {
  background: #1e2d4a;
  transition: background 0.2s;
}

.employee-row:nth-child(even) {
  background: #1a2744;
}

.name-cell {
  color: #fff;
}

.employee-name {
  font-size: 1.1rem;
  font-weight: 600;
}

.department {
  font-size: 0.85rem;
  color: #8ba3c7;
  margin-top: 0.2rem;
}

.schedule-cell {
  color: #e0e6ed;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 60px;
  vertical-align: middle;
}

.schedule-cell:hover {
  background: rgba(26, 115, 232, 0.3);
}

.schedule-cell.today {
  background: rgba(26, 115, 232, 0.15);
}

.schedule-cell.holiday {
  background: #3d2c1f;
  color: #ffb74d;
}

.schedule-cell.has-schedule {
  background: #1a3a5c;
}

.schedule-content {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.schedule-time {
  font-size: 1rem;
  font-weight: 600;
  color: #64b5f6;
}

.schedule-title {
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.empty-cell {
  color: #4a6085;
  font-size: 1.2rem;
}

.page-indicator {
  position: absolute;
  bottom: 1rem;
  right: 2rem;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 1rem;
}
</style>
