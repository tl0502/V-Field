<script setup lang="ts">
import { useRouter } from 'vue-router'
import AdminLoginForm from '../components/auth/AdminLoginForm.vue'
import { useAdminSession } from '../composables/useAdminSession'

const router = useRouter()
const { busy, errorMessage, login } = useAdminSession()

async function onSubmit(payload: { loginName: string; password: string }) {
  try {
    await login(payload.loginName, payload.password)
    await router.replace({ name: 'identity' })
  } catch {
    // Error text is already on the form.
  }
}
</script>

<template>
  <main class="page">
    <section class="card">
      <h1 class="title">域管理登录</h1>
      <p class="copy">使用同一套平台账号的管理登录名和密码。本轮只验证身份，不交付入域审批。</p>
      <AdminLoginForm :busy="busy" :error-message="errorMessage" @submit="onSubmit" />
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
  width: min(420px, 100%);
  padding: 28px;
  border: 1px solid #ebebeb;
  border-radius: 16px;
  background: #ffffff;
}

.title {
  margin: 0 0 8px;
  font-size: 22px;
}

.copy {
  margin: 0 0 20px;
  color: #5c6166;
  font-size: 14px;
  line-height: 1.5;
}

@media (prefers-color-scheme: dark) {
  .card {
    border-color: #3a3a3c;
    background: #1c1c1e;
  }

  .copy {
    color: #8e949b;
  }
}
</style>
