<script setup lang="ts">
import NotDeliveredPanel from '../../components/NotDeliveredPanel.vue'
import { useSystemScheme } from '../../composables/useSystemScheme'

const { scheme } = useSystemScheme({ bindPage: true })
</script>

<template>
  <view class="page-shell" :data-scheme="scheme">
    <NotDeliveredPanel v-if="scheme === 'light'" title="消息" />
    <NotDeliveredPanel v-else title="消息" />
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
