<script setup lang="ts">
import ProbeNav from '../../components/ProbeNav.vue'
</script>

<template>
  <view class="probe-page">
    <ProbeNav title="次页首帧" />
    <view class="probe-body">
      <view class="second-card">
        <text class="second-card__text">把模拟器系统外观改成深色后切到本页，观察第一帧背景、顶栏和底栏是否已经是深色，有没有先闪成浅色。</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.second-card {
  padding: 24rpx;
  border-radius: 20rpx;
  background-color: #ffffff;
}

.second-card__text {
  color: #111111;
  font-size: 28rpx;
  line-height: 1.6;
}

@media (prefers-color-scheme: dark) {
  .second-card {
    background-color: #1c1c1e;
  }

  .second-card__text {
    color: #f5f5f5;
  }
}
</style>
