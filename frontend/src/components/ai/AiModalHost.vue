<script setup>
import { computed } from 'vue'
import { Bot, User, Wrench, AlertTriangle } from 'lucide-vue-next'
import BaseModal from '@/components/common/BaseModal.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseAlert from '@/components/common/BaseAlert.vue'
import Spinner from '@/components/common/Spinner.vue'
import { useUiStore } from '@/stores/ui'
import { agentLabel } from '@/services/aiAgent'
import { formatMoney } from '@/lib/formatters'

const uiStore = useUiStore()
const modal = computed(() => uiStore.modal)

function suggestionText(s) {
  if (typeof s === 'string') return s
  return s.text || s.content || JSON.stringify(s, null, 2)
}
</script>

<template>
  <BaseModal
    v-if="modal && modal.type === 'ai-loading'"
    @close="uiStore.closeModal"
  >
    <template #header><h3 class="ai-modal-title"><Bot :size="20" /> {{ agentLabel(modal.agentName) }}</h3></template>
    <div class="ai-loading">
      <Spinner />
      <p>Consultando o assistente <strong>{{ modal.agentName }}</strong>…</p>
      <p class="muted ai-loading__hint">Isso pode levar de 10 a 30 segundos.</p>
    </div>
  </BaseModal>

  <BaseModal
    v-else-if="modal && modal.type === 'ai-result'"
    @close="uiStore.closeModal"
  >
    <template #header><h3 class="ai-modal-title"><Bot :size="20" /> {{ agentLabel(modal.agentName) }}</h3></template>
    <BaseAlert v-if="modal.result?.error" variant="danger">
      <div>{{ modal.result.error }}</div>
      <details v-if="modal.result?.text || modal.result?.message" class="ai-debug">
        <summary>Ver detalhes técnicos</summary>
        <pre>{{ modal.result.message || modal.result.text }}</pre>
      </details>
    </BaseAlert>

    <template v-else>
      <template v-if="modal.agentName === 'marketSizer' && modal.result?.raw">
        <div class="market-grid">
          <div class="market-cell"><span class="muted">TAM</span><strong>{{ formatMoney(modal.result.raw.tam) }}</strong></div>
          <div class="market-cell"><span class="muted">SAM</span><strong>{{ formatMoney(modal.result.raw.sam) }}</strong></div>
          <div class="market-cell"><span class="muted">SOM</span><strong>{{ formatMoney(modal.result.raw.som) }}</strong></div>
        </div>
        <div v-if="modal.result.raw.methodology" class="market-note">
          <span class="badge">Metodologia</span>
          <p>{{ modal.result.raw.methodology }}</p>
        </div>
        <div v-if="modal.result.raw.sources?.length" class="market-note">
          <span class="badge badge--alt">Fontes</span>
          <p>{{ modal.result.raw.sources.join(', ') }}</p>
        </div>
        <p v-if="modal.result.raw.disclaimer" class="muted market-disclaimer"><AlertTriangle :size="14" /> {{ modal.result.raw.disclaimer }}</p>
      </template>
      <template v-else-if="Array.isArray(modal.result?.idealCustomers) && modal.result.idealCustomers.length">
        <h4 class="ai-section"><User :size="18" /> Clientes ideais propostos</h4>
        <div
          v-for="(p, i) in modal.result.idealCustomers"
          :key="`ic-${i}`"
          class="ai-suggestion"
        >
          <h5>{{ p.name || `Cliente #${i + 1}` }}<span v-if="p.fitScore" class="muted"> · fit {{ p.fitScore }}/10</span></h5>
          <p v-if="p.role"><strong>Papel:</strong> {{ p.role }}<span v-if="p.companySize"> · {{ p.companySize }}</span></p>
          <p v-if="p.pain"><strong>Dor:</strong> {{ p.pain }}</p>
          <p v-if="p.trigger"><strong>Gatilho:</strong> {{ p.trigger }}</p>
          <p v-if="p.budget || p.authority">
            <strong v-if="p.budget">Orçamento:</strong> {{ p.budget }}
            <span v-if="p.budget && p.authority"> · </span>
            <strong v-if="p.authority">Autoridade:</strong> {{ p.authority }}
          </p>
          <p v-if="p.channel"><strong>Canal:</strong> {{ p.channel }}</p>
          <p v-if="p.reasoning" class="muted"><em>{{ p.reasoning }}</em></p>
        </div>

        <template v-if="Array.isArray(modal.result?.companyChanges) && modal.result.companyChanges.length">
          <h4 class="ai-section"><Wrench :size="18" /> O que a empresa precisa mudar</h4>
          <div
            v-for="(ch, i) in modal.result.companyChanges"
            :key="`cc-${i}`"
            class="ai-suggestion ai-suggestion--alt"
          >
            <h5>{{ ch.area }}: {{ ch.change }}</h5>
            <p v-if="ch.why" class="muted">{{ ch.why }}</p>
          </div>
        </template>

        <p v-if="modal.result?.rationale" class="muted ai-rationale">
          {{ modal.result.rationale }}
        </p>
      </template>
      <template v-else-if="Array.isArray(modal.result?.suggestions) && modal.result.suggestions.length">
        <div
          v-for="(s, i) in modal.result.suggestions"
          :key="i"
          class="ai-suggestion"
        >
          <h5 v-if="s.title">{{ s.title }}</h5>
          <pre>{{ suggestionText(s) }}</pre>
        </div>
      </template>
      <div v-else-if="modal.result?.text" class="ai-suggestion">
        <pre>{{ modal.result.text }}</pre>
      </div>
      <div v-else class="ai-suggestion">
        <pre>{{ JSON.stringify(modal.result, null, 2) }}</pre>
      </div>
    </template>

    <template #footer>
      <BaseButton v-if="modal.onApply" variant="primary" @click="modal.onApply">
        Aplicar sugestões
      </BaseButton>
      <BaseButton variant="ghost" @click="uiStore.closeModal">Fechar</BaseButton>
    </template>
  </BaseModal>
