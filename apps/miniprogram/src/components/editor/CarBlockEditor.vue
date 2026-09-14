<script setup lang="ts">
import { shallowRef } from 'vue'
import { codePointLength, LIMITS } from '@vquan/content-core'
import type { CarBlock } from '@vquan/content-core'
import { textInputEvent } from '../../utils/inputEvent'
const props = defineProps<{ block: CarBlock; number: number; disabled: boolean }>()
const emit = defineEmits<{ update: [description: string]; remove: []; dragStart: [y: number]; dragMove: [y: number]; dragEnd: []; dragCancel: []; focus: []; move: [direction: -1 | 1] }>()
const editing = shallowRef(!props.block.description)
const error = shallowRef('')
function edit() { if (!props.disabled) { emit('focus'); editing.value = true } }
function save() {
  if (props.disabled) return
  emit('focus')
  if (!props.block.description.trim() || codePointLength(props.block.description) > LIMITS.car) { error.value = '车源描述须为 1–2000 个字符'; return }
  error.value = ''; editing.value = false
}
function input(event: unknown) { emit('update', textInputEvent(event).value) }
function touch(event: { touches: ArrayLike<{ clientY: number }> }, phase: 'start' | 'move') {
  if (props.disabled || !event.touches[0]) return
  if (phase === 'start') emit('dragStart', event.touches[0].clientY)
  else emit('dragMove', event.touches[0].clientY)
}
</script>

<template>
  <view class="vehicle-card">
    <view class="vehicle-head"><view class="vehicle-identity"><view class="drag-handle" aria-label="拖动车源卡片换位" @touchstart.stop="touch($event, 'start')" @touchmove.stop.prevent="touch($event, 'move')" @touchend.stop="emit('dragEnd')" @touchcancel.stop="emit('dragCancel')">⠿</view><text class="vehicle-name">车源 {{ number }}</text></view><view class="vehicle-actions"><button :disabled="disabled" @click="editing ? save() : edit()">{{ editing ? '保存' : '编辑' }}</button><button class="remove" :disabled="disabled" @click="emit('remove')">移除</button></view></view>
    <textarea v-if="editing" class="vehicle-textarea" :value="block.description" :disabled="disabled" :maxlength="-1" auto-height placeholder="车型、报价、颜色……按你的习惯填写" :show-confirm-bar="false" @focus="emit('focus')" @input="input" />
    <text v-else class="vehicle-description" @click="edit">{{ block.description }}</text>
    <view class="vehicle-foot"><text>{{ codePointLength(block.description) }}/2000</text><view class="vehicle-actions"><button :disabled="disabled" @click="emit('move', -1)">上移</button><button :disabled="disabled" @click="emit('move', 1)">下移</button></view></view>
    <text v-if="error" class="vehicle-error">{{ error }}</text>
  </view>
</template>

<style scoped>
.vehicle-card { background: #f5f8fa; border: 1rpx solid #d8e1e7; border-left: 5rpx solid #7ba4d8; border-radius: 12rpx; padding: 22rpx 24rpx; margin: 12rpx 0; }
.vehicle-head, .vehicle-identity, .vehicle-actions, .vehicle-foot { display: flex; align-items: center; }
.vehicle-head, .vehicle-foot { justify-content: space-between; gap: 16rpx; }
.vehicle-name { font-size: 25rpx; font-weight: 600; color: #4d6c85; }
.drag-handle { color: #9aaebd; width: 56rpx; font-size: 43rpx; line-height: 60rpx; touch-action: none; }
.vehicle-actions { gap: 18rpx; }
.vehicle-actions button { font-size: 23rpx; color: #286bc4; background: transparent; padding: 8rpx 0; margin: 0; line-height: 1.5; }
.vehicle-actions button::after { border: 0; }
.vehicle-actions .remove { color: #a34e3b; }
.vehicle-textarea, .vehicle-description { display: block; width: 100%; min-height: 100rpx; color: #202a32; font-size: 28rpx; line-height: 1.8; padding: 14rpx 0; white-space: pre-wrap; word-break: break-all; }
.vehicle-foot { font-size: 21rpx; color: #93a1ac; margin-top: 12rpx; }
.vehicle-error { display: block; color: #a34e3b; font-size: 23rpx; margin-top: 10rpx; }
</style>
