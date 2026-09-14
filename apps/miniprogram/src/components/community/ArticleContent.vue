<script setup lang="ts">
import { computed } from 'vue'
import type { ContentBlock } from '@vquan/content-core'
const props = defineProps<{ blocks: ContentBlock[] }>()
const numbers = computed(() => {
  const result: Record<string, number> = {}
  let number = 0
  for (const block of props.blocks) if (block.type === 'car') result[block.id] = ++number
  return result
})
</script>

<template>
  <view class="article-content">
    <template v-for="block in blocks" :key="block.id">
      <text v-if="block.type === 'text'" class="body-text" user-select>{{ block.text }}</text>
      <view v-else class="read-car"><text class="car-kicker">车源 {{ numbers[block.id] }}</text><text class="car-description" user-select>{{ block.description }}</text></view>
    </template>
  </view>
</template>

<style scoped>
.article-content { color: #202a32; }
.body-text { display: block; font-size: 30rpx; line-height: 1.9; white-space: pre-wrap; word-break: break-all; }
.read-car { padding: 28rpx; margin: 26rpx 0; background: #f5f8fa; border: 1rpx solid #d8e1e7; border-left: 5rpx solid #7ba4d8; border-radius: 12rpx; }
.car-kicker { display: block; font-size: 23rpx; color: #5b7890; font-weight: 600; margin-bottom: 18rpx; }
.car-description { display: block; font-size: 29rpx; line-height: 1.8; white-space: pre-wrap; word-break: break-all; }
</style>
