import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    dedupe: ['vue', 'vue-router']
  },
  optimizeDeps: {
    exclude: ['@vquan/admin-shell']
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    cors: false,
    fs: {
      allow: ['.', '../../packages/admin-shell', '../../packages/session-core', '../../packages/content-core', '../../node_modules'].map(
        (path) => fileURLToPath(new URL(path, import.meta.url))
      )
    },
    proxy: {
      '/api': 'http://127.0.0.1:3064'
    }
  },
  preview: { host: '127.0.0.1', cors: false }
})
