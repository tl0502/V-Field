import { createApp } from 'vue'
import { createAdminRouter, initAdminShell } from '@vquan/admin-shell'
import App from './App.vue'
import './styles.css'

initAdminShell({
  audience: 'admin-domain',
  loginTitle: '域管理登录',
  loginCopy: '使用同一套平台账号的管理登录名和密码。本轮只验证身份，不交付入域审批。',
  identityTitle: '域管理 · 当前身份'
})

createApp(App).use(createAdminRouter()).mount('#app')
