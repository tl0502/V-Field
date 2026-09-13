import { computed, shallowReadonly, shallowRef } from 'vue'

export class SessionRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
    this.name = 'SessionRequestError'
  }
}

export interface SessionRequestOptions {
  method?: 'GET' | 'POST'
  body?: Record<string, unknown>
  token?: string
}

interface SessionOptions {
  request: <T>(path: string, options?: SessionRequestOptions) => Promise<T>
  storage: { read: () => string; write: (token: string) => void }
  errorMessage: (error: unknown, fallback: string) => string
}

function isInvalidSession(error: unknown) {
  return error instanceof SessionRequestError &&
    (error.status === 401 || (error.status === 403 && error.message === 'account_disabled'))
}

export function createSessionController<TAccount extends object>(options: SessionOptions) {
  const me = shallowRef<TAccount | null>(null)
  const token = shallowRef('')
  const busy = shallowRef(false)
  const refreshing = shallowRef(false)
  const errorMessage = shallowRef('')
  const retryAction = shallowRef<'refresh' | 'logout' | null>(null)
  let revision = 0
  let refreshFlight: { revision: number; promise: Promise<boolean> } | undefined
  let logoutFlight: Promise<boolean> | undefined

  function invalidateReads() {
    revision++
    refreshFlight = undefined
    refreshing.value = false
  }

  function replaceToken(value: string) {
    options.storage.write(value)
    token.value = value
    me.value = null
    invalidateReads()
  }

  function current(snapshot: { token: string; revision: number }) {
    return revision === snapshot.revision && token.value === snapshot.token &&
      options.storage.read() === snapshot.token
  }

  function loadIdentity(): Promise<boolean> {
    const stored = options.storage.read()
    if (stored !== token.value) {
      token.value = stored
      me.value = null
      invalidateReads()
    }
    if (!stored) return Promise.resolve(false)
    if (refreshFlight?.revision === revision) return refreshFlight.promise

    const snapshot = { token: stored, revision }
    refreshing.value = true
    const flight = {
      revision,
      promise: Promise.resolve(false)
    }
    flight.promise = (async () => {
      try {
        const account = await options.request<TAccount>('/api/auth/me', { token: stored })
        if (!current(snapshot)) return false
        if (!account || typeof account !== 'object') throw new Error('invalid_response')
        me.value = account
        errorMessage.value = ''
        retryAction.value = null
        return true
      } catch (error) {
        if (!current(snapshot)) return false
        if (isInvalidSession(error)) replaceToken('')
        errorMessage.value = options.errorMessage(error, '暂时无法读取登录状态，请重试')
        retryAction.value = 'refresh'
        return false
      } finally {
        if (refreshFlight === flight) {
          refreshFlight = undefined
          refreshing.value = false
        }
      }
    })()
    refreshFlight = flight
    return flight.promise
  }

  function refresh() {
    // A login/logout owns the session until it finishes. Its private identity
    // read remains available, but page lifecycle refreshes cannot race with it.
    return busy.value ? Promise.resolve(false) : loadIdentity()
  }

  async function login(path: string, credentials: () => Promise<Record<string, unknown>>) {
    if (busy.value) return false
    busy.value = true
    errorMessage.value = ''
    retryAction.value = null
    invalidateReads()
    const run = revision
    const previousToken = options.storage.read()
    try {
      const body = await credentials()
      if (run !== revision || options.storage.read() !== previousToken) return false
      const response = await options.request<{ token: string }>(path, { method: 'POST', body })
      if (run !== revision || options.storage.read() !== previousToken) return false
      if (typeof response?.token !== 'string' || !response.token) throw new Error('login_failed')
      replaceToken(response.token)
      return await loadIdentity()
    } catch (error) {
      if (run === revision) errorMessage.value = options.errorMessage(error, '登录失败，请重试')
      return false
    } finally {
      busy.value = false
    }
  }

  function logout(): Promise<boolean> {
    if (logoutFlight) return logoutFlight
    if (busy.value) return Promise.resolve(false)
    const stored = options.storage.read()
    if (stored !== token.value) {
      token.value = stored
      me.value = null
    }
    invalidateReads()
    const snapshot = { token: stored, revision }
    if (!stored) {
      replaceToken('')
      errorMessage.value = ''
      retryAction.value = null
      return Promise.resolve(true)
    }
    busy.value = true
    errorMessage.value = ''
    retryAction.value = null
    logoutFlight = (async () => {
      try {
        try {
          const result = await options.request<{ ok: boolean }>('/api/auth/logout', {
            method: 'POST', token: stored
          })
          if (result?.ok !== true) throw new Error('invalid_response')
        } catch (error) {
          // An expired/revoked token is already logged out. Network and server
          // errors must keep the credential available for an explicit retry.
          if (!isInvalidSession(error)) throw error
        }
        if (!current(snapshot)) return false
        replaceToken('')
        return true
      } catch (error) {
        if (current(snapshot)) {
          errorMessage.value = options.errorMessage(error, '退出登录未完成，请重试')
          retryAction.value = 'logout'
        }
        return false
      } finally {
        busy.value = false
        logoutFlight = undefined
      }
    })()
    return logoutFlight
  }

  return {
    me: shallowReadonly(me),
    busy: computed(() => busy.value || refreshing.value),
    errorMessage: shallowReadonly(errorMessage),
    isAuthed: computed(() => Boolean(me.value)),
    canRetry: computed(() => Boolean(token.value) && retryAction.value !== null),
    retryLabel: computed(() => retryAction.value === 'logout' ? '重试退出' : '重试读取'),
    retry: () => retryAction.value === 'logout' ? logout() : refresh(),
    refresh,
    login,
    logout
  }
}
