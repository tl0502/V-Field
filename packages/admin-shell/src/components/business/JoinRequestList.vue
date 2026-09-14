<script setup lang="ts">
import type { JoinRequest } from '@vquan/content-core'
defineProps<{ requests: JoinRequest[]; busy: boolean }>()
defineEmits<{ decide: [id: string, decision: 'approved' | 'rejected'] }>()
</script>

<template>
  <p v-if="!requests.length" class="business-empty">暂时没有待处理的入域申请</p>
  <ul v-else class="business-list">
    <li v-for="item in requests" :key="item.id" class="business-row">
      <div><strong>用户号 {{ item.userId }}</strong><p class="business-copy">{{ new Date(item.createdAt).toLocaleString() }}</p></div>
      <div class="business-actions"><button class="business-button secondary" :disabled="busy" @click="$emit('decide', item.id, 'rejected')">拒绝</button><button class="business-button" :disabled="busy" @click="$emit('decide', item.id, 'approved')">批准入域</button></div>
    </li>
  </ul>
</template>
