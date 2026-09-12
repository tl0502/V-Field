import { computed, readonly, ref, shallowRef } from 'vue'
import type { AccountMe, AuthResponse } from '../types'
import { authErrorMessage } from '../utils/authErrorMessage'
import { apiBaseUrl, sessionStorageKey } from '../utils/config'

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

function readStoredToken() {
  const stored = uni.getStorageSync(sessionStorageKey)
  return typeof stored === 'string' && stored ? stored : ''
}

function parseResponseData<T>(raw: unknown) {
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as T & { error?: string }
    } catch {
      throw new Error('invalid_json')
    }
  }
  return raw as T & { error?: string }
}

function withAudience(path: string) {
  return `${path}${path.includes('?') ? '&' : '?'}audience=miniprogram`
}

async function request<T>(path: string, options: { method?: string; body?: unknown; token?: string } = {}) {
  const header: Record<string, string> = {
    'x-vquan-audience': 'miniprogram'
  }
  if (options.body !== undefined) {
    header['content-type'] = 'application/json'
  }
  const session = options.token || token.value
  if (session) {
    header.Authorization = `Bearer ${session}`
    header['x-vquan-session'] = session
  }

  const response = await new Promise<UniApp.RequestSuccessCallbackResult>((resolve, reject) => {
    uni.request({
      url: `${apiBaseUrl}${withAudience(path)}`,
      method: (options.method || 'GET') as UniApp.RequestOptions['method'],
      header,
      data: options.body,
      dataType: 'json',
      success: resolve,
      fail: reject
    })
  })

  const data = parseResponseData<T>(response.data)
  if (response.statusCode >= 400) {
    throw new Error(data.error || `http_${response.statusCode}`)
  }
  return data
}

export function useMiniprogramSession() {
  const isAuthed = computed(() => Boolean(me.value))

  async function refresh() {
    const stored = readStoredToken()
    if (!stored) {
      if (!token.value) me.value = null
      return
    }
    persistToken(stored)
    try {
      const account = await request<AccountMe>('/api/auth/me', { token: stored })
      if (readStoredToken() !== stored) return
      me.value = account
    } catch {
      if (readStoredToken() !== stored) return
      me.value = null
      persistToken('')
    }
  }

  async function loginWithWeChat() {
    if (busy.value) return
    busy.value = true
    errorMessage.value = ''
    let issued = ''
    try {
      const login = await uni.login({ provider: 'weixin' })
      const body = await request<AuthResponse>('/api/auth/wechat/login', {
        method: 'POST',
        body: { code: login.code }
      })
      if (!body.token) {
        throw new Error('login_failed')
      }
      issued = body.token
      persistToken(issued)
      me.value = await request<AccountMe>('/api/auth/me', { token: issued })
      const stack = getCurrentPages()
      if (stack.length > 1) {
        uni.navigateBack()
      } else {
        uni.switchTab({ url: '/pages/me/me' })
      }
    } catch (error) {
      if (issued && readStoredToken() === issued) {
        persistToken('')
        me.value = null
      }
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
