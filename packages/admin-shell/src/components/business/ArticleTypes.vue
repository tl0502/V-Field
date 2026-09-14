<script setup lang="ts">
import { onMounted, shallowRef } from 'vue'
import type { ArticleType } from '@vquan/content-core'
import { useAdminTask } from '../../composables/useAdminTask'
import ArticleTypeForm from './ArticleTypeForm.vue'
import ArticleTypeList from './ArticleTypeList.vue'
import TaskFeedback from './TaskFeedback.vue'
const props = defineProps<{ domainId: string }>()
const { busy, error, notice, run, request } = useAdminTask()
const types = shallowRef<ArticleType[]>([])
const editing = shallowRef<ArticleType | null>(null)
const formKey = shallowRef(0)
const loaded = shallowRef(false)
async function refresh() {
  const result = await run(() => request<{ types: ArticleType[] }>(`/api/admin/domain/${props.domainId}/types`))
  if (result) { types.value = result.types; loaded.value = true }
}
async function save(body: Record<string, unknown>) {
  const path = `/api/admin/domain/${props.domainId}/types${editing.value ? `/${editing.value.id}` : ''}`
  const result = await run(() => request<{ type: ArticleType }>(path, { method: 'POST', body }))
  if (!result) return
  types.value = types.value.some((item) => item.id === result.type.id) ? types.value.map((item) => item.id === result.type.id ? result.type : item) : [...types.value, result.type]
  editing.value = null
  formKey.value++
  notice.value = '已保存。新的发布按此规则检查，已发布文章保持原样。'
}
onMounted(refresh)
</script>

<template>
  <section class="business-panel">
    <div class="business-heading"><h2>文章类型与使用规则</h2><button class="business-button secondary" :disabled="busy" @click="refresh">刷新类型</button></div>
    <p class="business-copy">选用平台的正文、车源卡片模板，设置本域的内容要求。</p>
    <TaskFeedback :error="error" :notice="notice" />
    <ArticleTypeList v-if="loaded" :types="types" :busy="busy" @edit="editing = $event" />
    <ArticleTypeForm :key="formKey" :value="editing" :busy="busy" @save="save" @cancel="editing = null" />
  </section>
</template>
