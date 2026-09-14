import { shallowRef } from 'vue'
import { businessErrorMessage } from '@vquan/content-core'
import { useAdminSession } from './useAdminSession'

export function useAdminTask() {
  const busy = shallowRef(false)
  const error = shallowRef('')
  const notice = shallowRef('')
  const session = useAdminSession()
  async function run<T>(action: () => Promise<T>): Promise<T | undefined> {
    if (busy.value) return undefined
    const accountId = session.me.value?.account.id
    busy.value = true
    error.value = ''
    notice.value = ''
    try {
      const result = await action()
      return accountId === session.me.value?.account.id ? result : undefined
    } catch (cause) {
      if (accountId === session.me.value?.account.id) error.value = businessErrorMessage(cause)
      return undefined
    } finally { busy.value = false }
  }
  return { busy, error, notice, run, request: session.request }
}
