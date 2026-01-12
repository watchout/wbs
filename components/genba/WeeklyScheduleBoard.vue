<template>
  <div class="schedule-board" :class="{ fullscreen: isFullscreen }">
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
            :class="getCellClass(employee.schedules[day.key])"
          >
            <div v-if="employee.schedules[day.key]" class="schedule-content">
              {{ formatCellContent(employee.schedules[day.key]) }}
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
  </div>
</template>

<script setup lang="ts">
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

interface WeekDay {
  key: string      // 'monday', 'tuesday', ...
  label: string    // '月', '火', ...
  date: string     // '1/12'
}

// Props
interface Props {
  employees: Employee[]
  weekDays: WeekDay[]
  loading: boolean
  isFullscreen: boolean
}

const props = defineProps<Props>()

// セルのクラスを決定
function getCellClass(schedule: DaySchedule | undefined): Record<string, boolean> {
  return {
    holiday: schedule?.isHoliday ?? false,
    'all-day': schedule?.title === '終日' || (schedule?.start === schedule?.end)
  }
}

// セルの表示内容をフォーマット
function formatCellContent(schedule: DaySchedule | undefined): string {
  if (!schedule) return '-'
  
  // 休み/終日の場合
  if (schedule.isHoliday) {
    return schedule.title || '休み'
  }
  
  // displayTextがあればそれを使用
  if (schedule.displayText) {
    return schedule.displayText
  }
  
  return schedule.title || '-'
}
</script>

<style scoped>
.schedule-board {
  width: 100%;
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
  min-width: 120px;
}

.day-header {
  background: #f5f5f5;
  font-weight: bold;
  min-width: 100px;
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

.schedule-cell.all-day {
  background: #e3f2fd;
}

.schedule-content {
  font-size: 0.85rem;
  line-height: 1.4;
  white-space: pre-line;
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
.schedule-board.fullscreen .schedule-matrix {
  font-size: 1.2rem;
  background: #16213e;
  color: #eee;
}

.schedule-board.fullscreen .schedule-matrix th,
.schedule-board.fullscreen .schedule-matrix td {
  border-color: #334;
}

.schedule-board.fullscreen .employee-header,
.schedule-board.fullscreen .day-header {
  background: #0f3460;
}

.schedule-board.fullscreen .employee-name {
  background: #1a1a2e;
}

.schedule-board.fullscreen .schedule-cell.holiday {
  background: #3d2c1f;
}

.schedule-board.fullscreen .schedule-cell.all-day {
  background: #1a3a5c;
}

.schedule-board.fullscreen .employee-name .department {
  color: #aaa;
}

.schedule-board.fullscreen .day-date {
  color: #aaa;
}

.schedule-board.fullscreen .no-schedule {
  color: #555;
}
</style>
