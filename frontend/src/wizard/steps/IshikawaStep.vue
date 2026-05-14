<script setup>
import { usePlanStore } from '@/stores/plan'
import BaseField from '@/components/common/BaseField.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import HelpBox from '@/components/common/HelpBox.vue'
import AiHelperButton from '@/components/ai/AiHelperButton.vue'

const store = usePlanStore()
const ish = store.plan.ishikawa

const cats = [
  { key: 'method', name: 'Método', hint: 'Processos, regras, procedimentos' },
  { key: 'machine', name: 'Máquina', hint: 'Equipamentos, software, ferramentas' },
  { key: 'material', name: 'Material', hint: 'Insumos, dados, matérias-primas' },
  { key: 'people', name: 'Mão de Obra', hint: 'Treinamento, capacidade, motivação' },
  { key: 'measure', name: 'Medida', hint: 'KPIs, métricas, acompanhamento' },
  { key: 'environment', name: 'Meio Ambiente', hint: 'Cultura, mercado, condições externas' }
]

function save() { store.save() }

function getCausesText(key) {
  return (ish.causes[key] || []).join('\n')
}

function setCauses(key, text) {
  ish.causes[key] = text.split('\n').map(s => s.trim()).filter(Boolean)
  save()
}
</script>

<template>
  <div>
    <div class="card">
      <BaseField label="Problema central / efeito observado">
        <BaseInput
          v-model="ish.problem"
          placeholder="Ex: Taxa de cancelamento subiu 15%"
          @update:model-value="save"
        />
      </BaseField>
    </div>

    <AiHelperButton agent="problemDetector" label="Sugerir problemas e causas-raiz" />

    <div class="swot-grid" style="margin-top:12px">
      <div v-for="cat in cats" :key="cat.key" class="swot-block">
        <h4>{{ cat.name }}</h4>
        <div class="hint">{{ cat.hint }}</div>
        <textarea
          class="input"
          :placeholder="`Liste possíveis causas (uma por linha)`"
          :value="getCausesText(cat.key)"
          @input="setCauses(cat.key, $event.target.value)"
          rows="4"
          style="width:100%;resize:vertical"
        ></textarea>
      </div>
    </div>
  </div>
</template>
