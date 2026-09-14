<script setup lang="ts">
import { onMounted, shallowRef } from 'vue'
import type { JoinRequest } from '@vquan/content-core'
import { useAdminTask } from '../../composables/useAdminTask'
import TaskFeedback from './TaskFeedback.vue'
import JoinRequestList from './JoinRequestList.vue'
const props = defineProps<{ domainId: string }>()
const { busy, error, notice, run, request } = useAdminTask()
const requests = shallowRef<JoinRequest[]>([])
const loaded = shallowRef(false)
async function refresh() {
  const result = await run(() => request<{ requests: JoinRequest[] }>(`/api/admin/domain/${props.domainId}/join-requests`))
  if (result) { requests.value = result.requests; loaded.value = true }
}
async function decide(id: string, decision: 'approved' | 'rejected') {
  const result = await run(() => request<{ status: string }>(`/api/admin/domain/${props.domainId}/join-requests/${id}/decision`, { method: 'POST', body: { decision } }))
  if (!result) return
  requests.value = requests.value.filter((item) => item.id !== id)
  notice.value = result.status === 'approved' ? '已批准，对方现在可以在本域发布。' : result.status === 'cancelled' ? '对方已取消该申请，本次没有授予成员资格。' : '已拒绝该申请，对方可以重新申请。'
}
onMounted(refresh)
</script>

<template>
  <section class="business-panel">
    <div class="business-heading"><h2>入域申请</h2><button class="business-button secondary" :disabled="busy" @click="refresh">刷新列表</button></div>
    <TaskFeedback :error="error" :notice="notice" />
    <p v-if="busy && !loaded" class="business-copy">正在读取申请…</p>
    <JoinRequestList v-if="loaded" :requests="requests" :busy="busy" @decide="decide" />
  </section>
</template>
