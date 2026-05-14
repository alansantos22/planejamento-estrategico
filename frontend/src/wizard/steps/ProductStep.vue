<script setup>
import { computed, ref } from 'vue'
import { usePlanStore } from '@/stores/plan'
import { productFocusAnalysis } from '@/lib/scoring'
import BaseField from '@/components/common/BaseField.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import BaseMoneyInput from '@/components/common/BaseMoneyInput.vue'
import BaseTextarea from '@/components/common/BaseTextarea.vue'
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

function save() { store.save() }

function addOffering() {
  p.offerings = p.offerings || []
  p.offerings.push({
    name: '',
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
function applyCalculator(result) {
  const o = calcOffering.value
  if (!o) return
  o.marginPct = result.marginPct
  o.markupPct = result.markupPct
  o.costs = result.costs
  save()
  closeCalculator()
}
</script>

<template>
  <div>
    <HelpBox>
      <strong>Regra:</strong> %receita e %esforço somam 100% no total.
      O sistema calcula <strong>eficiência</strong> (receita/esforço) e aponta produtos que <em>sangram</em> esforço sem retornar.
    </HelpBox>

    <div v-for="(o, i) in p.offerings" :key="i" class="offering-card">
      <h5>Oferta #{{ i + 1 }} <button class="btn-icon" @click="removeOffering(i)">×</button></h5>
      <FormGrid :cols="2">
        <BaseField label="Nome da oferta" :span="2">
          <BaseInput v-model="o.name" placeholder="Ex: Plano Pro / Consultoria mensal" @update:model-value="save" />
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
                <label>
                  <input
                    type="checkbox"
                    :checked="!!o.hasPlans"
                    :disabled="!!o.onDemand"
                    @change="o.hasPlans = $event.target.checked; ensureTiers(o); save()"
                  />
                  Vendido em planos
                </label>
                <InfoTooltip text="Marque se a oferta tem múltiplos níveis (ex: Básico, Pro, Enterprise). Para cada plano você informa nome e preço." />
              </div>
              <div class="pricing-block__toggle">
                <label>
                  <input
                    type="checkbox"
                    :checked="!!o.onDemand"
                    @change="o.onDemand = $event.target.checked; save()"
                  />
                  Preço sob demanda
                </label>
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
            <div
              v-for="(t, ti) in (o.pricingTiers && o.pricingTiers.length ? o.pricingTiers : [{}])"
              :key="ti"
              class="pricing-tiers__row"
            >
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
              <button
                type="button"
                class="btn-icon"
                :disabled="(o.pricingTiers || []).length <= 1"
                @click="removeTier(o, ti)"
                aria-label="Remover plano"
              >×</button>
            </div>
            <button type="button" class="btn-add btn-add--sm" @click="addTier(o)">+ Adicionar plano</button>
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
            <button
              type="button"
              class="btn-calc"
              title="Calcular markup a partir dos custos"
              aria-label="Calcular markup"
              @click="openCalculator(i)"
            >🧮</button>
          </div>
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
          <div class="big">{{ analysis.stars.map(s => s.name).join(', ') || 'n/d' }}</div>
          <div class="desc">eficiência ≥ 1.2</div>
        </div>
        <div class="dash-tile">
          <h4>Sangrias</h4>
          <div class="big">{{ analysis.bleeders.map(b => b.name).join(', ') || 'n/d' }}</div>
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

    label {
      display: inline-flex;
      align-items: center;
      gap: t.$space-2;
      cursor: pointer;
      user-select: none;
    }

    input { cursor: pointer; }
    input:disabled { cursor: not-allowed; }

    &.is-disabled label { opacity: 0.5; cursor: not-allowed; }
  }
}

.pricing-tiers {
  display: flex;
  flex-direction: column;
  gap: t.$space-2;

  &__row {
    display: grid;
    grid-template-columns: 1fr 1fr auto;
    gap: t.$space-2;
    align-items: center;
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

.btn-add--sm {
  align-self: flex-start;
  font-size: t.$font-size-sm;
  padding: t.$space-2 t.$space-3;
}

.input-with-action {
  display: flex;
  gap: t.$space-2;
  align-items: stretch;

  > :first-child { flex: 1; }
}

.btn-calc {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 t.$space-3;
  background: t.$color-bg-soft;
  border: 1px solid t.$color-border;
  border-radius: t.$radius-md;
  cursor: pointer;
  font-size: t.$font-size-md;
  transition: background 0.15s, border-color 0.15s;

  &:hover {
    background: #fef3e0;
    border-color: t.$color-primary;
  }

  &:focus-visible { @include t.focus-ring; }
}

@include t.respond-down(t.$bp-md) {
  .pricing-tiers__row {
    grid-template-columns: 1fr auto;

    :first-child { grid-column: 1 / -1; }
  }
}
</style>
