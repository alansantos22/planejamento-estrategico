<script setup>
import { computed } from 'vue'
import { usePlanStore } from '@/stores/plan'
import { marketAnalysis } from '@/lib/scoring'
import { formatMoney } from '@/lib/formatters'
import { AlertTriangle, CheckCircle2 } from 'lucide-vue-next'
import BaseField from '@/components/common/BaseField.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseMoneyInput from '@/components/common/BaseMoneyInput.vue'
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
        <BaseField label="TAM (Mercado Total)" hint="anual">
          <BaseMoneyInput v-model="m.tam" placeholder="50.000.000.000" @update:model-value="save" />
        </BaseField>
        <BaseField label="SAM (Endereçável)" hint="anual">
          <BaseMoneyInput v-model="m.sam" placeholder="2.000.000.000" @update:model-value="save" />
        </BaseField>
        <BaseField label="SOM (Obtenível em 12 meses)">
          <BaseMoneyInput v-model="m.som" placeholder="50.000.000" @update:model-value="save" />
        </BaseField>
        <BaseField label="Período-base (meses)">
          <BaseInput v-model="m.timeframeMonths" type="number" placeholder="12" @update:model-value="save" />
        </BaseField>
        <BaseField label="Notas / fontes" hint="de onde vieram os números" :span="2">
          <BaseTextarea v-model="m.notes" placeholder="Ex: IBGE, ABComm, relatórios de associação setorial..." :maxlength="300" @update:model-value="save" />
        </BaseField>
      </FormGrid>

      <div v-if="analysis.tam" class="market-bars">
        <div class="bar bar--tam">
          <div class="bar__fill" style="width:100%"></div>
          <div class="bar__row">
            <span class="bar__label">TAM</span>
            <span class="bar__value">{{ formatMoney(analysis.tam) }}</span>
          </div>
        </div>
        <div class="bar bar--sam">
          <div class="bar__fill" :style="{ width: Math.max(2, Math.min(100, analysis.samOfTam)) + '%' }"></div>
          <div class="bar__row">
            <span class="bar__label">SAM</span>
            <span class="bar__value">
              {{ formatMoney(analysis.sam) }}
              <small>{{ analysis.samOfTam.toFixed(1) }}% do TAM</small>
            </span>
          </div>
        </div>
        <div class="bar bar--som">
          <div class="bar__fill" :style="{ width: Math.max(2, Math.min(100, analysis.somOfSam)) + '%' }"></div>
          <div class="bar__row">
            <span class="bar__label">SOM</span>
            <span class="bar__value">
              {{ formatMoney(analysis.som) }}
              <small>{{ analysis.somOfSam.toFixed(1) }}% do SAM</small>
            </span>
          </div>
        </div>

        <div v-if="analysis.alerts.length" class="alerts">
          <div v-for="(a, i) in analysis.alerts" :key="i" class="alert warning"><AlertTriangle :size="14" /> {{ a }}</div>
        </div>
        <div v-else class="alert success"><CheckCircle2 :size="14" /> Tamanho de mercado coerente.</div>
      </div>
    </div>

    <AiHelperButton agent="marketSizer" label="Estimar TAM/SAM/SOM" />
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tokens' as t;

.market-bars {
  margin-top: t.$space-5;
  display: flex;
  flex-direction: column;
  gap: t.$space-2;
}

.bar {
  position: relative;
  height: 56px;
  background: t.$color-bg-soft;
  border-radius: t.$radius-md;
  overflow: hidden;
  border: 1px solid t.$color-border;

  &__fill {
    position: absolute;
    inset: 0 auto 0 0;
    transition: width 0.4s ease;
  }

  &__row {
    position: relative;
    z-index: 1;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 t.$space-4;
    gap: t.$space-3;
  }

  &__label {
    font-weight: t.$font-weight-bold;
    letter-spacing: 0.5px;
    color: t.$color-text;
    min-width: 48px;
  }

  &__value {
    font-weight: t.$font-weight-semi;
    color: t.$color-text;
    white-space: nowrap;
    display: flex;
    align-items: baseline;
    gap: t.$space-2;

    small {
      font-weight: t.$font-weight-regular;
      color: t.$color-text-light;
      font-size: t.$font-size-xs;
    }
  }

  &--tam .bar__fill { background: rgba(229, 95, 24, 0.28); border-left: 4px solid t.$color-primary; }
  &--sam .bar__fill { background: rgba(245, 158, 11, 0.28); border-left: 4px solid t.$color-secondary; }
  &--som .bar__fill { background: rgba(34, 197, 94, 0.28); border-left: 4px solid t.$color-success; }
}

.alerts { margin-top: t.$space-3; }
</style>
