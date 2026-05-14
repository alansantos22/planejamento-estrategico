import { createRouter, createWebHashHistory } from 'vue-router'

const LandingView = () => import('@/views/LandingView.vue')
const WizardView = () => import('@/views/WizardView.vue')
const DashboardView = () => import('@/views/DashboardView.vue')
const ProfileView = () => import('@/views/ProfileView.vue')

export const router = createRouter({
  history: createWebHashHistory(),
  scrollBehavior: () => ({ top: 0, behavior: 'smooth' }),
  routes: [
    { path: '/', name: 'landing', component: LandingView },
    { path: '/wizard', name: 'wizard', component: WizardView },
    { path: '/dashboard', name: 'dashboard', component: DashboardView },
    { path: '/perfil', name: 'profile', component: ProfileView },
    { path: '/perfil/:slug', name: 'profilePublic', component: ProfileView },
    { path: '/:pathMatch(.*)*', redirect: '/' }
  ]
})
