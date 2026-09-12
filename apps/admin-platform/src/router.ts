import { createRouter, createWebHistory } from 'vue-router'
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
