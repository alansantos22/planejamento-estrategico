<script setup>
import { computed } from 'vue'
import { usePlanStore } from '@/stores/plan'
import { forecastProjection } from '@/lib/scoring'
import { formatMoney } from '@/lib/formatters'
import BaseField from '@/components/common/BaseField.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseMoneyInput from '@/components/common/BaseMoneyInput.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import BaseSwitch from '@/components/common/BaseSwitch.vue'
import FormGrid from '@/components/common/FormGrid.vue'
import HelpBox from '@/components/common/HelpBox.vue'
import InfoTooltip from '@/components/common/InfoTooltip.vue'

const MAX_PROJECTIONS = 3
const COLORS = ['#f97316', '#22d3ee', '#a78bfa']

const store = usePlanStore()
const f = store.plan.forecast
if (!Array.isArray(f.perProduct)) f.perProduct = []
if (!f.mode) f.mode = 'single'
f.perProduct.forEach((it) => { if (!it.billingType) it.billingType = 'recorrente' })

const scenarioOptions = [
  { value: 'pessimista', label: 'Pessimista' },
  { value: 'realista', label: 'Realista' },
  { value: 'otimista', label: 'Otimista' }
]

const isPerProduct = computed({
  get: () => f.mode === 'perProduct',
  set: (v) => { f.mode = v ? 'perProduct' : 'single'; save() }
})

const productOptions = computed(() => {
  const fromProducts = (store.plan.product?.offerings || [])
    .map((o) => o.name || o.title || '')
    .filter(Boolean)
  const fromFunnels = (store.plan.funnel?.perProduct || [])
    .map((s) => s.productName || '')
    .filter(Boolean)
  return Array.from(new Set([...fromProducts, ...fromFunnels]))
})

const projection = computed(() => forecastProjection(store.plan))
const chartMax = computed(() => {
  const months = projection.value.months
  return months.length ? Math.max(...months.map((m) => m.revenue), 1) : 1
})
const baseMax = computed(() => {
  const months = projection.value.months
  return months.length ? Math.max(...months.map((m) => m.activeBase), 1) : 1
})

function save() { store.save() }

function addProjection() {
  if (f.perProduct.length >= MAX_PROJECTIONS) return
  f.perProduct.push({
    productName: '',
    billingType: 'recorrente',
    avgTicket: '',
    currentClients: '',
    growthRatePct: '',
    retentionPct: ''
  })
  save()
}

function removeProjection(i) {
  f.perProduct.splice(i, 1)
  save()
}

// Detecta cobrança única a partir do modelo de cobrança cadastrado no produto.
const ONE_TIME_BILLINGS = ['unico', 'por-projeto']

function onProductSelected(item) {
  const offering = (store.plan.product?.offerings || []).find(
    (o) => (o.name || o.title) === item.productName
  )
  if (offering?.billing) {
    item.billingType = ONE_TIME_BILLINGS.includes(offering.billing) ? 'unico' : 'recorrente'
  }
  const sub = (store.plan.funnel?.perProduct || []).find((s) => s.productName === item.productName)
  if (sub && Array.isArray(sub.stages) && sub.stages.length && !item.currentClients) {
    const last = sub.stages[sub.stages.length - 1]
    if (last && last.count !== '' && last.count != null) item.currentClients = last.count
  }
  save()
}
</script>

