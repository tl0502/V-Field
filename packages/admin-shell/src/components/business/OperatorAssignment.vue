<script setup lang="ts">
import { onMounted, shallowRef, watch } from 'vue'
import { USER_ID_PATTERN } from '@vquan/content-core'
import type { Domain } from '@vquan/content-core'
import { useAdminTask } from '../../composables/useAdminTask'
import TaskFeedback from './TaskFeedback.vue'

interface ManagementUser { userId: string; status: string; hasManagementCredential: boolean; domainOperatorDomainIds: string[] }
const { busy, error, notice, run, request } = useAdminTask()
const domain = shallowRef<Domain | null>(null)
const query = shallowRef('')
const user = shallowRef<ManagementUser | null>(null)
const generatedPassword = shallowRef('')
const passwordEffective = shallowRef(false)

watch(query, () => { user.value = null; generatedPassword.value = ''; passwordEffective.value = false; notice.value = '' })
async function loadDomain() {
  const result = await run(() => request<{ domain: Domain }>('/api/domains/auto-verify'))
  if (result) domain.value = result.domain
}
onMounted(loadDomain)

async function search() {
  if (!USER_ID_PATTERN.test(query.value.trim())) { error.value = '请输入完整的 8 位用户号'; return }
  const target = query.value.trim()
  const result = await run(() => request<{ user: ManagementUser | null }>(`/api/admin/platform/accounts/${target}`))
  if (!result || query.value.trim() !== target) return
  user.value = result.user
  passwordEffective.value = false
  generatedPassword.value = ''
  if (!result.user) { notice.value = '没有找到这个用户号'; return }
  if (!result.user.hasManagementCredential && result.user.status === 'active') {
    const bytes = crypto.getRandomValues(new Uint8Array(24))
    generatedPassword.value = btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_')
  }
}

async function assign() {
  if (!user.value || !domain.value) return
  const target = user.value.userId
  const result = await run(() => request<{ alreadyGranted: boolean; credentialCreated: boolean; submittedPasswordValid: boolean }>(
    `/api/admin/platform/domains/${domain.value!.id}/operators`, {
      method: 'POST', body: { userId: target, ...(generatedPassword.value ? { password: generatedPassword.value } : {}) }
    }))
  if (!result || user.value?.userId !== target) return
  passwordEffective.value = result.submittedPasswordValid
  notice.value = result.alreadyGranted ? '该用户已具备此域的运营权限。' : '已指定为域运营者。'
  notice.value += result.submittedPasswordValid ? ' 本次密码已生效，请现场交付。' : ' 沿用账号已有的管理密码。'
  user.value = { ...user.value, hasManagementCredential: true }
  if (!result.submittedPasswordValid) generatedPassword.value = ''
}

async function copyPassword() {
  try { await navigator.clipboard.writeText(generatedPassword.value); notice.value = '密码已复制' }
  catch { error.value = '复制失败，请选中密码手动复制' }
}
</script>

<template>
  <section class="business-panel">
    <div class="business-heading"><div><p class="business-kicker">平台管理</p><h2>指定域运营者</h2></div><span v-if="domain" class="business-badge">{{ domain.name }}</span></div>
    <p class="business-copy">输入对方在“我的”页面显示的用户号，核对后授予当前域的运营权限。</p>
    <button v-if="!domain" class="business-button secondary" :disabled="busy" @click="loadDomain">重新读取业务域</button>
    <form class="business-inline-form" @submit.prevent="search">
      <label class="business-field grow"><span>用户号</span><input v-model="query" name="userId" inputmode="numeric" maxlength="8" placeholder="8 位数字" :disabled="busy" /></label>
      <button class="business-button" type="submit" :disabled="busy || !domain">{{ busy ? '处理中…' : '查找用户' }}</button>
    </form>
    <TaskFeedback :error="error" :notice="notice" />
    <div v-if="user" class="business-result">
      <div class="business-heading"><strong class="public-user-id">{{ user.userId }}</strong><span class="business-badge">{{ user.status === 'active' ? '正常账号' : '账号已停用' }}</span></div>
      <p v-if="user.hasManagementCredential && !generatedPassword" class="business-copy">已有管理密码，指定后继续使用原密码。</p>
      <div v-if="generatedPassword" class="business-password">
        <span>{{ passwordEffective ? '本次管理密码（已生效）' : '本次随机密码（指定成功后生效）' }}</span>
        <code>{{ generatedPassword }}</code>
        <button class="business-button secondary" type="button" @click="copyPassword">复制密码</button>
        <small>仅在本次页面展示，关闭后无法回查。</small>
      </div>
      <button class="business-button" :disabled="busy || user.status !== 'active' || !domain" @click="assign">指定为{{ domain?.name }}运营者</button>
    </div>
  </section>
</template>
