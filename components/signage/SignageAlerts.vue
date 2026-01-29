<template>
  <div class="signage-alerts" v-if="todaySchedules.length > 0">
    <div class="alerts-header">
      <span class="alerts-icon">📢</span>
      <span class="alerts-title">本日の予定</span>
    </div>
    <div class="alerts-scroll">
      <div class="alert-item" v-for="schedule in todaySchedules" :key="schedule.id">
        <span class="alert-time">{{ schedule.time }}</span>
        <span class="alert-name">{{ schedule.userName }}</span>
        <span class="alert-title">{{ schedule.title }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

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
  schedules: Record<string, DaySchedule | undefined>
}

interface Props {
  employees: Employee[]
  todayKey: string
}

const props = defineProps<Props>()

const todaySchedules = computed(() => {
  const schedules: Array<{ id: string; time: string; userName: string; title: string }> = []
  
  for (const employee of props.employees) {
    const schedule = employee.schedules[props.todayKey]
    if (schedule && !schedule.isHoliday) {
      const start = new Date(schedule.start)
      const end = new Date(schedule.end)
      schedules.push({
        id: schedule.scheduleId,
        time: `${start.getHours()}:${String(start.getMinutes()).padStart(2, '0')}-${end.getHours()}:${String(end.getMinutes()).padStart(2, '0')}`,
        userName: employee.name,
        title: schedule.title
      })
    }
  }
  
  // 開始時間順にソート
  return schedules.sort((a, b) => a.time.localeCompare(b.time))
})
</script>

<style scoped>
.signage-alerts {
  background: linear-gradient(90deg, #0f3460 0%, #16213e 100%);
  padding: 0.75rem 2rem;
  border-top: 2px solid #1a73e8;
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.alerts-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #ffb74d;
  flex-shrink: 0;
}

.alerts-icon {
  font-size: 1.5rem;
}

.alerts-title {
  font-size: 1.1rem;
  font-weight: 600;
}

.alerts-scroll {
  display: flex;
  gap: 2rem;
  overflow: hidden;
  flex: 1;
}

.alert-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: #fff;
  flex-shrink: 0;
  animation: scroll-left 30s linear infinite;
}

.alert-time {
  color: #64b5f6;
  font-weight: 600;
  font-size: 1rem;
}

.alert-name {
  color: #81d4fa;
  font-size: 1rem;
}

.alert-title {
  color: #e0e6ed;
  font-size: 1rem;
}

@keyframes scroll-left {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(-100%);
  }
}
</style>
