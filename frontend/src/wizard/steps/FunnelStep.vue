<script setup>
import { computed } from 'vue'
import { usePlanStore } from '@/stores/plan'
import { funnelAnalysis } from '@/lib/scoring'
import { formatMoney } from '@/lib/formatters'
import BaseField from '@/components/common/BaseField.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import FormGrid from '@/components/common/FormGrid.vue'
import HelpBox from '@/components/common/HelpBox.vue'
import AiHelperButton from '@/components/ai/AiHelperButton.vue'

const store = usePlanStore()
const f = store.plan.funnel

const analysis = computed(() => funnelAnalysis(store.plan.funnel))

function save() { store.save() }

function addStage() {
  const lastIdx = f.stages.length - 1
  f.stages.splice(lastIdx, 0, { name: 'Nova etapa', count: '', conversionToNext: '' })
  save()
}

function removeStage(i) {
  if (f.stages.length <= 2) { alert('Mantenha pelo menos 2 etapas.'); return }
  f.stages.splice(i, 1)
  save()
}

function addChannel() {
  f.channels = f.channels || []
  f.channels.push({ name: '', mixPct: '', costPerLead: '' })
  save()
}

function removeChannel(i) {
  f.channels.splice(i, 1)
  save()
}
</script>

<template>
  <div>
    <HelpBox>
      <strong>Como funciona:</strong> preencha quantos passam por cada etapa hoje (opcional) e a
      <strong>taxa de conversão</strong> para a próxima. Defina o ticket médio e a meta mensal:
      o sistema diz <em>quantos visitantes você precisa</em>.
    </HelpBox>

    <AiHelperButton agent="salesFunnelArchitect" label="Montar funil sugerido para seu segmento" />

    <!-- Ticket, ciclo, meta -->
    <div class="card" style="margin-top:12px">
      <FormGrid :cols="2">
        <BaseField label="Ticket médio (R$)">
          <BaseInput v-model="f.avgTicket" type="number" placeholder="Ex: 350" @update:model-value="save" />
        </BaseField>
        <BaseField label="Ciclo de venda (dias)">
          <BaseInput v-model="f.salesCycleDays" type="number" placeholder="Ex: 30" @update:model-value="save" />
        </BaseField>
        <BaseField label="Meta de receita mensal (R$)" :span="2">
          <BaseInput v-model="f.monthlyRevenueGoal" type="number" placeholder="Ex: 100000" @update:model-value="save" />
        </BaseField>
      </FormGrid>
    </div>

    <!-- Etapas -->
    <div class="card">
      <h4 style="margin:0 0 10px">Etapas do funil</h4>
      <div v-for="(s, i) in f.stages" :key="i" class="stage-row">
        <input class="input" v-model="s.name" placeholder="Nome da etapa" @input="save" />
        <input class="input" type="number" v-model="s.count" placeholder="Qtd atual" @input="save" />
        <template v-if="i < f.stages.length - 1">
          <input class="input" type="number" min="0" max="100" v-model="s.conversionToNext" placeholder="% → próxima" @input="save" />
        </template>
        <div v-else class="muted" style="align-self:center">(final)</div>
        <button class="btn-icon" @click="removeStage(i)">×</button>
      </div>
      <button class="btn-add" @click="addStage">+ Adicionar etapa</button>
    </div>

    <!-- Canais -->
    <div class="card">
      <h4 style="margin:0 0 10px">Canais de aquisição <small class="muted">(opcional)</small></h4>
      <div v-for="(ch, i) in (f.channels || [])" :key="i" class="channel-row">
        <input class="input" v-model="ch.name" placeholder="Ex: Google Ads / Indicação / Outbound" @input="save" />
        <input class="input" type="number" v-model="ch.mixPct" placeholder="% do mix" @input="save" />
        <input class="input" type="number" v-model="ch.costPerLead" placeholder="R$ / lead" @input="save" />
        <button class="btn-icon" @click="removeChannel(i)">×</button>
      </div>
      <button class="btn-add" @click="addChannel">+ Adicionar canal</button>
    </div>

    <!-- Cálculo reverso -->
    <div v-if="analysis.neededClients" class="card">
      <h4 style="margin:0 0 10px">Cálculo reverso</h4>
      <template v-if="analysis.allRatesFilled">
        <p style="margin:0 0 10px">
          <strong>Para faturar {{ formatMoney(Number(f.monthlyRevenueGoal)) }}/mês com ticket de {{ formatMoney(Number(f.avgTicket)) }}, você precisa:</strong>
        </p>
        <div class="funnel-viz">
          <div
            v-for="(s, i) in analysis.reverseFlow"
            :key="i"
            class="funnel-stage"
            :style="{ width: ((s.count / analysis.reverseFlow[0].count) * 100) + '%' }"
          >
            <span class="fs-name">{{ s.stage }}</span>
            <span class="fs-count">{{ s.count.toLocaleString('pt-BR') }}</span>
          </div>
        </div>
      </template>
      <template v-else>
        <div class="alert warning">⚠ Preencha as taxas de conversão para ver o cálculo reverso.</div>
        <p><strong>Clientes necessários:</strong> {{ analysis.neededClients }} / mês</p>
      </template>
      <div v-if="analysis.bottleneck" class="alert info" style="margin-top:14px">
        🔍 <strong>Gargalo:</strong> {{ analysis.bottleneck.stage }}, apenas {{ analysis.bottleneck.rate.toFixed(1) }}% convertem.
      </div>
    </div>
  </div>
</template>
