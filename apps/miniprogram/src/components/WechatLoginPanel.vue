<script setup lang="ts">
import { computed, shallowRef } from 'vue'

const props = defineProps<{
  busy: boolean
  errorMessage: string
}>()

const emit = defineEmits<{
  login: []
}>()

const termsAccepted = shallowRef(false)

const buttonLabel = computed(() => (props.busy ? '正在登录' : '微信一键登录'))
const buttonClass = computed(() => ({
  'wechat-login-button': true,
  'wechat-login-button--busy': props.busy
}))

function toggleTerms() {
  termsAccepted.value = !termsAccepted.value
}

function submit() {
  if (props.busy) return
  if (!termsAccepted.value) {
    return
  }
  emit('login')
}
</script>

<template>
  <view class="login-panel">
    <view class="auth-brand">
      <view class="auth-mark">
        <text class="auth-mark-letter">V</text>
      </view>
      <text class="auth-heading">V域</text>
    </view>

    <view class="auth-actions">
      <view class="consent-box" @click="toggleTerms">
        <view class="consent-mark" :class="{ 'consent-mark--on': termsAccepted }">
          <text class="consent-tick">✓</text>
        </view>
        <text class="consent-copy">我已阅读并同意用户协议和隐私政策</text>
      </view>
      <button
        class="wechat-login-button"
        :class="buttonClass"
        :loading="busy"
        :disabled="busy || !termsAccepted"
        @click="submit"
      >
        {{ buttonLabel }}
      </button>
      <text v-if="!termsAccepted" class="auth-hint">请先勾选协议再登录</text>
      <text v-if="errorMessage" class="auth-error">{{ errorMessage }}</text>
    </view>
  </view>
</template>

<style scoped>
.login-panel {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding: 0 48rpx calc(64rpx + env(safe-area-inset-bottom));
  background-color: #f7f8fa;
  box-sizing: border-box;
}

.auth-brand {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.auth-mark {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 120rpx;
  height: 120rpx;
  margin-bottom: 24rpx;
  border-radius: 32rpx;
  background-color: #ff6a00;
}

.auth-mark-letter {
  color: #ffffff;
  font-size: 56rpx;
  font-weight: 700;
  line-height: 1;
}

.auth-heading {
  color: #111111;
  font-size: 44rpx;
  font-weight: 700;
  line-height: 1.2;
}

.auth-actions {
  display: flex;
  flex-direction: column;
  padding-bottom: 24rpx;
}

.consent-box {
  display: flex;
  align-items: center;
}

.consent-mark {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32rpx;
  height: 32rpx;
  margin-right: 12rpx;
  border: 1rpx solid #d9d9d9;
  border-radius: 50%;
  background-color: #ffffff;
}

.consent-mark--on {
  border-color: #ff6a00;
  background-color: #ff6a00;
}

.consent-tick {
  color: #ffffff;
  font-size: 20rpx;
  font-weight: 700;
  opacity: 0;
}

.consent-mark--on .consent-tick {
  opacity: 1;
}

.consent-copy {
  color: #8e949b;
  font-size: 24rpx;
  line-height: 1.9;
}

.wechat-login-button {
  box-sizing: border-box;
  width: 100%;
  height: 92rpx;
  margin: 20rpx 0 0;
  padding: 0;
  border-radius: 46rpx;
  background-color: #ff6a00;
  color: #ffffff;
  font-size: 30rpx;
  font-weight: 600;
  line-height: 92rpx;
}

.wechat-login-button--busy {
  opacity: 0.72;
}

.auth-hint,
.auth-error {
  display: block;
  margin-top: 24rpx;
  font-size: 23rpx;
  line-height: 1.55;
}

.auth-hint {
  color: #8e949b;
}

.auth-error {
  padding: 18rpx 22rpx;
  border: 1rpx solid #d94b3d;
  border-radius: 12rpx;
  background-color: #ffffff;
  color: #d94b3d;
}

/* 锁浅色：微信媒体查询不受 darkmode 开关控制。恢复跟随系统时取消注释。 */
/*
@media (prefers-color-scheme: dark) {
  .login-panel {
    background-color: #111111;
  }

  .auth-heading {
    color: #f5f5f5;
  }

  .consent-mark {
    border-color: #3a3a3c;
    background-color: #1c1c1e;
  }

  .consent-copy,
  .auth-hint {
    color: #8e949b;
  }

  .auth-error {
    background-color: #1c1c1e;
  }
}
*/
</style>
