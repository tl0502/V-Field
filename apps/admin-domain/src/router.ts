import { createRouter, createWebHistory } from 'vue-router'
import { useAdminSession } from './composables/useAdminSession'
import IdentityView from './views/IdentityView.vue'
import LoginView from './views/LoginView.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/login' },
    { path: '/login', name: 'login', component: LoginView },
    { path: '/identity', name: 'identity', component: IdentityView }
  ]
})

const session = useAdminSession()
let sessionReady = false

router.beforeEach(async (to) => {
  if (!sessionReady) {
    await session.refresh()
    sessionReady = true
  }

  if (to.name === 'identity' && !session.isAuthed.value) {
    return { name: 'login' }
  }
  if (to.name === 'login' && session.isAuthed.value) {
    return { name: 'identity' }
  }
})
