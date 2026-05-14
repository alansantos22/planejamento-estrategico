<script setup>
import { computed } from 'vue'
import { usePlanStore } from '@/stores/plan'
import BaseField from '@/components/common/BaseField.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseAutocomplete from '@/components/common/BaseAutocomplete.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import { SEGMENT_OPTIONS } from '@/lib/optionLists'
import BaseSwitch from '@/components/common/BaseSwitch.vue'
import { Bot } from 'lucide-vue-next'
import FormGrid from '@/components/common/FormGrid.vue'
import HelpBox from '@/components/common/HelpBox.vue'

const store = usePlanStore()
const c = store.plan.company

const aiEnabled = computed({
  get: () => store.aiAssistantEnabled,
  set: (v) => store.setAiAssistantEnabled(v)
})

const sizeOptions = [
  { value: '', label: 'Selecione...' },
  { value: 'Solo / MEI', label: 'Solo / MEI' },
  { value: 'Microempresa (até 9)', label: 'Microempresa (até 9)' },
  { value: 'Pequena (10-49)', label: 'Pequena (10-49)' },
  { value: 'Média (50-249)', label: 'Média (50-249)' },
  { value: 'Grande (250+)', label: 'Grande (250+)' }
]

const revenueOptions = [
  { value: '', label: 'Selecione...' },
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
        <BaseAutocomplete
          v-model="c.segment"
          :options="SEGMENT_OPTIONS"
          placeholder="Ex: Tecnologia / SaaS"
          @update:model-value="save"
        />
      </BaseField>
      <BaseField label="Porte">
        <BaseSelect v-model="c.size" :options="sizeOptions" @update:model-value="save" />
      </BaseField>
      <BaseField label="Número de funcionários" hint="incluindo você">
        <BaseInput v-model="c.employees" type="number" min="1" placeholder="Ex: 5" @update:model-value="save" />
      </BaseField>
      <BaseField label="Faturamento mensal estimado" hint="opcional">
        <BaseSelect v-model="c.revenue" :options="revenueOptions" @update:model-value="save" />
      </BaseField>
      <BaseField label="Tempo de operação" hint="em anos">
        <BaseInput v-model="c.age" type="number" min="0" placeholder="Ex: 3" @update:model-value="save" />
      </BaseField>
      <BaseField label="Região de atuação" hint="opcional">
        <BaseInput v-model="c.region" placeholder="Ex: Brasil, Sudeste, ou Global" @update:model-value="save" />
      </BaseField>
    </FormGrid>

    <div class="ai-toggle">
      <div class="ai-toggle__text">
        <h5><Bot :size="18" /> Ativar Assistente de IA</h5>
        <p class="muted">
          Quando ativo, botões de IA aparecem nos passos para sugerir personas,
          SWOT, concorrentes, <strong>clientes ideais</strong> e mudanças estratégicas
          baseadas no seu plano.
        </p>
      </div>
      <BaseSwitch v-model="aiEnabled" />
    </div>

    <HelpBox v-if="aiEnabled" style="margin-top: 12px;">
      <strong>Assistente IA ativado.</strong> Em <em>Cliente Ideal</em> você poderá
      pedir a proposta de clientes ideais + mudanças sugeridas para a empresa.
    </HelpBox>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tokens' as t;

.ai-toggle {
  margin-top: t.$space-5;
  padding: t.$space-3 t.$space-4;
  border: 1px solid t.$color-border;
  border-radius: t.$radius-sm;
  background: t.$color-bg-soft;
  display: flex;
  align-items: center;
  gap: t.$space-4;

  &__text {
    flex: 1;

    h5 {
      margin: 0 0 4px;
      display: flex;
      align-items: center;
      gap: t.$space-2;
    }

    p {
      margin: 0;
      font-size: t.$font-size-sm;
    }
  }
}
</style>
