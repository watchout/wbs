<template>
  <div class="meetings-page">
    <header class="page-header">
      <h1>📅 日程調整</h1>
      <NuxtLink to="/meetings/new" class="btn btn-primary">+ 新規作成</NuxtLink>
    </header>

    <div v-if="loading" class="loading">読み込み中...</div>

    <div v-else-if="meetings.length === 0" class="empty-state">
      <p>日程調整リクエストがありません</p>
      <NuxtLink to="/meetings/new" class="btn btn-primary">新規作成</NuxtLink>
    </div>

    <div v-else class="meetings-list">
      <div v-for="meeting in meetings" :key="meeting.id" class="meeting-card">
        <div class="meeting-info">
          <h3 class="meeting-title">{{ meeting.title }}</h3>
          <div class="meeting-meta">
            <span class="status-badge" :class="meeting.status.toLowerCase()">
              {{ statusLabel(meeting.status) }}
            </span>
            <span class="duration">{{ meeting.duration }}分</span>
            <span class="invitees">{{ meeting.inviteeCount }}名</span>
          </div>
          <div class="date-range">
            {{ formatDateRange(meeting.dateRangeStart, meeting.dateRangeEnd) }}
          </div>
          <div v-if="meeting.confirmedStart" class="confirmed-date">
            ✅ 確定: {{ formatDateTime(meeting.confirmedStart) }}
          </div>
        </div>
        <div class="meeting-actions">
          <NuxtLink :to="`/meetings/${meeting.id}`" class="btn btn-small">詳細</NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface Meeting {
  id: string
  title: string
  status: string
  duration: number
  dateRangeStart: string
  dateRangeEnd: string
  organizer: { id: string; name: string | null }
  inviteeCount: number
  confirmedStart: string | null
  createdAt: string
}

const meetings = ref<Meeting[]>([])
const loading = ref(true)

async function fetchMeetings() {
  loading.value = true
  try {
    const response = await $fetch<{ success: boolean; meetings: Meeting[] }>('/api/meetings')
    if (response.success) {
      meetings.value = response.meetings
    }
  } catch (error) {
    console.error('Failed to fetch meetings')
  } finally {
    loading.value = false
  }
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    DRAFT: '下書き',
    OPEN: '回答受付中',
    CONFIRMED: '確定済み',
    CANCELLED: 'キャンセル'
  }
  return labels[status] || status
}

function formatDateRange(start: string, end: string): string {
  const s = new Date(start)
  const e = new Date(end)
  return `${s.getMonth() + 1}/${s.getDate()} - ${e.getMonth() + 1}/${e.getDate()}`
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}

onMounted(fetchMeetings)

useHead({ title: '日程調整 | ミエルプラス' })
</script>

<style scoped>
.meetings-page {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.page-header h1 {
  font-size: 1.5rem;
  color: #1a1a2e;
}

.meetings-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.meeting-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.meeting-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #1a1a2e;
  margin-bottom: 0.5rem;
}

.meeting-meta {
  display: flex;
  gap: 1rem;
  margin-bottom: 0.5rem;
  font-size: 0.85rem;
  color: #666;
}

.status-badge {
  padding: 0.2rem 0.6rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}

.status-badge.open { background: #e8f5e9; color: #2e7d32; }
.status-badge.draft { background: #fff3e0; color: #e65100; }
.status-badge.confirmed { background: #e3f2fd; color: #1565c0; }
.status-badge.cancelled { background: #fce4ec; color: #c62828; }

.date-range {
  font-size: 0.9rem;
  color: #888;
}

.confirmed-date {
  margin-top: 0.5rem;
  font-size: 0.9rem;
  color: #2e7d32;
  font-weight: 500;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  text-decoration: none;
  display: inline-block;
}

.btn-primary {
  background: #1a73e8;
  color: white;
}

.btn-primary:hover {
  background: #1557b0;
}

.btn-small {
  padding: 0.4rem 0.8rem;
  background: #f0f0f0;
  color: #333;
}

.btn-small:hover {
  background: #e0e0e0;
}

.loading, .empty-state {
  text-align: center;
  padding: 3rem;
  color: #888;
}

@media (max-width: 768px) {
  .meetings-page {
    padding: 1rem;
  }

  .meeting-card {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .meeting-actions {
    width: 100%;
  }

  .meeting-actions .btn {
    width: 100%;
    text-align: center;
  }
}
</style>
