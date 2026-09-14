import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'
import { fileURLToPath } from 'node:url'
import { resolve, relative } from 'node:path'

export default defineConfig(({ command, mode }) => {
  // uni's mp-weixin dev command uses build + watch, never a Vite HTTP server.
  // The stable uni toolchain requires Vite 5; keep its server paths unavailable.
  if (command !== 'build' || process.env.UNI_PLATFORM !== 'mp-weixin') {
    throw new Error('此工程仅支持微信小程序构建，请使用 dev:mp-weixin 或 build:mp-weixin')
  }
  const testBuild = mode === 'testminiprogram'
  const testRoot = fileURLToPath(new URL('../testminiprogram/', import.meta.url))
  const testOutput = resolve(testRoot, 'dist/build/mp-weixin')
  if ((testBuild && (process.env.VQUAN_BUILD_TARGET !== 'testminiprogram' ||
      !process.env.UNI_OUTPUT_DIR || relative(testOutput, resolve(process.env.UNI_OUTPUT_DIR)) !== '')) ||
      (!testBuild && process.env.VQUAN_BUILD_TARGET === 'testminiprogram')) {
    throw new Error('测试包必须通过 build:testminiprogram 构建到 apps/testminiprogram/dist/build/mp-weixin')
  }
  return {
    plugins: [uni()],
    resolve: testBuild ? {
      alias: [
        { find: /^(\.\.\/)+utils\/requestApi$/, replacement: resolve(testRoot, 'src/requestApi.ts') },
        { find: /^(\.\.\/)+utils\/config$/, replacement: resolve(testRoot, 'src/config.ts') }
      ]
    } : undefined,
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
