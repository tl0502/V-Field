<script setup lang="ts">
import { computed, shallowRef } from 'vue'

const props = defineProps<{
  busy: boolean
  errorMessage: string
}>()

const emit = defineEmits<{
  submit: [payload: { loginName: string; password: string }]
}>()

const loginName = shallowRef('')
const password = shallowRef('')

const canSubmit = computed(
  () => Boolean(loginName.value.trim()) && password.value.length >= 8 && !props.busy
)

function onSubmit() {
  if (!canSubmit.value) return
  emit('submit', { loginName: loginName.value.trim(), password: password.value })
}
</script>

<template>
  <form class="login-form" @submit.prevent="onSubmit">
    <label class="field">
      <span class="label">管理登录名</span>
      <input v-model="loginName" class="input" name="loginName" autocomplete="username" />
    </label>
    <label class="field">
      <span class="label">管理密码</span>
      <input v-model="password" class="input" type="password" name="password" autocomplete="current-password" />
    </label>
    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
    <button class="submit" type="submit" :disabled="!canSubmit">
      {{ busy ? '正在登录' : '登录' }}
    </button>
  </form>
</template>

<style scoped>
.login-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.label {
  color: #111111;
  font-size: 14px;
  font-weight: 600;
}

.input {
  height: 44px;
  padding: 0 12px;
  border: 1px solid #d9d9d9;
  border-radius: 10px;
  background: #ffffff;
  color: #111111;
  font-size: 15px;
}

.submit {
  height: 44px;
  border: 0;
  border-radius: 10px;
  background: #ff6a00;
  color: #ffffff;
  font-size: 15px;
  font-weight: 600;
}

.submit:disabled {
  opacity: 0.55;
}

.error {
  margin: 0;
  padding: 10px 12px;
  border: 1px solid #d94b3d;
  border-radius: 8px;
  color: #d94b3d;
  font-size: 13px;
}

@media (prefers-color-scheme: dark) {
  .label {
    color: #f5f5f5;
  }

  .input {
    border-color: #3a3a3c;
    background: #1c1c1e;
    color: #f5f5f5;
  }
}
</style>
