import { createApp } from 'vue'
import { createAdminRouter, initAdminShell } from '@vquan/admin-shell'
import App from './App.vue'
import './styles.css'

initAdminShell({
  audience: 'admin-platform',
  loginTitle: '平台管理登录',
  loginCopy: '使用平台账号的管理登录名或用户号及管理密码，进入平台管理。',
  identityTitle: '平台管理 · 当前身份'
})

createApp(App).use(createAdminRouter()).mount('#app')
