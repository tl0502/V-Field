<script setup lang="ts">
import { shallowRef } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import ArticleDocument from '../../components/community/ArticleDocument.vue'
import { useArticleDetail } from '../../composables/useArticleDetail'
import { useMiniprogramSession } from '../../composables/useMiniprogramSession'
import { formatLocalTimestamp } from '../../utils/dateTime'
const id = shallowRef('')
const { article, busy, deleting, error, unavailable, isAuthor, load, remove } = useArticleDetail(id)
const session = useMiniprogramSession()
onLoad((options) => { id.value = typeof options?.id === 'string' ? options.id : '' })
onShow(() => { void session.refresh(); if (article.value) void load() })
function returnHome() { uni.switchTab({ url: '/pages/index/index' }) }
</script>

<template>
  <view class="detail-page">
    <view v-if="busy" class="detail-state">正在展开内容…</view>
    <view v-if="error" class="detail-state"><text>{{ error }}</text><button v-if="!unavailable" @click="load">重新读取</button><button @click="returnHome">返回列表</button></view>
    <ArticleDocument v-if="article" :title="article.title" :user-id="article.author.userId" :domain-name="article.domain.name" :type-name="article.type.name" :time-label="formatLocalTimestamp(article.createdAt)" :tags="article.tags" :blocks="article.blocks" />
    <view v-if="isAuthor" class="author-actions"><button :disabled="deleting" @click="remove">{{ deleting ? '正在处理…' : '删除这篇内容' }}</button></view>
  </view>
</template>

<style scoped>
.detail-page { min-height: 100vh; background: #fffefa; }
.detail-state { display: flex; flex-direction: column; gap: 24rpx; padding: 70rpx 40rpx; font-size: 27rpx; color: #77828b; text-align: center; }
.detail-state button { font-size: 26rpx; color: #536b7d; background: #edf3f7; }
.author-actions { padding: 24rpx 36rpx 60rpx; border-top: 1rpx solid #e5e6e3; }
.author-actions button { background: #fffefa; color: #a34e3b; border: 1rpx solid #e5c8bd; font-size: 27rpx; }
</style>
