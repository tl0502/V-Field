<script setup lang="ts">
import { computed } from 'vue'
import type { AccountMe } from '../types'

const props = defineProps<{
  me: AccountMe | null
  busy: boolean
}>()

const emit = defineEmits<{
  logout: []
  login: []
}>()

const roleText = computed(() => {
  if (!props.me) return '未登录'
  if (props.me.roles.platformOperator) return '平台运营者'
  if (props.me.roles.domainOperatorDomainIds.length) return '域运营者'
  if (props.me.roles.memberDomainIds.length) return '域成员'
  return '平台账号用户'
})

const accountId = computed(() => props.me?.account.id ?? '')
const notDelivered = computed(() => props.me?.notDelivered ?? ['assign-domain-operator', 'join-approval', 'publish', 'read'])
</script>

<template>
  <view class="identity-panel">
    <view v-if="!me" class="empty-card">
      <text class="empty-title">尚未登录</text>
      <text class="empty-copy">请先完成微信登录。本轮只交付身份骨架，不交付发布或阅读。</text>
      <button class="login-button" :disabled="busy" @click="emit('login')">去登录</button>
    </view>
    <view v-else class="card">
      <text class="label">平台账号</text>
      <text class="value">{{ accountId }}</text>
      <text class="label">当前角色</text>
      <text class="value">{{ roleText }}</text>
      <text class="label">本轮未交付</text>
      <text class="value">{{ notDelivered.join('、') }}</text>
      <button class="logout-button" :disabled="busy" @click="emit('logout')">退出登录</button>
    </view>
  </view>
</template>

<style scoped>
.identity-panel {
  min-height: 100vh;
  padding: 32rpx;
  background-color: #f7f8fa;
  box-sizing: border-box;
}

.card,
.empty-card {
  padding: 32rpx;
  border: 1rpx solid #ebebeb;
  border-radius: 14rpx;
  background-color: #ffffff;
}

.empty-title,
.label {
  display: block;
  color: #111111;
  font-size: 27rpx;
  font-weight: 600;
}

.empty-copy,
.value {
  display: block;
  margin-top: 8rpx;
  margin-bottom: 24rpx;
  color: #5c6166;
  font-size: 24rpx;
  line-height: 1.5;
  word-break: break-all;
}

.login-button,
.logout-button {
  width: 100%;
  height: 80rpx;
  margin-top: 12rpx;
  border-radius: 12rpx;
  font-size: 28rpx;
}

.login-button {
  background-color: #ff6a00;
  color: #ffffff;
  border: 0;
}

.logout-button {
  background-color: #ffffff;
  color: #d94b3d;
  border: 1rpx solid #d94b3d;
}

/* 锁浅色：微信媒体查询不受 darkmode 开关控制。恢复跟随系统时取消注释。 */
/*
@media (prefers-color-scheme: dark) {
  .identity-panel {
    background-color: #111111;
  }

  .card,
  .empty-card {
    border-color: #3a3a3c;
    background-color: #1c1c1e;
  }

  .empty-title,
  .label {
    color: #f5f5f5;
  }

  .empty-copy,
  .value {
    color: #8e949b;
  }

  .logout-button {
    background-color: #1c1c1e;
  }

  .login-button {
    background-color: #ff6a00;
  }
}
*/
</style>
