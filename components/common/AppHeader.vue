<template>
  <header class="app-header">
    <!-- Left: Logo + Product Switcher -->
    <div class="header-left" ref="productMenuRef">
      <button class="brand-trigger" @click="toggleProductMenu" :aria-expanded="productMenuOpen">
        <span class="brand-icon">M</span>
        <span class="brand-text">ミエルボード</span>
        <span class="brand-arrow">&#9660;</span>
      </button>
      <span class="brand-powered">powered by ミエルプラス</span>

      <Transition name="dropdown">
        <div v-if="productMenuOpen" class="product-dropdown">
          <NuxtLink
            :to="homeLink"
            class="product-item product-item-active"
            @click="closeProductMenu"
          >
            <span class="product-check">&#10003;</span>
            ミエルボード
          </NuxtLink>
          <div class="product-item product-item-disabled">
            <span class="product-check"></span>
            ミエルストック
            <span class="product-badge">準備中</span>
          </div>
          <div class="product-item product-item-disabled">
            <span class="product-check"></span>
            ミエルドライブ
            <span class="product-badge">準備中</span>
          </div>
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

    <!-- Right: User Menu + Mobile Hamburger -->
    <div class="header-right">
      <template v-if="isAuthenticated">
        <!-- User Menu (desktop) -->
        <div class="user-menu" ref="userMenuRef">
          <button
            class="user-menu-trigger"
            @click="toggleMenu"
            :aria-expanded="menuOpen"
          >
            <span class="user-icon">{{ userInitial }}</span>
            <span class="user-name">{{ userName }}</span>
            <span class="role-badge" :class="roleClass">{{ roleLabel }}</span>
            <span class="dropdown-arrow">&#9660;</span>
          </button>

          <Transition name="dropdown">
            <div v-if="menuOpen" class="dropdown-menu">
              <!-- Settings Section -->
              <div class="menu-section">
                <div class="menu-section-header">設定</div>
                <NuxtLink to="/settings/profile" class="menu-item" @click="closeMenu">
                  <span class="menu-icon">&#128100;</span>
                  プロフィール
                </NuxtLink>
                <NuxtLink to="/settings/password" class="menu-item" @click="closeMenu">
                  <span class="menu-icon">&#128273;</span>
                  パスワード変更
                </NuxtLink>
                <NuxtLink to="/settings/calendar" class="menu-item" @click="closeMenu">
                  <span class="menu-icon">&#128197;</span>
                  カレンダー連携
                </NuxtLink>
              </div>

              <!-- Admin Section (ADMIN only) -->
              <div v-if="isAdmin" class="menu-section">
                <div class="menu-section-header">管理</div>
                <NuxtLink to="/admin/users" class="menu-item" @click="closeMenu">
                  <span class="menu-icon">&#128101;</span>
                  ユーザー管理
                </NuxtLink>
                <NuxtLink to="/admin/departments" class="menu-item" @click="closeMenu">
                  <span class="menu-icon">&#127970;</span>
                  部署管理
                </NuxtLink>
              </div>

              <!-- Logout -->
              <div class="menu-section menu-section-logout">
                <button class="menu-item menu-item-logout" @click="handleLogout">
                  <span class="menu-icon">&#128682;</span>
                  ログアウト
                </button>
              </div>
            </div>
          </Transition>
        </div>

        <!-- Mobile Hamburger Button -->
        <button
          class="mobile-menu-btn"
          @click="toggleMobileMenu"
          :aria-expanded="mobileMenuOpen"
          aria-label="メニューを開く"
        >
          <span class="hamburger-icon" :class="{ open: mobileMenuOpen }">
            <span></span>
            <span></span>
            <span></span>
          </span>
        </button>
      </template>
      <template v-else>
        <NuxtLink to="/login" class="login-link">ログイン</NuxtLink>
      </template>
    </div>

    <!-- Mobile Drawer Overlay -->
    <Transition name="overlay-fade">
      <div
        v-if="mobileMenuOpen"
        class="mobile-overlay"
        @click="closeMobileMenu"
      />
    </Transition>

    <!-- Mobile Drawer -->
    <Transition name="drawer-slide">
      <nav
        v-if="mobileMenuOpen"
        class="mobile-drawer"
        role="navigation"
        aria-label="モバイルメニュー"
      >
        <!-- Drawer Header -->
        <div class="drawer-header">
          <div class="drawer-user-info">
            <span class="drawer-user-icon">{{ userInitial }}</span>
            <div class="drawer-user-detail">
              <span class="drawer-user-name">{{ userName }}</span>
              <span class="drawer-role-badge" :class="roleClass">{{ roleLabel }}</span>
            </div>
          </div>
          <button class="drawer-close-btn" @click="closeMobileMenu" aria-label="メニューを閉じる">
            &#10005;
          </button>
        </div>

        <!-- Navigation Links -->
        <div class="drawer-section">
          <div class="drawer-section-header">ナビゲーション</div>
          <NuxtLink
            :to="`/org/${effectiveOrgSlug}/weekly-board`"
            class="drawer-item"
            :class="{ active: isActive('/weekly-board') }"
            @click="closeMobileMenu"
          >
            <span class="drawer-icon">&#128197;</span>
            週間ボード
          </NuxtLink>
          <NuxtLink
            to="/meetings"
            class="drawer-item"
            :class="{ active: isActive('/meetings') }"
            @click="closeMobileMenu"
          >
            <span class="drawer-icon">&#128336;</span>
            日程調整
          </NuxtLink>
        </div>

        <!-- Settings -->
        <div class="drawer-section">
          <div class="drawer-section-header">設定</div>
          <NuxtLink to="/settings/profile" class="drawer-item" @click="closeMobileMenu">
            <span class="drawer-icon">&#128100;</span>
            プロフィール
          </NuxtLink>
          <NuxtLink to="/settings/password" class="drawer-item" @click="closeMobileMenu">
            <span class="drawer-icon">&#128273;</span>
            パスワード変更
          </NuxtLink>
          <NuxtLink to="/settings/calendar" class="drawer-item" @click="closeMobileMenu">
            <span class="drawer-icon">&#128197;</span>
            カレンダー連携
          </NuxtLink>
        </div>

        <!-- Admin Section (ADMIN only) -->
        <div v-if="isAdmin" class="drawer-section">
          <div class="drawer-section-header">管理</div>
          <NuxtLink to="/admin/users" class="drawer-item" @click="closeMobileMenu">
            <span class="drawer-icon">&#128101;</span>
            ユーザー管理
          </NuxtLink>
          <NuxtLink to="/admin/departments" class="drawer-item" @click="closeMobileMenu">
            <span class="drawer-icon">&#127970;</span>
            部署管理
          </NuxtLink>
        </div>

        <!-- Logout -->
        <div class="drawer-section drawer-section-bottom">
          <button class="drawer-item drawer-item-logout" @click="handleMobileLogout">
            <span class="drawer-icon">&#128682;</span>
            ログアウト
          </button>
        </div>
      </nav>
    </Transition>
  </header>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '~/composables/useAuth'
