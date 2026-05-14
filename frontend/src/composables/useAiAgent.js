/**
 * Composable que orquestra uma chamada de agente de IA:
 *
 *  - monta payload a partir do plano
 *  - usa cache local (no estado do plano) para evitar repetidas chamadas
 *  - abre modal de loading enquanto pensa
 *  - abre modal de resultado quando recebe
 *  - permite aplicar sugestões no estado
 */

import { ref } from 'vue'
import { usePlanStore } from '@/stores/plan'
import { useUiStore } from '@/stores/ui'
import {
  buildPayload,
  callAgent,
  payloadCacheKey,
  applySuggestions
} from '@/services/aiAgent'

export function useAiAgent() {
  const planStore = usePlanStore()
  const uiStore = useUiStore()
  const isRunning = ref(false)

  async function run(agentName) {
    const backend = planStore.aiBackendUrl
    if (!backend) {
      alert('Configure a URL do backend de IA em "Config" no topo da página.')
      return
    }

    const payload = buildPayload(agentName, planStore.plan)
    const cacheKey = payloadCacheKey(agentName, payload)
    const cached = planStore.getCachedAgentResult(cacheKey)
    if (cached) {
      uiStore.openModal({ type: 'ai-result', agentName, result: cached, onApply: () => doApply(agentName, cached) })
      return
    }

    isRunning.value = true
    uiStore.openModal({ type: 'ai-loading', agentName })
    try {
      const result = await callAgent(backend, agentName, payload)
      planStore.cacheAgentResult(cacheKey, result)
      uiStore.openModal({
        type: 'ai-result',
        agentName,
        result,
        onApply: result.applicable ? () => doApply(agentName, result) : null
      })
    } catch (err) {
      uiStore.closeModal()
      alert(`Erro ao chamar IA: ${err.message}\n\nVerifique se o backend está rodando em ${backend}`)
    } finally {
      isRunning.value = false
    }
  }

  function doApply(agentName, result) {
    applySuggestions(agentName, result, planStore.plan)
    planStore.save()
    uiStore.closeModal()
  }

  return { isRunning, run }
}
