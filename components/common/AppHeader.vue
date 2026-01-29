<template>
  <header class="app-header">
    <!-- Left: Logo + Product Switcher -->
    <div class="header-left" ref="productMenuRef">
      <button class="brand-trigger" @click="toggleProductMenu" :aria-expanded="productMenuOpen">
        <span class="brand-icon">M</span>
        <span class="brand-text">ミエルボード</span>
        <span class="brand-arrow">▼</span>
      </button>
      <span class="brand-powered">powered by ミエルプラス</span>

      <Transition name="dropdown">
        <div v-if="productMenuOpen" class="product-dropdown">
          <NuxtLink
            :to="homeLink"
            class="product-item product-item-active"
            @click="closeProductMenu"
          >
            <span class="product-check">✓</span>
            ミエルボード
          </NuxtLink>
          <a href="/" class="product-item" @click="closeProductMenu">
            <span class="product-check"></span>
            ミエルストック
          </a>
          <a href="/" class="product-item" @click="closeProductMenu">
            <span class="product-check"></span>
            ミエルドライブ
          </a>
        </div>
      </Transition>
    </div>

    <!-- Center: Main Navigation (hidden on mobile) -->
    <nav v-if="isAuthenticated" class="main-nav">
      <NuxtLink
        :to="`/org/${effectiveOrgSlug}/weekly-board`"
        class="nav-link"
        :class="{ active: isActive('/weekly-board') }"
      >
        週間ボード
      </NuxtLink>
      <NuxtLink
        to="/meetings"
        class="nav-link"
        :class="{ active: isActive('/meetings') }"
      >
        日程調整
      </NuxtLink>
    </nav>

    <!-- Right: User Menu or Login Link -->
    <div class="header-right">
      <template v-if="isAuthenticated">
        <div class="user-menu" ref="userMenuRef">
          <button
            class="user-menu-trigger"
            @click="toggleMenu"
            :aria-expanded="menuOpen"
          >
            <span class="user-icon">{{ userInitial }}</span>
            <span class="user-name">{{ userName }}</span>
            <span class="role-badge" :class="roleClass">{{ roleLabel }}</span>
            <span class="dropdown-arrow">▼</span>
          </button>

          <Transition name="dropdown">
            <div v-if="menuOpen" class="dropdown-menu">
              <!-- Settings Section -->
              <div class="menu-section">
                <div class="menu-section-header">設定</div>
                <NuxtLink to="/settings/profile" class="menu-item" @click="closeMenu">
                  <span class="menu-icon">👤</span>
                  プロフィール
                </NuxtLink>
                <NuxtLink to="/settings/password" class="menu-item" @click="closeMenu">
                  <span class="menu-icon">🔑</span>
                  パスワード変更
                </NuxtLink>
              </div>

              <!-- Admin Section (ADMIN/SUPER_ADMIN only) -->
              <div v-if="isAdmin" class="menu-section">
                <div class="menu-section-header">管理</div>
                <NuxtLink to="/admin/users" class="menu-item" @click="closeMenu">
                  <span class="menu-icon">👥</span>
                  ユーザー管理
                </NuxtLink>
                <NuxtLink to="/admin/departments" class="menu-item" @click="closeMenu">
                  <span class="menu-icon">🏢</span>
                  部署管理
                </NuxtLink>
              </div>

              <!-- Logout -->
              <div class="menu-section menu-section-logout">
                <button class="menu-item menu-item-logout" @click="handleLogout">
                  <span class="menu-icon">🚪</span>
                  ログアウト
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </template>
      <template v-else>
        <NuxtLink to="/login" class="login-link">ログイン</NuxtLink>
      </template>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

interface UserInfo {
  id: string
  name: string | null
  email: string
  role: string
  department?: {
    id: string
    name: string
  } | null
}

interface MeResponse {
  success: boolean
  user: UserInfo | null
  organization: {
    id: string
    name: string
    slug?: string
  } | null
  isAuthenticated: boolean
  isDevice: boolean
}

const route = useRoute()
const router = useRouter()

const user = ref<UserInfo | null>(null)
const orgSlug = ref<string | null>(null)
const isAuthenticated = ref(false)
const menuOpen = ref(false)
const productMenuOpen = ref(false)
const userMenuRef = ref<HTMLElement | null>(null)
const productMenuRef = ref<HTMLElement | null>(null)

// Computed
const userName = computed(() => user.value?.name || user.value?.email || '')
const userInitial = computed(() => {
  const name = user.value?.name || user.value?.email || ''
  return name.charAt(0).toUpperCase()
})

const isAdmin = computed(() => {
  const role = user.value?.role
  return role === 'ADMIN' || role === 'SUPER_ADMIN'
})

const roleClass = computed(() => {
  const role = user.value?.role
  return {
    'role-super-admin': role === 'SUPER_ADMIN',
    'role-admin': role === 'ADMIN',
    'role-leader': role === 'LEADER',
    'role-member': role === 'MEMBER'
  }
})

const roleLabel = computed(() => {
  const roleMap: Record<string, string> = {
    SUPER_ADMIN: '最高管理者',
    ADMIN: '管理者',
    LEADER: 'リーダー',
    MEMBER: '一般'
  }
  return roleMap[user.value?.role || ''] || '一般'
})

// ホームリンク：ログイン済みなら週間ボード、未ログインならランディング
const homeLink = computed(() => {
  if (isAuthenticated.value && effectiveOrgSlug.value) {
    return `/org/${effectiveOrgSlug.value}/weekly-board`
  }
  return '/'
})

// orgSlugのフォールバック（デフォルト: 'demo'）
const effectiveOrgSlug = computed(() => {
  return orgSlug.value || 'demo'
})

// Methods
function isActive(path: string): boolean {
  return route.path.includes(path)
}

