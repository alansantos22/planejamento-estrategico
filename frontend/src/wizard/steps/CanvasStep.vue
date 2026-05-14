<script setup>
import { usePlanStore } from '@/stores/plan'
import BaseField from '@/components/common/BaseField.vue'
import BaseTextarea from '@/components/common/BaseTextarea.vue'
import FormGrid from '@/components/common/FormGrid.vue'

const store = usePlanStore()
const canvas = store.plan.canvas

const fields = [
  { key: 'segments', label: 'Segmentos de Clientes', hint: 'Para quem você cria valor?' },
  { key: 'valueProp', label: 'Proposta de Valor', hint: 'Que problema resolve / dor sana?' },
  { key: 'channels', label: 'Canais', hint: 'Como entrega valor (vendas/distribuição)?' },
  { key: 'relationship', label: 'Relacionamento', hint: 'Self-service, atendimento, comunidade...' },
  { key: 'revenue', label: 'Fontes de Receita', hint: 'Como ganha dinheiro?' },
  { key: 'resources', label: 'Recursos Principais', hint: 'Ativos críticos (humanos, tecnológicos)' },
  { key: 'activities', label: 'Atividades-chave', hint: 'O que precisa fazer todo dia?' },
  { key: 'partners', label: 'Parceiros-chave', hint: 'Quem é essencial para o modelo?' },
  { key: 'costs', label: 'Estrutura de Custos', hint: 'Principais custos fixos e variáveis' }
]

function save() { store.save() }
</script>

<template>
  <div class="card">
    <FormGrid :cols="2">
      <BaseField v-for="f in fields" :key="f.key" :label="f.label" :hint="f.hint">
        <BaseTextarea v-model="canvas[f.key]" :placeholder="f.hint" @update:model-value="save" />
      </BaseField>
    </FormGrid>
  </div>
</template>
