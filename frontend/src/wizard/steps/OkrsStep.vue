<script setup>
import { computed } from 'vue'
import { usePlanStore } from '@/stores/plan'
import { isMeasurable } from '@/lib/scoring'
import BaseField from '@/components/common/BaseField.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import HelpBox from '@/components/common/HelpBox.vue'
import InfoTooltip from '@/components/common/InfoTooltip.vue'

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
      <BaseField>
        <template #label>
          Objetivo (qualitativo)
          <InfoTooltip text="O que você quer alcançar, em uma frase inspiradora e qualitativa — sem números. Responde 'para onde vamos?'. Ex: 'Tornar-se referência em automação para PMEs'." />
        </template>
        <BaseInput
          v-model="okr.objective"
          placeholder="Ex: Tornar-se referência em automação para PMEs"
          @update:model-value="save"
        />
      </BaseField>

      <div class="kr-list">
        <div class="kr-list__label">
          Resultados-Chave (KR)
          <InfoTooltip text="Métricas que provam que o objetivo foi atingido. Cada KR é obrigatoriamente quantificável: tem número, %, R$ ou prazo. Ex: 'Aumentar MRR de R$ 50 mil para R$ 80 mil em 90 dias'. A etiqueta indica se o texto contém algo mensurável." />
        </div>
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

<style lang="scss" scoped>
@use '@/styles/tokens' as t;

.kr-list__label {
  display: flex;
  align-items: center;
  gap: t.$space-2;
  margin: t.$space-3 0 t.$space-2;
  font-size: t.$font-size-sm;
  font-weight: t.$font-weight-semi;
  color: t.$color-text;
}
</style>
