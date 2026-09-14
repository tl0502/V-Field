import { onUnmounted, shallowRef } from 'vue'
import { businessErrorMessage } from '@vquan/content-core'
import type { Article, Domain } from '@vquan/content-core'
import { requestApi } from '../utils/requestApi'
type ArticleSummary = Omit<Article, 'blocks'>
export function useArticleFeed() {
  const domain = shallowRef<Domain | null>(null)
  const articles = shallowRef<ArticleSummary[]>([])
  const nextCursor = shallowRef<string | null>(null)
  const busy = shallowRef(false)
  const error = shallowRef('')
  const loaded = shallowRef(false)
  let generation = 0
  async function load(more = false) {
    if (more && (busy.value || !nextCursor.value)) return
    const run = ++generation
    busy.value = true
    error.value = ''
    try {
      const current = domain.value ?? (await requestApi<{ domain: Domain }>('/api/domains/auto-verify')).domain
      const result = await requestApi<{ domain: Domain; articles: ArticleSummary[]; nextCursor: string | null }>(`/api/domains/${current.id}/articles${more ? `?cursor=${encodeURIComponent(nextCursor.value!)}` : ''}`)
      if (run !== generation) return
      domain.value = result.domain
      articles.value = more ? [...articles.value, ...result.articles.filter((item) => !articles.value.some((existing) => existing.id === item.id))] : result.articles
      nextCursor.value = result.nextCursor
      loaded.value = true
    } catch (cause) { if (run === generation) error.value = businessErrorMessage(cause, '暂时没有连上，请重新读取') }
    finally { if (run === generation) busy.value = false }
  }
  function remove(id: string) { articles.value = articles.value.filter((item) => item.id !== id) }
  uni.$on('article-deleted', remove)
  onUnmounted(() => { generation++; uni.$off('article-deleted', remove) })
  return { domain, articles, nextCursor, busy, error, loaded, load }
}
