<script setup lang="ts">
import { shallowRef } from 'vue'
import { businessErrorMessage, validateTagName, codePointLength } from '@vquan/content-core'
defineProps<{ busy: boolean }>()
const emit = defineEmits<{ create: [name: string] }>()
const name = shallowRef('')
const error = shallowRef('')
function submit() {
  try { const value = validateTagName(name.value); error.value = ''; emit('create', value) }
  catch (cause) { error.value = businessErrorMessage(cause) }
}
</script>

<template>
  <form @submit.prevent="submit">
    <div class="business-inline-form"><label class="business-field grow"><span>新标签 <small>{{ codePointLength(name) }}/24</small></span><input v-model="name" name="tagName" placeholder="例如：新能源" :disabled="busy" /></label><button class="business-button" type="submit" :disabled="busy">新增标签</button></div>
    <p v-if="error" class="business-feedback business-feedback--error" role="alert">{{ error }}</p>
  </form>
</template>
