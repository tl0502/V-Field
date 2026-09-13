import { createSessionController, SessionRequestError } from '@vquan/session-core'
import type { SessionRequestOptions } from '@vquan/session-core'
import type { AccountMe } from '../types'
import { authErrorMessage } from '../utils/authErrorMessage'
import { apiBaseUrl, sessionStorageKey } from '../utils/config'

async function request<T>(path: string, options: SessionRequestOptions = {}): Promise<T> {
  const header: Record<string, string> = { 'x-vquan-audience': 'miniprogram' }
  if (options.body !== undefined) header['content-type'] = 'application/json'
  if (options.token) {
    header.Authorization = `Bearer ${options.token}`
    header['x-vquan-session'] = options.token
  }
  const query = `${path}${path.includes('?') ? '&' : '?'}audience=miniprogram`
  const response = await new Promise<UniApp.RequestSuccessCallbackResult>((resolve, reject) => {
    uni.request({
      url: `${apiBaseUrl}${query}`,
      method: options.method ?? 'GET',
      header,
      data: options.body,
      dataType: 'json',
      success: resolve,
      fail: reject
    })
  })
  let data: T & { error?: string }
  try {
    data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data
  } catch {
    throw new SessionRequestError('invalid_response', response.statusCode)
  }
  if (response.statusCode >= 400) {
    throw new SessionRequestError(data?.error || `http_${response.statusCode}`, response.statusCode)
  }
  return data
}

const session = createSessionController<AccountMe>({
  request,
  errorMessage: authErrorMessage,
  storage: {
    read() {
      const stored = uni.getStorageSync(sessionStorageKey)
      return typeof stored === 'string' ? stored : ''
    },
    write(value) {
      if (value) uni.setStorageSync(sessionStorageKey, value)
      else uni.removeStorageSync(sessionStorageKey)
    }
  }
})

export function useMiniprogramSession() {
  return {
    ...session,
    loginWithWeChat: () => session.login('/api/auth/wechat/login', async () => {
      const result = await uni.login({ provider: 'weixin' })
      return { code: result.code }
    })
  }
}
