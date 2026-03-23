<template>
  <div class="notification-settings">
    <h1>通知設定</h1>
    <p class="subtitle">メール通知の受信設定を管理します</p>

    <div v-if="loading" class="loading">読み込み中...</div>

    <div v-else class="settings-card">
      <div class="setting-row">
        <div class="setting-info">
          <span class="setting-label">メール通知</span>
          <span class="setting-desc">配置変更、会議招待などの重要な通知をメールで受信します</span>
        </div>
        <label class="toggle">
          <input
            type="checkbox"
            v-model="notifyEmail"
            @change="saveSettings"
          />
          <span class="toggle-slider"></span>
        </label>
      </div>
    </div>

    <p v-if="saveMessage" class="save-message" :class="saveError ? 'error' : 'success'">
      {{ saveMessage }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useToast } from '~/composables/useToast'

const toast = useToast()
const loading = ref(true)
const notifyEmail = ref(true)
const saveMessage = ref('')
const saveError = ref(false)

async function fetchSettings() {
  loading.value = true
  try {
    const res = await $fetch<{ settings: { notifyEmail: boolean } }>('/api/users/me/notification-settings')
    notifyEmail.value = res.settings.notifyEmail
  } catch {
    toast.error('通知設定の読み込みに失敗しました')
  } finally {
    loading.value = false
  }
}

async function saveSettings() {
  try {
    await $fetch('/api/users/me/notification-settings', {
      method: 'PATCH',
      body: { notifyEmail: notifyEmail.value },
    })
    toast.success('通知設定を保存しました')
    saveMessage.value = ''
  } catch {
    toast.error('通知設定の保存に失敗しました')
  }
}

onMounted(() => fetchSettings())
</script>

<style scoped>
.notification-settings {
  max-width: 600px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

h1 { font-size: 1.5rem; font-weight: bold; margin-bottom: 0.25rem; }
.subtitle { color: #6b7280; margin-bottom: 1.5rem; }

.settings-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 20px;
}

.setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.setting-info { flex: 1; }
.setting-label { display: block; font-weight: 600; font-size: 0.95rem; }
.setting-desc { display: block; color: #6b7280; font-size: 0.8rem; margin-top: 4px; }

.toggle { position: relative; display: inline-block; width: 48px; height: 26px; }
.toggle input { opacity: 0; width: 0; height: 0; }
.toggle-slider {
  position: absolute; cursor: pointer; inset: 0;
  background: #d1d5db; border-radius: 26px; transition: 0.3s;
}
.toggle-slider::before {
  content: ''; position: absolute; height: 20px; width: 20px;
  left: 3px; bottom: 3px; background: white; border-radius: 50%; transition: 0.3s;
}
.toggle input:checked + .toggle-slider { background: #6366f1; }
.toggle input:checked + .toggle-slider::before { transform: translateX(22px); }

.save-message { margin-top: 1rem; font-size: 0.875rem; }
.save-message.success { color: #059669; }
.save-message.error { color: #dc2626; }
.loading { color: #6b7280; padding: 2rem; text-align: center; }
</style>