<template>
  <div>
    <HelpBox>
      <strong>Cenários:</strong> pessimista (metade do crescimento), realista (esperado) e
      otimista (1.5x). Baseado nos dados do funil e ticket médio.
    </HelpBox>

    <div class="forecast-mode-switch">
      <BaseSwitch v-model="isPerProduct" />
      <div>
        <strong>{{ isPerProduct ? 'Projeção por produto' : 'Projeção única' }}</strong>
        <div class="muted" style="font-size:12px">
          {{ isPerProduct
            ? 'Cada produto tem sua própria projeção. O gráfico empilha as receitas por produto.'
            : 'Uma única projeção agregada, a partir do funil e do ticket médio.' }}
        </div>
      </div>
    </div>

    <!-- Modo único -->
    <div v-if="!isPerProduct" class="card">
      <FormGrid :cols="2">
        <BaseField>
          <template #label>
            Crescimento mensal esperado (%)
            <InfoTooltip text="Quanto sua base de clientes/receita cresce a cada mês, em %. Ex: 8 significa que cada mês entra 8% a mais. É o crescimento bruto, antes de descontar quem sai." />
          </template>
          <BaseInput v-model="f.growthRatePct" type="number" step="0.1" placeholder="Ex: 8" @update:model-value="save" />
        </BaseField>
        <BaseField>
          <template #label>
            Retenção mensal (%)
            <InfoTooltip text="Quantos clientes continuam de um mês para o outro, em %. Ex: 92 significa que 92% permanecem e 8% cancelam — esse 8% é o churn (retenção = 100 − churn). Quanto maior, melhor." />
          </template>
          <BaseInput v-model="f.retentionPct" type="number" step="0.1" placeholder="Ex: 92" @update:model-value="save" />
        </BaseField>
        <BaseField>
          <template #label>
            Período (meses)
            <InfoTooltip text="Por quantos meses projetar a receita. Entre 3 e 36. O padrão é 12 (um ano)." />
          </template>
          <BaseInput v-model="f.months" type="number" min="3" max="36" @update:model-value="save" />
        </BaseField>
        <BaseField>
          <template #label>
            Cenário ativo
            <InfoTooltip text="Qual projeção exibir: pessimista (metade do crescimento), realista (o crescimento informado) ou otimista (1.5x o crescimento)." />
          </template>
          <BaseSelect v-model="f.scenario" :options="scenarioOptions" @update:model-value="save" />
        </BaseField>
      </FormGrid>
    </div>

    <!-- Modo por produto -->
    <div v-else class="card">
      <FormGrid :cols="2">
        <BaseField>
          <template #label>
            Período (meses)
            <InfoTooltip text="Por quantos meses projetar a receita. Entre 3 e 36. O padrão é 12 (um ano). Vale para todas as projeções." />
          </template>
          <BaseInput v-model="f.months" type="number" min="3" max="36" @update:model-value="save" />
        </BaseField>
        <BaseField>
          <template #label>
            Cenário ativo
            <InfoTooltip text="Qual projeção exibir: pessimista (metade do crescimento), realista (o crescimento informado) ou otimista (1.5x o crescimento)." />
          </template>
          <BaseSelect v-model="f.scenario" :options="scenarioOptions" @update:model-value="save" />
        </BaseField>
      </FormGrid>

      <div v-for="(item, i) in f.perProduct" :key="i" class="projection-card">
        <div class="projection-card__head">
          <span class="projection-card__dot" :style="{ background: COLORS[i % COLORS.length] }"></span>
          <select class="input" v-model="item.productName" @change="onProductSelected(item)">
            <option value="">Selecione um produto…</option>
            <option v-for="opt in productOptions" :key="opt" :value="opt">{{ opt }}</option>
          </select>
          <button class="btn-icon" title="Remover projeção" @click="removeProjection(i)">×</button>
        </div>

        <div class="projection-card__billing">
          <BaseSwitch
            :model-value="item.billingType === 'unico'"
            @update:model-value="item.billingType = $event ? 'unico' : 'recorrente'; save()"
          />
          <span>Pagamento único <small class="muted">(cliente paga 1x — sem receita recorrente)</small></span>
          <InfoTooltip text="Marque se o produto é cobrado uma única vez (ex: mentoria fechada, projeto, curso). A receita conta apenas no mês da venda — não acumula base nem usa retenção. Detectado automaticamente pelo modelo de cobrança do produto." />
        </div>

        <FormGrid :cols="2">
          <BaseField>
            <template #label>
              Ticket médio
              <InfoTooltip text="Valor que cada cliente paga neste produto. Para recorrente, é o valor mensal; para pagamento único, é o valor total da venda." />
            </template>
            <BaseMoneyInput v-model="item.avgTicket" placeholder="350" @update:model-value="save" />
          </BaseField>
          <BaseField>
            <template #label>
              Novos clientes / mês
              <InfoTooltip text="Quantos clientes novos você fecha por mês neste produto. Ex: se vende ~3 mentorias/mês, coloque 3. É a base da projeção." />
            </template>
            <BaseInput v-model="item.currentClients" type="number" placeholder="Ex: 3" @update:model-value="save" />
          </BaseField>
          <BaseField>
            <template #label>
              Crescimento mensal (%)
              <InfoTooltip text="Quanto as vendas mensais deste produto crescem a cada mês, em %. Ex: 8 = vende 8% a mais de clientes novos por mês." />
            </template>
            <BaseInput v-model="item.growthRatePct" type="number" step="0.1" placeholder="Ex: 8" @update:model-value="save" />
          </BaseField>
          <BaseField v-if="item.billingType !== 'unico'">
            <template #label>
              Retenção mensal (%)
              <InfoTooltip text="Quantos clientes deste produto continuam de um mês para o outro. Ex: 92 = 92% permanecem, 8% cancelam (churn). Não se aplica a pagamento único." />
            </template>
            <BaseInput v-model="item.retentionPct" type="number" step="0.1" placeholder="Ex: 92" @update:model-value="save" />
          </BaseField>
        </FormGrid>
      </div>

      <button
        class="btn-add"
        :disabled="f.perProduct.length >= MAX_PROJECTIONS"
        @click="addProjection"
      >+ Adicionar projeção</button>
      <p v-if="f.perProduct.length >= MAX_PROJECTIONS" class="muted" style="font-size:12px; margin:6px 0 0">
        Limite de {{ MAX_PROJECTIONS }} projeções para manter a análise de IA enxuta e barata.
      </p>
    </div>

    <!-- Resultado -->
    <div class="card">
      <div v-if="projection.months.length">
        <div class="dash-tile" style="margin-bottom:14px">
          <h4>Receita acumulada ({{ projection.scenario }})</h4>
          <div class="big">{{ formatMoney(projection.totalRevenue) }}</div>
          <div class="desc">em {{ projection.months.length }} meses</div>
        </div>

        <div v-if="projection.perProduct && projection.perProduct.length" class="projection-breakdown">
          <div v-for="(pp, pi) in projection.perProduct" :key="pp.name" class="projection-breakdown__item">
            <span class="projection-breakdown__label">
              <span class="projection-card__dot" :style="{ background: COLORS[pi % COLORS.length] }"></span>
              {{ pp.name }}
              <small>{{ pp.billingType === 'unico' ? 'pgto único' : 'recorrente' }}</small>
            </span>
            <strong>{{ formatMoney(pp.totalRevenue) }}</strong>
          </div>
        </div>

        <!-- ===== Gráfico de receita ===== -->
        <h4 class="chart-title">Receita por mês</h4>
        <div v-if="projection.perProduct && projection.perProduct.length" class="forecast-chart">
          <div v-for="(m, mi) in projection.months" :key="m.month" class="fc-bar">
            <span class="fc-tip">
              <strong>Mês {{ m.month }}</strong>
              <span class="fc-tip__total">{{ formatMoney(m.revenue) }}</span>
              <span v-for="(pp, pi) in projection.perProduct" :key="pi" class="fc-tip__row">
                <i :style="{ background: COLORS[pi % COLORS.length] }"></i>
                {{ pp.name }}: {{ formatMoney(pp.months[mi].revenue) }}
              </span>
            </span>
            <div class="fc-stack" :style="{ height: ((m.revenue / chartMax) * 100) + '%' }">
              <div
                v-for="(pp, pi) in projection.perProduct"
                :key="pi"
                class="fc-seg"
                :style="{
                  flexGrow: pp.months[mi].revenue,
                  background: COLORS[pi % COLORS.length]
                }"
              ></div>
            </div>
            <span class="fc-label">{{ m.month }}</span>
          </div>
        </div>
        <div v-else class="forecast-chart">
          <div v-for="m in projection.months" :key="m.month" class="fc-bar">
            <span class="fc-tip">
              <strong>Mês {{ m.month }}</strong>
              {{ formatMoney(m.revenue) }}
              <small>{{ m.activeBase }} clientes</small>
            </span>
            <div class="fc-fill" :style="{ height: ((m.revenue / chartMax) * 100) + '%' }"></div>
            <span class="fc-label">{{ m.month }}</span>
          </div>
        </div>

        <!-- ===== Gráfico de assinantes / clientes ativos ===== -->
        <div class="chart-head">
          <h4 class="chart-title">Assinantes / clientes ativos por mês</h4>
          <span class="chart-final">
            {{ projection.months[projection.months.length - 1].activeBase.toLocaleString('pt-BR') }}
            no mês {{ projection.months.length }}
          </span>
        </div>
        <div v-if="projection.perProduct && projection.perProduct.length" class="forecast-chart">
          <div v-for="(m, mi) in projection.months" :key="m.month" class="fc-bar">
            <span class="fc-tip">
              <strong>Mês {{ m.month }}</strong>
              <span class="fc-tip__total">{{ m.activeBase.toLocaleString('pt-BR') }} clientes</span>
              <span v-for="(pp, pi) in projection.perProduct" :key="pi" class="fc-tip__row">
                <i :style="{ background: COLORS[pi % COLORS.length] }"></i>
                {{ pp.name }}: {{ pp.months[mi].activeBase.toLocaleString('pt-BR') }}
              </span>
            </span>
            <div class="fc-stack" :style="{ height: ((m.activeBase / baseMax) * 100) + '%' }">
              <div
                v-for="(pp, pi) in projection.perProduct"
                :key="pi"
                class="fc-seg"
                :style="{
                  flexGrow: pp.months[mi].activeBase,
                  background: COLORS[pi % COLORS.length]
                }"
              ></div>
            </div>
            <span class="fc-label">{{ m.month }}</span>
          </div>
        </div>
        <div v-else class="forecast-chart">
          <div v-for="m in projection.months" :key="m.month" class="fc-bar">
            <span class="fc-tip">
              <strong>Mês {{ m.month }}</strong>
              {{ m.activeBase.toLocaleString('pt-BR') }} clientes
            </span>
            <div class="fc-fill fc-fill--base" :style="{ height: ((m.activeBase / baseMax) * 100) + '%' }"></div>
            <span class="fc-label">{{ m.month }}</span>
          </div>
        </div>
      </div>
      <div v-else class="alert warning">
        ⚠ {{ isPerProduct
          ? 'Adicione ao menos uma projeção com ticket e novos clientes/mês.'
          : 'Preencha o funil (ticket + clientes atuais) para projetar.' }}
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tokens' as t;

