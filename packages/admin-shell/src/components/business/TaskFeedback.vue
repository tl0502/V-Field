<script setup lang="ts">
defineProps<{ error?: string; notice?: string }>()
</script>

<template>
  <p v-if="error" class="business-feedback business-feedback--error" role="alert">{{ error }}</p>
  <p v-if="notice" class="business-feedback" role="status">{{ notice }}</p>
</template>
