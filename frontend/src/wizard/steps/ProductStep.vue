<script setup>
import { computed } from 'vue'
import { usePlanStore } from '@/stores/plan'
import { productFocusAnalysis } from '@/lib/scoring'
import BaseField from '@/components/common/BaseField.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseTextarea from '@/components/common/BaseTextarea.vue'
import FormGrid from '@/components/common/FormGrid.vue'
import HelpBox from '@/components/common/HelpBox.vue'
import AiHelperButton from '@/components/ai/AiHelperButton.vue'

const store = usePlanStore()
const p = store.plan.product

const analysis = computed(() => productFocusAnalysis(store.plan.product))

const totalRev = computed(() =>
  (p.offerings || []).reduce((s, o) => s + (Number(o.revenuePct) || 0), 0)
)
const totalEff = computed(() =>
  (p.offerings || []).reduce((s, o) => s + (Number(o.effortPct) || 0), 0)
)

function save() { store.save() }

function addOffering() {
  p.offerings = p.offerings || []
  p.offerings.push({ name: '', revenuePct: '', effortPct: '', marginPct: '' })
  save()
}

function removeOffering(i) {
  p.offerings.splice(i, 1)
  save()
}
</script>

<template>
  <div>
    <HelpBox>
      <strong>Regra:</strong> %receita e %esforço somam 100% no total.
      O sistema calcula <strong>eficiência</strong> (receita/esforço) e aponta produtos que <em>sangram</em> esforço sem retornar.
    </HelpBox>

    <AiHelperButton agent="productIdeaGenerator" label="Sugerir ideias de produto" />

    <div v-for="(o, i) in p.offerings" :key="i" class="offering-card">
      <h5>Oferta #{{ i + 1 }} <button class="btn-icon" @click="removeOffering(i)">×</button></h5>
      <FormGrid :cols="2">
        <BaseField label="Nome da oferta" :span="2">
          <BaseInput v-model="o.name" placeholder="Ex: Plano Pro / Consultoria mensal" @update:model-value="save" />
        </BaseField>
        <BaseField label="% da receita">
          <BaseInput v-model="o.revenuePct" type="number" min="0" max="100" placeholder="Ex: 60" @update:model-value="save" />
        </BaseField>
        <BaseField label="% do esforço/tempo">
          <BaseInput v-model="o.effortPct" type="number" min="0" max="100" placeholder="Ex: 30" @update:model-value="save" />
        </BaseField>
        <BaseField label="% margem">
          <BaseInput v-model="o.marginPct" type="number" min="-100" max="100" placeholder="Ex: 45" @update:model-value="save" />
        </BaseField>
      </FormGrid>
    </div>

    <button class="btn-add" @click="addOffering">+ Adicionar Oferta</button>

    <div v-if="analysis.focus" class="card" style="margin-top:16px">
      <h4 style="margin:0 0 10px">Análise 80/20</h4>
      <div class="dash-grid" style="margin-bottom:14px">
        <div class="dash-tile">
          <h4>Produto-foco recomendado</h4>
          <div class="big">{{ analysis.focus.name }}</div>
          <div class="desc">eficiência {{ analysis.focus.efficiency.toFixed(2) }}</div>
        </div>
        <div class="dash-tile">
          <h4>Estrelas</h4>
          <div class="big">{{ analysis.stars.map(s => s.name).join(', ') || '—' }}</div>
          <div class="desc">eficiência ≥ 1.2</div>
        </div>
        <div class="dash-tile">
          <h4>Sangrias</h4>
          <div class="big">{{ analysis.bleeders.map(b => b.name).join(', ') || '—' }}</div>
          <div class="desc">esforço alto, receita baixa</div>
        </div>
      </div>
      <div v-if="totalRev !== 100 || totalEff !== 100" class="alert warning">
        ⚠ Soma de %receita = {{ totalRev }}, %esforço = {{ totalEff }}. O ideal é 100 cada.
      </div>
      <BaseField label="Justificativa do foco" style="margin-top:14px">
        <BaseTextarea v-model="p.focusReasoning" placeholder="Por que este é o produto-foco? Quais critérios pesaram?" @update:model-value="save" />
      </BaseField>
    </div>
  </div>
</template>
