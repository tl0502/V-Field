import { computed, readonly, ref, shallowRef } from 'vue'
import type { AccountMe, AuthResponse } from '../types'

const sessionStorageKey = 'vquan.admin-platform.session'

const me = ref<AccountMe | null>(null)
const token = shallowRef('')
const busy = shallowRef(false)
const errorMessage = shallowRef('')

function persistToken(value: string) {
  token.value = value
  if (value) {
    sessionStorage.setItem(sessionStorageKey, value)
  } else {
    sessionStorage.removeItem(sessionStorageKey)
  }
}

async function request<T>(path: string, options: { method?: string; body?: unknown } = {}) {
  const headers: Record<string, string> = {
    'x-vquan-audience': 'admin'
  }
  if (options.body !== undefined) {
    headers['content-type'] = 'application/json'
  }
  if (token.value) {
    headers.authorization = `Bearer ${token.value}`
  }

  const response = await fetch(path, {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined
  })
  const data = (await response.json()) as T & { error?: string }
  if (!response.ok) {
    throw new Error(data.error || `http_${response.status}`)
  }
  return data
}

export function useAdminSession() {
  const isAuthed = computed(() => Boolean(me.value))
  const isPlatformOperator = computed(() => Boolean(me.value?.roles.platformOperator))

  async function refresh() {
    const stored = sessionStorage.getItem(sessionStorageKey)
    if (!stored) {
      me.value = null
      persistToken('')
      return
    }
    persistToken(stored)
    try {
      me.value = await request<AccountMe>('/api/auth/me')
    } catch {
      me.value = null
      persistToken('')
    }
  }

  async function login(loginName: string, password: string) {
    if (busy.value) return
    busy.value = true
    errorMessage.value = ''
    try {
      const body = await request<AuthResponse>('/api/auth/admin/login', {
        method: 'POST',
        body: { loginName, password }
      })
      persistToken(body.token)
      const { token: _token, ...account } = body
      me.value = account
    } catch (error) {
      // TODO: 把接口错误码翻成用户可读文案，不要直接展示 invalid_credentials 等代号。
      errorMessage.value = error instanceof Error ? error.message : 'login_failed'
      throw error
    } finally {
      busy.value = false
    }
  }

  async function logout() {
    if (token.value) {
      await request('/api/auth/logout', { method: 'POST' }).catch(() => undefined)
    }
    me.value = null
    persistToken('')
  }

  return {
    me: readonly(me),
    busy: readonly(busy),
    errorMessage: readonly(errorMessage),
    isAuthed,
    isPlatformOperator,
    refresh,
    login,
    logout
  }
}
