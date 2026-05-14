<script setup>
import { computed } from 'vue'
import { usePlanStore } from '@/stores/plan'
import { marketAnalysis } from '@/lib/scoring'
import { formatMoney, clamp } from '@/lib/formatters'
import BaseField from '@/components/common/BaseField.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseTextarea from '@/components/common/BaseTextarea.vue'
import FormGrid from '@/components/common/FormGrid.vue'
import HelpBox from '@/components/common/HelpBox.vue'
import AiHelperButton from '@/components/ai/AiHelperButton.vue'

const store = usePlanStore()
const m = store.plan.market

const analysis = computed(() => marketAnalysis(store.plan.market))

function save() { store.save() }
</script>

<template>
  <div>
    <HelpBox>
      <strong>TAM</strong> = mercado total mundial/nacional.
      <strong>SAM</strong> = mercado que seu modelo atinge.
      <strong>SOM</strong> = fatia realista em 12 meses (≤ 5% do SAM).
    </HelpBox>

    <div class="card">
      <FormGrid :cols="2">
        <BaseField label="TAM — Mercado Total" hint="anual, R$">
          <BaseInput v-model="m.tam" type="number" placeholder="Ex: 50000000000" @update:model-value="save" />
        </BaseField>
        <BaseField label="SAM — Endereçável" hint="anual, R$">
          <BaseInput v-model="m.sam" type="number" placeholder="Ex: 2000000000" @update:model-value="save" />
        </BaseField>
        <BaseField label="SOM — Obtenível em 12 meses" hint="R$">
          <BaseInput v-model="m.som" type="number" placeholder="Ex: 50000000" @update:model-value="save" />
        </BaseField>
        <BaseField label="Período-base (meses)">
          <BaseInput v-model="m.timeframeMonths" type="number" placeholder="12" @update:model-value="save" />
        </BaseField>
        <BaseField label="Notas / fontes" hint="de onde vieram os números" :span="2">
          <BaseTextarea v-model="m.notes" placeholder="Ex: IBGE, ABComm, relatórios de associação setorial..." @update:model-value="save" />
        </BaseField>
      </FormGrid>

      <div v-if="analysis.tam" style="margin-top:18px">
        <div class="pyramid">
          <div class="pyr-row tam" style="width:100%">
            <span class="pyr-label">TAM</span>
            <span class="pyr-value">{{ formatMoney(analysis.tam) }}</span>
          </div>
          <div class="pyr-row sam" :style="{ width: clamp(analysis.samOfTam, 5, 95) + '%' }">
            <span class="pyr-label">SAM</span>
            <span class="pyr-value">{{ formatMoney(analysis.sam) }} <small>({{ analysis.samOfTam.toFixed(1) }}% do TAM)</small></span>
          </div>
          <div class="pyr-row som" :style="{ width: clamp(analysis.somOfSam, 2, 60) + '%' }">
            <span class="pyr-label">SOM</span>
            <span class="pyr-value">{{ formatMoney(analysis.som) }} <small>({{ analysis.somOfSam.toFixed(1) }}% do SAM)</small></span>
          </div>
        </div>
        <div v-if="analysis.alerts.length" class="alerts">
          <div v-for="(a, i) in analysis.alerts" :key="i" class="alert warning">⚠ {{ a }}</div>
        </div>
        <div v-else class="alert success">✓ Tamanho de mercado coerente.</div>
      </div>
    </div>

    <AiHelperButton agent="marketSizer" label="Estimar TAM/SAM/SOM" />
  </div>
</template>
