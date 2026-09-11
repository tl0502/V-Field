<script setup lang="ts">
import ProbeNav from '../../components/ProbeNav.vue'

const cards = [
  { id: '1', title: '列表卡片 A', note: '对照旧首页信息层级' },
  { id: '2', title: '列表卡片 B', note: '系统改外观后应整页一起变' }
]
</script>

<template>
  <view class="probe-page">
    <ProbeNav title="首页对照" />
    <view class="probe-body">
      <text class="home-kicker">系统改成深色后再切过来，看这一屏首帧。</text>
      <view
        v-for="card in cards"
        :key="card.id"
        class="home-card"
      >
        <text class="home-card__title">{{ card.title }}</text>
        <text class="home-card__note">{{ card.note }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.home-kicker,
.home-card__title,
.home-card__note {
  color: #111111;
}

.home-kicker {
  display: block;
  margin-bottom: 20rpx;
  font-size: 26rpx;
  color: #8e949b;
}

.home-card {
  margin-bottom: 16rpx;
  padding: 24rpx;
  border-radius: 20rpx;
  background-color: #ffffff;
}

.home-card__title {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
}

.home-card__note {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #8e949b;
}

@media (prefers-color-scheme: dark) {
  .home-card {
    background-color: #1c1c1e;
  }

  .home-card__title {
    color: #f5f5f5;
  }
}
</style>
