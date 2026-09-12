import { readonly, shallowRef } from 'vue'
import { onThemeChange } from '@dcloudio/uni-app'

export type SystemScheme = 'light' | 'dark'

/**
 * 临时关闭跟随系统深色。微信小程序 DarkMode 兼容性不足，默认只使用浅色。
 * 深色样式、theme.json 的 dark 段、以及下面的读取逻辑都保留，不删除。
 * 页面/组件的 prefers-color-scheme 深色块已注释：微信媒体查询不受 darkmode 开关控制。
 * 恢复跟随系统时：本开关改为 true；manifest.json 的 mp-weixin.darkmode 改回 true；
 * pages.json 窗口 / tabBar 颜色改回 theme.json 的 @变量；取消注释各页和组件的深色媒体查询。
 */
export const FOLLOW_SYSTEM_DARK_MODE = false

function readSystemScheme(): SystemScheme {
  if (!FOLLOW_SYSTEM_DARK_MODE) return 'light'
  try {
    const info = uni.getSystemInfoSync() as { theme?: string }
    return info.theme === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

const scheme = shallowRef<SystemScheme>(readSystemScheme())
let appListenerBound = false

function applyScheme(next: string | undefined) {
  if (!FOLLOW_SYSTEM_DARK_MODE) {
    scheme.value = 'light'
    return
  }
  scheme.value = next === 'dark' ? 'dark' : 'light'
}

function ensureAppListener() {
  if (appListenerBound) return
  appListenerBound = true
  uni.onThemeChange?.((result) => {
    applyScheme(result.theme)
  })
}

export function useSystemScheme(options?: { bindPage?: boolean }) {
  ensureAppListener()

  if (options?.bindPage) {
    onThemeChange((result) => {
      applyScheme(result.theme)
    })
  }

  return {
    scheme: readonly(scheme)
  }
}
