import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

export default defineConfig({
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
})
