<script setup lang="ts">
import type { Tag } from '@vquan/content-core'
defineProps<{ tags: Tag[]; busy: boolean }>()
defineEmits<{ disable: [tag: Tag] }>()
</script>

<template>
  <p v-if="!tags.length" class="business-empty">标签库还是空的。你可以先新增，成员也能在发布时创建。</p>
  <ul v-else class="business-list">
    <li v-for="tag in tags" :key="tag.id" class="business-row">
      <div><strong># {{ tag.name }}</strong><span class="business-badge">{{ tag.enabled ? '启用' : '停用' }}</span><p class="business-copy">{{ tag.source === 'member' ? '成员发布时创建' : '运营者创建' }}<span v-if="tag.creatorUserId"> · {{ tag.creatorUserId }}</span></p></div>
      <button v-if="tag.enabled" class="business-button secondary danger" :disabled="busy" @click="$emit('disable', tag)">停用</button>
    </li>
  </ul>
</template>
