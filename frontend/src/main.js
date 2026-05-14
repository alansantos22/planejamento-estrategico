import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import { usePlanStore } from './stores/plan'

import './styles/main.scss'

const app = createApp(App)
app.use(createPinia())
app.use(router)

// Monta imediatamente para minimizar o tempo até o primeiro paint (FCP/LCP).
// O plano é carregado em paralelo; as views observam `planStore.isLoading`.
app.mount('#app')

const planStore = usePlanStore()
planStore.installUnloadGuard()
planStore.load()
