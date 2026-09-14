<script setup lang="ts">
import type { Article } from '@vquan/content-core'
import { formatLocalTimestamp } from '../../utils/dateTime'
defineProps<{ article: Omit<Article, 'blocks'> }>()
defineEmits<{ open: [id: string] }>()
</script>

<template>
  <view class="feed-card" hover-class="feed-card--pressed" @click="$emit('open', article.id)">
    <view class="feed-head"><text class="feed-type">{{ article.type.name }}</text><text class="feed-time">{{ formatLocalTimestamp(article.createdAt, 'date') }}</text></view>
    <text class="feed-title">{{ article.title }}</text>
    <text class="feed-summary">{{ article.excerpt }}</text>
    <view v-if="article.tags.length" class="feed-tags"><text v-for="tag in article.tags" :key="tag.id">#{{ tag.name }}</text></view>
    <view class="feed-meta"><text>查看详情</text><text>→</text></view>
  </view>
</template>

<style scoped>
.feed-card { padding: 30rpx; margin-bottom: 22rpx; background: #fff; border: 1rpx solid #e5e9eb; border-radius: 16rpx; }
.feed-card--pressed { background: #f9fafb; }
.feed-head, .feed-meta { display: flex; justify-content: space-between; align-items: center; gap: 18rpx; }
.feed-type { color: #6d7e8b; font-size: 22rpx; background: #eff4f7; padding: 7rpx 12rpx; border-radius: 6rpx; }
.feed-time { color: #8d979e; font-size: 22rpx; }
.feed-title { display: block; margin: 22rpx 0 14rpx; font-size: 33rpx; font-weight: 600; color: #202a32; line-height: 1.5; word-break: break-all; }
.feed-summary { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; color: #77828b; font-size: 26rpx; line-height: 1.8; word-break: break-all; }
.feed-tags { display: flex; flex-wrap: wrap; gap: 14rpx; margin-top: 18rpx; font-size: 23rpx; color: #527494; }
.feed-meta { border-top: 1rpx solid #edf0f2; margin-top: 24rpx; padding-top: 22rpx; color: #82909a; font-size: 23rpx; }
</style>
