<script setup lang="ts">
import { onHide, onShow, onUnload } from '@dcloudio/uni-app'
import WechatLoginPanel from '../../components/WechatLoginPanel.vue'
import { useMiniprogramSession } from '../../composables/useMiniprogramSession'
import { useSystemScheme } from '../../composables/useSystemScheme'

const { busy, errorMessage, canRetry, retryLabel, loginWithWeChat, retry } = useMiniprogramSession()
const { scheme } = useSystemScheme({ bindPage: true })

let active = false
let attempt = 0
onShow(() => { active = true })
function leavePage() {
  active = false
  attempt++
}
onHide(leavePage)
onUnload(leavePage)

async function completeLogin(action: () => Promise<boolean>) {
  const currentAttempt = ++attempt
  const pages = getCurrentPages()
  const origin = pages[pages.length - 1]
  if (!await action() || !active || attempt !== currentAttempt) return
  const currentPages = getCurrentPages()
  if (currentPages[currentPages.length - 1] !== origin) return
  if (currentPages.length > 1) uni.navigateBack()
  else uni.switchTab({ url: '/pages/me/me' })
}
</script>

<template>
  <view class="page-shell" :data-scheme="scheme">
    <WechatLoginPanel
      v-if="scheme === 'light'"
      :busy="busy"
      :error-message="errorMessage"
      :can-retry="canRetry"
      :retry-label="retryLabel"
      @login="completeLogin(loginWithWeChat)"
      @retry="completeLogin(retry)"
    />
    <WechatLoginPanel
      v-else
      :busy="busy"
      :error-message="errorMessage"
      :can-retry="canRetry"
      :retry-label="retryLabel"
      @login="completeLogin(loginWithWeChat)"
      @retry="completeLogin(retry)"
    />
  </view>
</template>

<style scoped>
.page-shell {
  min-height: 100vh;
  background-color: #f7f8fa;
  box-sizing: border-box;
}

/* 锁浅色：微信媒体查询不受 darkmode 开关控制。恢复跟随系统时取消注释。 */
/*
@media (prefers-color-scheme: dark) {
  .page-shell {
    background-color: #111111;
  }
}
*/
</style>
