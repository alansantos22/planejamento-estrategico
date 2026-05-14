<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import TopBar from '@/components/layout/TopBar.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import AiModalHost from '@/components/ai/AiModalHost.vue'
import { usePlanStore } from '@/stores/plan'

const planStore = usePlanStore()
const router = useRouter()

const isLoading = computed(() => planStore.isLoading)

async function handleRestart() {
  if (confirm('Tem certeza que deseja apagar todo o plano e recomeçar?')) {
    await planStore.reset()
    router.push({ name: 'landing' })
  }
}

function handleExport() {
  planStore.exportToFile()
}

async function handleImport(file) {
  try {
    await planStore.importFromFile(file)
    alert('Plano importado com sucesso!')
    router.push({ name: 'dashboard' })
  } catch (err) {
    alert(`Erro ao importar: ${err.message}`)
  }
}

function handleSettings() {
  const url = prompt(
    'URL do backend de IA (deixe vazio pra desabilitar):',
    planStore.plan.ai?.backendUrl || ''
  )
  if (url === null) return
  planStore.setAiBackendUrl(url)
  alert('Configuração salva.')
}
</script>

<template>
  <TopBar
    @restart="handleRestart"
    @export="handleExport"
    @import="handleImport"
    @settings="handleSettings"
  />

  <main class="app-main">
    <div v-if="isLoading" class="container app-loading">
      <p class="muted">Carregando seu plano…</p>
    </div>
    <RouterView v-else />
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
