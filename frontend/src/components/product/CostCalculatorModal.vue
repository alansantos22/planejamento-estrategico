<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import BaseModal from '@/components/common/BaseModal.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import BaseMoneyInput from '@/components/common/BaseMoneyInput.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import InfoTooltip from '@/components/common/InfoTooltip.vue'

const props = defineProps({
  offering: { type: Object, required: true }
})
const emit = defineEmits(['close', 'apply', 'auto-save'])

const COST_TYPES = [
  { value: 'mao-de-obra', label: 'Mão de obra' },
  { value: 'materia-prima', label: 'Matéria prima' },
  { value: 'energia', label: 'Energia / Utilidades' },
  { value: 'frete', label: 'Frete / Logística' },
  { value: 'pdv', label: 'PDV / Comissão' },
  { value: 'imposto', label: 'Imposto' },
  { value: 'royalties', label: 'Royalties' },
  { value: 'cac', label: 'CAC / Custo de aquisição' },
  { value: 'marketing', label: 'Marketing / Aquisição' },
  { value: 'software', label: 'Software / Licenças' },
  { value: 'outro', label: 'Outro' }
]

const PCT_DEFAULT_TYPES = new Set(['imposto', 'pdv', 'royalties'])

function cloneCosts(src) {
  const list = Array.isArray(src) ? src : []
  return list.map((c) => ({
    name: c.name || '',
    type: c.type || '',
    value: c.value ?? '',
    unit: c.unit === 'PCT' ? 'PCT' : 'BRL'
  }))
}

const tiers = computed(() => (props.offering.pricingTiers || []).filter((t) => t && (t.price || t.price === 0)))
const tierOptions = computed(() => tiers.value.map((t, i) => ({
  value: String(i),
  label: `${t.name || `Plano ${i + 1}`} — R$ ${Number(t.price || 0).toLocaleString('pt-BR')}`
})))

// Checkbox: "Custos para todos os planos"
const sharedForAll = ref(props.offering.costsPerPlan !== true)

// Shared costs (when sharedForAll = true)
const costs = ref(cloneCosts(props.offering.costs))
if (costs.value.length === 0) costs.value.push({ name: '', type: '', value: '', unit: 'BRL' })

// Per-plan costs: array of cost-arrays indexed by tier
function initTierCosts() {
  const existing = props.offering.tierCosts
  return tiers.value.map((_, i) => {
    if (Array.isArray(existing) && existing[i]) {
      const c = cloneCosts(existing[i])
      return c.length ? c : [{ name: '', type: '', value: '', unit: 'BRL' }]
    }
    return [{ name: '', type: '', value: '', unit: 'BRL' }]
  })
}
const tierCostsArr = ref(initTierCosts())
const activePlanIdx = ref(0)

// Returns the current mutable cost list
function getCostList() {
  if (sharedForAll.value) return costs.value
  return tierCostsArr.value[activePlanIdx.value] || costs.value
}

const currentCosts = computed(() => getCostList())

// Ensure tierCostsArr stays in sync with tiers when switching mode
watch(sharedForAll, (val) => {
  if (!val) {
    while (tierCostsArr.value.length < tiers.value.length) {
      tierCostsArr.value.push([{ name: '', type: '', value: '', unit: 'BRL' }])
    }
    if (activePlanIdx.value >= tiers.value.length) activePlanIdx.value = 0
  }
})

// Price selection (shared mode)
const savedTierIdx = props.offering.calcSelectedTierIdx
const savedManualPrice = props.offering.calcManualPrice

const selectedTierIdx = ref(
  savedTierIdx !== undefined && savedTierIdx !== '' && tiers.value[Number(savedTierIdx)]
    ? String(savedTierIdx)
    : (tiers.value.length ? '0' : '')
)
const manualPrice = ref(
  savedManualPrice !== undefined && savedManualPrice !== ''
    ? savedManualPrice
    : (tiers.value.length ? '' : (props.offering.pricingTiers?.[0]?.price ?? ''))
)

const effectivePrice = computed(() => {
  if (!sharedForAll.value) {
    return Number(tiers.value[activePlanIdx.value]?.price) || 0
  }
  if (selectedTierIdx.value !== '' && tiers.value[Number(selectedTierIdx.value)]) {
    return Number(tiers.value[Number(selectedTierIdx.value)].price) || 0
  }
  return Number(manualPrice.value) || 0
})

function costToBRL(c, price) {
  const n = Number(c.value) || 0
  if (c.unit === 'PCT') return (n / 100) * price
  return n
}

