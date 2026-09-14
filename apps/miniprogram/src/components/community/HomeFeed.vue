<script setup lang="ts">
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import { useArticleFeed } from '../../composables/useArticleFeed'
import { useMiniprogramSession } from '../../composables/useMiniprogramSession'
import FeedItem from './FeedItem.vue'
const { domain, articles, nextCursor, busy, error, loaded, load } = useArticleFeed()
const session = useMiniprogramSession()
onShow(() => { void load(); void session.refresh() })
onPullDownRefresh(async () => { await load(); uni.stopPullDownRefresh() })
function open(id: string) { uni.navigateTo({ url: `/pages/detail/detail?id=${id}` }) }
function publish() { uni.navigateTo({ url: '/pages/join/join' }) }
</script>

<template>
  <view class="home-content">
    <view class="domain-heading"><text>{{ domain?.name || 'v域' }}</text><text class="domain-label">当前业务域</text></view>
    <view class="home-banner"><text class="banner-kicker">汽车 · 信息交流</text><text class="banner-title">在这里，分享有用的信息。</text><text class="banner-copy">加入业务域后，即可发布正文与车源卡片。</text></view>
    <view class="feed-heading"><text>域内内容</text><text class="sort-label">最新</text></view>
    <view v-if="error" class="feed-state"><text class="state-title">暂时没有连上</text><text>{{ error }}</text><button @click="load()">重新读取</button></view>
    <view v-else-if="busy && !loaded" class="feed-state"><text>正在读取内容…</text></view>
    <view v-else-if="loaded && !articles.length" class="feed-state"><text class="state-title">这里还没有内容</text><text>成员发布后，内容会显示在这里。</text></view>
    <FeedItem v-for="article in articles" :key="article.id" :article="article" @open="open" />
    <button v-if="nextCursor" class="load-more" :disabled="busy" @click="load(true)">{{ busy ? '读取中…' : '继续加载' }}</button>
    <button class="floating-publish" aria-label="发布内容" @click="publish">＋</button>
  </view>
</template>

<style scoped>
.home-content { padding: 24rpx 30rpx 140rpx; }
.domain-heading, .feed-heading { display: flex; align-items: center; justify-content: space-between; }
.domain-heading { color: #202a32; font-size: 34rpx; font-weight: 600; margin: 12rpx 0 28rpx; }
.domain-label { font-size: 22rpx; color: #9ba4ac; font-weight: 400; }
.home-banner { border: 1rpx solid #e0e7eb; border-radius: 18rpx; padding: 32rpx; background: #eaf0f4; }
.banner-kicker { display: block; color: #7d919f; font-size: 22rpx; }
.banner-title { display: block; color: #364c5c; font-size: 34rpx; font-weight: 600; margin: 16rpx 0; }
.banner-copy { color: #7a8e9c; font-size: 23rpx; line-height: 1.6; }
.feed-heading { margin: 32rpx 0 22rpx; font-size: 28rpx; color: #303d47; font-weight: 600; }
.sort-label { color: #778995; font-size: 23rpx; font-weight: 400; }
.feed-state { display: flex; flex-direction: column; gap: 20rpx; align-items: center; padding: 64rpx 24rpx; text-align: center; color: #8c979f; font-size: 25rpx; line-height: 1.7; }
.state-title { color: #536775; font-size: 30rpx; }
.feed-state button, .load-more { font-size: 25rpx; color: #536775; border: 1rpx solid #d9e0e5; background: #fff; }
.floating-publish { position: fixed; right: 36rpx; bottom: calc(36rpx + env(safe-area-inset-bottom)); width: 100rpx; height: 100rpx; padding: 0; line-height: 94rpx; border-radius: 50%; background: #ff6a00; color: #fff; font-size: 58rpx; box-shadow: 0 10rpx 28rpx rgba(145, 72, 18, .18); }
.floating-publish::after { border: 0; }
</style>
