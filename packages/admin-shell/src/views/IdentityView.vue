<script setup lang="ts">
import { useRouter } from 'vue-router'
import IdentityPanel from '../components/IdentityPanel.vue'
import { useAdminSession } from '../composables/useAdminSession'
import { adminShellConfig } from '../shell'

const router = useRouter()
const { me, busy, errorMessage, canRetry, retryLabel, retry, logout, isAuthed } = useAdminSession()
const { identityTitle } = adminShellConfig()

async function onLogout() {
  if (await logout()) await router.replace({ name: 'login' })
}

async function onRetry() {
  await retry()
  if (!isAuthed.value && !canRetry.value) await router.replace({ name: 'login' })
}
</script>

<template>
  <main v-if="me" class="page">
    <section class="card">
      <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>
      <button v-if="canRetry" :disabled="busy" @click="onRetry">{{ retryLabel }}</button>
      <IdentityPanel :title="identityTitle" :me="me" :busy="busy" @logout="onLogout" />
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
