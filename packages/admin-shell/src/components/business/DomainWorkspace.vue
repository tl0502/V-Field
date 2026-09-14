<script setup lang="ts">
import { onMounted, shallowRef } from 'vue'
import type { Domain } from '@vquan/content-core'
import { useAdminTask } from '../../composables/useAdminTask'
import JoinReview from './JoinReview.vue'
import ArticleTypes from './ArticleTypes.vue'
import DomainTags from './DomainTags.vue'
import TaskFeedback from './TaskFeedback.vue'
const { busy, error, run, request } = useAdminTask()
const domains = shallowRef<Domain[]>([])
const domainId = shallowRef('')
const tab = shallowRef('requests')
const loaded = shallowRef(false)
async function load() {
  const result = await run(() => request<{ domains: Domain[] }>('/api/admin/domain/domains'))
  if (result) { domains.value = result.domains; domainId.value = result.domains[0]?.id ?? ''; loaded.value = true }
}
onMounted(load)
</script>

<template>
  <div>
    <TaskFeedback :error="error" />
    <div v-if="!domainId" class="business-panel"><p class="business-copy">{{ loaded ? '当前账号尚未获授有效业务域的运营权限。' : '正在读取管理权限…' }}</p><button class="business-button secondary" :disabled="busy" @click="load">重新读取</button></div>
    <template v-else>
      <div class="business-domain-bar"><label class="business-field"><span>管理业务域</span><select v-model="domainId"><option v-for="domain in domains" :key="domain.id" :value="domain.id">{{ domain.name }}</option></select></label></div>
      <nav class="business-tabs" aria-label="域管理功能"><button :class="{ active: tab === 'requests' }" @click="tab = 'requests'">入域申请</button><button :class="{ active: tab === 'types' }" @click="tab = 'types'">文章类型</button><button :class="{ active: tab === 'tags' }" @click="tab = 'tags'">标签库</button></nav>
      <JoinReview v-if="tab === 'requests'" :key="domainId + '-requests'" :domain-id="domainId" />
      <ArticleTypes v-if="tab === 'types'" :key="domainId + '-types'" :domain-id="domainId" />
      <DomainTags v-if="tab === 'tags'" :key="domainId + '-tags'" :domain-id="domainId" />
    </template>
  </div>
</template>
