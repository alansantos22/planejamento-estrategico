/**
 * Orquestra uma chamada de agente de IA.
 *
 *  - Lock GLOBAL (compartilhado entre todas as instâncias do composable) impede
 *    cliques múltiplos / requisições paralelas — protege contra spam e contra
 *    estourar cota por engano.
 *  - Debounce no clique pra evitar double-fire de mouses/touchpads bugados.
 *  - 403 "cota_esgotada" do backend é tratado como estado permanente (mostra
 *    aviso uma vez, atualiza cache local de sessão).
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
import { ensureSession, markFinalReportUsed, getSessionInfo } from '@/services/planApi'

// Estado GLOBAL — uma única chamada de IA em voo no app inteiro.
const globalIsRunning = ref(false)
let lastClickAt = 0
const CLICK_DEBOUNCE_MS = 600

export function useAiAgent() {
  const planStore = usePlanStore()
  const uiStore = useUiStore()

  async function run(agentName) {
    // Debounce de clique (rejeita disparos < 600ms entre si)
    const now = Date.now()
    if (now - lastClickAt < CLICK_DEBOUNCE_MS) return
    lastClickAt = now

    // Lock global — só uma chamada em voo
    if (globalIsRunning.value) return

    const backend = planStore.aiBackendUrl
    if (!backend) {
      alert('Backend de IA não configurado. Verifique se o servidor da pasta /server está rodando.')
      return
    }
    if (!planStore.aiAssistantEnabled) {
      alert('Ative o Assistente de IA no passo "Sua Empresa" antes de usar.')
      return
    }

    // Bloqueio local pro relatório final se já consumiu a cota
    await ensureSession().catch(() => null)
    const sess = getSessionInfo()
    if (sess?.finalReportUsed && agentName === sess.finalReportAgent) {
      alert('Você já gerou o relatório final neste IP. Continue editando seu plano e baixe o resultado anterior.')
      return
    }

    const payload = buildPayload(agentName, planStore.plan)
    const cacheKey = payloadCacheKey(agentName, payload)
    const cached = planStore.getCachedAgentResult(cacheKey)
    if (cached && !cached.error) {
      uiStore.openModal({ type: 'ai-result', agentName, result: cached, onApply: () => doApply(agentName, cached) })
      return
    }

    globalIsRunning.value = true
    uiStore.openModal({ type: 'ai-loading', agentName })
    try {
      const result = await callAgent(backend, agentName, payload)
      if (!result?.error) planStore.cacheAgentResult(cacheKey, result)
      uiStore.openModal({
        type: 'ai-result',
        agentName,
        result,
        onApply: result.applicable ? () => doApply(agentName, result) : null
      })
    } catch (err) {
      uiStore.closeModal()
      if (err.status === 403 && err.code === 'cota_esgotada') {
        markFinalReportUsed()
        alert(err.message || 'Cota esgotada para este IP.')
      } else if (err.status === 429) {
        alert('Muitas requisições. Aguarde alguns segundos antes de tentar novamente.')
      } else {
        alert(`Erro ao chamar IA: ${err.message}`)
      }
    } finally {
      globalIsRunning.value = false
    }
  }

  function doApply(agentName, result) {
    applySuggestions(agentName, result, planStore.plan)
    planStore.plan.ai = planStore.plan.ai || {}
    planStore.plan.ai.appliedAgents = planStore.plan.ai.appliedAgents || []
    if (!planStore.plan.ai.appliedAgents.includes(agentName)) {
      planStore.plan.ai.appliedAgents.push(agentName)
    }
    planStore.save()
    uiStore.closeModal()
  }

  return { isRunning: globalIsRunning, run }
}
