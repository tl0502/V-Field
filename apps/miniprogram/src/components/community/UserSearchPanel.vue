<script setup lang="ts">
import { shallowRef, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { USER_ID_PATTERN, businessErrorMessage } from '@vquan/content-core'
import { useMiniprogramSession } from '../../composables/useMiniprogramSession'
const session = useMiniprogramSession()
const { me } = session
const query = shallowRef('')
const result = shallowRef<{ userId: string } | null>(null)
const searched = shallowRef(false)
const busy = shallowRef(false)
const error = shallowRef('')
let generation = 0
watch([query, () => me.value?.account.id], () => { generation++; result.value = null; searched.value = false; error.value = ''; busy.value = false })
onShow(() => { void session.refresh() })
async function search() {
  if (busy.value) return
  if (!USER_ID_PATTERN.test(query.value.trim())) { error.value = '请输入完整的 8 位用户号'; return }
  const run = ++generation
  busy.value = true
  error.value = ''
  result.value = null
  searched.value = false
  try {
    const response = await session.request<{ user: { userId: string } | null }>(`/api/users/by-user-id/${query.value.trim()}`)
    if (run === generation) { result.value = response.user; searched.value = true }
  } catch (cause) { if (run === generation) error.value = businessErrorMessage(cause, '查找失败，请重试') }
  finally { if (run === generation) busy.value = false }
}
function copy() { if (result.value) uni.setClipboardData({ data: result.value.userId, fail: () => { error.value = '复制失败，请重试' } }) }
function login() { uni.navigateTo({ url: '/pages/auth/auth' }) }
</script>

<template>
  <view class="search-page">
    <text class="search-title">按用户号找人</text>
    <text class="search-copy">输入对方分享的完整 8 位号码。</text>
    <view v-if="!me" class="search-card"><text>登录后即可查找用户</text><button class="search-button" @click="login">去登录</button></view>
    <template v-else>
      <view class="search-field"><input v-model="query" type="number" maxlength="8" placeholder="8 位用户号" confirm-type="search" @confirm="search" /><button class="search-button" :disabled="busy" @click="search">{{ busy ? '查找中' : '查找' }}</button></view>
      <text v-if="error" class="search-error">{{ error }}</text>
      <view v-if="result" class="search-card"><text class="search-label">{{ result.userId === me.account.userId ? '这是你的用户号' : '已找到用户' }}</text><text class="user-number">{{ result.userId }}</text><button class="copy-button" @click="copy">复制用户号</button></view>
      <view v-else-if="searched" class="search-card"><text>未找到可用用户</text><text class="search-copy">请核对完整号码后重试。</text></view>
    </template>
  </view>
</template>

<style scoped>
.search-page { padding: 44rpx 32rpx; color: #202a32; }
.search-title { display: block; font-size: 38rpx; font-weight: 600; }
.search-copy { display: block; margin: 16rpx 0 32rpx; font-size: 26rpx; color: #77828b; line-height: 1.6; }
.search-field { display: flex; align-items: center; gap: 16rpx; }
.search-field input { flex: 1; min-width: 0; height: 88rpx; border: 1rpx solid #dce2e6; border-radius: 12rpx; padding: 0 24rpx; background: #fff; font-size: 32rpx; }
.search-button { margin: 0; background: #ff6a00; color: #fff; font-size: 27rpx; border-radius: 12rpx; }
.search-button::after, .copy-button::after { border: 0; }
.search-card { margin-top: 36rpx; padding: 40rpx 32rpx; background: #fff; border: 1rpx solid #e5e9eb; border-radius: 16rpx; }
.search-label { display: block; color: #77828b; font-size: 25rpx; }
.user-number { display: block; font-size: 48rpx; letter-spacing: 6rpx; font-weight: 600; margin: 20rpx 0 28rpx; }
.copy-button { color: #286bc4; background: #edf4fc; font-size: 27rpx; }
.search-error { display: block; margin: 24rpx 0; font-size: 26rpx; color: #a34e3b; }
</style>
