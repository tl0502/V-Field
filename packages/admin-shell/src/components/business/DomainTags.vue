<script setup lang="ts">
import { onMounted, shallowRef } from 'vue'
import type { Tag } from '@vquan/content-core'
import { useAdminTask } from '../../composables/useAdminTask'
import TagForm from './TagForm.vue'
import TagList from './TagList.vue'
import TaskFeedback from './TaskFeedback.vue'
const props = defineProps<{ domainId: string }>()
const { busy, error, notice, run, request } = useAdminTask()
const tags = shallowRef<Tag[]>([])
const formKey = shallowRef(0)
const loaded = shallowRef(false)
async function refresh() {
  const result = await run(() => request<{ tags: Tag[] }>(`/api/admin/domain/${props.domainId}/tags`))
  if (result) { tags.value = result.tags; loaded.value = true }
}
async function create(name: string) {
  const result = await run(() => request<{ tag: Tag }>(`/api/admin/domain/${props.domainId}/tags`, { method: 'POST', body: { name } }))
  if (!result) return
  if (!tags.value.some((item) => item.id === result.tag.id)) tags.value = [...tags.value, result.tag]
  formKey.value++
  notice.value = '标签已可供本域成员选用。'
}
async function disable(tag: Tag) {
  if (!window.confirm(`停用“${tag.name}”？新的发布将不能再使用，历史文章保留原标签。`)) return
  const result = await run(() => request<{ tag: Tag }>(`/api/admin/domain/${props.domainId}/tags/${tag.id}/disable`, { method: 'POST' }))
  if (!result) return
  tags.value = tags.value.map((item) => item.id === tag.id ? { ...item, enabled: false } : item)
  notice.value = '标签已停用，历史文章保持可读。'
}
onMounted(refresh)
</script>

<template>
  <section class="business-panel">
    <div class="business-heading"><h2>域共享标签</h2><button class="business-button secondary" :disabled="busy" @click="refresh">刷新标签</button></div>
    <p class="business-copy">成员与运营者共同丰富本域词库。标签描述主题，不改变文章结构。</p>
    <TagForm :key="formKey" :busy="busy" @create="create" />
    <TaskFeedback :error="error" :notice="notice" />
    <TagList v-if="loaded" :tags="tags" :busy="busy" @disable="disable" />
  </section>
</template>
