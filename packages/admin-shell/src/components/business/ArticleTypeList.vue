<script setup lang="ts">
import type { ArticleType } from '@vquan/content-core'
defineProps<{ types: ArticleType[]; busy: boolean }>()
defineEmits<{ edit: [type: ArticleType] }>()
</script>

<template>
  <p v-if="!types.length" class="business-empty">还没有文章类型。创建后，成员才能开始发布。</p>
  <ul v-else class="business-list">
    <li v-for="type in types" :key="type.id" class="business-row">
      <div><strong>{{ type.name }}</strong><span class="business-badge">{{ type.enabled ? '启用' : '停用' }}</span><p class="business-copy">正文{{ !type.rules.text.enabled ? '不可用' : type.rules.text.required ? '必填' : '可选' }} · 车源{{ type.rules.car.enabled ? `${type.rules.car.min}–${type.rules.car.max} 张` : '不可用' }}</p></div>
      <button class="business-button secondary" :disabled="busy" @click="$emit('edit', type)">编辑规则</button>
    </li>
  </ul>
</template>
