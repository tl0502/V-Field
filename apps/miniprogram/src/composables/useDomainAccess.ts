import { onUnmounted, shallowRef, watch } from 'vue'
import { businessErrorMessage } from '@vquan/content-core'
import type { Domain, JoinState } from '@vquan/content-core'
import { requestApi } from '../utils/requestApi'
import { useMiniprogramSession } from './useMiniprogramSession'

export function useDomainAccess() {
  const session = useMiniprogramSession()
  const domain = shallowRef<Domain | null>(null)
  const state = shallowRef<JoinState | null>(null)
  const busy = shallowRef(false)
  const error = shallowRef('')
  let generation = 0
  async function refresh() {
    const run = ++generation
    const actor = session.me.value?.account.id
    busy.value = true
    error.value = ''
    state.value = null
    try {
      const result = await requestApi<{ domain: Domain }>('/api/domains/auto-verify')
      if (run !== generation) return
      domain.value = result.domain
      if (actor) {
        const resultState = await session.request<JoinState>(`/api/domains/${result.domain.id}/join-state`)
        if (run === generation && actor === session.me.value?.account.id) state.value = resultState
      }
    } catch (cause) { if (run === generation) error.value = businessErrorMessage(cause, '暂时无法读取业务域，请重试') }
    finally { if (run === generation) busy.value = false }
  }
  async function act(action: 'apply' | 'cancel') {
    if (busy.value || !domain.value || !session.me.value) return
    const run = ++generation
    busy.value = true
    error.value = ''
    const base = `/api/domains/${domain.value.id}/join-requests`
    const path = action === 'apply' ? base : `${base}/${state.value?.application?.id}/cancel`
    try {
      const result = await session.request<JoinState>(path, { method: 'POST' })
      if (run === generation) state.value = result
    } catch (cause) { if (run === generation) error.value = businessErrorMessage(cause) }
    finally { if (run === generation) busy.value = false }
  }
  watch(() => session.me.value?.account.id, refresh, { immediate: true })
  onUnmounted(() => { generation++ })
  return { domain, state, busy, error, refresh, act, me: session.me }
}
