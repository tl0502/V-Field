<script setup lang="ts">
import { reactive, shallowRef, watch } from 'vue'
import { DEFAULT_RULES, validateType, businessErrorMessage, codePointLength } from '@vquan/content-core'
import type { ArticleType } from '@vquan/content-core'
const props = defineProps<{ value: ArticleType | null; busy: boolean }>()
const emit = defineEmits<{ save: [value: Record<string, unknown>]; cancel: [] }>()
const draft = reactive({ name: '', enabled: true, textEnabled: true, textRequired: true, carEnabled: true, min: 0, max: 50 })
const error = shallowRef('')
watch(() => props.value, (value) => {
  const rules = value?.rules ?? DEFAULT_RULES
  Object.assign(draft, { name: value?.name ?? '', enabled: value?.enabled ?? true, textEnabled: rules.text.enabled, textRequired: rules.text.required, carEnabled: rules.car.enabled, min: rules.car.min, max: rules.car.max || 50 })
  error.value = ''
}, { immediate: true })
function submit() {
  try {
    const value = { name: draft.name, enabled: draft.enabled, version: props.value?.version,
      rules: { text: { enabled: draft.textEnabled, required: draft.textEnabled && draft.textRequired }, car: { enabled: draft.carEnabled, min: draft.carEnabled ? draft.min : 0, max: draft.carEnabled ? draft.max : 0 } } }
    validateType(value)
    error.value = ''
    emit('save', value)
  } catch (cause) { error.value = businessErrorMessage(cause) }
}
</script>

<template>
  <form class="business-form" @submit.prevent="submit">
    <h3>{{ value ? '编辑文章类型' : '新建文章类型' }}</h3>
    <label class="business-field"><span>类型名称 <small>{{ codePointLength(draft.name) }}/32</small></span><input v-model="draft.name" name="typeName" :disabled="busy" placeholder="例如：车源信息" /></label>
    <label class="business-check"><input v-model="draft.enabled" type="checkbox" :disabled="busy" />允许成员使用此类型发布</label>
    <fieldset class="business-rules" :disabled="busy"><legend>正文模板</legend><label class="business-check"><input v-model="draft.textEnabled" type="checkbox" />允许正文</label><label class="business-check"><input v-model="draft.textRequired" type="checkbox" :disabled="!draft.textEnabled" />正文必填</label></fieldset>
    <fieldset class="business-rules" :disabled="busy"><legend>车源卡片模板</legend><label class="business-check"><input v-model="draft.carEnabled" type="checkbox" />允许车源卡片</label><div v-if="draft.carEnabled" class="business-inline-form"><label class="business-field"><span>最少张数</span><input v-model.number="draft.min" type="number" min="0" max="50" step="1" /></label><label class="business-field"><span>最多张数</span><input v-model.number="draft.max" type="number" min="1" max="50" step="1" /></label></div></fieldset>
    <p v-if="error" class="business-feedback business-feedback--error" role="alert">{{ error }}</p>
    <div class="business-actions"><button class="business-button" type="submit" :disabled="busy">{{ busy ? '保存中…' : '保存类型' }}</button><button v-if="value" class="business-button secondary" type="button" :disabled="busy" @click="emit('cancel')">取消编辑</button></div>
  </form>
</template>