const totalCost = computed(() =>
  currentCosts.value.reduce((sum, c) => sum + costToBRL(c, effectivePrice.value), 0)
)
const grossProfit = computed(() => effectivePrice.value - totalCost.value)
const marginPct = computed(() => {
  if (effectivePrice.value <= 0) return null
  return (grossProfit.value / effectivePrice.value) * 100
})
const markupPct = computed(() => {
  if (totalCost.value <= 0) return null
  return (grossProfit.value / totalCost.value) * 100
})

// Per-plan results table
const tierResults = computed(() =>
  tiers.value.map((t, i) => {
    const price = Number(t.price) || 0
    const tc = tierCostsArr.value[i] || []
    const cost = tc.reduce((s, c) => s + costToBRL(c, price), 0)
    const profit = price - cost
    const margin = price > 0 ? (profit / price) * 100 : null
    const markup = cost > 0 ? (profit / cost) * 100 : null
    return { name: t.name || `Plano ${i + 1}`, price, cost, profit, margin, markup }
  })
)

function addCost() {
  getCostList().push({ name: '', type: '', value: '', unit: 'BRL' })
}
function removeCost(i) {
  const list = getCostList()
  list.splice(i, 1)
  if (list.length === 0) list.push({ name: '', type: '', value: '', unit: 'BRL' })
}
function toggleUnit(i) {
  const c = getCostList()[i]
  c.unit = c.unit === 'PCT' ? 'BRL' : 'PCT'
  c.value = ''
}
function onTypeChange(i) {
  const c = getCostList()[i]
  if (!c.value && PCT_DEFAULT_TYPES.has(c.type)) c.unit = 'PCT'
}
function onPctInput(e, i) {
  const raw = String(e.target.value || '').replace(',', '.').replace(/[^\d.]/g, '')
  const parts = raw.split('.')
  const norm = parts.length > 1 ? parts[0] + '.' + parts.slice(1).join('').slice(0, 2) : parts[0]
  getCostList()[i].value = norm
  e.target.value = norm
}
function onBrlInput(e, i) {
  const digits = String(e.target.value || '').replace(/\D+/g, '')
  if (!digits) {
    getCostList()[i].value = ''
    e.target.value = ''
    return
  }
  const n = parseInt(digits, 10)
  getCostList()[i].value = n
  e.target.value = n.toLocaleString('pt-BR')
}
function displayValue(c) {
  if (c.value === '' || c.value === null || c.value === undefined) return ''
  if (c.unit === 'PCT') return String(c.value)
  const n = Number(c.value)
  return Number.isFinite(n) ? n.toLocaleString('pt-BR') : ''
}

