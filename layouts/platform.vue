<template>
  <div class="platform-layout">
    <!-- Mobile Sidebar Overlay -->
    <Transition name="overlay-fade">
      <div
        v-if="sidebarOpen"
        class="sidebar-overlay"
        @click="closeSidebar"
      />
    </Transition>

    <!-- サイドバー -->
    <aside class="platform-sidebar" :class="{ open: sidebarOpen }">
      <div class="sidebar-header">
        <div class="logo">
          <span class="logo-icon">M</span>
          <span class="logo-text">ミエルプラス運営</span>
        </div>
        <button class="sidebar-close-btn" @click="closeSidebar" aria-label="サイドバーを閉じる">
          &#10005;
        </button>
      </div>

      <nav class="sidebar-nav">
        <NuxtLink to="/platform" class="nav-item" :class="{ active: route.path === '/platform' }" @click="closeSidebar">
          <span class="nav-icon">dashboard</span>
          <span class="nav-label">ダッシュボード</span>
        </NuxtLink>

        <NuxtLink to="/platform/plans" class="nav-item" :class="{ active: route.path === '/platform/plans' }" @click="closeSidebar">
          <span class="nav-icon">layers</span>
          <span class="nav-label">プラン管理</span>
        </NuxtLink>

        <NuxtLink to="/platform/credit-packs" class="nav-item" :class="{ active: route.path === '/platform/credit-packs' }" @click="closeSidebar">
          <span class="nav-icon">bolt</span>
          <span class="nav-label">クレジットパック</span>
        </NuxtLink>

        <NuxtLink to="/platform/cohorts" class="nav-item" :class="{ active: route.path === '/platform/cohorts' }" @click="closeSidebar">
          <span class="nav-icon">percent</span>
          <span class="nav-label">コホート割引</span>
        </NuxtLink>

        <div class="nav-divider"></div>

        <NuxtLink to="/platform/organizations" class="nav-item" :class="{ active: route.path.startsWith('/platform/organizations') }" @click="closeSidebar">
          <span class="nav-icon">business</span>
          <span class="nav-label">契約一覧</span>
        </NuxtLink>
      </nav>

      <div class="sidebar-footer">
        <NuxtLink to="/" class="nav-item back-link" @click="closeSidebar">
          <span class="nav-icon">arrow_back</span>
          <span class="nav-label">メインに戻る</span>
        </NuxtLink>
      </div>
    </aside>

    <!-- メインコンテンツ -->
    <div class="platform-main">
      <header class="platform-header">
        <!-- Mobile hamburger for sidebar -->
        <button class="sidebar-toggle-btn" @click="toggleSidebar" aria-label="サイドバーを開く">
          <span class="toggle-icon">
            <span></span>
            <span></span>
            <span></span>
          </span>
        </button>

        <div class="header-title">
          <slot name="header-title">プラットフォーム管理</slot>
        </div>
        <div class="header-user">
          <span v-if="user" class="user-name">{{ user.name || user.email }}</span>
          <button @click="logout" class="logout-btn">ログアウト</button>
        </div>
      </header>

      <main class="platform-content">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const route = useRoute()
const router = useRouter()

const { data: authData } = await useFetch('/api/auth/me')
const user = computed(() => authData.value?.user)

const sidebarOpen = ref(false)

function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value
  if (sidebarOpen.value) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
}

function closeSidebar() {
  sidebarOpen.value = false
  document.body.style.overflow = ''
}

async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  router.push('/login')
}

// Close sidebar on route change
watch(() => route.fullPath, () => {
  closeSidebar()
})
</script>

<style scoped>
.platform-layout {
  display: flex;
  min-height: 100vh;
  background: #f1f5f9;
}

/* Sidebar Overlay */
.sidebar-overlay {
  display: none;
}

/* Overlay animation */
.overlay-fade-enter-active,
.overlay-fade-leave-active {
  transition: opacity 0.3s ease;
}

.overlay-fade-enter-from,
.overlay-fade-leave-to {
  opacity: 0;
}

/* サイドバー */
.platform-sidebar {
  width: 260px;
  background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 100;
  transition: transform 0.3s ease;
}

.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sidebar-close-btn {
  display: none;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 6px;
  color: #fff;
  font-size: 0.85rem;
  cursor: pointer;
  transition: background 0.2s;
}

.sidebar-close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-icon {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.2rem;
  color: #fff;
}

.logo-text {
  color: #fff;
  font-weight: 600;
  font-size: 1rem;
}

.sidebar-nav {
  flex: 1;
  padding: 16px 12px;
  overflow-y: auto;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  color: #94a3b8;
  text-decoration: none;
  border-radius: 8px;
  margin-bottom: 4px;
  transition: all 0.2s;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #e2e8f0;
}

.nav-item.active {
  background: rgba(59, 130, 246, 0.2);
  color: #60a5fa;
}

.nav-icon {
  font-family: 'Material Symbols Outlined', sans-serif;
  font-size: 20px;
}

.nav-label {
  font-size: 0.9rem;
  font-weight: 500;
}

.nav-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.1);
  margin: 16px 0;
}

.sidebar-footer {
  padding: 16px 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.back-link {
  color: #64748b;
}

.back-link:hover {
  color: #94a3b8;
}

/* メインコンテンツ */
.platform-main {
  flex: 1;
  margin-left: 260px;
  display: flex;
  flex-direction: column;
}

.platform-header {
  height: 64px;
  background: #fff;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  position: sticky;
  top: 0;
  z-index: 50;
}

/* Sidebar toggle (hidden on desktop) */
.sidebar-toggle-btn {
  display: none;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: none;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  cursor: pointer;
  padding: 0;
  margin-right: 12px;
  transition: background 0.2s;
}

.sidebar-toggle-btn:hover {
  background: #f1f5f9;
}

.toggle-icon {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 18px;
  height: 14px;
  position: relative;
}

.toggle-icon span {
  display: block;
  width: 100%;
  height: 2px;
  background: #475569;
  border-radius: 1px;
  position: absolute;
  left: 0;
}

.toggle-icon span:nth-child(1) {
  top: 0;
}

.toggle-icon span:nth-child(2) {
  top: 50%;
  transform: translateY(-50%);
}

.toggle-icon span:nth-child(3) {
  bottom: 0;
}

.header-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #1e293b;
}

.header-user {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-name {
  color: #64748b;
  font-size: 0.9rem;
}

.logout-btn {
  padding: 6px 12px;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  color: #475569;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}

.logout-btn:hover {
  background: #e2e8f0;
}

.platform-content {
  flex: 1;
  padding: 32px;
}

@media (max-width: 1024px) {
  .platform-sidebar {
    width: 200px;
  }

  .platform-main {
    margin-left: 200px;
  }

  .logo-text {
    font-size: 0.85rem;
  }
}

@media (max-width: 768px) {
  .platform-sidebar {
    width: 260px;
    transform: translateX(-100%);
    z-index: 200;
  }

  .platform-sidebar.open {
    transform: translateX(0);
  }

  .sidebar-close-btn {
    display: flex;
  }

  .sidebar-overlay {
    display: block;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 150;
  }

  .platform-main {
    margin-left: 0;
  }

  .sidebar-toggle-btn {
    display: flex;
  }

  .platform-header {
    padding: 0 16px;
  }

  .platform-content {
    padding: 16px;
  }
}
</style>