.forecast-mode-switch {
  display: flex;
  align-items: flex-start;
  gap: t.$space-3;
  padding: t.$space-3;
  background: t.$color-bg-soft;
  border: 1px solid t.$color-border;
  border-radius: t.$radius-md;
  margin-bottom: t.$space-3;
}

.projection-card {
  border: 1px solid t.$color-border;
  border-radius: t.$radius-md;
  padding: t.$space-3;
  margin-top: t.$space-3;
  background: t.$color-bg-soft;

  &__head {
    display: flex;
    gap: t.$space-2;
    align-items: center;
    margin-bottom: t.$space-2;

    > select { flex: 1; font-weight: 600; }
  }

  &__dot {
    flex: none;
    width: 12px;
    height: 12px;
    border-radius: 50%;
  }

  &__billing {
    display: flex;
    align-items: center;
    gap: t.$space-2;
    margin-bottom: t.$space-3;
    font-size: t.$font-size-sm;
    color: t.$color-text;
  }
}

.projection-breakdown {
  display: flex;
  flex-wrap: wrap;
  gap: t.$space-2;
  margin-bottom: t.$space-3;

  &__item {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: t.$space-2 t.$space-3;
    background: t.$color-bg-soft;
    border: 1px solid t.$color-border;
    border-radius: t.$radius-sm;
    font-size: t.$font-size-xs;
    color: t.$color-text-light;

    strong { color: t.$color-text; font-size: t.$font-size-sm; }
  }

  &__label {
    display: flex;
    align-items: center;
    gap: t.$space-1;

    small {
      padding: 0 4px;
      border-radius: t.$radius-sm;
      background: t.$color-surface;
      border: 1px solid t.$color-border;
    }
  }
}

