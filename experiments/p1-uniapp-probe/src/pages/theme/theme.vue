<script setup lang="ts">
import ProbeNav from '../../components/ProbeNav.vue'
import ThemePanel from '../../components/ThemePanel.vue'

const checks = [
  '在开发者工具模拟器把系统外观从浅色切到深色',
  '看本页背景、顶栏、卡片、文字是否真的变成深色',
  '再切回浅色，确认页面能回到浅色',
  '再切到首页、次页，看第一帧',
  '最后到原生页打开弹窗和键盘'
]
</script>

<template>
  <view class="probe-page">
    <ProbeNav title="跟随系统" />
    <view class="probe-body">
      <ThemePanel />
      <view class="check-card">
        <text class="check-card__title">请你人工核对</text>
        <text
          v-for="item in checks"
          :key="item"
          class="check-card__item"
        >{{ item }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.check-card {
  margin-top: 24rpx;
  padding: 24rpx;
  border-radius: 20rpx;
  background-color: #ffffff;
}

.check-card__title,
.check-card__item {
  color: #111111;
}

.check-card__title {
  display: block;
  margin-bottom: 12rpx;
  font-size: 32rpx;
  font-weight: 600;
}

.check-card__item {
  display: block;
  margin-top: 12rpx;
  font-size: 26rpx;
  line-height: 1.5;
  color: #8e949b;
}

@media (prefers-color-scheme: dark) {
  .check-card {
    background-color: #1c1c1e;
  }

  .check-card__title {
    color: #f5f5f5;
  }
}
</style>
