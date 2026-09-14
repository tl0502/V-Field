import { computed, onUnmounted, shallowRef, watch } from 'vue'
import type { Ref } from 'vue'
import { businessErrorMessage } from '@vquan/content-core'
import type { Article } from '@vquan/content-core'
import { requestApi } from '../utils/requestApi'
import { useMiniprogramSession } from './useMiniprogramSession'

export function useArticleDetail(id: Ref<string>) {
  const session = useMiniprogramSession()
  const article = shallowRef<Article | null>(null)
  const busy = shallowRef(false)
  const deleting = shallowRef(false)
  const error = shallowRef('')
  const unavailable = shallowRef(false)
  let generation = 0
  const isAuthor = computed(() => Boolean(article.value && session.me.value?.account.userId === article.value.author.userId))
  async function load() {
    if (!id.value) return
    const run = ++generation
    busy.value = true
    error.value = ''
    unavailable.value = false
    article.value = null
    try {
      const response = await requestApi<{ article: Article }>(`/api/articles/${encodeURIComponent(id.value)}`)
      if (run === generation) article.value = response.article
    } catch (cause) {
      if (run === generation) {
        error.value = businessErrorMessage(cause, '未能读取内容，请重试')
        unavailable.value = cause instanceof Error && ['article_unavailable', 'invalid_id'].includes(cause.message)
      }
    } finally { if (run === generation) busy.value = false }
  }
  async function remove() {
    if (deleting.value || !article.value || !isAuthor.value) return
    deleting.value = true
    const target = article.value.id
    try {
      const confirmation = await uni.showModal({ title: '删除这篇内容？', content: '删除后，列表与原详情链接都无法再读取。此操作无法在页面恢复。', confirmText: '删除', confirmColor: '#a34e3b' })
      if (!confirmation.confirm) return
      await session.request(`/api/articles/${target}/delete`, { method: 'POST' })
      article.value = null
      uni.$emit('article-deleted', target)
      uni.navigateBack({ fail: () => uni.switchTab({ url: '/pages/index/index' }) })
    } catch (cause) { error.value = businessErrorMessage(cause, '删除未完成，请重试') }
    finally { deleting.value = false }
  }
  watch(id, load, { immediate: true })
  onUnmounted(() => { generation++ })
  return { article, busy, deleting, error, unavailable, isAuthor, load, remove }
}
