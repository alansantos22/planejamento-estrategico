<script setup>
import { defineAsyncComponent } from 'vue'
import { useRouter } from 'vue-router'
import TopBar from '@/components/layout/TopBar.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import { usePlanStore } from '@/stores/plan'
import { throttleClick, singleFlight } from '@/lib/debounce'

const AiModalHost = defineAsyncComponent(() => import('@/components/ai/AiModalHost.vue'))

const planStore = usePlanStore()
const router = useRouter()

async function handleRestart() {
  if (confirm('Tem certeza que deseja apagar todo o plano e recomeçar?')) {
    await planStore.reset()
    router.push({ name: 'landing' })
  }
}

// Throttle (1.5s) — usuário pode baixar quantas vezes quiser, mas não 10x por segundo.
const handleExport = throttleClick(() => {
  planStore.exportToFile()
}, 1500)

// singleFlight + throttle — import faz I/O, não pode haver dois rodando.
const handleImport = singleFlight(throttleClick(async (file) => {
  try {
    await planStore.importFromFile(file)
    alert('Plano importado com sucesso!')
    router.push({ name: 'dashboard' })
  } catch (err) {
    alert(`Erro ao importar: ${err.message}`)
  }
}, 1500))
</script>

<template>
  <TopBar
    @restart="handleRestart"
    @export="handleExport"
    @import="handleImport"
  />

  <main class="app-main">
    <RouterView />
  </main>

  <AppFooter />
  <AiModalHost />
</template>

<style lang="scss" scoped>
@use '@/styles/tokens' as t;

.app-main {
  min-height: calc(100vh - 60px);
  padding-block: t.$space-7 t.$space-10;
}

.app-loading {
  padding-block: t.$space-10;
  text-align: center;
}
</style>
