<script setup>
import { computed, ref } from 'vue'
import { usePlanStore } from '@/stores/plan'
import { productFocusAnalysis } from '@/lib/scoring'
import BaseField from '@/components/common/BaseField.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import BaseMoneyInput from '@/components/common/BaseMoneyInput.vue'
import BaseTextarea from '@/components/common/BaseTextarea.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseSwitch from '@/components/common/BaseSwitch.vue'
import FormGrid from '@/components/common/FormGrid.vue'
import HelpBox from '@/components/common/HelpBox.vue'
import InfoTooltip from '@/components/common/InfoTooltip.vue'
import CostCalculatorModal from '@/components/product/CostCalculatorModal.vue'

const TYPE_OPTIONS = [
  { value: '', label: 'Selecione...' },
  { value: 'saas', label: 'SaaS / Software' },
  { value: 'servico', label: 'Serviço' },
  { value: 'consultoria', label: 'Consultoria' },
  { value: 'infoproduto', label: 'Infoproduto / Curso' },
  { value: 'produto-fisico', label: 'Produto físico' },
  { value: 'assinatura', label: 'Assinatura' },
  { value: 'marketplace', label: 'Marketplace / Comissão' },
  { value: 'outro', label: 'Outro' }
]

const NATURE_OPTIONS = [
  { value: '', label: 'Selecione...' },
  { value: 'digital', label: 'Digital' },
  { value: 'fisico', label: 'Físico' },
  { value: 'hibrido', label: 'Híbrido' }
]

const BILLING_OPTIONS = [
  { value: '', label: 'Selecione...' },
  { value: 'unico', label: 'Pagamento único' },
  { value: 'mensal', label: 'Recorrente mensal' },
  { value: 'anual', label: 'Recorrente anual' },
  { value: 'por-uso', label: 'Por uso / consumo' },
  { value: 'por-projeto', label: 'Por projeto' }
]

const store = usePlanStore()
const p = store.plan.product

const analysis = computed(() => productFocusAnalysis(store.plan.product))

const totalRev = computed(() =>
  (p.offerings || []).reduce((s, o) => s + (Number(o.revenuePct) || 0), 0)
)
const totalEff = computed(() =>
  (p.offerings || []).reduce((s, o) => s + (Number(o.effortPct) || 0), 0)
)

const MAX_OFFERINGS = 3

function save() { store.save() }

function addOffering() {
  p.offerings = p.offerings || []
  if (p.offerings.length >= MAX_OFFERINGS) return
  p.offerings.push({
    name: '',
    description: '',
    type: '',
    nature: '',
    billing: '',
    onDemand: false,
    hasPlans: false,
    pricingTiers: [{ name: '', price: '' }],
    revenuePct: '',
    effortPct: '',
    marginPct: '',
    markupPct: '',
    costs: []
  })
  save()
}

function removeOffering(i) {
  p.offerings.splice(i, 1)
  save()
}

function ensureTiers(o) {
  if (!Array.isArray(o.pricingTiers)) o.pricingTiers = []
  if (o.pricingTiers.length === 0) o.pricingTiers.push({ name: '', price: '' })
}

function addTier(o) {
  ensureTiers(o)
  o.pricingTiers.push({ name: '', price: '' })
  save()
}

function removeTier(o, i) {
  o.pricingTiers.splice(i, 1)
  if (o.pricingTiers.length === 0) o.pricingTiers.push({ name: '', price: '' })
  save()
}

const calcOfferingIndex = ref(null)
const calcOffering = computed(() =>
  calcOfferingIndex.value !== null ? p.offerings[calcOfferingIndex.value] : null
)

