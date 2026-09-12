<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import IdentityPanel from '../components/auth/IdentityPanel.vue'
import { useAdminSession } from '../composables/useAdminSession'

const router = useRouter()
const { me, isAuthed, refresh, logout } = useAdminSession()

onMounted(async () => {
  await refresh()
  if (!isAuthed.value) {
    await router.replace({ name: 'login' })
  }
})

async function onLogout() {
  await logout()
  await router.replace({ name: 'login' })
}
</script>

<template>
  <main v-if="me" class="page">
    <section class="card">
      <IdentityPanel title="域管理 · 当前身份" :me="me" @logout="onLogout" />
    </section>
  </main>
</template>

<style scoped>
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
