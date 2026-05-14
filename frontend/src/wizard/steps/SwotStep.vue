<script setup>
import { usePlanStore } from '@/stores/plan'
import { icpFitScore } from '@/lib/scoring'
import HelpBox from '@/components/common/HelpBox.vue'
import AiHelperButton from '@/components/ai/AiHelperButton.vue'

const store = usePlanStore()
const swot = store.plan.swot

function save() { store.save() }

function addItem(list) {
  list.push({ text: '', impact: 7, confidence: 7 })
  save()
}

function removeItem(list, i) {
  list.splice(i, 1)
  save()
}
</script>

<template>
  <div>
    <HelpBox>
      <strong>Como pontuar:</strong> <strong>Impacto</strong> = quão relevante é para o negócio.
      <strong>Confiança</strong> = quão certo você está. Score do item = (Impacto × Confiança) ÷ 10.
    </HelpBox>

    <AiHelperButton agent="swotDetector" label="Sugerir itens da SWOT a partir do contexto" />

    <div class="swot-grid">
      <!-- Forças -->
      <div class="swot-block s">
        <h4>Forças (S)</h4>
        <div class="hint">Vantagens internas, controláveis</div>
        <div class="row-head"><span>Descrição</span><span>Impacto</span><span>Confiança</span><span></span></div>
        <div v-for="(item, i) in swot.strengths" :key="i" class="item-row">
          <input class="input" v-model="item.text" placeholder="Ex: Equipe enxuta e ágil" @input="save" />
          <input class="num" type="number" min="1" max="10" v-model="item.impact" placeholder="1-10" @input="save" />
          <input class="num" type="number" min="1" max="10" v-model="item.confidence" placeholder="1-10" @input="save" />
          <button class="btn-icon" @click="removeItem(swot.strengths, i)">×</button>
        </div>
        <button class="btn-add" @click="addItem(swot.strengths)">+ Adicionar item</button>
      </div>

      <!-- Fraquezas -->
      <div class="swot-block w">
        <h4>Fraquezas (W)</h4>
        <div class="hint">Limitações internas, controláveis</div>
        <div class="row-head"><span>Descrição</span><span>Impacto</span><span>Confiança</span><span></span></div>
        <div v-for="(item, i) in swot.weaknesses" :key="i" class="item-row">
          <input class="input" v-model="item.text" placeholder="Ex: Falta de capital para marketing" @input="save" />
          <input class="num" type="number" min="1" max="10" v-model="item.impact" placeholder="1-10" @input="save" />
          <input class="num" type="number" min="1" max="10" v-model="item.confidence" placeholder="1-10" @input="save" />
          <button class="btn-icon" @click="removeItem(swot.weaknesses, i)">×</button>
        </div>
        <button class="btn-add" @click="addItem(swot.weaknesses)">+ Adicionar item</button>
      </div>

      <!-- Oportunidades -->
      <div class="swot-block o">
        <h4>Oportunidades (O)</h4>
        <div class="hint">Tendências externas favoráveis</div>
        <div class="row-head"><span>Descrição</span><span>Impacto</span><span>Confiança</span><span></span></div>
        <div v-for="(item, i) in swot.opportunities" :key="i" class="item-row">
          <input class="input" v-model="item.text" placeholder="Ex: Crescimento do mercado de automação" @input="save" />
          <input class="num" type="number" min="1" max="10" v-model="item.impact" placeholder="1-10" @input="save" />
          <input class="num" type="number" min="1" max="10" v-model="item.confidence" placeholder="1-10" @input="save" />
          <button class="btn-icon" @click="removeItem(swot.opportunities, i)">×</button>
        </div>
        <button class="btn-add" @click="addItem(swot.opportunities)">+ Adicionar item</button>
      </div>

      <!-- Ameaças -->
      <div class="swot-block t">
        <h4>Ameaças (T)</h4>
        <div class="hint">Riscos externos</div>
        <div class="row-head"><span>Descrição</span><span>Impacto</span><span>Confiança</span><span></span></div>
        <div v-for="(item, i) in swot.threats" :key="i" class="item-row">
          <input class="input" v-model="item.text" placeholder="Ex: Concorrentes com mais capital" @input="save" />
          <input class="num" type="number" min="1" max="10" v-model="item.impact" placeholder="1-10" @input="save" />
          <input class="num" type="number" min="1" max="10" v-model="item.confidence" placeholder="1-10" @input="save" />
          <button class="btn-icon" @click="removeItem(swot.threats, i)">×</button>
        </div>
        <button class="btn-add" @click="addItem(swot.threats)">+ Adicionar item</button>
      </div>
    </div>
  </div>
</template>
