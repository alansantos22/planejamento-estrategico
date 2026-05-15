<script setup>
import { computed } from 'vue'
import { X } from 'lucide-vue-next'
import { usePlanStore } from '@/stores/plan'
import { iceScore } from '@/lib/scoring'
import BaseField from '@/components/common/BaseField.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseBadge from '@/components/common/BaseBadge.vue'
import FormGrid from '@/components/common/FormGrid.vue'
import HelpBox from '@/components/common/HelpBox.vue'

const store = usePlanStore()
const actions = store.plan.actions

function save() { store.save() }

function addAction() {
  actions.push({ what: '', why: '', where: '', when: '', who: '', how: '', howmuch: '', impact: 7, confidence: 7, ease: 5 })
  save()
}

function removeAction(i) {
  actions.splice(i, 1)
  save()
}
</script>

<template>
  <div>
    <HelpBox>
      <strong>ICE Score</strong> = média de Impacto + Confiança + Facilidade (1-10).
      Use para priorizar o que fazer primeiro.
    </HelpBox>

    <div v-for="(a, i) in actions" :key="i" class="action-card">
      <h5>
        Ação #{{ i + 1 }}
        <BaseBadge variant="info">ICE {{ iceScore(a).toFixed(1) }}</BaseBadge>
        <button class="btn-icon" aria-label="Remover ação" @click="removeAction(i)"><X :size="16" /></button>
      </h5>
      <FormGrid :cols="2">
        <BaseField label="O quê? (What)">
          <BaseInput v-model="a.what" placeholder="O que será feito" @update:model-value="save" />
        </BaseField>
        <BaseField label="Por quê? (Why)">
          <BaseInput v-model="a.why" placeholder="Justificativa estratégica" @update:model-value="save" />
        </BaseField>
        <BaseField label="Onde? (Where)">
          <BaseInput v-model="a.where" placeholder="Setor / canal" @update:model-value="save" />
        </BaseField>
        <BaseField label="Quando? (When)">
          <BaseInput v-model="a.when" placeholder="Prazo / data" @update:model-value="save" />
        </BaseField>
        <BaseField label="Quem? (Who)">
          <BaseInput v-model="a.who" placeholder="Responsável" @update:model-value="save" />
        </BaseField>
        <BaseField label="Como? (How)">
          <BaseInput v-model="a.how" placeholder="Método / passo a passo" @update:model-value="save" />
        </BaseField>
        <BaseField label="Quanto custa? (How much)">
          <BaseInput v-model="a.howmuch" placeholder="R$ ou tempo de equipe" @update:model-value="save" />
        </BaseField>
        <div></div>
        <BaseField label="Impacto (1-10)">
          <BaseInput v-model="a.impact" type="number" min="1" max="10" @update:model-value="save" />
        </BaseField>
        <BaseField label="Confiança (1-10)">
          <BaseInput v-model="a.confidence" type="number" min="1" max="10" @update:model-value="save" />
        </BaseField>
        <BaseField label="Facilidade (1-10)">
          <BaseInput v-model="a.ease" type="number" min="1" max="10" @update:model-value="save" />
        </BaseField>
      </FormGrid>
    </div>

    <button class="btn-add" @click="addAction">+ Adicionar Ação</button>
  </div>
</template>
