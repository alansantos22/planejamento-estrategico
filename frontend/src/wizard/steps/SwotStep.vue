<script setup>
import { usePlanStore } from '@/stores/plan'
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

function score(item) {
  const s = (Number(item.impact) * Number(item.confidence)) / 10
  return Number.isFinite(s) ? s : 0
}

function scoreClass(item) {
  const s = score(item)
  if (s >= 7) return 'is-high'
  if (s >= 4) return 'is-mid'
  return 'is-low'
}

const QUADRANTS = [
  { key: 'strengths',     label: 'Forças',        letter: 'S', hint: 'Vantagens internas, controláveis',  cls: 's', placeholder: 'Ex: Equipe enxuta e ágil' },
  { key: 'weaknesses',    label: 'Fraquezas',     letter: 'W', hint: 'Limitações internas, controláveis', cls: 'w', placeholder: 'Ex: Falta de capital para marketing' },
  { key: 'opportunities', label: 'Oportunidades', letter: 'O', hint: 'Tendências externas favoráveis',    cls: 'o', placeholder: 'Ex: Crescimento do mercado de automação' },
  { key: 'threats',       label: 'Ameaças',       letter: 'T', hint: 'Riscos externos',                   cls: 't', placeholder: 'Ex: Concorrentes com mais capital' },
]
</script>

<template>
  <div>
    <HelpBox>
      <strong>Como pontuar:</strong> <strong>Impacto</strong> = quão relevante é para o negócio.
      <strong>Confiança</strong> = quão certo você está. Score = (Impacto × Confiança) ÷ 10.
    </HelpBox>

    <AiHelperButton agent="swotDetector" label="Sugerir itens da SWOT a partir do contexto" />

    <div class="swot-grid">
      <div v-for="q in QUADRANTS" :key="q.key" :class="['swot-block', q.cls]">

        <div class="swot-block__header">
          <div :class="['swot-block__letter', q.cls]">{{ q.letter }}</div>
          <div>
            <h4>{{ q.label }}</h4>
            <p class="hint">{{ q.hint }}</p>
          </div>
        </div>

        <div class="items">
          <div v-for="(item, i) in swot[q.key]" :key="i" class="item-card">
            <div class="item-card__body">
              <div class="textarea-grow" :data-value="item.text">
                <textarea
                  v-model="item.text"
                  :placeholder="q.placeholder"
                  class="textarea-grow__input"
                  maxlength="300"
                  @input="save"
                />
              </div>
              <button class="item-card__remove" aria-label="Remover" @click="removeItem(swot[q.key], i)">×</button>
            </div>

            <div class="item-card__footer">
              <label class="item-card__field">
                <span>Impacto</span>
                <input type="number" min="1" max="10" v-model="item.impact" @input="save" />
              </label>
              <label class="item-card__field">
                <span>Confiança</span>
                <input type="number" min="1" max="10" v-model="item.confidence" @input="save" />
              </label>
              <div :class="['item-card__score', scoreClass(item)]">
                {{ score(item).toFixed(1) }}
              </div>
            </div>
          </div>
        </div>

        <button class="btn-add" @click="addItem(swot[q.key])">+ Adicionar item</button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tokens' as t;

.swot-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: start;
  gap: t.$space-4;
  margin-top: t.$space-4;

  @include t.respond-down(t.$bp-md) {
    grid-template-columns: 1fr;
  }
}

