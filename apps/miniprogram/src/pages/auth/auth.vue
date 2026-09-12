<script setup lang="ts">
import WechatLoginPanel from '../../components/WechatLoginPanel.vue'
import { useMiniprogramSession } from '../../composables/useMiniprogramSession'
import { useSystemScheme } from '../../composables/useSystemScheme'

const { busy, errorMessage, loginWithWeChat } = useMiniprogramSession()
const { scheme } = useSystemScheme({ bindPage: true })
</script>

<template>
  <view class="page-shell" :data-scheme="scheme">
    <WechatLoginPanel
      v-if="scheme === 'light'"
      :busy="busy"
      :error-message="errorMessage"
      @login="loginWithWeChat"
    />
    <WechatLoginPanel
      v-else
      :busy="busy"
      :error-message="errorMessage"
      @login="loginWithWeChat"
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
