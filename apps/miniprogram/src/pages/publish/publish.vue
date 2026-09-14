<script setup lang="ts">
import { shallowRef } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import PublishEditor from '../../components/editor/PublishEditor.vue'
const domainId = shallowRef('')
onLoad((options) => { domainId.value = typeof options?.domainId === 'string' ? options.domainId : '' })
</script>
<template><PublishEditor :domain-id="domainId" /></template>