.swot-block {
  background: t.$color-surface;
  border: 2px solid t.$color-border;
  border-radius: t.$radius-lg;
  padding: t.$space-4;
  display: flex;
  flex-direction: column;
  gap: t.$space-3;

  &.s { border-color: #22c55e; }
  &.w { border-color: #f97316; }
  &.o { border-color: #3b82f6; }
  &.t { border-color: #eab308; }

  &__header {
    display: flex;
    align-items: center;
    gap: t.$space-3;
  }

  &__letter {
    width: 40px;
    height: 40px;
    border-radius: t.$radius-md;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.25rem;
    font-weight: t.$font-weight-bold;
    flex-shrink: 0;

    &.s { background: rgba(34,  197, 94,  0.15); color: #22c55e; }
    &.w { background: rgba(249, 115, 22,  0.15); color: #f97316; }
    &.o { background: rgba(59,  130, 246, 0.15); color: #3b82f6; }
    &.t { background: rgba(234, 179, 8,   0.15); color: #eab308; }
  }

  h4 {
    margin: 0;
    font-size: t.$font-size-md;
    font-weight: t.$font-weight-bold;
    color: t.$color-text;
  }
}

.hint {
  margin: 0;
  font-size: t.$font-size-xs;
  color: t.$color-text-light;
}

.items {
  display: flex;
  flex-direction: column;
  gap: t.$space-2;
}

.item-card {
  background: t.$color-bg-soft;
  border: 1px solid t.$color-border;
  border-radius: t.$radius-md;
  overflow: visible;
  transition: border-color 0.2s;

  &:focus-within {
    border-color: t.$color-primary;
  }

  &__body {
    display: flex;
    align-items: flex-start;
    gap: t.$space-2;
    padding: t.$space-3 t.$space-3 t.$space-2;
  }

  &__remove {
    flex-shrink: 0;
    width: 22px;
    height: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    border-radius: t.$radius-sm;
    color: t.$color-text-light;
    cursor: pointer;
    font-size: 1rem;
    line-height: 1;
    opacity: 0.35;
    transition: opacity 0.15s, background 0.15s, color 0.15s;

    &:hover {
      opacity: 1;
      background: t.$color-danger;
      color: #fff;
    }
  }

  &__footer {
    display: flex;
    align-items: center;
    gap: t.$space-3;
    padding: t.$space-2 t.$space-3;
    border-top: 1px solid t.$color-border;
    background: t.$color-surface;
    border-radius: 0 0 t.$radius-md t.$radius-md;
  }

  &__field {
    display: flex;
    align-items: center;
    gap: t.$space-2;
    font-size: t.$font-size-xs;
    color: t.$color-text-light;

    span { white-space: nowrap; }

    input {
      width: 44px;
      text-align: center;
      background: t.$color-bg-soft;
      border: 1px solid t.$color-border;
      border-radius: t.$radius-sm;
      color: t.$color-text;
      font-family: inherit;
      font-size: t.$font-size-sm;
      font-weight: t.$font-weight-semi;
      padding: 2px t.$space-1;
      transition: border-color 0.15s;

      &:focus {
        outline: none;
        border-color: t.$color-primary;
      }

      &::-webkit-inner-spin-button,
      &::-webkit-outer-spin-button { -webkit-appearance: none; }
    }
  }

  &__score {
    margin-left: auto;
    font-size: t.$font-size-sm;
    font-weight: t.$font-weight-bold;
    padding: 2px t.$space-2;
    border-radius: t.$radius-sm;
    min-width: 36px;
    text-align: center;

    &.is-high { background: rgba(34,  197, 94,  0.15); color: #22c55e; }
    &.is-mid  { background: rgba(234, 179, 8,   0.15); color: #eab308; }
    &.is-low  { background: rgba(239, 68,  68,  0.15); color: #ef4444; }
  }
}

// Técnica grid-mirror: ::after espelha o conteúdo e força o grid cell a crescer
.textarea-grow {
  flex: 1;
  display: grid;
  font-family: inherit;
  font-size: t.$font-size-sm;
  line-height: 1.6;

  &::after {
    content: attr(data-value) ' ';
    white-space: pre-wrap;
    word-break: break-word;
    visibility: hidden;
    grid-area: 1 / 1;
    padding: 0;
    min-height: 44px;
  }

  &__input {
    grid-area: 1 / 1;
    resize: none;
    overflow: hidden;
    background: transparent;
    border: none;
    outline: none;
    color: t.$color-text;
    font-family: inherit;
    font-size: inherit;
    line-height: inherit;
    padding: 0;
    width: 100%;
    min-height: 44px;

    &::placeholder { color: t.$color-text-light; }
  }
}


.btn-add {
  width: 100%;
  padding: t.$space-2;
  background: transparent;
  border: 1px dashed t.$color-border;
  border-radius: t.$radius-md;
  color: t.$color-text-light;
  font-size: t.$font-size-sm;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s, background 0.15s;

  &:hover {
    border-color: t.$color-primary;
    color: t.$color-primary;
    background: t.$color-primary-soft;
  }
}
</style>
