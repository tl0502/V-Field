import { computed, readonly, shallowRef } from 'vue'

export type ResolvedTheme = 'light' | 'dark'

function readSystemTheme(): ResolvedTheme {
  try {
    const info = uni.getSystemInfoSync() as { theme?: string }
    return info.theme === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

const systemTheme = shallowRef<ResolvedTheme>(readSystemTheme())
let listening = false

function ensureListener() {
  if (listening) return
  listening = true
  uni.onThemeChange?.((result) => {
    systemTheme.value = result.theme === 'dark' ? 'dark' : 'light'
  })
}

export function useThemePreference() {
  ensureListener()

  return {
    systemTheme: readonly(systemTheme),
    label: computed(() => (systemTheme.value === 'dark' ? '深色' : '浅色'))
  }
}
