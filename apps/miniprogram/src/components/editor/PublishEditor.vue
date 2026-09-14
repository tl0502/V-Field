<script setup lang="ts">
import { computed, shallowRef, toRef } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { codePointLength } from '@vquan/content-core'
import { usePublishDraft } from '../../composables/usePublishDraft'
import { useMiniprogramSession } from '../../composables/useMiniprogramSession'
import ArticleDocument from '../community/ArticleDocument.vue'
import BlockEditor from './BlockEditor.vue'
import TagPicker from './TagPicker.vue'
const props = defineProps<{ domainId: string }>()
const {
  draft, domain, tags, availableTypes, selectedType, rulesChanged, ruleIssues, canAddCar,
  loading, ready, submitting, error, storageError, saveLabel, publishedId, displayTags, hasPendingSubmission, me,
  initialize, refreshRules, selectType, acceptRules, publishInput, persist, clear, publish, openPublished
} = usePublishDraft(toRef(props, 'domainId'))
const session = useMiniprogramSession()
const preview = shallowRef(false)
const cursorReset = shallowRef(0)
const typeIndex = computed(() => Math.max(0, availableTypes.value.findIndex((type) => type.id === draft.value.typeId)))
onShow(() => { void session.refresh(); if (ready.value) void refreshRules() })
function changeType(event: { detail: { value: string | number } }) { cursorReset.value++; const type = availableTypes.value[Number(event.detail.value)]; if (type) selectType(type.id) }
function showPreview() { if (publishInput()) { persist(); preview.value = true; uni.setNavigationBarTitle({ title: '内容预览' }) } }
function returnToEditor() { preview.value = false; uni.setNavigationBarTitle({ title: '发布内容' }) }
function login() { uni.navigateTo({ url: '/pages/auth/auth' }) }
function joinDomain() { uni.navigateTo({ url: '/pages/join/join' }) }
</script>

<template>
  <view class="publish-page">
    <view v-if="!me" class="editor-state"><text>登录并加入当前域后即可发布</text><button @click="login">去登录</button></view>
    <view v-else-if="!ready" class="editor-state"><text>{{ loading ? '正在读取发布设置与草稿…' : error || '发布设置尚未就绪' }}</text><button v-if="!loading" @click="initialize">重新读取</button><button v-if="!loading" @click="joinDomain">查看入域状态</button></view>
    <template v-else>
      <template v-if="preview"><view class="preview-return"><button @click="returnToEditor">← 返回编辑</button><text>尚未发布</text></view><ArticleDocument :title="draft.title" :user-id="me.account.userId" :domain-name="domain?.name || ''" :type-name="selectedType?.name || ''" time-label="内容预览" :tags="displayTags" :blocks="draft.blocks" /></template>
      <view v-else class="editor-document">
        <view class="publish-domain"><text>{{ domain?.name }}</text><text>{{ saveLabel }}</text></view>
        <input v-model="draft.title" class="title-input" :disabled="submitting || !!publishedId" :maxlength="-1" placeholder="标题" @focus="cursorReset++" />
        <text class="title-counter">{{ codePointLength(draft.title) }}/80</text>
        <view class="editor-settings"><picker :range="availableTypes" :value="typeIndex" range-key="name" :disabled="submitting || !!publishedId" @click="cursorReset++" @change="changeType"><view class="type-picker">{{ selectedType?.name || '选择文章类型' }} ▾</view></picker><button :disabled="submitting || !!publishedId" @click="showPreview">预览</button><button class="clear-draft" :disabled="submitting || !!publishedId" @click="clear">清空草稿</button></view>
        <view v-if="!availableTypes.length" class="rule-feedback"><text>当前没有可用文章类型，需要域运营者创建或启用后才能发布。草稿仍保留。</text><button :disabled="loading" @click="refreshRules">刷新类型</button></view>
        <view v-else-if="ruleIssues.length" class="rule-feedback"><text v-for="issue in ruleIssues" :key="issue">{{ issue }}</text><button v-if="rulesChanged" :disabled="submitting" @click="acceptRules">已核对，使用新规则</button><button :disabled="loading || submitting" @click="refreshRules">刷新规则与标签</button></view>
        <BlockEditor v-model:blocks="draft.blocks" :disabled="submitting || !!publishedId" :can-add-car="canAddCar" :cursor-reset="cursorReset" />
        <TagPicker v-model:selected="draft.tags" :tags="tags" :disabled="submitting || !!publishedId" @focus="cursorReset++" />
      </view>
      <view v-if="error || storageError" class="publish-feedback"><text v-if="error">{{ error }}</text><text v-if="storageError">{{ storageError }}</text><button v-if="storageError && !publishedId" @click="persist">重试保存草稿</button><button v-if="error && !submitting && !publishedId" :disabled="loading" @click="refreshRules">核对最新规则</button></view>
      <view class="publish-actions"><button v-if="publishedId" class="publish-primary" @click="openPublished">查看已发布内容</button><template v-else><button v-if="preview" class="publish-secondary" :disabled="submitting" @click="returnToEditor">返回编辑</button><button class="publish-primary" :disabled="submitting || loading || (!hasPendingSubmission && (!selectedType?.enabled || rulesChanged))" @click="publish">{{ submitting ? '正在处理…' : hasPendingSubmission ? '核对并重试上次发布' : '发布内容' }}</button></template></view>
    </template>
  </view>
