import { createApp } from 'vue'
import { createAdminRouter, initAdminShell } from '@vquan/admin-shell'
import App from './App.vue'
import './styles.css'

initAdminShell({
  audience: 'admin-domain',
  loginTitle: '域管理登录',
  loginCopy: '使用 8 位用户号和管理密码，处理入域申请、配置文章类型与标签。',
  identityTitle: '域管理 · 当前身份'
})

createApp(App).use(createAdminRouter()).mount('#app')
