<template>
  <nav class="admin-nav">
    <div class="nav-brand">
      <NuxtLink to="/" class="brand-link">📋 ミエルプラス</NuxtLink>
    </div>
    <ul class="nav-menu">
      <li>
        <NuxtLink to="/admin/users" :class="{ active: isActive('/admin/users') }">
          👥 ユーザー管理
        </NuxtLink>
      </li>
      <li>
        <NuxtLink to="/admin/departments" :class="{ active: isActive('/admin/departments') }">
          🏢 部署管理
        </NuxtLink>
      </li>
    </ul>
    <div class="nav-user">
      <span class="user-name">{{ userName }}</span>
      <button class="btn-logout" @click="logout">ログアウト</button>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const userName = ref('')

function isActive(path: string): boolean {
  return route.path.startsWith(path)
}

async function logout() {
  try {
    await $fetch('/api/auth/logout', { method: 'POST' })
  } catch {
    // ignore
  }
  router.push('/login')
}

onMounted(async () => {
  try {
    const response = await $fetch<{ user?: { name: string | null } }>('/api/auth/me')
    userName.value = response.user?.name || '管理者'
  } catch {
    userName.value = '管理者'
  }
})
</script>

<style scoped>
.admin-nav {
  display: flex;
  align-items: center;
  gap: 2rem;
  padding: 0.75rem 2rem;
  background: #1a1a2e;
  color: #fff;
  border-bottom: 2px solid #1a73e8;
}

.nav-brand {
  flex-shrink: 0;
}

.brand-link {
  color: #fff;
  text-decoration: none;
  font-size: 1.2rem;
  font-weight: 600;
}

.nav-menu {
  display: flex;
  list-style: none;
  margin: 0;
  padding: 0;
  gap: 1.5rem;
  flex: 1;
}

.nav-menu a {
  color: #ccc;
  text-decoration: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  transition: all 0.2s;
}

.nav-menu a:hover,
.nav-menu a.active {
  color: #fff;
  background: rgba(26, 115, 232, 0.3);
}

.nav-user {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.user-name {
  font-size: 0.9rem;
  color: #aaa;
}

.btn-logout {
  padding: 0.4rem 0.8rem;
  background: transparent;
  border: 1px solid #666;
  color: #ccc;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
}

.btn-logout:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

/* モバイル対応 */
@media (max-width: 768px) {
  .admin-nav {
    flex-wrap: wrap;
    padding: 0.75rem 1rem;
    gap: 0.75rem;
  }

  .nav-menu {
    order: 3;
    width: 100%;
    gap: 0.5rem;
    justify-content: center;
  }

  .nav-menu a {
    padding: 0.4rem 0.6rem;
    font-size: 0.85rem;
  }

  .nav-user {
    margin-left: auto;
  }

  .user-name {
    display: none;
  }
}
</style>
