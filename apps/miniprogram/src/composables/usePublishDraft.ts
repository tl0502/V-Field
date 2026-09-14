import { computed, onUnmounted, ref, shallowRef, watch } from 'vue'
import type { Ref } from 'vue'
import { onHide, onUnload } from '@dcloudio/uni-app'
import {
  articleRuleIssues, businessErrorMessage, decodeDraft, draftStorageKey, editorId,
  emptyText, ensureTextSlots, normalizeName, prepareArticle
} from '@vquan/content-core'
import type { Article, ArticleInput, ArticleType, ContentBlock, Domain, LocalDraft, SelectedTag, Tag } from '@vquan/content-core'
import { SessionRequestError } from '@vquan/session-core'
import { requestApi } from '../utils/requestApi'
import { useMiniprogramSession } from './useMiniprogramSession'

interface DraftFields { typeId: string; typeVersion: number; title: string; blocks: ContentBlock[]; tags: SelectedTag[] }
const blank = (): DraftFields => ({ typeId: '', typeVersion: 1, title: '', blocks: [emptyText()], tags: [] })

export function usePublishDraft(requestedDomainId: Ref<string>) {
  const session = useMiniprogramSession()
  const draft = ref<DraftFields>(blank())
  const domain = shallowRef<Domain | null>(null)
  const types = shallowRef<ArticleType[]>([])
  const tags = shallowRef<Tag[]>([])
  const loading = shallowRef(false)
  const ready = shallowRef(false)
  const submitting = shallowRef(false)
  const error = shallowRef('')
  const storageError = shallowRef('')
  const saveLabel = shallowRef('')
  const publishedId = shallowRef('')
  const pendingSubmission = shallowRef<ArticleInput | null>(null)
  let owner: { accountId: string; domainId: string } | null = null
  let generation = 0
  let revision = 0
  let operationId = editorId('publish')
  let lastIntent = ''
  let hydrating = false
  let saveTimer: ReturnType<typeof setTimeout> | undefined
  const selectedType = computed(() => types.value.find((type) => type.id === draft.value.typeId) ?? null)
  const availableTypes = computed(() => types.value.filter((type) => type.enabled))
  const rulesChanged = computed(() => Boolean(selectedType.value && selectedType.value.version !== draft.value.typeVersion))
  const ruleIssues = computed(() => {
    const type = selectedType.value
    if (!type || !type.enabled) return ['当前文章类型不可用，请选择可用类型；草稿内容仍保留。']
    const issues = articleRuleIssues(draft.value.blocks, type.rules)
    if (rulesChanged.value) issues.unshift('文章类型规则已更新，请核对后使用新规则。')
    for (const tag of draft.value.tags) if (tag.id && !tags.value.some((value) => value.id === tag.id)) issues.push(`标签“${tag.name}”已不可用，请移除或改选。`)
    return issues
  })
  const canAddCar = computed(() => Boolean(selectedType.value?.rules.car.enabled && draft.value.blocks.filter((block) => block.type === 'car').length < (selectedType.value?.rules.car.max ?? 0)))
  const hasPendingSubmission = computed(() => Boolean(pendingSubmission.value))
  function intentSignature() {
    const { typeVersion: _version, ...content } = draft.value
    return JSON.stringify(content)
  }

  function snapshot(): LocalDraft | null {
    if (!owner || !ready.value) return null
    return { schema: 1, ...owner, ...JSON.parse(JSON.stringify(draft.value)), operationId,
      ...(pendingSubmission.value ? { pendingSubmission: pendingSubmission.value } : {}) }
  }
  function persist() {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = undefined
    if (publishedId.value) return
    const current = snapshot()
    if (!current) return
    try {
      uni.setStorageSync(draftStorageKey(current.accountId, current.domainId), JSON.stringify(current))
      storageError.value = ''
      saveLabel.value = '草稿已保存到本机'
    } catch {
      storageError.value = '本机草稿保存失败，请勿关闭页面；仍可重试保存或直接发布。'
      saveLabel.value = ''
    }
  }
  watch(draft, () => {
    if (hydrating || !ready.value) return
    revision++
    const intent = intentSignature()
    if (intent !== lastIntent) {
      operationId = editorId('publish')
      pendingSubmission.value = null
      lastIntent = intent
    }
    error.value = ''
    saveLabel.value = '正在保存草稿…'
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(persist, 250)
  }, { deep: true, flush: 'sync' })

  async function initialize() {
    persist()
    const run = ++generation
    ready.value = false
    submitting.value = false
    publishedId.value = ''
    pendingSubmission.value = null
    owner = null
    domain.value = null
    types.value = []
    tags.value = []
    hydrating = true
    draft.value = blank()
    hydrating = false
    error.value = ''
    storageError.value = ''
    const actor = session.me.value?.account.id
    if (!actor) { loading.value = false; return }
    loading.value = true
    try {
      const found = (await requestApi<{ domain: Domain }>('/api/domains/auto-verify')).domain
      if (requestedDomainId.value && requestedDomainId.value !== found.id) throw new Error('domain_unavailable')
      const [configuration, tagResult] = await Promise.all([
        session.request<{ types: ArticleType[] }>(`/api/domains/${found.id}/types`),
        session.request<{ tags: Tag[] }>(`/api/domains/${found.id}/tags`)
      ])
      if (run !== generation || actor !== session.me.value?.account.id) return
      domain.value = found
      types.value = configuration.types
      tags.value = tagResult.tags
      const stored = decodeDraft(uni.getStorageSync(draftStorageKey(actor, found.id)), actor, found.id)
      owner = { accountId: actor, domainId: found.id }
      hydrating = true
      if (stored) {
        draft.value = { typeId: stored.typeId, typeVersion: stored.typeVersion, title: stored.title, blocks: ensureTextSlots(stored.blocks), tags: stored.tags }
        operationId = stored.operationId
        pendingSubmission.value = stored.pendingSubmission ?? null
        saveLabel.value = '已恢复本机草稿'
      } else {
        draft.value = blank()
        const first = configuration.types.find((type) => type.enabled)
        if (first) { draft.value.typeId = first.id; draft.value.typeVersion = first.version }
        operationId = editorId('publish')
        saveLabel.value = '每个账号、每个域独立保存一份草稿'
      }
      revision++
      lastIntent = intentSignature()
      ready.value = true
      hydrating = false
    } catch (cause) {
      if (run === generation) error.value = cause instanceof Error && cause.message === 'invalid_draft'
        ? '本机草稿读取失败，原内容未覆盖。请重试读取。'
        : businessErrorMessage(cause, '无法读取发布设置，请重试')
    } finally { if (run === generation) { loading.value = false; hydrating = false } }
  }

  async function refreshRules() {
    if (!owner || !ready.value || loading.value || submitting.value) return
    const actor = owner.accountId
    const run = generation
    loading.value = true
    try {
      const [configuration, tagResult] = await Promise.all([
        session.request<{ types: ArticleType[] }>(`/api/domains/${owner.domainId}/types`),
        session.request<{ tags: Tag[] }>(`/api/domains/${owner.domainId}/tags`)
      ])
      if (run === generation && actor === session.me.value?.account.id) { types.value = configuration.types; tags.value = tagResult.tags }
    } catch (cause) { if (run === generation) error.value = businessErrorMessage(cause, '未能刷新文章规则，草稿仍保留') }
    finally { if (run === generation) loading.value = false }
  }

  function selectType(id: string) {
    const type = types.value.find((item) => item.id === id && item.enabled)
    if (type) { draft.value.typeId = type.id; draft.value.typeVersion = type.version }
  }
  function acceptRules() { if (selectedType.value) draft.value.typeVersion = selectedType.value.version }

  function publishInput() {
    if (ruleIssues.value.length) { error.value = ruleIssues.value.join('；'); return null }
    try {
      return prepareArticle({ ...draft.value, operationId, tags: draft.value.tags.map((tag) => tag.id ? { id: tag.id } : { name: tag.name }) })
    } catch (cause) { error.value = businessErrorMessage(cause); return null }
  }

  async function clear() {
    if (!owner || submitting.value) return
    const currentOwner = { ...owner }
    const currentGeneration = generation
    const result = await uni.showModal({ title: '清空本机草稿？', content: '当前账号在这个域的未发布内容将被清空，无法恢复。', confirmText: '清空', confirmColor: '#a34e3b' })
    if (!result.confirm || currentGeneration !== generation) return
    try {
      uni.removeStorageSync(draftStorageKey(currentOwner.accountId, currentOwner.domainId))
      if (saveTimer) clearTimeout(saveTimer)
      saveTimer = undefined
      hydrating = true
      const type = selectedType.value?.enabled ? selectedType.value : availableTypes.value[0]
      draft.value = { ...blank(), typeId: type?.id ?? '', typeVersion: type?.version ?? 1 }
      operationId = editorId('publish')
      pendingSubmission.value = null
      lastIntent = intentSignature()
      revision++
      hydrating = false
      error.value = ''; storageError.value = ''; saveLabel.value = '草稿已清空'
    } catch { storageError.value = '清空失败，草稿仍保留，请重试' }
  }

  async function publish() {
    if (submitting.value || loading.value || !owner || !ready.value || publishedId.value) return
    const input = pendingSubmission.value ?? publishInput()
    if (!input) return
    const run = generation
    const submittedRevision = revision
    const submittedOwner = { ...owner }
    submitting.value = true
    error.value = ''
    try {
      const confirmation = await uni.showModal({ title: pendingSubmission.value ? '核对上次发布' : '确认发布', content: `发布到「${domain.value!.name}」\n文章类型：${selectedType.value?.name || '上次选择的类型'}`, confirmText: pendingSubmission.value ? '核对并重试' : '发布' })
      if (!confirmation.confirm || run !== generation || revision !== submittedRevision) return
      if (pendingSubmission.value) {
        const receipt = await session.request<{ article: Article | null; deleted: boolean }>(`/api/domains/${submittedOwner.domainId}/submissions/${encodeURIComponent(input.operationId)}`)
        if (run !== generation || revision !== submittedRevision) return
        if (receipt.article) { finishPublished(receipt.article.id, submittedOwner); return }
        if (receipt.deleted) { pendingSubmission.value = null; error.value = '上次发布的内容已删除，不能通过重试恢复。'; persist(); return }
      }
      pendingSubmission.value = JSON.parse(JSON.stringify(input))
      persist()
      const result = await session.request<{ article: Article }>(`/api/domains/${submittedOwner.domainId}/articles`, { method: 'POST', body: { ...input } })
      if (run !== generation || revision !== submittedRevision || session.me.value?.account.id !== submittedOwner.accountId) return
      finishPublished(result.article.id, submittedOwner)
    } catch (cause) {
      if (run === generation) {
        if (cause instanceof SessionRequestError && cause.status >= 400 && cause.status < 500 && ![408, 429].includes(cause.status)) { pendingSubmission.value = null; persist() }
        error.value = businessErrorMessage(cause, '发布结果尚未确定，草稿仍在；重试会先核对上次结果。')
      }
    }
    finally { if (run === generation) submitting.value = false }
  }
  function finishPublished(articleId: string, submittedOwner: { accountId: string; domainId: string }) {
    publishedId.value = articleId
    pendingSubmission.value = null
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = undefined
    try { uni.removeStorageSync(draftStorageKey(submittedOwner.accountId, submittedOwner.domainId)); storageError.value = ''; saveLabel.value = '发布成功，草稿已清理' }
    catch { storageError.value = '内容已发布，但本机草稿未能清理；再次打开时请核对。' }
    uni.$emit('article-published', articleId)
    if (!storageError.value) openPublished()
  }
  function openPublished() {
    if (publishedId.value) uni.redirectTo({ url: `/pages/detail/detail?id=${publishedId.value}`, fail: () => { error.value = '发布已成功，请点击“查看已发布内容”重试打开。' } })
  }

  const displayTags = computed(() => draft.value.tags.map((tag) => {
    const stored = tags.value.find((value) => tag.id ? value.id === tag.id : normalizeName(value.name) === normalizeName(tag.name))
    return stored ? { id: stored.id, name: stored.name } : tag
  }))
  watch([() => session.me.value?.account.id, requestedDomainId], initialize, { immediate: true })
  onHide(persist)
  onUnload(persist)
  onUnmounted(() => { persist(); generation++; if (saveTimer) clearTimeout(saveTimer) })
  return { draft, domain, types, tags, availableTypes, selectedType, rulesChanged, ruleIssues, canAddCar,
    loading, ready, submitting, error, storageError, saveLabel, publishedId, displayTags, hasPendingSubmission, me: session.me,
    initialize, refreshRules, selectType, acceptRules, publishInput, persist, clear, publish, openPublished }
}
