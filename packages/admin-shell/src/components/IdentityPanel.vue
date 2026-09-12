<script setup lang="ts">
import { computed } from 'vue'
import type { AccountMe } from '../types'

const props = defineProps<{
  title: string
  me: AccountMe
}>()

const emit = defineEmits<{
  logout: []
}>()

const roleText = computed(() => {
  if (props.me.roles.platformOperator) return '平台运营者'
  if (props.me.roles.domainOperatorDomainIds.length) return '域运营者'
  return '已登录，无本轮管理资格'
})
</script>

<template>
  <section class="panel">
    <h1 class="title">{{ title }}</h1>
    <dl class="facts">
      <div class="fact">
        <dt>平台账号</dt>
        <dd>{{ me.account.id }}</dd>
      </div>
      <div class="fact">
        <dt>登录名</dt>
        <dd>{{ me.loginName || '无' }}</dd>
      </div>
      <div class="fact">
        <dt>当前角色</dt>
        <dd>{{ roleText }}</dd>
      </div>
      <div class="fact">
        <dt>本轮未交付</dt>
        <dd>{{ me.notDelivered.join('、') }}</dd>
      </div>
    </dl>
    <button class="logout" type="button" @click="emit('logout')">退出登录</button>
  </section>
</template>

<style scoped>
.panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.title {
  margin: 0;
  font-size: 22px;
}

.facts {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 0;
}

.fact dt {
  color: #8e949b;
  font-size: 12px;
}

.fact dd {
  margin: 4px 0 0;
  color: #111111;
  font-size: 14px;
  word-break: break-all;
}

.logout {
  height: 40px;
  border: 1px solid #d94b3d;
  border-radius: 10px;
  background: transparent;
  color: #d94b3d;
}

@media (prefers-color-scheme: dark) {
  .fact dd {
    color: #f5f5f5;
  }
}
</style>
