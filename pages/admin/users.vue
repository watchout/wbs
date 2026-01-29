<template>
  <div class="admin-users-page">
    <div class="admin-page">
      <div class="page-header">
      <h1>ユーザー管理</h1>
      <button class="btn btn-primary" @click="openCreateModal">+ ユーザー追加</button>
    </div>

    <div v-if="error" class="error-message">{{ error }}</div>

    <table v-if="users.length > 0" class="users-table">
      <thead>
        <tr>
          <th>名前</th>
          <th>メール</th>
          <th>権限</th>
          <th>部署</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="user in users" :key="user.id">
          <td>{{ user.name || '(未設定)' }}</td>
          <td>{{ user.email }}</td>
          <td>
            <span class="role-badge" :class="user.role.toLowerCase()">
              {{ user.role }}
            </span>
          </td>
          <td>{{ user.department?.name || '-' }}</td>
          <td class="actions">
            <button class="btn btn-sm" @click="openEditModal(user)">編集</button>
            <button class="btn btn-sm btn-danger" @click="confirmDelete(user)">削除</button>
          </td>
        </tr>
      </tbody>
    </table>

    <p v-else-if="!loading" class="empty-state">ユーザーがいません</p>

    <!-- モーダル -->
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal-card">
        <h2>{{ editingUser ? 'ユーザー編集' : 'ユーザー追加' }}</h2>
        <form @submit.prevent="handleSubmit">
          <div class="form-group" v-if="!editingUser">
            <label>メールアドレス</label>
            <input v-model="form.email" type="email" required :disabled="submitting" />
          </div>
          <div class="form-group">
            <label>名前</label>
            <input v-model="form.name" type="text" :disabled="submitting" />
          </div>
          <div class="form-group">
            <label>権限</label>
            <select v-model="form.role" :disabled="submitting">
              <option value="MEMBER">一般社員</option>
              <option value="LEADER">リーダー/配車担当</option>
              <option value="ADMIN">管理者</option>
            </select>
          </div>
          <div class="form-group">
            <label>部署</label>
            <select v-model="form.departmentId" :disabled="submitting">
              <option value="">なし</option>
              <option v-for="dept in departments" :key="dept.id" :value="dept.id">
                {{ dept.name }}
              </option>
            </select>
          </div>
          <div v-if="modalError" class="error-message">{{ modalError }}</div>
          <div class="modal-actions">
            <button type="button" class="btn" @click="closeModal" :disabled="submitting">キャンセル</button>
            <button type="submit" class="btn btn-primary" :disabled="submitting">
              {{ submitting ? '保存中...' : '保存' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- 削除確認 -->
    <div v-if="showDeleteConfirm" class="modal-overlay" @click.self="showDeleteConfirm = false">
      <div class="modal-card">
        <h2>ユーザー削除</h2>
        <p>「{{ deletingUser?.name || deletingUser?.email }}」を削除しますか？</p>
        <div class="modal-actions">
          <button class="btn" @click="showDeleteConfirm = false">キャンセル</button>
          <button class="btn btn-danger" @click="handleDelete" :disabled="submitting">
            {{ submitting ? '削除中...' : '削除' }}
          </button>
        </div>
      </div>
    </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
definePageMeta({
  middleware: 'admin'
})

interface User {
  id: string
  email: string
  name: string | null
  role: string
  department: { id: string; name: string } | null
  createdAt: string
}

interface Department {
  id: string
  name: string
}

const users = ref<User[]>([])
const departments = ref<Department[]>([])
const loading = ref(false)
const error = ref('')
const showModal = ref(false)
const showDeleteConfirm = ref(false)
const editingUser = ref<User | null>(null)
const deletingUser = ref<User | null>(null)
const submitting = ref(false)
const modalError = ref('')

const form = ref({
  email: '',
  name: '',
  role: 'MEMBER',
  departmentId: ''
})

async function fetchUsers() {
  loading.value = true
  try {
    const res = await $fetch<{ success: boolean; users: User[] }>('/api/users')
    users.value = res.users
  } catch {
    error.value = 'ユーザー一覧の取得に失敗しました'
  } finally {
    loading.value = false
  }
}

async function fetchDepartments() {
  try {
    const res = await $fetch<{ success: boolean; departments: Department[] }>('/api/departments')
    departments.value = res.departments
  } catch {
    // 部署取得失敗は無視
  }
}

function openCreateModal() {
  editingUser.value = null
  form.value = { email: '', name: '', role: 'MEMBER', departmentId: '' }
  modalError.value = ''
  showModal.value = true
}

function openEditModal(user: User) {
  editingUser.value = user
  form.value = {
    email: user.email,
    name: user.name || '',
    role: user.role,
    departmentId: user.department?.id || ''
  }
  modalError.value = ''
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingUser.value = null
}

function confirmDelete(user: User) {
  deletingUser.value = user
  showDeleteConfirm.value = true
}

async function handleSubmit() {
  submitting.value = true
  modalError.value = ''
  try {
    if (editingUser.value) {
      await $fetch(`/api/users/${editingUser.value.id}`, {
        method: 'PATCH',
        body: {
          name: form.value.name,
          role: form.value.role,
          departmentId: form.value.departmentId || null
        }
      })
    } else {
      await $fetch('/api/users', {
        method: 'POST',
        body: {
          email: form.value.email,
          name: form.value.name,
          role: form.value.role,
          departmentId: form.value.departmentId || undefined
        }
      })
    }
    closeModal()
    await fetchUsers()
  } catch (err: unknown) {
    const fetchError = err as { data?: { message?: string } }
    modalError.value = fetchError.data?.message || '保存に失敗しました'
  } finally {
    submitting.value = false
  }
}

async function handleDelete() {
  if (!deletingUser.value) return
  submitting.value = true
  try {
    await fetch(`/api/users/${deletingUser.value.id}`, { method: 'DELETE' })
    showDeleteConfirm.value = false
    deletingUser.value = null
    await fetchUsers()
  } catch (err: unknown) {
    const fetchError = err as { data?: { message?: string } }
    error.value = fetchError.data?.message || '削除に失敗しました'
    showDeleteConfirm.value = false
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  fetchUsers()
  fetchDepartments()
})

useHead({ title: 'ユーザー管理' })
</script>

<style scoped>
.admin-users-page {
  max-width: 960px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.page-header h1 {
  font-size: 1.5rem;
  color: #1a1a2e;
}

.users-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.users-table th,
.users-table td {
  padding: 0.75rem 1rem;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.users-table th {
  background: #f5f5f5;
  font-weight: 600;
  font-size: 0.85rem;
  color: #555;
}

.role-badge {
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
}

.role-badge.admin { background: #e8f0fe; color: #1a73e8; }
.role-badge.leader { background: #fef3e0; color: #e65100; }
.role-badge.member { background: #e6f4ea; color: #137333; }

.actions {
  display: flex;
  gap: 0.5rem;
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

.btn-sm { padding: 0.3rem 0.6rem; font-size: 0.8rem; }

.btn:disabled { opacity: 0.5; cursor: not-allowed; }

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
  max-width: 440px;
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

.form-group label {
  font-size: 0.85rem;
  font-weight: 500;
  color: #333;
}

.form-group input,
.form-group select {
  padding: 0.6rem 0.8rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.95rem;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #1a73e8;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

.error-message {
  color: #d93025;
  font-size: 0.85rem;
  padding: 0.75rem;
  background: #ffeaea;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.empty-state {
  text-align: center;
  color: #888;
  padding: 3rem;
}

/* モバイル対応 */
@media (max-width: 768px) {
  .admin-page {
    padding: 1rem;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .page-header h1 {
    font-size: 1.25rem;
  }

  .users-table {
    display: block;
    overflow-x: auto;
  }

  .users-table th,
  .users-table td {
    padding: 0.5rem;
    font-size: 0.85rem;
    white-space: nowrap;
  }

  .modal-overlay .modal {
    margin: 1rem;
    padding: 1.5rem;
    max-width: calc(100% - 2rem);
  }

  .modal h2 {
    font-size: 1.1rem;
  }

  .modal-actions {
    flex-direction: column;
  }

  .modal-actions .btn {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .actions {
    flex-direction: column;
    gap: 0.25rem;
  }

  .actions button {
    font-size: 0.75rem;
    padding: 0.35rem 0.5rem;
  }
}
</style>
