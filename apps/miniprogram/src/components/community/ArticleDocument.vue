<script setup lang="ts">
import type { ContentBlock, SelectedTag } from '@vquan/content-core'
import ArticleContent from './ArticleContent.vue'
defineProps<{ title: string; userId: string; domainName: string; typeName: string; timeLabel: string; tags: SelectedTag[]; blocks: ContentBlock[] }>()
</script>

<template>
  <view class="article-document">
    <view class="author-line"><view class="author-mark">V</view><view class="author-copy"><text class="author-id">用户号 {{ userId }}</text><text class="article-meta">{{ domainName }} · {{ timeLabel }}</text></view></view>
    <text class="article-type">{{ typeName }}</text><text class="article-title">{{ title }}</text>
    <view v-if="tags.length" class="article-tags"><text v-for="tag in tags" :key="tag.id || tag.name">#{{ tag.name }}</text></view>
    <ArticleContent :blocks="blocks" />
  </view>
</template>

<style scoped>
.article-document { padding: 34rpx 36rpx 60rpx; background: #fffefa; color: #202a32; }
.author-line { display: flex; align-items: center; gap: 18rpx; margin-bottom: 34rpx; }
.author-mark { width: 70rpx; height: 70rpx; line-height: 70rpx; text-align: center; background: #eaf0f4; color: #7a929f; font-size: 30rpx; border-radius: 18rpx; }
.author-copy { flex: 1; min-width: 0; }
.author-id { display: block; font-size: 27rpx; font-weight: 600; }
.article-meta { display: block; font-size: 22rpx; color: #8b969e; margin-top: 9rpx; line-height: 1.5; }
.article-type { display: inline-block; color: #7a8e9a; background: #eff4f6; padding: 6rpx 12rpx; font-size: 22rpx; border-radius: 6rpx; }
.article-title { display: block; font-size: 42rpx; line-height: 1.5; font-weight: 700; margin: 22rpx 0 30rpx; word-break: break-all; }
.article-tags { display: flex; gap: 18rpx; flex-wrap: wrap; color: #567b9c; font-size: 24rpx; margin-bottom: 28rpx; }
</style>
