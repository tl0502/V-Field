import { computed } from 'vue'
import { createSessionController, SessionRequestError } from '@vquan/session-core'
import type { SessionRequestOptions } from '@vquan/session-core'
import { authErrorMessage } from '../authErrorMessage'
import { adminShellConfig } from '../shell'
import type { AccountMe } from '../types'

async function request<T>(path: string, options: SessionRequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { 'x-vquan-audience': adminShellConfig().audience }
  if (options.body !== undefined) headers['content-type'] = 'application/json'
  if (options.token) headers.authorization = `Bearer ${options.token}`
  const response = await fetch(path, {
    method: options.method ?? 'GET',
    headers,
    credentials: 'include',
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined
  })
  let data: T & { error?: string; issues?: string[] }
  try {
    data = await response.json()
  } catch {
    throw new SessionRequestError('invalid_response', response.status)
  }
  if (!response.ok) {
    throw new SessionRequestError(data?.error || `http_${response.status}`, response.status, data?.issues)
  }
  return data
}

const session = createSessionController<AccountMe>({
  request,
  errorMessage: authErrorMessage,
  cookieAuth: true,
  storage: {
    read: () => '',
    write() {}
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
