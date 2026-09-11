<script setup lang="ts">
import { shallowRef } from 'vue'

const inputValue = shallowRef('')

function openModal() {
  uni.showModal({
    title: '原生弹窗',
    content: '若颜色不跟随页面主题，记为原生界面限制，而不是业务换肤失败。',
    showCancel: true
  })
}
</script>

<template>
  <view class="native-panel">
    <text class="native-panel__title">原生界面</text>
    <button class="native-panel__button" @tap="openModal">打开授权风格弹窗</button>
    <input
      v-model="inputValue"
      class="native-panel__input"
      placeholder="点这里看键盘颜色"
      placeholder-class="native-panel__placeholder"
    >
  </view>
</template>

<style scoped>
.native-panel {
  margin-top: 24rpx;
  padding: 24rpx;
  border-radius: 20rpx;
  background-color: #ffffff;
}

.native-panel__title,
.native-panel__button {
  color: #111111;
}

.native-panel__title {
  display: block;
  margin-bottom: 16rpx;
  font-size: 32rpx;
  font-weight: 600;
}

.native-panel__button {
  margin-bottom: 16rpx;
  background-color: #ff6a00;
  color: #ffffff;
}

.native-panel__input {
  height: 72rpx;
  padding: 0 16rpx;
  border: 1px solid #e6e8eb;
  border-radius: 12rpx;
  color: #111111;
  background-color: #f7f8fa;
}

@media (prefers-color-scheme: dark) {
  .native-panel {
    background-color: #1c1c1e;
  }

  .native-panel__title {
    color: #f5f5f5;
  }

  .native-panel__input {
    border-color: #3a3a3c;
    color: #f5f5f5;
    background-color: #111111;
  }
}
</style>
