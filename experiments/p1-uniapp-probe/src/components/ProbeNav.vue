<script setup lang="ts">
defineProps<{
  title: string
}>()
</script>

<template>
  <view class="probe-nav">
    <text class="probe-nav__title">{{ title }}</text>
    <text class="probe-nav__note">实验 · 非正式工程</text>
  </view>
</template>

<style scoped>
.probe-nav {
  padding: 88rpx 32rpx 24rpx;
  background-color: #f7f8fa;
}

.probe-nav__title,
.probe-nav__note {
  color: #111111;
}

.probe-nav__title {
  display: block;
  font-size: 36rpx;
  font-weight: 600;
}

.probe-nav__note {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  opacity: 0.64;
}

@media (prefers-color-scheme: dark) {
  .probe-nav {
    background-color: #111111;
  }

  .probe-nav__title,
  .probe-nav__note {
    color: #f5f5f5;
  }
}
</style>
