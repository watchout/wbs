<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-card">
      <h2>{{ isEdit ? 'スケジュール編集' : 'スケジュール追加' }}</h2>
      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label>タイトル（現場名等）</label>
          <input v-model="form.title" type="text" required :disabled="submitting" placeholder="例: ○○ホテル 新館工事" />
        </div>

        <div class="form-group">
          <label>担当者</label>
          <select v-model="form.authorId" :disabled="submitting">
            <option value="">未指定</option>
            <option v-for="user in users" :key="user.id" :value="user.id">
              {{ user.name || user.email }}
            </option>
          </select>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>日付</label>
            <input v-model="form.date" type="date" required :disabled="submitting" />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>開始時間</label>
            <input v-model="form.startTime" type="time" required :disabled="submitting" />
          </div>
          <div class="form-group">
            <label>終了時間</label>
            <input v-model="form.endTime" type="time" required :disabled="submitting" />
          </div>
        </div>

        <div class="form-group">
          <label>説明（メモ）</label>
          <textarea v-model="form.description" :disabled="submitting" rows="2" placeholder="任意"></textarea>
        </div>

        <div v-if="errorMsg" class="error-message">{{ errorMsg }}</div>

        <div class="modal-actions">
          <button v-if="isEdit" type="button" class="btn btn-danger" @click="handleDelete" :disabled="submitting">
            削除
          </button>
          <div class="spacer"></div>
          <button type="button" class="btn" @click="$emit('close')" :disabled="submitting">キャンセル</button>
          <button type="submit" class="btn btn-primary" :disabled="submitting">
            {{ submitting ? '保存中...' : '保存' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useSchedules } from '~/composables/useSchedules'

interface User {
  id: string
  email: string
  name: string | null
}

interface ScheduleData {
  id?: string
  title?: string
  description?: string | null
  start?: string
  end?: string
  authorId?: string | null
}

interface Props {
  schedule?: ScheduleData
  defaultDate?: string
  defaultAuthorId?: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
  saved: []
}>()

const isEdit = computed(() => !!props.schedule?.id)
const { createSchedule, updateSchedule, deleteSchedule, error: apiError } = useSchedules()

const users = ref<User[]>([])
const submitting = ref(false)
const errorMsg = ref('')

const form = ref({
  title: '',
  authorId: '',
  date: '',
  startTime: '08:00',
  endTime: '17:00',
  description: ''
})

function toLocalDateString(isoString: string): string {
  const d = new Date(isoString)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function toLocalTimeString(isoString: string): string {
  const d = new Date(isoString)
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

function initForm() {
  if (props.schedule) {
    form.value.title = props.schedule.title || ''
    form.value.description = props.schedule.description || ''
    form.value.authorId = props.schedule.authorId || ''
    if (props.schedule.start) {
      form.value.date = toLocalDateString(props.schedule.start)
      form.value.startTime = toLocalTimeString(props.schedule.start)
    }
    if (props.schedule.end) {
      form.value.endTime = toLocalTimeString(props.schedule.end)
    }
  } else {
    if (props.defaultDate) {
      form.value.date = props.defaultDate
    }
    if (props.defaultAuthorId) {
      form.value.authorId = props.defaultAuthorId
    }
  }
}

async function fetchUsers() {
  try {
    const res = await $fetch<{ success: boolean; users: User[] }>('/api/users')
    users.value = res.users
  } catch {
    // ユーザー取得失敗は無視
  }
}

async function handleSubmit() {
  submitting.value = true
  errorMsg.value = ''

  const start = `${form.value.date}T${form.value.startTime}:00`
  const end = `${form.value.date}T${form.value.endTime}:00`

  if (isEdit.value && props.schedule?.id) {
    const result = await updateSchedule(props.schedule.id, {
      title: form.value.title,
      description: form.value.description || null,
      start,
      end,
      authorId: form.value.authorId || null
    })
    if (result) {
      emit('saved')
    } else {
      errorMsg.value = apiError.value
    }
  } else {
    const result = await createSchedule({
      title: form.value.title,
      description: form.value.description || undefined,
      start,
      end,
      authorId: form.value.authorId || undefined
    })
    if (result) {
      emit('saved')
    } else {
      errorMsg.value = apiError.value
    }
  }

  submitting.value = false
}

async function handleDelete() {
  if (!props.schedule?.id) return
  if (!confirm('このスケジュールを削除しますか？')) return

  submitting.value = true
  const success = await deleteSchedule(props.schedule.id)
  if (success) {
    emit('saved')
  } else {
    errorMsg.value = apiError.value
  }
  submitting.value = false
}

onMounted(() => {
  initForm()
  fetchUsers()
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
}

.modal-card {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  width: 100%;
  max-width: 480px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
}

.modal-card h2 {
  margin-bottom: 1.5rem;
  font-size: 1.2rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin-bottom: 1rem;
}

.form-row {
  display: flex;
  gap: 1rem;
}

.form-row .form-group {
  flex: 1;
}

.form-group label {
  font-size: 0.85rem;
  font-weight: 500;
  color: #333;
}

.form-group input,
.form-group select,
.form-group textarea {
  padding: 0.6rem 0.8rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.95rem;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #1a73e8;
}

.modal-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

.spacer {
  flex: 1;
}

.btn {
  padding: 0.5rem 1rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  font-size: 0.85rem;
}

.btn-primary {
  background: #1a73e8;
  color: white;
  border: none;
}

.btn-primary:hover:not(:disabled) { background: #1557b0; }

.btn-danger {
  background: #d93025;
  color: white;
  border: none;
}

.btn-danger:hover:not(:disabled) { background: #b3261e; }

.btn:disabled { opacity: 0.5; cursor: not-allowed; }

.error-message {
  color: #d93025;
  font-size: 0.85rem;
  padding: 0.75rem;
  background: #ffeaea;
  border-radius: 8px;
}
</style>
