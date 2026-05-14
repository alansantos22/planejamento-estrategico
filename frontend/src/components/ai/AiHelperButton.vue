<script setup>
import { computed, onMounted, ref } from 'vue'
import { Bot } from 'lucide-vue-next'
import BaseButton from '@/components/common/BaseButton.vue'
import { usePlanStore } from '@/stores/plan'
import { useAiAgent } from '@/composables/useAiAgent'
import { ensureSession, getSessionInfo } from '@/services/planApi'

const props = defineProps({
  agent: { type: String, required: true },
  label: { type: String, default: 'Assistente, me dê ideias' }
})

const planStore = usePlanStore()
const { isRunning, run } = useAiAgent()

const sessionInfo = ref(null)
onMounted(async () => {
  sessionInfo.value = await ensureSession().catch(() => null)
})

const enabled = computed(() => planStore.aiAssistantEnabled)

// Já foi aplicado neste plano — esconde o botão para evitar repetição.
const alreadyApplied = computed(() => {
  const list = planStore.plan?.ai?.appliedAgents || []
  return list.includes(props.agent)
})

// Cota esgotada SÓ para o agente do relatório final (do backend).
const quotaExhausted = computed(() => {
  const s = sessionInfo.value || getSessionInfo()
  return !!(s?.finalReportUsed && props.agent === s.finalReportAgent)
})

const disabled = computed(() =>
  !enabled.value || !planStore.aiBackendUrl || isRunning.value || quotaExhausted.value
)

const title = computed(() => {
  if (!enabled.value) return 'Ative o Assistente de IA no primeiro passo (Sua Empresa)'
  if (quotaExhausted.value) return 'Relatório final já foi gerado por este IP'
  return ''
})

const displayLabel = computed(() => {
  if (isRunning.value) return 'Pensando…'
  if (quotaExhausted.value) return 'Já gerado neste IP'
  return props.label
})

function onClick() {
  if (disabled.value) return
  run(props.agent)
}
</script>

<template>
  <BaseButton
    v-if="enabled && !alreadyApplied"
    variant="ai"
    size="sm"
    :disabled="disabled"
    :title="title"
    class="ai-helper-btn"
    :class="{ 'is-faded': disabled }"
    @click="onClick"
  >
    <Bot :size="16" />
    <span>{{ displayLabel }}</span>
  </BaseButton>
</template>

<style lang="scss" scoped>
.ai-helper-btn.is-faded {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
