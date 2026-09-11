<script setup lang="ts">
import { useThemePreference } from '../composables/useThemePreference'

const { label } = useThemePreference()
</script>

<template>
  <view class="theme-panel">
    <text class="theme-panel__title">微信端只跟随系统</text>
    <text class="theme-panel__meta">当前系统外观：{{ label }}</text>
    <text class="theme-panel__hint">请在开发者工具模拟器顶部切换浅色 / 深色，并再切回来。不要在应用里强制换肤。</text>
  </view>
</template>

<style scoped>
.theme-panel {
  padding: 24rpx;
  border-radius: 20rpx;
  background-color: #ffffff;
}

.theme-panel__title,
.theme-panel__meta,
.theme-panel__hint {
  color: #111111;
}

.theme-panel__title {
  font-size: 32rpx;
  font-weight: 600;
}

.theme-panel__meta {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  opacity: 0.72;
}

.theme-panel__hint {
  display: block;
  margin-top: 16rpx;
  font-size: 26rpx;
  line-height: 1.5;
  color: #8e949b;
}

@media (prefers-color-scheme: dark) {
  .theme-panel {
    background-color: #1c1c1e;
  }

  .theme-panel__title,
  .theme-panel__meta {
    color: #f5f5f5;
  }
}
</style>