function fmt(n) {
  if (n === null || !Number.isFinite(n)) return '—'
  return n.toFixed(1)
}
function fmtMoney(n) {
  return Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function buildPayload() {
  if (sharedForAll.value) {
    return {
      costsPerPlan: false,
      costs: costs.value.filter((c) => (c.name || '').trim() || Number(c.value) > 0 || c.type),
      tierCosts: null,
      marginPct: marginPct.value !== null ? Number(marginPct.value.toFixed(2)) : '',
      markupPct: markupPct.value !== null ? Number(markupPct.value.toFixed(2)) : '',
      priceUsed: effectivePrice.value,
      selectedTierIdx: selectedTierIdx.value,
      manualPrice: manualPrice.value,
      tierMarginPct: null,
      tierMarkupPct: null
    }
  }
  const results = tierResults.value
  return {
    costsPerPlan: true,
    tierCosts: tierCostsArr.value.map((tc) => tc.filter((c) => (c.name || '').trim() || Number(c.value) > 0 || c.type)),
    costs: [],
    marginPct: '',
    markupPct: '',
    tierMarginPct: results.map((r) => (r.margin !== null ? Number(r.margin.toFixed(2)) : '')),
    tierMarkupPct: results.map((r) => (r.markup !== null ? Number(r.markup.toFixed(2)) : ''))
  }
}

function apply() { emit('apply', buildPayload()) }

let autoSaveTimer = null
function scheduleAutoSave() {
  if (autoSaveTimer) clearTimeout(autoSaveTimer)
  autoSaveTimer = setTimeout(() => { emit('auto-save', buildPayload()) }, 300)
}

watch([costs, tierCostsArr, selectedTierIdx, manualPrice, sharedForAll, activePlanIdx], scheduleAutoSave, { deep: true })

onBeforeUnmount(() => { if (autoSaveTimer) clearTimeout(autoSaveTimer) })
</script>

<template>
  <BaseModal title="Calculadora de margem e markup" size="lg" @close="emit('close')">
    <p class="muted" style="margin-top:0">
      Liste todos os custos (diretos e indiretos) envolvidos na entrega de <strong>1 unidade</strong> da oferta.
      O sistema soma, compara com o preço e calcula margem e markup.
    </p>

    <!-- Preço de venda: só no modo compartilhado -->
    <div v-if="sharedForAll" class="calc-section">
      <h4>1. Preço de venda</h4>
      <div v-if="tiers.length" class="calc-row">
        <label class="calc-label">Plano usado no cálculo</label>
        <BaseSelect v-model="selectedTierIdx" :options="tierOptions" />
      </div>
      <div v-else class="calc-row">
        <label class="calc-label">Preço de venda (unitário)</label>
        <BaseMoneyInput v-model="manualPrice" placeholder="Ex: 297" />
      </div>
    </div>

    <div class="calc-section">
      <h4>
        {{ sharedForAll ? '2.' : '1.' }} Custos por unidade
        <InfoTooltip text="Some todos os custos para produzir/entregar UMA unidade. Para mão de obra: (salário/hora) × (horas gastas por unidade). Para custos fixos diluídos: rateie pelo volume mensal." />
      </h4>

      <!-- Checkbox: custos para todos os planos (só quando há múltiplos planos com preço) -->
      <div v-if="tiers.length >= 2" class="shared-toggle">
        <label class="shared-toggle__label">
          <input
            type="checkbox"
            class="shared-toggle__check"
            :checked="sharedForAll"
            @change="sharedForAll = $event.target.checked"
          />
          Custos para todos os planos
        </label>
        <InfoTooltip text="Quando marcado, os mesmos custos valem para todos os planos. Desmarque para definir custos diferentes por plano." />
      </div>

      <!-- Tabs dos planos (modo por plano) -->
      <div v-if="!sharedForAll && tiers.length >= 2" class="plan-tabs">
        <button
          v-for="(t, i) in tiers"
          :key="i"
          type="button"
          class="plan-tabs__tab"
          :class="{ 'is-active': activePlanIdx === i }"
          @click="activePlanIdx = i"
        >
          {{ t.name || `Plano ${i + 1}` }}
          <span class="plan-tabs__price">R$ {{ Number(t.price || 0).toLocaleString('pt-BR') }}</span>
        </button>
      </div>

      <div class="cost-list">
        <div class="cost-list__head">
          <div>Descrição</div>
          <div>Tipo</div>
          <div>
            Valor
            <InfoTooltip text="Clique em R$/% para alternar entre valor fixo (reais) e percentual sobre o preço de venda. Ex: imposto 8% = 8% do preço." />
          </div>
          <div></div>
        </div>
        <div v-for="(c, i) in currentCosts" :key="i" class="cost-list__row">
          <BaseInput v-model="c.name" placeholder="Ex: Salário do designer (2h)" />
          <BaseSelect
            v-model="c.type"
            :options="[{ value: '', label: 'Selecione...' }, ...COST_TYPES]"
            @update:model-value="onTypeChange(i)"
          />
          <div class="cost-value" :class="{ 'is-pct': c.unit === 'PCT' }">
            <button
              type="button"
              class="cost-value__unit"
              :title="c.unit === 'PCT' ? 'Percentual do preço — clique para usar R$' : 'Valor fixo — clique para usar %'"
              @click="toggleUnit(i)"
            >{{ c.unit === 'PCT' ? '%' : 'R$' }}</button>
            <input
              v-if="c.unit === 'PCT'"
              type="text"
              inputmode="decimal"
              class="cost-value__input"
              :value="displayValue(c)"
              placeholder="0"
              @input="onPctInput($event, i)"
            />
            <input
              v-else
              type="text"
              inputmode="numeric"
              class="cost-value__input"
              :value="displayValue(c)"
              placeholder="0"
              @input="onBrlInput($event, i)"
            />
          </div>
          <BaseButton
            variant="icon"
            :disabled="currentCosts.length <= 1"
            aria-label="Remover custo"
            @click="removeCost(i)"
          >×</BaseButton>
        </div>
        <BaseButton variant="add" size="sm" @click="addCost">+ Adicionar custo</BaseButton>
      </div>
    </div>

    <div class="calc-section calc-summary">
      <h4>{{ sharedForAll ? '3.' : '2.' }} Resultado</h4>

      <!-- Modo compartilhado: resumo único -->
      <div v-if="sharedForAll" class="summary-grid">
        <div class="summary-tile">
          <div class="summary-tile__label">Preço</div>
          <div class="summary-tile__value">R$ {{ fmtMoney(effectivePrice) }}</div>
        </div>
        <div class="summary-tile">
          <div class="summary-tile__label">Custo total</div>
          <div class="summary-tile__value">R$ {{ fmtMoney(totalCost) }}</div>
        </div>
        <div class="summary-tile">
          <div class="summary-tile__label">Lucro bruto</div>
          <div
            class="summary-tile__value"
            :class="{ 'is-negative': grossProfit < 0, 'is-positive': grossProfit > 0 }"
          >R$ {{ fmtMoney(grossProfit) }}</div>
        </div>
        <div class="summary-tile is-highlight">
          <div class="summary-tile__label">
            Margem
            <InfoTooltip text="(Preço − Custo) ÷ Preço × 100. Quanto da receita sobra como lucro. Sempre < 100%." />
          </div>
          <div
            class="summary-tile__value"
            :class="{ 'is-negative': marginPct !== null && marginPct < 0 }"
          >{{ fmt(marginPct) }}%</div>
        </div>
        <div class="summary-tile is-highlight">
          <div class="summary-tile__label">
            Markup
            <InfoTooltip text="(Preço − Custo) ÷ Custo × 100. Quanto você adiciona em cima do custo. Pode passar de 100%." />
          </div>
          <div
            class="summary-tile__value"
            :class="{ 'is-negative': markupPct !== null && markupPct < 0 }"
          >{{ fmt(markupPct) }}%</div>
        </div>
      </div>

      <!-- Modo por plano: tabela com todos os planos -->
      <div v-else class="tier-results">
        <div class="tier-results__head">
          <div>Plano</div>
          <div>Preço</div>
          <div>Custo</div>
          <div>Lucro</div>
          <div>Margem</div>
          <div>Markup</div>
        </div>
        <div
          v-for="(r, i) in tierResults"
          :key="i"
          class="tier-results__row"
          :class="{ 'is-active': activePlanIdx === i }"
          @click="activePlanIdx = i"
        >
          <div class="tier-results__name">{{ r.name }}</div>
          <div>R$ {{ fmtMoney(r.price) }}</div>
          <div>R$ {{ fmtMoney(r.cost) }}</div>
          <div :class="{ 'is-negative': r.profit < 0, 'is-positive': r.profit > 0 }">R$ {{ fmtMoney(r.profit) }}</div>
          <div :class="{ 'is-negative': r.margin !== null && r.margin < 0 }">{{ fmt(r.margin) }}%</div>
          <div :class="{ 'is-negative': r.markup !== null && r.markup < 0 }">{{ fmt(r.markup) }}%</div>
        </div>
      </div>

      <div v-if="sharedForAll && effectivePrice <= 0" class="alert warning" style="margin-top:12px">
        ⚠ Defina o preço de venda para calcular margem e markup.
      </div>
      <div v-else-if="sharedForAll && grossProfit < 0" class="alert danger" style="margin-top:12px">
        ⚠ Custo total maior que o preço — você está operando no prejuízo.
      </div>
    </div>

    <template #footer>
      <BaseButton variant="ghost" @click="emit('close')">Fechar</BaseButton>
      <BaseButton variant="primary" :disabled="sharedForAll && effectivePrice <= 0" @click="apply">Aplicar à oferta</BaseButton>
    </template>
  </BaseModal>
</template>

<style lang="scss" scoped>
@use '@/styles/tokens' as t;

.muted { color: t.$color-text-light; font-size: t.$font-size-sm; }

.calc-section {
  padding: t.$space-4 0;
  border-bottom: 1px solid t.$color-border;

  &:last-of-type { border-bottom: 0; }

  h4 {
    margin: 0 0 t.$space-3;
    font-size: t.$font-size-md;
    color: t.$color-primary;
    display: inline-flex;
    align-items: center;
    gap: t.$space-2;
  }
}

.calc-row {
  display: flex;
  flex-direction: column;
  gap: t.$space-2;
}

.calc-label {
  font-size: t.$font-size-sm;
  font-weight: t.$font-weight-semi;
  color: t.$color-text;
}

.shared-toggle {
  display: inline-flex;
  align-items: center;
  gap: t.$space-2;
  margin-bottom: t.$space-3;

  &__label {
    display: inline-flex;
    align-items: center;
    gap: t.$space-2;
    font-size: t.$font-size-sm;
    color: t.$color-text;
    cursor: pointer;
    user-select: none;
  }

  &__check {
    accent-color: t.$color-primary;
    width: 16px;
    height: 16px;
    cursor: pointer;
  }
}

.plan-tabs {
  display: flex;
  gap: t.$space-2;
  margin-bottom: t.$space-3;
  flex-wrap: wrap;

  &__tab {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: t.$space-2 t.$space-4;
    border: 1px solid t.$color-border;
    border-radius: t.$radius-md;
    background: t.$color-bg-soft;
    color: t.$color-text-light;
    font-size: t.$font-size-sm;
    cursor: pointer;
    transition: all 0.15s;
    gap: 2px;

    &.is-active {
      border-color: t.$color-primary;
      background: t.$color-primary-soft;
      color: t.$color-text;
    }

    &:hover:not(.is-active) {
      border-color: t.$color-primary;
      color: t.$color-text;
    }
  }

  &__price {
    font-size: t.$font-size-xs;
    font-weight: t.$font-weight-semi;
    color: t.$color-primary;
  }
}

.cost-list {
  display: flex;
  flex-direction: column;
  gap: t.$space-2;

  &__head {
    display: grid;
    grid-template-columns: 2fr 1.2fr 1fr 32px;
    gap: t.$space-2;
    font-size: t.$font-size-xs;
    text-transform: uppercase;
    color: t.$color-text-light;
    font-weight: t.$font-weight-semi;
    padding: 0 t.$space-1;
  }

  &__row {
    display: grid;
    grid-template-columns: 2fr 1.2fr 1fr 32px;
    gap: t.$space-2;
    align-items: center;
  }
}

.cost-value {
  display: flex;
  align-items: stretch;
  width: 100%;
  border: 1px solid t.$color-border;
  border-radius: t.$radius-md;
  background: t.$color-surface;
  overflow: hidden;
  transition: border-color 0.2s, box-shadow 0.2s;

  &:focus-within {
    @include t.focus-ring;
  }

  &__unit {
    padding: 0 t.$space-3;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 38px;
    background: t.$color-bg-soft;
    color: t.$color-text-light;
    font-size: t.$font-size-sm;
    font-weight: t.$font-weight-semi;
    border: 0;
    border-right: 1px solid t.$color-border;
    cursor: pointer;
    user-select: none;
    transition: background 0.15s, color 0.15s;

    &:hover { background: t.$color-border; color: t.$color-text; }
  }

  &.is-pct &__unit {
    background: t.$color-primary;
    color: #fff;
    border-right-color: t.$color-primary;
  }

  &__input {
    flex: 1;
    width: 100%;
    border: 0;
    outline: 0;
    background: transparent;
    color: t.$color-text;
    font-family: inherit;
    padding: t.$space-2 t.$space-3;
    font-size: t.$font-size-sm;
  }
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: t.$space-3;

  @include t.respond-down(t.$bp-md) {
    grid-template-columns: repeat(2, 1fr);
  }
}

.summary-tile {
  padding: t.$space-3;
  background: t.$color-bg-soft;
  border: 1px solid t.$color-border;
  border-radius: t.$radius-md;
  display: flex;
  flex-direction: column;
  gap: t.$space-1;

  &.is-highlight {
    background: t.$color-primary-soft;
    border-color: t.$color-primary;
  }

  &__label {
    font-size: t.$font-size-xs;
    text-transform: uppercase;
    color: t.$color-text-light;
    font-weight: t.$font-weight-semi;
    display: inline-flex;
    align-items: center;
    gap: t.$space-1;
  }

  &__value {
    font-size: t.$font-size-lg;
    font-weight: t.$font-weight-bold;
    color: t.$color-text;

    &.is-negative { color: t.$color-danger; }
    &.is-positive { color: #16a34a; }
  }
}

.tier-results {
  border: 1px solid t.$color-border;
  border-radius: t.$radius-md;
  overflow: hidden;

  &__head {
    display: grid;
    grid-template-columns: 1.5fr 1fr 1fr 1fr 0.8fr 0.8fr;
    gap: t.$space-2;
    padding: t.$space-2 t.$space-3;
    background: t.$color-bg-soft;
    font-size: t.$font-size-xs;
    text-transform: uppercase;
    color: t.$color-text-light;
    font-weight: t.$font-weight-semi;
    border-bottom: 1px solid t.$color-border;
  }

  &__row {
    display: grid;
    grid-template-columns: 1.5fr 1fr 1fr 1fr 0.8fr 0.8fr;
    gap: t.$space-2;
    padding: t.$space-2 t.$space-3;
    font-size: t.$font-size-sm;
    cursor: pointer;
    transition: background 0.15s;
    border-bottom: 1px solid t.$color-border;

    &:last-child { border-bottom: 0; }

    &.is-active { background: t.$color-primary-soft; }
    &:hover:not(.is-active) { background: t.$color-bg-soft; }

    .is-negative { color: t.$color-danger; }
    .is-positive { color: #16a34a; }
  }

  &__name {
    font-weight: t.$font-weight-semi;
    color: t.$color-text;
  }
}
</style>