import { useCsrf } from '~/composables/useCsrf'

const route = useRoute()
const router = useRouter()
const { user: authUser, isAuthenticated, fetchMe } = useAuth()
const { csrfFetch } = useCsrf()

// Product menu
const productMenuOpen = ref(false)
const productMenuRef = ref<HTMLElement | null>(null)

// User menu (desktop)
const menuOpen = ref(false)
const userMenuRef = ref<HTMLElement | null>(null)

// Mobile drawer
const mobileMenuOpen = ref(false)

// Computed
const userName = computed(() => authUser.value?.name || authUser.value?.email || '')
const userInitial = computed(() => {
  const name = authUser.value?.name || authUser.value?.email || ''
  return name.charAt(0).toUpperCase()
})

const isAdmin = computed(() => authUser.value?.role === 'ADMIN')

const roleClass = computed(() => {
  const role = authUser.value?.role
  return {
    'role-admin': role === 'ADMIN',
    'role-leader': role === 'LEADER',
    'role-member': role === 'MEMBER'
  }
})

const roleLabel = computed(() => {
  const roleMap: Record<string, string> = {
    ADMIN: '管理者',
    LEADER: 'リーダー',
    MEMBER: '一般'
  }
  return roleMap[authUser.value?.role || ''] || '一般'
})

// orgSlug from route or default
const effectiveOrgSlug = computed(() => {
  return (route.params.slug as string) || 'demo'
})

const homeLink = computed(() => {
  if (isAuthenticated.value && effectiveOrgSlug.value) {
    return `/org/${effectiveOrgSlug.value}/weekly-board`
  }
  return '/'
})

// Methods
function isActive(path: string): boolean {
  return route.path.includes(path)
}

// Product menu
function toggleProductMenu() {
  productMenuOpen.value = !productMenuOpen.value
}

function closeProductMenu() {
  productMenuOpen.value = false
}

// User menu (desktop)
function toggleMenu() {
  menuOpen.value = !menuOpen.value
}

function closeMenu() {
  menuOpen.value = false
}

// Mobile drawer
function toggleMobileMenu() {
  mobileMenuOpen.value = !mobileMenuOpen.value
  if (mobileMenuOpen.value) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
}

function closeMobileMenu() {
  mobileMenuOpen.value = false
  document.body.style.overflow = ''
}

// Click outside handler
function handleClickOutside(event: MouseEvent) {
  if (userMenuRef.value && !userMenuRef.value.contains(event.target as Node)) {
    closeMenu()
  }
  if (productMenuRef.value && !productMenuRef.value.contains(event.target as Node)) {
    closeProductMenu()
  }
}

// Logout
async function handleLogout() {
  closeMenu()
  try {
    await csrfFetch('/api/auth/logout', { method: 'POST' })
  } catch {
    // ignore
  }
  const { clear } = useAuth()
  clear()
  router.push('/login')
}

