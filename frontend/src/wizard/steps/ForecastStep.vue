<script setup>
import { computed } from 'vue'
import { usePlanStore } from '@/stores/plan'
import { forecastProjection } from '@/lib/scoring'
import { formatMoney } from '@/lib/formatters'
import BaseField from '@/components/common/BaseField.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import FormGrid from '@/components/common/FormGrid.vue'
import HelpBox from '@/components/common/HelpBox.vue'

const store = usePlanStore()
const f = store.plan.forecast

const scenarioOptions = [
  { value: 'pessimista', label: 'Pessimista' },
  { value: 'realista', label: 'Realista' },
  { value: 'otimista', label: 'Otimista' }
]

const projection = computed(() => forecastProjection(store.plan))
const maxRevenue = computed(() => {
  const months = projection.value.months
  return months.length ? Math.max(...months.map(m => m.revenue)) : 1
})

function save() { store.save() }
</script>

<template>
  <div>
    <HelpBox>
      <strong>Cenários:</strong> pessimista (metade do crescimento), realista (esperado) e
      otimista (1.5x). Baseado nos dados do funil e ticket médio.
    </HelpBox>

    <div class="card">
      <FormGrid :cols="2">
        <BaseField label="Crescimento mensal esperado (%)">
          <BaseInput v-model="f.growthRatePct" type="number" step="0.1" placeholder="Ex: 8" @update:model-value="save" />
        </BaseField>
        <BaseField label="Retenção mensal (%)">
          <BaseInput v-model="f.retentionPct" type="number" step="0.1" placeholder="Ex: 92" @update:model-value="save" />
        </BaseField>
        <BaseField label="Período (meses)">
          <BaseInput v-model="f.months" type="number" min="3" max="36" @update:model-value="save" />
        </BaseField>
        <BaseField label="Cenário ativo">
          <BaseSelect v-model="f.scenario" :options="scenarioOptions" @update:model-value="save" />
        </BaseField>
      </FormGrid>

      <div v-if="projection.months.length" style="margin-top:16px">
        <div class="dash-tile" style="margin-bottom:14px">
          <h4>Receita acumulada ({{ projection.scenario }})</h4>
          <div class="big">{{ formatMoney(projection.totalRevenue) }}</div>
          <div class="desc">em {{ projection.months.length }} meses</div>
        </div>
        <div class="forecast-chart">
          <div
            v-for="m in projection.months"
            :key="m.month"
            class="fc-bar"
            :title="`Mês ${m.month}: ${formatMoney(m.revenue)} (${m.activeBase} clientes)`"
          >
            <div class="fc-fill" :style="{ height: ((m.revenue / maxRevenue) * 100) + '%' }"></div>
            <span class="fc-label">{{ m.month }}</span>
          </div>
        </div>
      </div>
      <div v-else class="alert warning">
        ⚠ Preencha o funil (ticket + clientes atuais) para projetar.
      </div>
    </div>
  </div>
</template>
