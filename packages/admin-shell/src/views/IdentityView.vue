<script setup lang="ts">
import { useRouter } from 'vue-router'
import { shallowRef } from 'vue'
import IdentityPanel from '../components/IdentityPanel.vue'
import { useAdminSession } from '../composables/useAdminSession'
import { adminShellConfig } from '../shell'
import OperatorAssignment from '../components/business/OperatorAssignment.vue'
import DomainWorkspace from '../components/business/DomainWorkspace.vue'

const router = useRouter()
const { me, busy, errorMessage, canRetry, retryLabel, retry, logout, isAuthed } = useAdminSession()
const { identityTitle, audience } = adminShellConfig()
const showIdentity = shallowRef(false)

async function onLogout() {
  if (await logout()) await router.replace({ name: 'login' })
}

async function onRetry() {
  await retry()
  if (!isAuthed.value && !canRetry.value) await router.replace({ name: 'login' })
}
</script>

<template>
  <main v-if="me" class="business-workspace">
    <header class="business-topbar"><div><h1 class="business-brand"><span>v域</span>{{ audience === 'admin-platform' ? '平台管理' : '域管理' }}</h1><small>用户号 {{ me.account.userId }}</small></div><div class="business-actions"><button class="business-button secondary" @click="showIdentity = !showIdentity">{{ showIdentity ? '返回工作台' : '当前身份' }}</button><button class="business-button secondary" :disabled="busy" @click="onLogout">退出登录</button></div></header>
    <section>
      <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>
      <button v-if="canRetry" :disabled="busy" @click="onRetry">{{ retryLabel }}</button>
      <div v-if="showIdentity" class="business-panel"><IdentityPanel :title="identityTitle" :me="me" :busy="busy" @logout="onLogout" /></div>
      <template v-else-if="audience === 'admin-platform'"><OperatorAssignment v-if="me.roles.platformOperator" :key="me.account.id" /><p v-else class="business-panel">当前账号没有平台管理权限。</p></template>
      <DomainWorkspace v-else :key="me.account.id" />
    </section>
  </main>
</template>

<style scoped>
.error { color: #d94b3d; }

.page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.card {
  width: min(520px, 100%);
  padding: 28px;
  border: 1px solid #ebebeb;
  border-radius: 16px;
  background: #ffffff;
}

@media (prefers-color-scheme: dark) {
  .card {
    border-color: #3a3a3c;
    background: #1c1c1e;
  }
}
</style>
