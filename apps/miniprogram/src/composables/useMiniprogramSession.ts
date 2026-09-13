import { createSessionController } from '@vquan/session-core'
import type { AccountMe } from '../types'
import { authErrorMessage } from '../utils/authErrorMessage'
import { sessionStorageKey } from '../utils/config'
import { requestApi } from '../utils/requestApi'

const session = createSessionController<AccountMe>({
  request: requestApi,
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