</template>

<style scoped>
.publish-page { min-height: 100vh; background: #fffefa; color: #202a32; padding-bottom: calc(130rpx + env(safe-area-inset-bottom)); }
.editor-document { padding: 30rpx 36rpx 36rpx; }
.publish-domain { display: flex; justify-content: space-between; gap: 18rpx; color: #8998a2; font-size: 21rpx; line-height: 1.6; margin-bottom: 26rpx; }
.title-input { height: 80rpx; padding: 0 0 18rpx; border-bottom: 1rpx solid #e5e6e3; font-size: 42rpx; font-weight: 700; color: #202a32; }
.title-counter { display: block; text-align: right; color: #a1a9af; font-size: 21rpx; margin-top: 10rpx; }
.editor-settings { display: flex; align-items: center; flex-wrap: wrap; gap: 18rpx; margin: 18rpx 0 24rpx; }
.editor-settings button, .type-picker { border-radius: 8rpx; padding: 12rpx 16rpx; background: #f0f3f5; color: #617988; font-size: 23rpx; line-height: 1.5; margin: 0; }
.editor-settings .clear-draft { margin-left: auto; background: transparent; color: #9d8174; }
.publish-page button::after { border: 0; }
.rule-feedback, .publish-feedback { padding: 20rpx 24rpx; margin: 22rpx 0; border: 1rpx solid #eddfc9; border-radius: 10rpx; background: #fff7eb; font-size: 24rpx; color: #986e3f; line-height: 1.7; }
.rule-feedback text, .publish-feedback text { display: block; margin-bottom: 8rpx; }
.rule-feedback button, .publish-feedback button { margin-top: 14rpx; background: #f6ebdb; color: #986e3f; font-size: 23rpx; }
.publish-feedback { margin: 0 36rpx 24rpx; background: #fff1eb; border-color: #efd4c8; color: #a34e3b; }
.publish-actions { position: fixed; bottom: 0; left: 0; right: 0; display: flex; gap: 18rpx; padding: 20rpx 36rpx calc(20rpx + env(safe-area-inset-bottom)); background: #fffefa; border-top: 1rpx solid #e5e6e3; z-index: 5; }
.publish-primary { flex: 1; margin: 0; background: #ff6a00; color: #fff; border-radius: 12rpx; font-size: 28rpx; }
.publish-secondary { flex: 1; background: #edf3f7; color: #52738b; font-size: 27rpx; }
.editor-state { padding: 70rpx 36rpx; display: flex; flex-direction: column; gap: 28rpx; text-align: center; color: #77828b; font-size: 27rpx; line-height: 1.8; }
.editor-state button { background: #e9f2fc; color: #286bc4; font-size: 27rpx; }
.preview-return { display: flex; justify-content: space-between; align-items: center; padding: 22rpx 36rpx; color: #9ba7af; font-size: 24rpx; border-bottom: 1rpx solid #e5e6e3; }
.preview-return button { margin: 0; background: transparent; font-size: 26rpx; color: #286bc4; padding: 0; }
</style>