function openCalculator(i) {
  calcOfferingIndex.value = i
}
function closeCalculator() {
  calcOfferingIndex.value = null
}
function writeCalculator(result) {
  const o = calcOffering.value
  if (!o) return
  o.costsPerPlan = result.costsPerPlan
  if (result.costsPerPlan) {
    o.tierCosts = result.tierCosts
    ;(o.pricingTiers || []).forEach((t, i) => {
      t.marginPct = result.tierMarginPct?.[i] ?? ''
      t.markupPct = result.tierMarkupPct?.[i] ?? ''
    })
    o.marginPct = ''
    o.markupPct = ''
  } else {
    o.costs = result.costs
    o.marginPct = result.marginPct
    o.markupPct = result.markupPct
    o.calcPriceUsed = result.priceUsed
    o.calcSelectedTierIdx = result.selectedTierIdx
    o.calcManualPrice = result.manualPrice
    ;(o.pricingTiers || []).forEach((t) => { t.marginPct = ''; t.markupPct = '' })
  }
  save()
}
function applyCalculator(result) {
  writeCalculator(result)
  closeCalculator()
}

function tiersPctSum(o) {
  return (o.pricingTiers || []).reduce((s, t) => s + (Number(t.revenuePct) || 0), 0)
}
</script>

<template>
  <div>
    <HelpBox>
      <strong>Regra:</strong> %receita e %esforço somam 100% no total.
      O sistema calcula <strong>eficiência</strong> (receita/esforço) e aponta produtos que <em>sangram</em> esforço sem retornar.
    </HelpBox>

    <div v-for="(o, i) in p.offerings" :key="i" class="offering-card">
      <h5>Oferta #{{ i + 1 }} <BaseButton variant="icon" aria-label="Remover oferta" @click="removeOffering(i)">×</BaseButton></h5>
      <FormGrid :cols="2">
        <BaseField label="Nome da oferta" :span="2">
          <BaseInput v-model="o.name" placeholder="Ex: Plano Pro / Consultoria mensal" @update:model-value="save" />
        </BaseField>
        <BaseField :span="2">
          <template #label>
            Descrição
            <InfoTooltip text="Descreva o que a oferta entrega, para quem é e qual problema resolve. Isso alimenta a geração de personas, ICP e SWOT." />
          </template>
          <BaseTextarea
            v-model="o.description"
            placeholder="Ex: Mentoria individual de 3 meses para fundadores de SaaS que querem sair do zero para os primeiros R$50k/mês. Inclui sessões semanais, revisão de pitch e acesso à comunidade."
            :rows="3"
            @update:model-value="save"
          />
        </BaseField>
        <BaseField>
          <template #label>
            Tipo
            <InfoTooltip text="Categoria do que você vende. Define como o produto é entregue (software, serviço, infoproduto etc.) e ajuda o sistema a calibrar análises futuras." />
          </template>
          <BaseSelect v-model="o.type" :options="TYPE_OPTIONS" @update:model-value="save" />
        </BaseField>
        <BaseField>
          <template #label>
            Natureza
            <InfoTooltip text="Físico (precisa logística/estoque), digital (entrega online) ou híbrido (mistura — ex: mentoria com material físico)." />
          </template>
          <BaseSelect v-model="o.nature" :options="NATURE_OPTIONS" @update:model-value="save" />
        </BaseField>
        <BaseField :span="2">
          <template #label>
            Modelo de cobrança
            <InfoTooltip text="Como o cliente paga: pagamento único, assinatura recorrente (mensal/anual), por uso, ou por projeto. Impacta projeção de receita e LTV." />
          </template>
          <BaseSelect v-model="o.billing" :options="BILLING_OPTIONS" @update:model-value="save" />
        </BaseField>
        <div class="pricing-block">
          <div class="pricing-block__head">
            <span class="pricing-block__title">Preço</span>
            <div class="pricing-block__toggles">
              <div class="pricing-block__toggle" :class="{ 'is-disabled': !!o.onDemand }">
                <BaseSwitch
                  :model-value="!!o.hasPlans"
                  :disabled="!!o.onDemand"
                  @update:model-value="o.hasPlans = $event; ensureTiers(o); save()"
                />
                <span class="pricing-block__toggle-label">Vendido em planos</span>
                <InfoTooltip text="Marque se a oferta tem múltiplos níveis (ex: Básico, Pro, Enterprise). Para cada plano você informa nome e preço." />
              </div>
              <div class="pricing-block__toggle">
                <BaseSwitch
                  :model-value="!!o.onDemand"
                  @update:model-value="o.onDemand = $event; save()"
                />
                <span class="pricing-block__toggle-label">Preço sob demanda</span>
                <InfoTooltip text="Marque se o preço é definido caso a caso (orçamento personalizado). Comum em consultoria, serviços B2B e projetos sob medida." />
              </div>
            </div>
          </div>

          <div v-if="o.onDemand" class="pricing-tiers__empty">
            Cobrança definida caso a caso (orçamento sob demanda).
          </div>

          <div v-else-if="!o.hasPlans" class="pricing-tiers__single">
            <BaseMoneyInput
              :model-value="(o.pricingTiers && o.pricingTiers[0] && o.pricingTiers[0].price) || ''"
              placeholder="Ex: 297"
              @update:model-value="ensureTiers(o); o.pricingTiers[0].name = ''; o.pricingTiers[0].price = $event; save()"
            />
          </div>

          <div v-else class="pricing-tiers">
            <div class="pricing-tiers__head">
              <span>Plano</span>
              <span>Preço</span>
              <span>% receita <InfoTooltip text="Quanto desta oferta vem deste plano. Ex: se 70% dos clientes são do plano Pro, coloque 70. A soma dos planos deve dar 100%." /></span>
              <span></span>
            </div>
            <div
              v-for="(t, ti) in (o.pricingTiers && o.pricingTiers.length ? o.pricingTiers : [{}])"
              :key="ti"
              class="pricing-tiers__item"
            >
              <div v-if="o.costsPerPlan && (t.marginPct !== '' && t.marginPct !== undefined)" class="tier-cost-badge">
                Margem <strong>{{ t.marginPct }}%</strong> · Markup <strong>{{ t.markupPct }}%</strong>
                <button type="button" class="tier-cost-badge__edit" @click="openCalculator(i)">editar custos</button>
              </div>
              <div class="pricing-tiers__row">
                <BaseInput
                  :model-value="t.name"
                  placeholder="Plano (ex: Básico, Pro)"
                  @update:model-value="ensureTiers(o); o.pricingTiers[ti].name = $event; save()"
                />
                <BaseMoneyInput
                  :model-value="t.price"
                  placeholder="Ex: 297"
                  @update:model-value="ensureTiers(o); o.pricingTiers[ti].price = $event; save()"
                />
                <div class="tier-pct">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    class="tier-pct__input"
                    :value="t.revenuePct"
                    placeholder="Ex: 40"
                    @input="ensureTiers(o); o.pricingTiers[ti].revenuePct = $event.target.value; save()"
                  />
                  <span class="tier-pct__suffix">%</span>
                </div>
                <BaseButton
                  variant="icon"
                  :disabled="(o.pricingTiers || []).length <= 1"
                  aria-label="Remover plano"
                  @click="removeTier(o, ti)"
                >×</BaseButton>
              </div>
            </div>
            <div v-if="(o.pricingTiers || []).length > 1" class="pricing-tiers__pct-sum">
              <span :class="{ 'is-ok': tiersPctSum(o) === 100, 'is-warn': tiersPctSum(o) !== 100 }">
                Soma: {{ tiersPctSum(o) }}%
                <span v-if="tiersPctSum(o) !== 100"> (ideal: 100%)</span>
              </span>
            </div>
            <BaseButton variant="add" size="sm" @click="addTier(o)">+ Adicionar plano</BaseButton>
          </div>
        </div>
        <BaseField>
          <template #label>
            % da receita
            <InfoTooltip text="Quanto esta oferta representa do seu faturamento total. Ex: se vende R$100k/mês e essa oferta gera R$60k, é 60%. A soma de todas as ofertas deve dar 100%." />
          </template>
          <BaseInput v-model="o.revenuePct" type="number" min="0" max="100" placeholder="Ex: 60" @update:model-value="save" />
        </BaseField>
        <BaseField>
          <template #label>
            % do esforço/tempo
            <InfoTooltip text="Quanto do tempo/atenção do time esta oferta consome (entrega, suporte, manutenção). Ex: se 30% das horas do time vão para ela, é 30%. A soma deve dar 100%. Usado para calcular eficiência (receita/esforço) e identificar produtos que sangram esforço." />
          </template>
          <BaseInput v-model="o.effortPct" type="number" min="0" max="100" placeholder="Ex: 30" @update:model-value="save" />
        </BaseField>
        <BaseField>
          <template #label>
            % margem
            <InfoTooltip text="Margem de lucro = (Preço − Custo) ÷ Preço × 100. Ex: vende a R$100 e custa R$55 para entregar → margem 45%. Pode ser negativa se opera no prejuízo." />
          </template>
          <div class="input-with-action">
            <BaseInput v-model="o.marginPct" type="number" min="-100" max="100" placeholder="Ex: 45" @update:model-value="save" />
            <button
              type="button"
              class="btn-calc"
              title="Calcular margem a partir dos custos"
              aria-label="Calcular margem"
              @click="openCalculator(i)"
            >🧮</button>
          </div>
        </BaseField>
        <BaseField>
          <template #label>
            % markup
            <InfoTooltip text="Markup = (Preço − Custo) ÷ Custo × 100. Quanto você adiciona em cima do custo. Ex: custo R$30, preço R$100 → markup 233%. Diferente de margem: markup pode passar de 100%." />
          </template>
          <div class="input-with-action">
            <BaseInput v-model="o.markupPct" type="number" min="-100" placeholder="Ex: 82" @update:model-value="save" />
            <BaseButton
              variant="ghost"
              class="btn-calc"
              title="Calcular markup a partir dos custos"
              aria-label="Calcular markup"
              @click="openCalculator(i)"
            >🧮</BaseButton>
          </div>
        </BaseField>
      </FormGrid>
    </div>

    <BaseButton
      variant="add"
      :disabled="(p.offerings || []).length >= MAX_OFFERINGS"
      @click="addOffering"
    >+ Adicionar Oferta</BaseButton>
    <p v-if="(p.offerings || []).length >= MAX_OFFERINGS" class="muted" style="font-size:12px; margin:6px 0 0">
      Limite de {{ MAX_OFFERINGS }} ofertas para manter a análise de IA enxuta e barata.
    </p>

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
          <div class="big">{{ analysis.stars.map(s => s.name).join(', ') || 'Nenhuma' }}</div>
          <div class="desc">eficiência ≥ 1.2</div>
        </div>
        <div class="dash-tile">
          <h4>Sangrias</h4>
          <div class="big">{{ analysis.bleeders.map(b => b.name).join(', ') || 'Nenhuma' }}</div>
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

    <CostCalculatorModal
      v-if="calcOffering"
      :offering="calcOffering"
      @close="closeCalculator"
      @apply="applyCalculator"
      @auto-save="writeCalculator"
    />
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tokens' as t;

