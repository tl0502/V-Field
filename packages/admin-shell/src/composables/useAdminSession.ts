import { computed } from 'vue'
import { createSessionController, SessionRequestError } from '@vquan/session-core'
import type { SessionRequestOptions } from '@vquan/session-core'
import { authErrorMessage } from '../authErrorMessage'
import { adminShellConfig } from '../shell'
import type { AccountMe } from '../types'

async function request<T>(path: string, options: SessionRequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { 'x-vquan-audience': 'admin' }
  if (options.body !== undefined) headers['content-type'] = 'application/json'
  if (options.token) headers.authorization = `Bearer ${options.token}`
  const response = await fetch(path, {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined
  })
  let data: T & { error?: string }
  try {
    data = await response.json()
  } catch {
    throw new SessionRequestError('invalid_response', response.status)
  }
  if (!response.ok) {
    throw new SessionRequestError(data?.error || `http_${response.status}`, response.status)
  }
  return data
}

const session = createSessionController<AccountMe>({
  request,
  errorMessage: authErrorMessage,
  storage: {
    read: () => sessionStorage.getItem(adminShellConfig().storageKey) ?? '',
    write(value) {
      const key = adminShellConfig().storageKey
      if (value) sessionStorage.setItem(key, value)
      else sessionStorage.removeItem(key)
    }
  }
})

export function useAdminSession() {
  return {
    ...session,
    isPlatformOperator: computed(() => Boolean(session.me.value?.roles.platformOperator)),
    login: (loginName: string, password: string) =>
      session.login('/api/auth/admin/login', async () => ({ loginName, password }))
  }
}
