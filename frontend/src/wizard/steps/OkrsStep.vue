<script setup>
import { computed } from 'vue'
import { usePlanStore } from '@/stores/plan'
import { isMeasurable } from '@/lib/scoring'
import BaseField from '@/components/common/BaseField.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import HelpBox from '@/components/common/HelpBox.vue'

const store = usePlanStore()
const okrs = store.plan.okrs

function save() { store.save() }

function addOkr() {
  okrs.push({ objective: '', krs: [{ text: '' }] })
  save()
}

function removeOkr(i) {
  okrs.splice(i, 1)
  save()
}

function addKr(okr) {
  okr.krs = okr.krs || []
  okr.krs.push({ text: '' })
  save()
}

function removeKr(okr, ki) {
  okr.krs.splice(ki, 1)
  save()
}
</script>

<template>
  <div>
    <HelpBox>
      <strong>Regra de ouro:</strong> Objetivo é qualitativo e inspirador.
      Key Result é <strong>obrigatoriamente quantificável</strong> (números, %, R$, prazo).
    </HelpBox>

    <div v-for="(okr, oi) in okrs" :key="oi" class="okr-card">
      <h5>
        Objetivo #{{ oi + 1 }}
        <button class="btn-icon" @click="removeOkr(oi)">×</button>
      </h5>
      <BaseField label="Objetivo (qualitativo)">
        <BaseInput
          v-model="okr.objective"
          placeholder="Ex: Tornar-se referência em automação para PMEs"
          @update:model-value="save"
        />
      </BaseField>

      <div class="kr-list">
        <div v-for="(kr, ki) in (okr.krs || [])" :key="ki" class="kr-row">
          <input
            class="input"
            v-model="kr.text"
            placeholder="Ex: Aumentar MRR de R$ 50 mil para R$ 80 mil em 90 dias"
            @input="save"
          />
          <span
            class="measurable-tag"
            :class="isMeasurable(kr.text || '') ? 'ok' : 'no'"
          >
            {{ isMeasurable(kr.text || '') ? '✓ Mensurável' : '⚠ Não mensurável' }}
          </span>
          <button class="btn-icon" @click="removeKr(okr, ki)">×</button>
        </div>
      </div>
      <button class="btn-add" @click="addKr(okr)">+ Adicionar Resultado-Chave (KR)</button>
    </div>

    <button class="btn-add" @click="addOkr">+ Adicionar Objetivo</button>
  </div>
</template>
