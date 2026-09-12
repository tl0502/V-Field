import { computed, readonly, ref, shallowRef } from 'vue'
import { authErrorMessage } from '../authErrorMessage'
import { apiBaseUrl, sessionStorageKey } from '../config'
import type { AccountMe, AuthResponse } from '../types'

const me = ref<AccountMe | null>(null)
const token = shallowRef('')
const busy = shallowRef(false)
const errorMessage = shallowRef('')

function persistToken(value: string) {
  token.value = value
  if (value) {
    uni.setStorageSync(sessionStorageKey, value)
  } else {
    uni.removeStorageSync(sessionStorageKey)
  }
}

async function request<T>(path: string, options: { method?: string; body?: unknown; token?: string } = {}) {
  const header: Record<string, string> = {
    'x-vquan-audience': 'miniprogram'
  }
  if (options.body !== undefined) {
    header['content-type'] = 'application/json'
  }
  const session = options.token ?? token.value
  if (session) {
    header.authorization = `Bearer ${session}`
  }

  const response = await new Promise<UniApp.RequestSuccessCallbackResult>((resolve, reject) => {
    uni.request({
      url: `${apiBaseUrl}${path}`,
      method: (options.method ?? 'GET') as UniApp.RequestOptions['method'],
      header,
      data: options.body,
      success: resolve,
      fail: reject
    })
  })

  const data = response.data as T & { error?: string }
  if (response.statusCode >= 400) {
    throw new Error(data.error || `http_${response.statusCode}`)
  }
  return data
}

export function useMiniprogramSession() {
  const isAuthed = computed(() => Boolean(me.value))

  async function refresh() {
    const stored = uni.getStorageSync(sessionStorageKey)
    if (!stored || typeof stored !== 'string') {
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

  async function loginWithWeChat() {
    if (busy.value) return
    busy.value = true
    errorMessage.value = ''
    try {
      const login = await uni.login({ provider: 'weixin' })
      const body = await request<AuthResponse>('/api/auth/wechat/login', {
        method: 'POST',
        body: { code: login.code }
      })
      persistToken(body.token)
      const { token: _token, ...account } = body
      me.value = account
      const stack = getCurrentPages()
      if (stack.length > 1) {
        uni.navigateBack()
      } else {
        uni.switchTab({ url: '/pages/me/me' })
      }
    } catch (error) {
      errorMessage.value = authErrorMessage(error)
    } finally {
      busy.value = false
    }
  }

  async function logout() {
    if (busy.value) return
    busy.value = true
    errorMessage.value = ''
    try {
      if (token.value) {
        await request('/api/auth/logout', { method: 'POST' }).catch(() => undefined)
      }
    } finally {
      me.value = null
      persistToken('')
      busy.value = false
    }
  }

  return {
    me: readonly(me),
    busy: readonly(busy),
    errorMessage: readonly(errorMessage),
    isAuthed,
    refresh,
    loginWithWeChat,
    logout
  }
}
