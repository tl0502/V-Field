import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

export default defineConfig(({ command }) => {
  // uni's mp-weixin dev command uses build + watch, never a Vite HTTP server.
  // The stable uni toolchain requires Vite 5; keep its server paths unavailable.
  if (command !== 'build' || process.env.UNI_PLATFORM !== 'mp-weixin') {
    throw new Error('此工程仅支持微信小程序构建，请使用 dev:mp-weixin 或 build:mp-weixin')
  }
  return {
    plugins: [uni()],
    // 微信真机调试的 JS 引擎不认 ?? / ?.。
    // uni 默认把 chrome53 转译交给开发者工具 es6 开关；该开关会把独立模块打坏，所以由 Vite 降编译。
    esbuild: {
      target: 'es2015'
    },
    build: {
      target: 'es2015',
      minify: 'esbuild'
    }
  }
})