function toggleMenu() {
  menuOpen.value = !menuOpen.value
}

function closeMenu() {
  menuOpen.value = false
}

function toggleProductMenu() {
  productMenuOpen.value = !productMenuOpen.value
}

function closeProductMenu() {
  productMenuOpen.value = false
}

function handleClickOutside(event: MouseEvent) {
  if (userMenuRef.value && !userMenuRef.value.contains(event.target as Node)) {
    closeMenu()
  }
  if (productMenuRef.value && !productMenuRef.value.contains(event.target as Node)) {
    closeProductMenu()
  }
}

async function handleLogout() {
  closeMenu()
  try {
    await $fetch('/api/auth/logout', { method: 'POST' })
  } catch {
    // ignore
  }
  isAuthenticated.value = false
  user.value = null
  router.push('/login')
}

async function fetchUser() {
  try {
    const response = await $fetch<MeResponse>('/api/auth/me')
    if (response.success && response.user) {
      user.value = response.user
      isAuthenticated.value = response.isAuthenticated

      // Get org slug from route or fetch from response
      if (route.params.slug) {
        orgSlug.value = route.params.slug as string
      } else if (response.organization?.slug) {
        orgSlug.value = response.organization.slug
      }
    }
  } catch {
    isAuthenticated.value = false
    user.value = null
  }
}

onMounted(() => {
  fetchUser()
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

// ページ遷移時に認証状態を再取得（ログイン後などに対応）
watch(() => route.fullPath, () => {
  fetchUser()
})
</script>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.5rem;
  background: #1a1a2e;
  color: #fff;
  border-bottom: 2px solid var(--color-primary, #1a73e8);
  position: sticky;
  top: 0;
  z-index: 100;
}

/* Left: Brand + Product Switcher */
.header-left {
  flex-shrink: 0;
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.brand-trigger {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #fff;
  font-weight: 600;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  transition: background 0.2s;
}

.brand-trigger:hover {
  background: rgba(255, 255, 255, 0.1);
}

.brand-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: var(--color-primary, #1a73e8);
  border-radius: 6px;
  font-weight: bold;
}

.brand-text {
  font-size: 1.1rem;
}

.brand-arrow {
  font-size: 0.6rem;
  color: #888;
}

.brand-powered {
  font-size: 0.7rem;
  color: #888;
  white-space: nowrap;
}

/* Product Switcher Dropdown */
.product-dropdown {
  position: absolute;
  top: calc(100% + 0.5rem);
  left: 0;
  min-width: 200px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  z-index: 1000;
  padding: 0.5rem 0;
}

.product-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  color: #333;
  text-decoration: none;
  transition: background 0.15s;
  font-size: 0.9rem;
  cursor: pointer;
}

.product-item:hover {
  background: #f5f5f5;
}

.product-item-active {
  font-weight: 600;
  color: var(--color-primary, #1a73e8);
}

.product-check {
  display: inline-block;
  width: 1rem;
  text-align: center;
  font-size: 0.85rem;
}

/* Center: Main Navigation */
.main-nav {
  display: flex;
  gap: 1rem;
}

.nav-link {
  color: #aaa;
  text-decoration: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  transition: all 0.2s;
}

.nav-link:hover,
.nav-link.active {
  color: #fff;
  background: rgba(26, 115, 232, 0.3);
}

/* Right: User Menu */
.header-right {
  flex-shrink: 0;
}

.login-link {
  color: #fff;
  text-decoration: none;
  padding: 0.5rem 1rem;
  background: var(--color-primary, #1a73e8);
  border-radius: 6px;
  transition: background 0.2s;
}

.login-link:hover {
  background: #1557b0;
}

.user-menu {
  position: relative;
}

.user-menu-trigger {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: transparent;
  border: 1px solid #444;
  border-radius: 6px;
  color: #fff;
  cursor: pointer;
  transition: all 0.2s;
}

.user-menu-trigger:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: #666;
}

.user-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: var(--color-primary, #1a73e8);
  border-radius: 50%;
  font-size: 0.85rem;
  font-weight: 600;
}

.user-name {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.role-badge {
  font-size: 0.7rem;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  background: #444;
}

.role-super-admin {
  background: #d32f2f;
}

.role-admin {
  background: #1a73e8;
}

.role-leader {
  background: #388e3c;
}

.role-member {
  background: #666;
}

.dropdown-arrow {
  font-size: 0.6rem;
  color: #888;
}

/* Dropdown Menu */
.dropdown-menu {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  min-width: 200px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  z-index: 1000;
}

.menu-section {
  padding: 0.5rem 0;
  border-bottom: 1px solid #eee;
}

.menu-section:last-child {
  border-bottom: none;
}

.menu-section-header {
  padding: 0.25rem 1rem;
  font-size: 0.75rem;
  color: #888;
  font-weight: 600;
  text-transform: uppercase;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  color: #333;
  text-decoration: none;
  transition: background 0.15s;
  border: none;
  background: none;
  width: 100%;
  font-size: 0.9rem;
  cursor: pointer;
  text-align: left;
}

.menu-item:hover {
  background: #f5f5f5;
}

.menu-item-logout {
  color: #d32f2f;
}

.menu-item-logout:hover {
  background: #ffebee;
}

.menu-icon {
  font-size: 1rem;
}

/* Dropdown animation */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.15s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* Mobile responsive */
@media (max-width: 768px) {
  .main-nav {
    display: none;
  }

  .brand-text {
    display: none;
  }

  .brand-powered {
    display: none;
  }

  .app-header {
    padding: 0.75rem 1rem;
  }
}

@media (max-width: 480px) {
  .user-name {
    display: none;
  }

  .role-badge {
    display: none;
  }

  .dropdown-arrow {
    display: none;
  }
}
</style>
