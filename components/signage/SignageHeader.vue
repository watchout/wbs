<template>
  <header class="signage-header">
    <div class="header-left">
      <div class="logo">
        <span class="logo-icon">📋</span>
        <span class="logo-text">ミエルプラス</span>
      </div>
      <div class="organization-name" v-if="organizationName">
        {{ organizationName }}
      </div>
    </div>
    
    <div class="header-center">
      <div class="week-label">{{ weekLabel }}</div>
    </div>
    
    <div class="header-right">
      <div class="weather" v-if="weather">
        <span class="weather-icon">{{ weather.icon }}</span>
        <span class="weather-temp">{{ weather.temp }}°</span>
      </div>
      <div class="clock">
        <div class="time">{{ currentTime }}</div>
        <div class="date">{{ currentDate }}</div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

interface Props {
  organizationName?: string
  weekLabel?: string
}

defineProps<Props>()

const currentTime = ref('')
const currentDate = ref('')
const weather = ref<{ icon: string; temp: number } | null>(null)

let clockInterval: ReturnType<typeof setInterval> | null = null

function updateClock() {
  const now = new Date()
  currentTime.value = now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
  
  const weekdays = ['日', '月', '火', '水', '木', '金', '土']
  currentDate.value = `${now.getMonth() + 1}/${now.getDate()}(${weekdays[now.getDay()]})`
}

// 簡易天気（本番では天気APIを使用）
function loadWeather() {
  // 仮の天気データ
  const weathers = [
    { icon: '☀️', temp: 12 },
    { icon: '⛅', temp: 10 },
    { icon: '🌧️', temp: 8 }
  ]
  weather.value = weathers[Math.floor(Math.random() * weathers.length)]
}

onMounted(() => {
  updateClock()
  loadWeather()
  clockInterval = setInterval(updateClock, 1000)
})

onUnmounted(() => {
  if (clockInterval) {
    clearInterval(clockInterval)
  }
})
</script>

<style scoped>
.signage-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background: linear-gradient(135deg, #0f3460 0%, #16213e 100%);
  color: #fff;
  border-bottom: 2px solid #1a73e8;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 2rem;
}

.logo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.logo-icon {
  font-size: 2rem;
}

.logo-text {
  font-size: 1.5rem;
  font-weight: bold;
  letter-spacing: 0.05em;
}

.organization-name {
  font-size: 1.2rem;
  opacity: 0.9;
  padding-left: 2rem;
  border-left: 2px solid rgba(255, 255, 255, 0.3);
}

.header-center {
  flex: 1;
  text-align: center;
}

.week-label {
  font-size: 1.5rem;
  font-weight: 600;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 2rem;
}

.weather {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.5rem;
}

.weather-icon {
  font-size: 2rem;
}

.clock {
  text-align: right;
}

.time {
  font-size: 2.5rem;
  font-weight: bold;
  font-variant-numeric: tabular-nums;
}

.date {
  font-size: 1rem;
  opacity: 0.8;
}
</style>
