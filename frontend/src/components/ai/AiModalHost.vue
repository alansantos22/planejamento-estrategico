<script setup>
import { computed } from 'vue'
import BaseModal from '@/components/common/BaseModal.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseAlert from '@/components/common/BaseAlert.vue'
import Spinner from '@/components/common/Spinner.vue'
import { useUiStore } from '@/stores/ui'

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
    :title="`🤖 ${modal.agentName}`"
    @close="uiStore.closeModal"
  >
    <div class="ai-loading">
      <Spinner />
      <p>Consultando o assistente <strong>{{ modal.agentName }}</strong>…</p>
      <p class="muted ai-loading__hint">Isso pode levar 10–30 segundos.</p>
    </div>
  </BaseModal>

  <BaseModal
    v-else-if="modal && modal.type === 'ai-result'"
    :title="`🤖 ${modal.agentName}`"
    @close="uiStore.closeModal"
  >
    <BaseAlert v-if="modal.result?.error" variant="danger">
      {{ modal.result.error }}
    </BaseAlert>

    <template v-else>
      <template v-if="Array.isArray(modal.result?.suggestions) && modal.result.suggestions.length">
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

.ai-suggestion {
  background: t.$color-bg-soft;
  border-left: 4px solid t.$color-primary;
  padding: t.$space-3 t.$space-4 - 2px;
  border-radius: t.$radius-sm;
  margin-bottom: t.$space-3;

  h5 {
    margin: 0 0 t.$space-2 - 2px;
    color: t.$color-primary;
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
