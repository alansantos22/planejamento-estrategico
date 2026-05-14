import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import { usePlanStore } from './stores/plan'

import './styles/main.scss'

const app = createApp(App)
app.use(createPinia())
app.use(router)

// Carrega o plano antes de montar — evita flicker
const planStore = usePlanStore()
planStore.load().finally(() => {
  planStore.installUnloadGuard()
  app.mount('#app')
})
