<template>
  <div class="settings-page">
    <div class="settings-container">
      <h1 class="page-title">設定</h1>

      <div class="settings-list">
        <NuxtLink to="/settings/profile" class="settings-item">
          <div class="item-icon">👤</div>
          <div class="item-content">
            <div class="item-title">プロフィール</div>
            <div class="item-description">名前の変更、アカウント情報の確認</div>
          </div>
          <div class="item-arrow">→</div>
        </NuxtLink>

        <NuxtLink to="/settings/password" class="settings-item">
          <div class="item-icon">🔑</div>
          <div class="item-content">
            <div class="item-title">パスワード変更</div>
            <div class="item-description">ログインパスワードの変更</div>
          </div>
          <div class="item-arrow">→</div>
        </NuxtLink>

        <NuxtLink to="/settings/calendar" class="settings-item">
          <div class="item-icon">📅</div>
          <div class="item-content">
            <div class="item-title">カレンダー連携</div>
            <div class="item-description">Googleカレンダーとの同期設定</div>
          </div>
          <div class="item-arrow">→</div>
        </NuxtLink>
      </div>

      <!-- Admin Section -->
      <div v-if="isAdmin" class="settings-section">
        <h2 class="section-title">管理</h2>
        <div class="settings-list">
          <NuxtLink to="/admin/users" class="settings-item">
            <div class="item-icon">👥</div>
            <div class="item-content">
              <div class="item-title">ユーザー管理</div>
              <div class="item-description">社員の追加・編集・権限設定</div>
            </div>
            <div class="item-arrow">→</div>
          </NuxtLink>

          <NuxtLink to="/admin/departments" class="settings-item">
            <div class="item-icon">🏢</div>
            <div class="item-content">
              <div class="item-title">部署管理</div>
              <div class="item-description">部署の追加・編集・削除</div>
            </div>
            <div class="item-arrow">→</div>
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

definePageMeta({
  layout: 'default',
  middleware: 'auth'
})

interface UserInfo {
  id: string
  name: string
  email: string
  role: string
}

const router = useRouter()
const user = ref<UserInfo | null>(null)

const isAdmin = computed(() => {
  const role = user.value?.role
  return role === 'ADMIN'
})

async function fetchUser() {
  try {
    const response = await $fetch<{ success: boolean; user: UserInfo | null; isAuthenticated: boolean }>('/api/auth/me')
    if (!response.isAuthenticated) {
      router.push('/login?redirect=/settings')
      return
    }
    user.value = response.user
  } catch {
    router.push('/login?redirect=/settings')
  }
}

onMounted(() => {
  fetchUser()
})

useHead({
  title: '設定'
})
</script>

<style scoped>
.settings-page {
  padding: 2rem;
  max-width: 600px;
  margin: 0 auto;
}

.settings-container {
  background: #fff;
  border-radius: 8px;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.page-title {
  font-size: 1.5rem;
  color: #333;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #eee;
}

.settings-section {
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid #eee;
}

.section-title {
  font-size: 1.1rem;
  color: #666;
  margin-bottom: 1rem;
}

.settings-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.settings-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: #f9f9f9;
  border-radius: 8px;
  text-decoration: none;
  color: inherit;
  transition: background 0.2s, transform 0.1s;
}

.settings-item:hover {
  background: #f0f0f0;
  transform: translateX(4px);
}

.item-icon {
  font-size: 1.5rem;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.item-content {
  flex: 1;
}

.item-title {
  font-weight: 600;
  color: #333;
  margin-bottom: 0.25rem;
}

.item-description {
  font-size: 0.85rem;
  color: #888;
}

.item-arrow {
  color: #ccc;
  font-size: 1.2rem;
}

@media (max-width: 640px) {
  .settings-page {
    padding: 1rem;
  }

  .settings-container {
    padding: 1.5rem;
  }

  .settings-item {
    padding: 0.75rem;
  }

  .item-icon {
    width: 36px;
    height: 36px;
    font-size: 1.25rem;
  }
}
</style>
