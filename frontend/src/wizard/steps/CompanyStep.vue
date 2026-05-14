<script setup>
import { usePlanStore } from '@/stores/plan'
import BaseField from '@/components/common/BaseField.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import FormGrid from '@/components/common/FormGrid.vue'

const store = usePlanStore()
const c = store.plan.company

const sizeOptions = [
  { value: '', label: '— selecione —' },
  { value: 'Solo / MEI', label: 'Solo / MEI' },
  { value: 'Microempresa (até 9)', label: 'Microempresa (até 9)' },
  { value: 'Pequena (10-49)', label: 'Pequena (10-49)' },
  { value: 'Média (50-249)', label: 'Média (50-249)' },
  { value: 'Grande (250+)', label: 'Grande (250+)' }
]

const revenueOptions = [
  { value: '', label: '— selecione —' },
  { value: 'Até R$ 10 mil', label: 'Até R$ 10 mil' },
  { value: 'R$ 10-50 mil', label: 'R$ 10-50 mil' },
  { value: 'R$ 50-200 mil', label: 'R$ 50-200 mil' },
  { value: 'R$ 200 mil - 1 mi', label: 'R$ 200 mil - 1 mi' },
  { value: 'Acima de R$ 1 mi', label: 'Acima de R$ 1 mi' }
]

function save() { store.save() }
</script>

<template>
  <div class="card">
    <FormGrid :cols="2">
      <BaseField label="Nome da empresa">
        <BaseInput v-model="c.name" placeholder="Ex: Unli Studios" @update:model-value="save" />
      </BaseField>
      <BaseField label="Segmento / setor">
        <BaseInput v-model="c.segment" placeholder="Ex: Tecnologia / SaaS" @update:model-value="save" />
      </BaseField>
      <BaseField label="Porte">
        <BaseSelect v-model="c.size" :options="sizeOptions" @update:model-value="save" />
      </BaseField>
      <BaseField label="Faturamento mensal estimado" hint="opcional">
        <BaseSelect v-model="c.revenue" :options="revenueOptions" @update:model-value="save" />
      </BaseField>
      <BaseField label="Tempo de operação" hint="em anos">
        <BaseInput v-model="c.age" type="number" min="0" placeholder="Ex: 3" @update:model-value="save" />
      </BaseField>
      <BaseField label="Região de atuação" hint="opcional">
        <BaseInput v-model="c.region" placeholder="Ex: Brasil — Sudeste, ou Global" @update:model-value="save" />
      </BaseField>
    </FormGrid>
  </div>
</template>