async function handleMobileLogout() {
  closeMobileMenu()
  try {
    await csrfFetch('/api/auth/logout', { method: 'POST' })
  } catch {
    // ignore
  }
  const { clear } = useAuth()
  clear()
  router.push('/login')
}

// Close mobile menu on route change
watch(() => route.fullPath, () => {
  closeMobileMenu()
})

onMounted(() => {
  fetchMe()
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  document.body.style.overflow = ''
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

.product-item-disabled {
  color: #999;
  cursor: not-allowed;
}

.product-item-disabled:hover {
  background: transparent;
}

.product-badge {
  margin-left: auto;
  font-size: 0.7rem;
  padding: 0.15rem 0.4rem;
  background: #f0f0f0;
  color: #888;
  border-radius: 3px;
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

/* Right: User Menu + Hamburger */
.header-right {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
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

/* ========================================
   Mobile Hamburger Button
   ======================================== */
.mobile-menu-btn {
  display: none;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: none;
  border: 1px solid #444;
  border-radius: 6px;
  cursor: pointer;
  padding: 0;
  transition: background 0.2s;
}

.mobile-menu-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

/* Hamburger icon with CSS animation */
.hamburger-icon {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 20px;
  height: 16px;
  position: relative;
}

.hamburger-icon span {
  display: block;
  width: 100%;
  height: 2px;
  background: #fff;
  border-radius: 1px;
  transition: all 0.3s ease;
  position: absolute;
  left: 0;
}

.hamburger-icon span:nth-child(1) {
  top: 0;
}

.hamburger-icon span:nth-child(2) {
  top: 50%;
  transform: translateY(-50%);
}

.hamburger-icon span:nth-child(3) {
  bottom: 0;
}

/* Hamburger to X animation */
.hamburger-icon.open span:nth-child(1) {
  top: 50%;
  transform: translateY(-50%) rotate(45deg);
}

.hamburger-icon.open span:nth-child(2) {
  opacity: 0;
}

.hamburger-icon.open span:nth-child(3) {
  bottom: 50%;
  transform: translateY(50%) rotate(-45deg);
}

/* ========================================
   Mobile Overlay
   ======================================== */
.mobile-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 200;
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

/* ========================================
   Mobile Drawer
   ======================================== */
.mobile-drawer {
  position: fixed;
  top: 0;
  right: 0;
  width: 280px;
  max-width: 80vw;
  height: 100vh;
  background: #fff;
  z-index: 300;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.15);
}

/* Drawer slide animation */
.drawer-slide-enter-active,
.drawer-slide-leave-active {
  transition: transform 0.3s ease;
}

.drawer-slide-enter-from,
.drawer-slide-leave-to {
  transform: translateX(100%);
}

/* Drawer Header */
.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  background: #1a1a2e;
  color: #fff;
  border-bottom: 2px solid var(--color-primary, #1a73e8);
}

.drawer-user-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.drawer-user-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: var(--color-primary, #1a73e8);
  border-radius: 50%;
  font-size: 1rem;
  font-weight: 600;
}

.drawer-user-detail {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.drawer-user-name {
  font-size: 0.9rem;
  font-weight: 600;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.drawer-role-badge {
  font-size: 0.65rem;
  padding: 0.1rem 0.35rem;
  border-radius: 3px;
  background: #444;
  width: fit-content;
}

.drawer-close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 6px;
  color: #fff;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s;
}

.drawer-close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* Drawer Sections */
.drawer-section {
  padding: 0.75rem 0;
  border-bottom: 1px solid #eee;
}

.drawer-section:last-child {
  border-bottom: none;
}

.drawer-section-header {
  padding: 0.25rem 1.25rem 0.5rem;
  font-size: 0.7rem;
  color: #888;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.drawer-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1.25rem;
  color: #333;
  text-decoration: none;
  transition: background 0.15s;
  font-size: 0.9rem;
  border: none;
  background: none;
  width: 100%;
  text-align: left;
  cursor: pointer;
}

.drawer-item:hover {
  background: #f5f5f5;
}

.drawer-item.active {
  color: var(--color-primary, #1a73e8);
  background: rgba(26, 115, 232, 0.08);
  font-weight: 600;
}

.drawer-icon {
  font-size: 1.1rem;
  width: 1.5rem;
  text-align: center;
}

.drawer-section-bottom {
  margin-top: auto;
}

.drawer-item-logout {
  color: #d32f2f;
}

.drawer-item-logout:hover {
  background: #ffebee;
}

/* ========================================
   Mobile responsive
   ======================================== */
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

  /* Desktop user menu hidden on mobile */
  .user-menu {
    display: none;
  }

  /* Hamburger visible on mobile */
  .mobile-menu-btn {
    display: flex;
  }
}

@media (max-width: 480px) {
  .mobile-drawer {
    width: 100vw;
    max-width: 100vw;
  }
}
</style>
