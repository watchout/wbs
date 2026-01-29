/**
 * スケジュールCRUD composable
 */

interface ScheduleInput {
  title: string
  description?: string
  start: string
  end: string
  authorId?: string
  color?: string
}

interface ScheduleUpdateInput {
  title?: string
  description?: string | null
  start?: string
  end?: string
  authorId?: string | null
  color?: string | null
}

interface ScheduleResponse {
  success: boolean
  schedule: {
    id: string
    title: string
    description: string | null
    start: string
    end: string
    authorId: string | null
    color: string | null
  }
}

interface DeleteResponse {
  success: boolean
  message: string
}

export function useSchedules() {
  const creating = ref(false)
  const updating = ref(false)
  const deleting = ref(false)
  const error = ref('')

  async function createSchedule(input: ScheduleInput): Promise<ScheduleResponse | null> {
    creating.value = true
    error.value = ''
    try {
      const res = await $fetch<ScheduleResponse>('/api/schedules', {
        method: 'POST',
        body: input
      })
      return res
    } catch (err: unknown) {
      const fetchError = err as { data?: { message?: string } }
      error.value = fetchError.data?.message || 'スケジュールの作成に失敗しました'
      return null
    } finally {
      creating.value = false
    }
  }

  async function updateSchedule(id: string, input: ScheduleUpdateInput): Promise<ScheduleResponse | null> {
    updating.value = true
    error.value = ''
    try {
      const res = await $fetch<ScheduleResponse>(`/api/schedules/${id}`, {
        method: 'PATCH',
        body: input
      })
      return res
    } catch (err: unknown) {
      const fetchError = err as { data?: { message?: string } }
      error.value = fetchError.data?.message || 'スケジュールの更新に失敗しました'
      return null
    } finally {
      updating.value = false
    }
  }

  async function deleteSchedule(id: string): Promise<boolean> {
    deleting.value = true
    error.value = ''
    try {
      await $fetch<DeleteResponse>(`/api/schedules/${id}`, {
        method: 'DELETE'
      })
      return true
    } catch (err: unknown) {
      const fetchError = err as { data?: { message?: string } }
      error.value = fetchError.data?.message || 'スケジュールの削除に失敗しました'
      return false
    } finally {
      deleting.value = false
    }
  }

  return {
    creating,
    updating,
    deleting,
    error,
    createSchedule,
    updateSchedule,
    deleteSchedule
  }
}
