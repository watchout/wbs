<template>
  <div class="admin-departments-page">
    <div class="admin-page">
      <div class="page-header">
      <h1>部署管理</h1>
      <button class="btn btn-primary" @click="openCreateModal">+ 部署追加</button>
    </div>

    <div v-if="loading" class="loading">読み込み中...</div>

    <table v-else class="departments-table">
      <thead>
        <tr>
          <th>部署名</th>
          <th>カラー</th>
          <th>所属人数</th>
          <th>表示順</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="dept in departments" :key="dept.id">
          <td>
            <span class="color-dot" :style="{ background: dept.color || '#888' }"></span>
            {{ dept.name }}
          </td>
          <td>{{ dept.color || '-' }}</td>
          <td>{{ dept.userCount }}名</td>
          <td>{{ dept.sortOrder }}</td>
          <td class="actions">
            <button class="btn btn-small" @click="openEditModal(dept)">編集</button>
            <button class="btn btn-small btn-danger" @click="deleteDepartment(dept)" :disabled="dept.userCount > 0">削除</button>
          </td>
        </tr>
        <tr v-if="departments.length === 0">
          <td colspan="5" class="empty-state">部署がありません</td>
        </tr>
      </tbody>
    </table>

    <!-- モーダル -->
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <h2>{{ editingDepartment ? '部署編集' : '部署追加' }}</h2>
        <form @submit.prevent="saveDepartment">
          <div class="form-group">
            <label>部署名 *</label>
            <input v-model="form.name" type="text" required :disabled="submitting" />
          </div>
          <div class="form-group">
            <label>カラー</label>
            <input v-model="form.color" type="color" :disabled="submitting" />
          </div>
          <div class="form-group">
            <label>表示順</label>
            <input v-model.number="form.sortOrder" type="number" min="0" :disabled="submitting" />
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
definePageMeta({
  middleware: 'admin'
})

interface Department {
  id: string
  name: string
  color: string | null
  sortOrder: number
  userCount: number
}

const departments = ref<Department[]>([])
const loading = ref(true)
const showModal = ref(false)
const editingDepartment = ref<Department | null>(null)
const submitting = ref(false)
const modalError = ref('')

const form = ref({
  name: '',
  color: '#1a73e8',
  sortOrder: 0
})

async function fetchDepartments() {
  loading.value = true
  try {
    const response = await $fetch<{ success: boolean; departments: Department[] }>('/api/departments')
    if (response.success) {
      departments.value = response.departments
    }
  } catch (error) {
    console.error('Failed to fetch departments')
  } finally {
    loading.value = false
  }
}

function openCreateModal() {
  editingDepartment.value = null
  form.value = { name: '', color: '#1a73e8', sortOrder: departments.value.length }
  modalError.value = ''
  showModal.value = true
}

function openEditModal(dept: Department) {
  editingDepartment.value = dept
  form.value = {
    name: dept.name,
    color: dept.color || '#1a73e8',
    sortOrder: dept.sortOrder
  }
  modalError.value = ''
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingDepartment.value = null
}

async function saveDepartment() {
  if (!form.value.name.trim()) {
    modalError.value = '部署名は必須です'
    return
  }

  submitting.value = true
  modalError.value = ''

  try {
    if (editingDepartment.value) {
      await $fetch(`/api/departments/${editingDepartment.value.id}`, {
        method: 'PATCH',
        body: form.value
      })
    } else {
      await $fetch('/api/departments', {
        method: 'POST',
        body: form.value
      })
    }
    closeModal()
    await fetchDepartments()
  } catch (error: any) {
    modalError.value = error.data?.message || '保存に失敗しました'
  } finally {
    submitting.value = false
  }
}

async function deleteDepartment(dept: Department) {
  if (dept.userCount > 0) {
    alert('所属ユーザーがいる部署は削除できません')
    return
  }
  if (!confirm(`「${dept.name}」を削除しますか？`)) {
    return
  }

  try {
    await $fetch(`/api/departments/${dept.id}`, { method: 'DELETE' })
    await fetchDepartments()
  } catch (error: any) {
    alert(error.data?.message || '削除に失敗しました')
  }
}

onMounted(fetchDepartments)

useHead({ title: '部署管理 | 管理画面' })
</script>

<style scoped>
.admin-page {
  padding: 2rem;
  max-width: 1000px;
  margin: 0 auto;
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

.departments-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.departments-table th,
.departments-table td {
  padding: 0.75rem 1rem;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.departments-table th {
  background: #f5f5f5;
  font-weight: 600;
  font-size: 0.85rem;
  color: #555;
}

.color-dot {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-right: 0.5rem;
  vertical-align: middle;
}

.actions {
  display: flex;
  gap: 0.5rem;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
}

.btn-primary {
  background: #1a73e8;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #1557b0;
}

.btn-small {
  padding: 0.35rem 0.75rem;
  font-size: 0.8rem;
  background: #f0f0f0;
}

.btn-small:hover:not(:disabled) {
  background: #e0e0e0;
}

.btn-danger {
  background: #d93025;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #b31412;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading {
  text-align: center;
  padding: 3rem;
  color: #888;
}

.empty-state {
  text-align: center;
  color: #888;
  padding: 3rem;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
}

.modal h2 {
  margin-bottom: 1.5rem;
  color: #1a1a2e;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.85rem;
  font-weight: 500;
  color: #333;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 0.6rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.9rem;
}

.form-group input[type="color"] {
  height: 40px;
  padding: 0.25rem;
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

  .departments-table {
    display: block;
    overflow-x: auto;
  }

  .modal {
    margin: 1rem;
    max-width: calc(100% - 2rem);
  }
}
</style>