// ---- Chart ----
.chart-title {
  margin: t.$space-4 0 0;
  font-size: t.$font-size-sm;
  color: t.$color-text-light;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.chart-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: t.$space-2;
  flex-wrap: wrap;
}

.chart-final {
  font-size: t.$font-size-sm;
  font-weight: t.$font-weight-semi;
  color: t.$color-text;
}

.fc-bar {
  position: relative;
}

.fc-fill--base {
  background: linear-gradient(180deg, #22d3ee, #3b82f6);
}

.fc-stack {
  width: 100%;
  min-height: 2px;
  display: flex;
  flex-direction: column-reverse;
  border-radius: t.$radius-xs t.$radius-xs 0 0;
  overflow: hidden;
  transition: height 0.4s ease;
}

.fc-seg {
  width: 100%;
  flex-basis: 0;
  min-height: 0;
}

.fc-tip {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%) translateY(-4px);
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: t.$space-2 t.$space-3;
  background: #1f2937;
  color: #fff;
  border-radius: t.$radius-md;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25);
  font-size: t.$font-size-sm;
  white-space: nowrap;
  text-align: left;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity 0.15s, transform 0.15s, visibility 0.15s;
  z-index: 50;

  strong { font-weight: t.$font-weight-semi; }
  small { color: rgba(255, 255, 255, 0.65); }

  &__total { color: rgba(255, 255, 255, 0.85); }

  &__row {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: t.$font-size-xs;

    i {
      width: 8px;
      height: 8px;
      border-radius: 2px;
      flex: none;
    }
  }

  &::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 5px solid transparent;
    border-top-color: #1f2937;
  }
}

.fc-bar:hover .fc-tip {
  opacity: 1;
  visibility: visible;
  transform: translateX(-50%) translateY(0);
}
</style>
