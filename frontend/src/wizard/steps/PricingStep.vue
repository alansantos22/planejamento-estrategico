<script setup>
import { computed } from 'vue'
import { usePlanStore } from '@/stores/plan'
import { pricingAnalysis } from '@/lib/scoring'
import { clamp } from '@/lib/formatters'
import BaseField from '@/components/common/BaseField.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import FormGrid from '@/components/common/FormGrid.vue'
import HelpBox from '@/components/common/HelpBox.vue'
import BaseBadge from '@/components/common/BaseBadge.vue'
import AiHelperButton from '@/components/ai/AiHelperButton.vue'

const store = usePlanStore()
const pr = store.plan.pricing

const analysis = computed(() => pricingAnalysis(store.plan.pricing))

function save() { store.save() }
</script>

<template>
  <div>
    <HelpBox>
      <strong>Statement de Posicionamento:</strong>
      "Para <em>[ICP]</em>, que <em>[problema]</em>, nós oferecemos <em>[produto]</em> que <em>[benefício]</em>,
      diferente de <em>[concorrente]</em> porque <em>[razão]</em>."
    </HelpBox>

    <AiHelperButton agent="pricingBenchmark" label="Buscar faixa de preço do mercado" />

    <div class="card" style="margin-top:12px">
      <h4 style="margin:0 0 10px">Statement de Posicionamento</h4>
      <FormGrid :cols="2">
        <BaseField label="Para (ICP)">
          <BaseInput v-model="pr.statement.icp" placeholder="Ex: gerentes de marketing de PMEs" @update:model-value="save" />
        </BaseField>
        <BaseField label="Que (problema)">
          <BaseInput v-model="pr.statement.problem" placeholder="Ex: gastam 10h/semana em relatórios manuais" @update:model-value="save" />
        </BaseField>
        <BaseField label="Oferecemos (produto)">
          <BaseInput v-model="pr.statement.product" placeholder="Ex: dashboard automatizado de marketing" @update:model-value="save" />
        </BaseField>
        <BaseField label="Que (benefício)">
          <BaseInput v-model="pr.statement.benefit" placeholder="Ex: economiza 8h/semana e mostra ROI por canal" @update:model-value="save" />
        </BaseField>
        <BaseField label="Diferente de (concorrente)">
          <BaseInput v-model="pr.statement.competitor" placeholder="Ex: planilhas e ferramentas genéricas" @update:model-value="save" />
        </BaseField>
        <BaseField label="Porque (razão)">
          <BaseInput v-model="pr.statement.reason" placeholder="Ex: integração nativa com 20+ canais brasileiros" @update:model-value="save" />
        </BaseField>
      </FormGrid>

      <h4 style="margin:18px 0 10px">Pricing</h4>
      <FormGrid :cols="2">
        <BaseField label="Preço atual (R$)">
          <BaseInput v-model="pr.currentPrice" type="number" placeholder="Ex: 297" @update:model-value="save" />
        </BaseField>
        <BaseField label="Margem alvo (%)">
          <BaseInput v-model="pr.targetMargin" type="number" placeholder="Ex: 60" @update:model-value="save" />
        </BaseField>
        <BaseField label="Mercado, mín (R$)">
          <BaseInput v-model="pr.marketMin" type="number" placeholder="Ex: 99" @update:model-value="save" />
        </BaseField>
        <BaseField label="Mercado, mediana (R$)">
          <BaseInput v-model="pr.marketMedian" type="number" placeholder="Ex: 350" @update:model-value="save" />
        </BaseField>
        <BaseField label="Mercado, máx (R$)">
          <BaseInput v-model="pr.marketMax" type="number" placeholder="Ex: 1500" @update:model-value="save" />
        </BaseField>
        <BaseField label="Margem real atual (%)">
          <BaseInput v-model="pr.actualMargin" type="number" placeholder="Ex: 52" @update:model-value="save" />
        </BaseField>
      </FormGrid>

      <div v-if="analysis.strategy && analysis.strategy !== 'n/d'" style="margin-top:16px">
        <div class="pricing-bar">
          <div class="pricing-track">
            <div class="pricing-marker" :style="{ left: clamp(analysis.position, 0, 100) + '%' }" title="Seu preço"></div>
            <div class="pricing-median" title="Mediana de mercado"></div>
          </div>
          <div class="pricing-labels">
            <span>R$ {{ pr.marketMin || '?' }}</span>
            <span>R$ {{ pr.marketMedian || '?' }}</span>
            <span>R$ {{ pr.marketMax || '?' }}</span>
          </div>
        </div>
        <div class="dash-tile" style="margin-top:14px">
          <h4>Estratégia detectada</h4>
          <div class="big">{{ analysis.strategy }}</div>
          <div class="desc"><BaseBadge :variant="analysis.color">{{ analysis.label }}</BaseBadge></div>
        </div>
      </div>
    </div>
  </div>
</template>
