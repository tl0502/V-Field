<script setup lang="ts">
defineProps<{
  title: string
}>()
</script>

<template>
  <view class="undelivered-panel">
    <view class="empty-card">
      <text class="empty-title">{{ title }}</text>
      <text class="empty-copy">本轮只交付身份骨架，不交付发布或阅读。</text>
    </view>
  </view>
</template>

<style scoped>
.undelivered-panel {
  min-height: 100vh;
  padding: 32rpx;
  background-color: #f7f8fa;
  box-sizing: border-box;
}

.empty-card {
  padding: 32rpx;
  border: 1rpx solid #ebebeb;
  border-radius: 14rpx;
  background-color: #ffffff;
}

.empty-title {
  display: block;
  color: #111111;
  font-size: 27rpx;
  font-weight: 600;
}

.empty-copy {
  display: block;
  margin-top: 8rpx;
  color: #5c6166;
  font-size: 24rpx;
  line-height: 1.5;
}

/* 锁浅色：微信媒体查询不受 darkmode 开关控制。恢复跟随系统时取消注释。 */
/*
@media (prefers-color-scheme: dark) {
  .undelivered-panel {
    background-color: #111111;
  }

  .empty-card {
    border-color: #3a3a3c;
    background-color: #1c1c1e;
  }

  .empty-title {
    color: #f5f5f5;
  }

  .empty-copy {
    color: #8e949b;
  }
}
*/
</style>
