<script setup lang="ts">
import { computed, getCurrentInstance, shallowRef, watch } from 'vue'
import { insertCarAtCursor, removeCar, swapCars, codePointLength } from '@vquan/content-core'
import type { ContentBlock } from '@vquan/content-core'
import CarBlockEditor from './CarBlockEditor.vue'
import { textInputEvent } from '../../utils/inputEvent'
const props = defineProps<{ blocks: ContentBlock[]; disabled: boolean; canAddCar: boolean; cursorReset: number }>()
const emit = defineEmits<{ 'update:blocks': [blocks: ContentBlock[]] }>()
const instance = getCurrentInstance()
let focus: { id: string; cursor: number } | null = null
const dragging = shallowRef('')
const dragTarget = shallowRef('')
let positions: { id: string; top: number; bottom: number }[] = []
let latestDragY = 0
let dragSequence = 0
const cars = computed(() => props.blocks.filter((block) => block.type === 'car'))
const numbers = computed(() => {
  const result: Record<string, number> = {}
  cars.value.forEach((block, index) => { result[block.id] = index + 1 })
  return result
})
const textCount = computed(() => props.blocks.reduce((count, block) => count + (block.type === 'text' ? codePointLength(block.text) : 0), 0))
watch(() => props.cursorReset, () => { focus = null })
function input(id: string, event: unknown) {
  const detail = textInputEvent(event)
  focus = { id, cursor: detail.cursor ?? detail.value.length }
  emit('update:blocks', props.blocks.map((block) => block.id === id && block.type === 'text' ? { ...block, text: detail.value } : block))
}
function rememberFocus(id: string, event: unknown) {
  const detail = textInputEvent(event)
  focus = { id, cursor: detail.cursor ?? (focus?.id === id ? focus.cursor : detail.value.length) }
}
// Keep the blur cursor for the insert button, but ignore an old blur after
// another editor field has already invalidated that text selection.
function rememberBlur(id: string, event: unknown) { if (focus?.id === id) rememberFocus(id, event) }
function updateCar(id: string, description: string) { emit('update:blocks', props.blocks.map((block) => block.id === id && block.type === 'car' ? { ...block, description } : block)) }
function insert() { if (!props.disabled && props.canAddCar) { emit('update:blocks', insertCarAtCursor(props.blocks, focus).blocks); focus = null } }
function remove(id: string) { emit('update:blocks', removeCar(props.blocks, id)); focus = null }
function move(id: string, direction: -1 | 1) {
  focus = null
  const index = cars.value.findIndex((block) => block.id === id)
  const target = cars.value[index + direction]
  if (target) emit('update:blocks', swapCars(props.blocks, id, target.id))
}
function startDrag(id: string, y: number) {
  focus = null; dragging.value = id; dragTarget.value = id; positions = []
  latestDragY = y
  const sequence = ++dragSequence
  uni.createSelectorQuery().in(instance?.proxy).selectAll('.editor-car-wrapper').boundingClientRect((rectangles) => {
    if (sequence !== dragSequence || dragging.value !== id || !Array.isArray(rectangles)) return
    positions = rectangles.map((rect) => ({ id: String(rect.id).replace(/^card-/, ''), top: rect.top ?? 0, bottom: rect.bottom ?? 0 }))
    dragMove(latestDragY)
  }).exec()
}
function dragMove(y: number) {
  latestDragY = y
  if (!dragging.value || !positions.length) return
  let nearest = positions[0]
  for (const item of positions) if (Math.abs((item.top + item.bottom) / 2 - y) < Math.abs((nearest.top + nearest.bottom) / 2 - y)) nearest = item
  dragTarget.value = nearest.id
}
function endDrag() {
  if (dragging.value && dragTarget.value && dragging.value !== dragTarget.value) emit('update:blocks', swapCars(props.blocks, dragging.value, dragTarget.value))
  cancelDrag()
}
function cancelDrag() {
  dragSequence++
  dragging.value = ''; dragTarget.value = ''; positions = []
}
</script>

<template>
  <view class="block-editor">
    <template v-for="block in blocks" :key="block.id">
      <textarea v-if="block.type === 'text'" :id="'text-' + block.id" class="body-textarea" :value="block.text" :disabled="disabled" :maxlength="-1" auto-height :show-confirm-bar="false" :placeholder="blocks.length === 1 ? '正文' : ''" @input="input(block.id, $event)" @focus="rememberFocus(block.id, $event)" @blur="rememberBlur(block.id, $event)" />
      <view v-else :id="'card-' + block.id" class="editor-car-wrapper" :class="{ 'drop-target': dragTarget === block.id && dragging !== block.id }"><CarBlockEditor :block="block" :number="numbers[block.id]" :disabled="disabled" @update="updateCar(block.id, $event)" @remove="remove(block.id)" @move="move(block.id, $event)" @focus="focus = null" @drag-start="startDrag(block.id, $event)" @drag-move="dragMove" @drag-end="endDrag" @drag-cancel="cancelDrag" /></view>
    </template>
    <view class="editor-caption"><text>正文 {{ textCount }}/20000</text><text>车源 {{ cars.length }} 张</text></view>
    <button class="insert-car" :disabled="disabled || !canAddCar" @click="insert">＋ 插入车源卡片</button>
    <text v-if="cars.length > 1" class="editor-hint">拖动卡片左上角可换位；正文顺序保持不变。</text>
  </view>
</template>

<style scoped>
.body-textarea { width: 100%; min-height: 100rpx; margin: 12rpx 0; padding: 12rpx 0; font-size: 30rpx; line-height: 1.9; color: #202a32; }
.editor-caption { display: flex; justify-content: space-between; gap: 18rpx; color: #99a3aa; font-size: 22rpx; margin: 24rpx 0; }
.insert-car { color: #286bc4; background: #e9f2fc; font-size: 27rpx; border-radius: 10rpx; }
.insert-car::after { border: 0; }
.editor-hint { display: block; color: #8c9aa5; font-size: 22rpx; line-height: 1.6; margin-top: 16rpx; }
.drop-target { outline: 3rpx dashed #286bc4; outline-offset: 5rpx; border-radius: 12rpx; }
</style>
