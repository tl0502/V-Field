<script setup lang="ts">
import { computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useDomainAccess } from '../../composables/useDomainAccess'
const { domain, state, busy, error, refresh, act, me } = useDomainAccess()
const stateLabel = computed(() => {
  if (!me.value) return '登录后可申请入域'
  if (state.value?.member) return '已加入，可以发布'
  if (!state.value) return ''
  return ({ pending: '入域申请待审核', approved: '当前未取得成员资格', rejected: '上次申请未通过', cancelled: '上次申请已取消' })[state.value.application?.status ?? 'cancelled'] ?? '尚未申请入域'
})
const canApply = computed(() => Boolean(me.value && state.value && !state.value.member && state.value.application?.status !== 'pending'))
function goLogin() { uni.navigateTo({ url: '/pages/auth/auth' }) }
function goPublish() { if (domain.value) uni.navigateTo({ url: `/pages/publish/publish?domainId=${domain.value.id}` }) }
onShow(() => { if (domain.value) void refresh() })
</script>

<template>
  <view class="join-panel">
    <view class="join-heading"><text class="join-title">{{ domain?.name || '当前业务域' }}</text><text v-if="state?.member" class="member-mark">域成员</text></view>
    <text v-if="busy" class="join-copy">正在读取入域状态…</text>
    <text v-else class="join-copy">{{ !state?.application && state && !state.member ? '尚未申请入域' : stateLabel }}</text>
    <view v-if="error" class="join-error"><text>{{ error }}</text><button class="join-button secondary" :disabled="busy" @click="refresh">重新读取</button></view>
    <button v-if="!me" class="join-button" :disabled="busy" @click="goLogin">登录并申请入域</button>
    <button v-else-if="state?.member" class="join-button" :disabled="busy" @click="goPublish">发布内容</button>
    <button v-else-if="state?.application?.status === 'pending'" class="join-button secondary" :disabled="busy" @click="act('cancel')">取消本次申请</button>
    <button v-else-if="canApply" class="join-button" :disabled="busy" @click="act('apply')">{{ state?.application ? '重新申请入域' : '申请入域' }}</button>
  </view>
</template>

<style scoped>
.join-panel { margin: 0 32rpx 28rpx; padding: 30rpx; border: 1rpx solid #e5e9eb; border-radius: 16rpx; background: #fff; }
.join-heading { display: flex; align-items: center; justify-content: space-between; gap: 20rpx; }
.join-title { font-size: 30rpx; font-weight: 600; color: #202a32; }
.member-mark { color: #347257; font-size: 23rpx; }
.join-copy { display: block; margin: 16rpx 0 26rpx; color: #77828b; font-size: 26rpx; line-height: 1.6; }
.join-button { background: #ff6a00; color: #fff; border-radius: 12rpx; font-size: 27rpx; margin: 0; }
.join-button::after { border: 0; }
.join-button.secondary { border: 1rpx solid #dbe1e5; background: #fff; color: #536573; }
.join-error { color: #a34e3b; font-size: 25rpx; line-height: 1.6; margin-bottom: 20rpx; }
</style>