.pricing-block {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  gap: t.$space-3;

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: t.$space-3;
    flex-wrap: wrap;
  }

  &__title {
    font-size: t.$font-size-sm;
    font-weight: 600;
    color: t.$color-text;
  }

  &__toggles {
    display: inline-flex;
    align-items: center;
    gap: t.$space-4;
    flex-wrap: wrap;
  }

  &__toggle {
    display: inline-flex;
    align-items: center;
    gap: t.$space-2;
    font-size: t.$font-size-sm;
    color: t.$color-text-light;

    &.is-disabled .pricing-block__toggle-label { opacity: 0.5; cursor: not-allowed; }
  }

  &__toggle-label {
    user-select: none;
  }
}

.pricing-tiers {
  display: flex;
  flex-direction: column;
  gap: t.$space-2;

  &__head {
    display: grid;
    grid-template-columns: 1fr 1fr 90px auto;
    gap: t.$space-2;
    font-size: t.$font-size-xs;
    text-transform: uppercase;
    color: t.$color-text-light;
    font-weight: t.$font-weight-semi;
    padding: 0 t.$space-1;
    align-items: center;
  }

  &__row {
    display: grid;
    grid-template-columns: 1fr 1fr 90px auto;
    gap: t.$space-2;
    align-items: center;
  }

  &__item {
    display: flex;
    flex-direction: column;
    gap: t.$space-1;
  }

  &__pct-sum {
    font-size: t.$font-size-xs;
    padding: 0 t.$space-1;

    .is-ok { color: #16a34a; font-weight: t.$font-weight-semi; }
    .is-warn { color: t.$color-warning; font-weight: t.$font-weight-semi; }
  }

  &__empty {
    padding: t.$space-3;
    background: t.$color-bg-soft;
    border: 1px dashed t.$color-border;
    border-radius: t.$radius-md;
    color: t.$color-text-light;
    font-size: t.$font-size-sm;
    font-style: italic;
  }
}

.tier-cost-badge {
  display: inline-flex;
  align-items: center;
  gap: t.$space-2;
  font-size: t.$font-size-xs;
  color: t.$color-text-light;
  background: t.$color-primary-soft;
  border: 1px solid t.$color-primary;
  border-radius: t.$radius-md;
  padding: t.$space-1 t.$space-3;

  strong { color: t.$color-text; }

  &__edit {
    margin-left: t.$space-1;
    background: none;
    border: none;
    color: t.$color-primary;
    font-size: t.$font-size-xs;
    cursor: pointer;
    padding: 0;
    text-decoration: underline;

    &:hover { opacity: 0.75; }
  }
}

.tier-pct {
  display: flex;
  align-items: stretch;
  border: 1px solid t.$color-border;
  border-radius: t.$radius-md;
  background: t.$color-surface;
  overflow: hidden;
  transition: border-color 0.2s, box-shadow 0.2s;

  &:focus-within {
    @include t.focus-ring;
  }

  &__input {
    flex: 1;
    width: 100%;
    min-width: 0;
    border: 0;
    outline: 0;
    background: transparent;
    color: t.$color-text;
    font-family: inherit;
    padding: t.$space-2 t.$space-2;
    font-size: t.$font-size-sm;

    &::-webkit-inner-spin-button,
    &::-webkit-outer-spin-button { -webkit-appearance: none; }
  }

  &__suffix {
    display: flex;
    align-items: center;
    padding: 0 t.$space-2;
    background: t.$color-bg-soft;
    border-left: 1px solid t.$color-border;
    color: t.$color-text-light;
    font-size: t.$font-size-sm;
    font-weight: t.$font-weight-semi;
    user-select: none;
  }
}

.input-with-action {
  display: flex;
  gap: t.$space-2;
  align-items: stretch;

  > :first-child { flex: 1; }
}

.btn-calc.btn-calc {
  padding: 0 t.$space-3;
  background: t.$color-bg-soft;
  border: 1px solid t.$color-border;
  font-size: t.$font-size-md;

  &:hover:not(:disabled) {
    background: t.$color-primary-soft;
    border-color: t.$color-primary;
    color: t.$color-text;
  }
}

@include t.respond-down(t.$bp-md) {
  .pricing-tiers__head { display: none; }

  .pricing-tiers__row {
    grid-template-columns: 1fr 90px auto;
    grid-template-rows: auto auto;

    :first-child { grid-column: 1 / -1; }
  }
}
</style>
