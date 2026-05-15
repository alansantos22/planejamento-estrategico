/**
 * Store Pinia do plano — fonte da verdade reativa do app.
 *
 * - `load()` busca do backend; se vazio, devolve estado padrão.
 * - Toda mutação no `state.plan` agenda um PUT debouncado (300ms).
 * - `saveNow()` força o flush imediato (usado em import / change-of-screen).
 * - `reset()` zera o plano no backend e na memória.
 */

import { defineStore } from 'pinia'
import { defaultState, migrate } from './defaultState'
import {
  getPlan,
  putPlan,
  deletePlan,
  putPlanKeepalive,
  setBackendUrl,
  getBackendUrl
} from '@/services/planApi'

const DEBOUNCE_MS = 3000
const LEGACY_SESSION_KEYS = ['mechame_planning_v2', 'mechame_planning_v1']

/** Lê o plano antigo deixado em sessionStorage pela versão pré-backend. */
function readLegacySession() {
  if (typeof sessionStorage === 'undefined') return null
  for (const key of LEGACY_SESSION_KEYS) {
    try {
      const raw = sessionStorage.getItem(key)
      if (raw) return JSON.parse(raw)
    } catch (_) {
      /* JSON inválido — ignora */
    }
  }
  return null
}

function clearLegacySession() {
  if (typeof sessionStorage === 'undefined') return
  LEGACY_SESSION_KEYS.forEach((k) => sessionStorage.removeItem(k))
}

export const usePlanStore = defineStore('plan', {
  state: () => ({
    plan: defaultState(),
    isLoading: true,
    isSaving: false,
    lastError: null,
    _saveTimer: null,
    _pendingSnapshot: null,
    _inflight: null
  }),

  getters: {
    isFullMode: (s) => s.plan.mode === 'completo',
    aiBackendUrl: (s) => s.plan.ai?.backendUrl?.trim() || '',
    aiAssistantEnabled: (s) => !!s.plan.ai?.assistantEnabled
  },

  actions: {
    async load() {
      this.isLoading = true
      try {
        const remote = await getPlan()
        if (remote) {
          this.plan = migrate(remote)
          // Backend é fonte da verdade — descarta qualquer resíduo legado.
          clearLegacySession()
        } else {
          // Backend vazio: tenta promover plano antigo do sessionStorage.
          const legacy = readLegacySession()
          if (legacy) {
            this.plan = migrate(legacy)
            try {
              await putPlan(this.plan)
              clearLegacySession()
            } catch (err) {
              console.warn('Falha ao migrar plano legado para o backend.', err)
            }
          } else {
            this.plan = defaultState()
          }
        }
        if (this.plan.ai?.backendUrl) {
          setBackendUrl(this.plan.ai.backendUrl)
        }
      } catch (err) {
        console.warn('Falha ao carregar plano. Usando estado vazio.', err)
        this.plan = defaultState()
        this.lastError = err.message
      } finally {
        this.isLoading = false
      }
    },

    /** Marca o estado como "sujo" e agenda um PUT debouncado. */
    save() {
      this._pendingSnapshot = this.plan
      if (this._saveTimer) clearTimeout(this._saveTimer)
      this._saveTimer = setTimeout(() => {
        this._saveTimer = null
        this._flush()
      }, DEBOUNCE_MS)
    },

    async _flush() {
      if (!this._pendingSnapshot) return
      const snapshot = JSON.parse(JSON.stringify(this._pendingSnapshot))
      this._pendingSnapshot = null
      this.isSaving = true
      this._inflight = putPlan(snapshot)
        .catch((err) => {
          console.error('Falha ao salvar plano.', err)
          this.lastError = err.message
        })
        .finally(() => {
          this.isSaving = false
          this._inflight = null
        })
      return this._inflight
    },

    async saveNow() {
      if (this._saveTimer) {
        clearTimeout(this._saveTimer)
        this._saveTimer = null
      }
      this._pendingSnapshot = this.plan
      await this._flush()
      if (this._inflight) await this._inflight
    },

    async reset() {
      if (this._saveTimer) {
        clearTimeout(this._saveTimer)
        this._saveTimer = null
      }
      this._pendingSnapshot = null
      try {
        await deletePlan()
      } catch (err) {
        console.warn('Falha ao apagar plano no backend.', err)
      }
      this.plan = defaultState()
    },

    setMode(mode) {
      this.plan.mode = mode === 'completo' ? 'completo' : 'enxuto'
      this.plan.currentStep = 0
      this.save()
    },

    setStep(i) {
      this.plan.currentStep = Math.max(0, i)
      this.save()
    },

    setAiAssistantEnabled(enabled) {
      this.plan.ai = this.plan.ai || { backendUrl: '', assistantEnabled: false, cache: {} }
      this.plan.ai.assistantEnabled = !!enabled
      this.save()
    },

    setAiBackendUrl(url) {
      this.plan.ai = this.plan.ai || { backendUrl: '', cache: {} }
      this.plan.ai.backendUrl = (url || '').trim()
      setBackendUrl(this.plan.ai.backendUrl || getBackendUrl())
      this.save()
    },

    cacheAgentResult(key, result) {
      this.plan.ai = this.plan.ai || { backendUrl: '', cache: {} }
      this.plan.ai.cache = this.plan.ai.cache || {}
      this.plan.ai.cache[key] = { ts: Date.now(), result }
      this.save()
    },

    getCachedAgentResult(key, ttlMs = 1000 * 60 * 30) {
      const entry = this.plan.ai?.cache?.[key]
      if (!entry) return null
      if (Date.now() - entry.ts > ttlMs) return null
      return entry.result
    },

    exportToFile() {
      const data = JSON.stringify(this.plan, null, 2)
      const blob = new Blob([data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const date = new Date().toISOString().split('T')[0]
      const name = (this.plan.company?.name || 'plano').replace(/[^\w-]/g, '_')
      a.href = url
      a.download = `planejamento-${name}-${date}.json`
      a.click()
      URL.revokeObjectURL(url)
    },

    async importFromFile(file) {
      const text = await file.text()
      const parsed = JSON.parse(text)
      this.plan = migrate(parsed)
      await this.saveNow()
    },

    /** Registra listener de beforeunload para garantir o flush. */
    installUnloadGuard() {
      if (typeof window === 'undefined') return
      window.addEventListener('beforeunload', () => {
        if (this._saveTimer && this._pendingSnapshot) {
          clearTimeout(this._saveTimer)
          this._saveTimer = null
          putPlanKeepalive(this._pendingSnapshot)
        }
      })
    }
  }
})
