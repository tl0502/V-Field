import vue from '@vitejs/plugin-vue'
import { defineConfig, searchForWorkspaceRoot } from 'vite'

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
    fs: {
      allow: [searchForWorkspaceRoot(process.cwd())]
    },
    proxy: {
      '/api': 'http://127.0.0.1:3064'
    }
  }
})
