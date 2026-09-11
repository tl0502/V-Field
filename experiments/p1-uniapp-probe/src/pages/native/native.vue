<script setup lang="ts">
import ProbeNav from '../../components/ProbeNav.vue'
import NativePanel from '../../components/NativePanel.vue'
</script>

<template>
  <view class="probe-page">
    <ProbeNav title="原生界面" />
    <view class="probe-body">
      <text class="native-kicker">先把模拟器切到深色，再打开弹窗和键盘。原生控件颜色不跟随，记为限制，不是业务换肤失败。</text>
      <NativePanel />
    </view>
  </view>
</template>

<style scoped>
.native-kicker {
  display: block;
  margin-bottom: 8rpx;
  font-size: 26rpx;
  line-height: 1.5;
  color: #8e949b;
}
</style>