</template>

<style lang="scss" scoped>
@use '@/styles/tokens' as t;

.ai-loading {
  text-align: center;
  padding: t.$space-8 t.$space-5;
  color: t.$color-text-light;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: t.$space-3;

  &__hint {
    font-size: t.$font-size-xs;
  }
}

.ai-section {
  margin: t.$space-4 0 t.$space-2;
  font-size: t.$font-size-lg;
}

.ai-rationale {
  margin-top: t.$space-3;
  font-style: italic;
  font-size: t.$font-size-sm;
}

.ai-modal-title {
  margin: 0;
  display: flex;
  align-items: center;
  gap: t.$space-2;
  color: t.$color-primary;
  font-size: t.$font-size-xl;
}

.ai-section {
  display: flex;
  align-items: center;
  gap: t.$space-2;
}

.market-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: t.$space-3;
  margin-bottom: t.$space-4;

  .market-cell {
    background: t.$color-bg-soft;
    border-radius: t.$radius-sm;
    padding: t.$space-3;
    display: flex;
    flex-direction: column;
    gap: 4px;

    span { font-size: t.$font-size-xs; }
    strong { font-size: t.$font-size-lg; color: t.$color-primary; }
  }
}

.market-note {
  margin-bottom: t.$space-3;

  .badge {
    display: inline-block;
    background: t.$color-primary;
    color: #fff;
    font-size: t.$font-size-xs;
    padding: 2px 8px;
    border-radius: 999px;
    margin-bottom: 4px;

    &--alt { background: #6b7280; }
  }

  p { margin: 0; font-size: t.$font-size-sm; }
}

.market-disclaimer {
  font-size: t.$font-size-xs;
  margin-top: t.$space-2;
}

.ai-debug {
  margin-top: t.$space-2;
  font-size: t.$font-size-xs;

  summary {
    cursor: pointer;
    color: t.$color-text-light;
  }

  pre {
    margin-top: t.$space-2;
    padding: t.$space-2;
    background: rgba(0, 0, 0, 0.05);
    border-radius: t.$radius-sm;
    white-space: pre-wrap;
    word-wrap: break-word;
    max-height: 240px;
    overflow: auto;
  }
}

.ai-suggestion {
  background: t.$color-bg-soft;
  border-left: 4px solid t.$color-primary;
  padding: t.$space-3 t.$space-4 - 2px;
  border-radius: t.$radius-sm;
  margin-bottom: t.$space-3;

  &--alt {
    border-left-color: #f59e0b;
  }

  h5 {
    margin: 0 0 t.$space-2 - 2px;
    color: t.$color-primary;
  }

  p {
    margin: 4px 0;
    font-size: t.$font-size-sm;
  }

  pre {
    white-space: pre-wrap;
    word-wrap: break-word;
    font-family: inherit;
    margin: 0;
    font-size: t.$font-size-sm;
  }
}
</style>
