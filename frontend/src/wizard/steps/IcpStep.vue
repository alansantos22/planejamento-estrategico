<script setup>
import { computed } from 'vue'
import { usePlanStore } from '@/stores/plan'
import { icpFitScore } from '@/lib/scoring'
import BaseField from '@/components/common/BaseField.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseAutocomplete from '@/components/common/BaseAutocomplete.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import { ROLE_OPTIONS, CHANNEL_OPTIONS } from '@/lib/optionLists'
import BaseTextarea from '@/components/common/BaseTextarea.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseBadge from '@/components/common/BaseBadge.vue'
import HelpBox from '@/components/common/HelpBox.vue'
import AiHelperButton from '@/components/ai/AiHelperButton.vue'
import FormGrid from '@/components/common/FormGrid.vue'

const store = usePlanStore()

const personas = computed(() => store.plan.icp.personas)

const authorityOptions = [
  { value: '', label: 'Selecione...' },
  { value: 'Decisor final', label: 'Decisor final' },
  { value: 'Influenciador', label: 'Influenciador' },
  { value: 'Comitê', label: 'Comitê' },
  { value: 'Indica para chefe', label: 'Indica para chefe' }
]

function save() { store.save() }

function addPersona() {
  const isFirst = personas.value.length === 0
  personas.value.push({
    name: '', role: '', ageRange: '', companySize: '',
    pain: '', trigger: '', budget: '', authority: '', channel: '',
    primary: isFirst
  })
  save()
}

function removePersona(i) {
  personas.value.splice(i, 1)
  save()
}

function setPrimary(i) {
  personas.value.forEach((p, j) => { p.primary = j === i })
  save()
}
</script>

<template>
  <div>
    <HelpBox>
      <strong>Dica:</strong> Marque <strong>uma persona como primária</strong>. Ela puxa as decisões.
      Campos críticos: <strong>dor, orçamento e autoridade de decisão</strong>.
    </HelpBox>

    <div style="display: flex; gap: 8px; flex-wrap: wrap; margin: 8px 0 16px;">
      <AiHelperButton agent="personaDetector" label="Sugerir personas a partir do contexto" />
      <AiHelperButton agent="idealCustomerFinder" label="Propor cliente ideal + mudanças na empresa" />
    </div>

    <div v-for="(p, i) in personas" :key="i" class="persona-card">
      <div class="persona-head">
        <h5>
          Persona #{{ i + 1 }}
          <BaseBadge v-if="p.primary" variant="success">primária</BaseBadge>
        </h5>
        <div class="persona-fit">
          <BaseBadge :variant="icpFitScore(p).color">ICP Fit {{ icpFitScore(p).score.toFixed(1) }}/10</BaseBadge>
          <span class="muted" style="font-size:12px">{{ icpFitScore(p).label }}</span>
        </div>
        <button class="btn-icon" @click="removePersona(i)">×</button>
      </div>

      <FormGrid :cols="2">
        <BaseField label="Nome da persona">
          <BaseInput v-model="p.name" placeholder="Ex: Mariana, Gerente de Marketing" @update:model-value="save" />
        </BaseField>
        <BaseField label="Cargo / papel">
          <BaseAutocomplete
            v-model="p.role"
            :options="ROLE_OPTIONS"
            placeholder="Ex: Gerente de Marketing"
            @update:model-value="save"
          />
        </BaseField>
        <BaseField label="Porte da empresa-cliente" hint="se B2B">
          <BaseInput v-model="p.companySize" placeholder="Ex: PME 10-50 funcionários" @update:model-value="save" />
        </BaseField>
        <BaseField label="Faixa etária / perfil">
          <BaseInput v-model="p.ageRange" placeholder="Ex: 30-45 anos, classe B" @update:model-value="save" />
        </BaseField>
        <BaseField label="Dor principal" hint="crítico" :span="2">
          <BaseTextarea v-model="p.pain" placeholder="Ex: Perde 10h/semana com tarefas manuais que poderiam ser automatizadas" @update:model-value="save" />
        </BaseField>
        <BaseField label="Gatilho de compra">
          <BaseInput v-model="p.trigger" placeholder="Ex: Após nova contratação que não rende" @update:model-value="save" />
        </BaseField>
        <BaseField label="Orçamento típico" hint="crítico">
          <BaseInput v-model="p.budget" placeholder="Ex: R$ 500-2.000/mês" @update:model-value="save" />
        </BaseField>
        <BaseField label="Autoridade de decisão" hint="crítico">
          <BaseSelect v-model="p.authority" :options="authorityOptions" @update:model-value="save" />
        </BaseField>
        <BaseField label="Canal preferido">
          <BaseAutocomplete
            v-model="p.channel"
            :options="CHANNEL_OPTIONS"
            placeholder="Ex: LinkedIn, indicação, busca"
            @update:model-value="save"
          />
        </BaseField>
        <BaseField :inline="true" :span="2">
          <input type="checkbox" :checked="p.primary" @change="setPrimary(i)" />
          Esta é a persona <strong>primária</strong>
        </BaseField>
      </FormGrid>
    </div>

    <button class="btn-add" @click="addPersona">+ Adicionar Persona</button>
  </div>
</template>
