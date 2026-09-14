<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import JoinStatusPanel from '../../components/community/JoinStatusPanel.vue'
import { useMiniprogramSession } from '../../composables/useMiniprogramSession'
const session = useMiniprogramSession()
onShow(() => { void session.refresh() })
</script>
<template><view class="join-page"><JoinStatusPanel /></view></template>
<style scoped>.join-page { padding-top: 32rpx; }</style>
