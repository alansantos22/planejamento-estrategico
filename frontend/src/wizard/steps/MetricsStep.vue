<script setup>
import { computed } from 'vue'
import { usePlanStore } from '@/stores/plan'
import { ltvCacAnalysis } from '@/lib/scoring'
import BaseField from '@/components/common/BaseField.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseMoneyInput from '@/components/common/BaseMoneyInput.vue'
import BaseBadge from '@/components/common/BaseBadge.vue'
import FormGrid from '@/components/common/FormGrid.vue'
import HelpBox from '@/components/common/HelpBox.vue'

const store = usePlanStore()
const m = store.plan.metrics

const ltvCac = computed(() => ltvCacAnalysis(store.plan.metrics))

function save() { store.save() }
</script>

<template>
  <div class="card">
    <HelpBox>
      <strong>Faixas de saúde:</strong>
      &lt;3x crítico • 3-5x aceitável • <strong>5-10x ideal</strong> • &gt;10x subinvestindo em marketing.
    </HelpBox>
    <FormGrid :cols="2">
      <BaseField label="CAC" hint="custo de aquisição">
        <BaseMoneyInput v-model="m.cac" placeholder="200" @update:model-value="save" />
      </BaseField>
      <BaseField label="LTV" hint="lifetime value">
        <BaseMoneyInput v-model="m.ltv" placeholder="1.500" @update:model-value="save" />
      </BaseField>
      <BaseField label="Ticket médio" hint="opcional">
        <BaseMoneyInput v-model="m.tickets" placeholder="250" @update:model-value="save" />
      </BaseField>
      <BaseField label="Churn mensal (%)" hint="opcional">
        <BaseInput v-model="m.churn" type="number" step="0.1" placeholder="Ex: 4" @update:model-value="save" />
      </BaseField>
    </FormGrid>

    <div v-if="ltvCac.status !== 'sem-dados'" class="dash-tile" style="margin-top:14px">
      <h4>Relação LTV/CAC</h4>
      <div class="big">{{ ltvCac.ratio.toFixed(2) }}x</div>
      <div class="desc"><BaseBadge :variant="ltvCac.color">{{ ltvCac.label }}</BaseBadge></div>
    </div>
  </div>
</template>
