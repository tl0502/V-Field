<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { normalizeName, validateTagName, businessErrorMessage, LIMITS } from '@vquan/content-core'
import type { SelectedTag, Tag } from '@vquan/content-core'
const props = defineProps<{ selected: SelectedTag[]; tags: Tag[]; disabled: boolean }>()
const emit = defineEmits<{ 'update:selected': [tags: SelectedTag[]]; focus: [] }>()
const query = shallowRef('')
const error = shallowRef('')
const visibleTags = computed(() => props.tags.filter((tag) => normalizeName(tag.name).includes(normalizeName(query.value))))
function contains(tag: SelectedTag) { return props.selected.some((value) => tag.id && value.id === tag.id || normalizeName(value.name) === normalizeName(tag.name)) }
function toggle(tag: SelectedTag) {
  if (props.disabled) return
  emit('focus')
  error.value = ''
  if (contains(tag)) emit('update:selected', props.selected.filter((value) => !(tag.id && value.id === tag.id) && normalizeName(value.name) !== normalizeName(tag.name)))
  else if (props.selected.length >= LIMITS.tags) error.value = '最多选择 6 个标签'
  else emit('update:selected', [...props.selected, { ...(tag.id ? { id: tag.id } : {}), name: tag.name }])
}
function add() {
  if (props.disabled) return
  emit('focus')
  try {
    const name = validateTagName(query.value)
    const existing = props.tags.find((tag) => normalizeName(tag.name) === normalizeName(name))
    const tag = existing ?? { name }
    if (!contains(tag)) toggle(tag)
    if (!error.value) query.value = ''
  } catch (cause) { error.value = businessErrorMessage(cause) }
}
</script>

<template>
  <view class="tag-picker">
    <view class="tag-heading"><text>标签</text><text class="tag-count">{{ selected.length }}/6 · 可不选</text></view>
    <view v-if="selected.length" class="selected-tags"><button v-for="tag in selected" :key="tag.id || tag.name" :disabled="disabled" @click="toggle(tag)">#{{ tag.name }} ×</button></view>
    <view class="tag-input-row"><input v-model="query" :disabled="disabled" :maxlength="-1" placeholder="查找或新建标签" confirm-type="done" @focus="emit('focus')" @confirm="add" /><button :disabled="disabled || !query.trim()" @click="add">添加</button></view>
    <view class="tag-options"><button v-for="tag in visibleTags" :key="tag.id" :class="{ selected: contains(tag) }" :disabled="disabled" @click="toggle(tag)">#{{ tag.name }}</button></view>
    <text v-if="!tags.length" class="tag-hint">本域还没有标签。新词将在成功发布时加入共享词库。</text>
    <text v-if="error" class="tag-error">{{ error }}</text>
  </view>
</template>

<style scoped>
.tag-picker { border-top: 1rpx solid #e5e6e3; margin-top: 34rpx; padding-top: 26rpx; }
.tag-heading { display: flex; justify-content: space-between; align-items: center; font-size: 28rpx; color: #536573; }
.tag-count { color: #929da4; font-size: 22rpx; }
.selected-tags, .tag-options { display: flex; gap: 12rpx; flex-wrap: wrap; margin: 20rpx 0; }
.selected-tags button, .tag-options button { margin: 0; padding: 8rpx 16rpx; font-size: 23rpx; line-height: 1.6; border-radius: 8rpx; background: #f0f3f5; color: #718796; }
.selected-tags button, .tag-options button.selected { background: #e9f2fc; color: #286bc4; }
.tag-picker button::after { border: 0; }
.tag-input-row { display: flex; gap: 14rpx; align-items: center; margin: 24rpx 0; }
.tag-input-row input { flex: 1; min-width: 0; height: 76rpx; padding: 0 18rpx; border: 1rpx solid #dce2e6; border-radius: 10rpx; font-size: 25rpx; }
.tag-input-row button { color: #286bc4; font-size: 24rpx; background: #e9f2fc; margin: 0; }
.tag-hint, .tag-error { display: block; color: #93a0a8; font-size: 22rpx; line-height: 1.7; }
.tag-error { color: #a34e3b; }
</style>
