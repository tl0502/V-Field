<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import AccountIdentityPanel from '../../components/AccountIdentityPanel.vue'
import { useMiniprogramSession } from '../../composables/useMiniprogramSession'
import { useSystemScheme } from '../../composables/useSystemScheme'

const { me, busy, refresh, logout } = useMiniprogramSession()
const { scheme } = useSystemScheme({ bindPage: true })

onShow(() => {
  void refresh()
})

function goLogin() {
  uni.navigateTo({ url: '/pages/auth/auth' })
}
</script>

<template>
  <view class="page-shell" :data-scheme="scheme">
    <AccountIdentityPanel
      v-if="scheme === 'light'"
      :me="me"
      :busy="busy"
      @logout="logout"
      @login="goLogin"
    />
    <AccountIdentityPanel
      v-else
      :me="me"
      :busy="busy"
      @logout="logout"
      @login="goLogin"
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
