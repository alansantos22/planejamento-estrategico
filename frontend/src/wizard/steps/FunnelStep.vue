<script setup>
import { computed } from 'vue'
import { usePlanStore } from '@/stores/plan'
import { funnelAnalysis } from '@/lib/scoring'
import { formatMoney } from '@/lib/formatters'
import { AlertTriangle, Search, X } from 'lucide-vue-next'
import BaseField from '@/components/common/BaseField.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseMoneyInput from '@/components/common/BaseMoneyInput.vue'
import BaseSwitch from '@/components/common/BaseSwitch.vue'
import FormGrid from '@/components/common/FormGrid.vue'
import HelpBox from '@/components/common/HelpBox.vue'
import AiHelperButton from '@/components/ai/AiHelperButton.vue'
import PartnerTip from '@/components/common/PartnerTip.vue'
import { FOORGE } from '@/lib/partners'

const store = usePlanStore()
const f = store.plan.funnel
if (!Array.isArray(f.perProduct)) f.perProduct = []
if (!f.mode) f.mode = 'single'

const isPerProduct = computed({
  get: () => f.mode === 'perProduct',
  set: (v) => { f.mode = v ? 'perProduct' : 'single'; save() }
})

const productOptions = computed(() => {
  const fromProducts = (store.plan.product?.offerings || [])
    .map((o) => o.name || o.title || '')
    .filter(Boolean)
  const fromSubFunnels = (f.perProduct || [])
    .map((s) => s.productName || '')
    .filter(Boolean)
  return Array.from(new Set([...fromProducts, ...fromSubFunnels]))
})

const productByName = computed(() => {
  const map = {}
  ;(store.plan.product?.offerings || []).forEach((o) => {
    const key = o.name || o.title || ''
    if (key) map[key] = o
  })
  return map
})

const TYPE_LABEL = {
  saas: 'SaaS / Software',
  servico: 'Serviço',
  consultoria: 'Consultoria',
  infoproduto: 'Infoproduto / Curso',
  'produto-fisico': 'Produto físico',
  assinatura: 'Assinatura',
  marketplace: 'Marketplace / Comissão',
  outro: 'Outro'
}

const BILLING_LABEL = {
  unico: 'pagamento único',
  mensal: 'recorrente mensal',
  anual: 'recorrente anual',
  'por-uso': 'por uso',
  'por-projeto': 'por projeto'
}

function lookupProduct(name) {
  return productByName.value[name] || null
}

function priceSummary(o) {
  if (!o) return ''
  if (o.onDemand) return 'preço sob demanda'
  if (o.hasPlans && Array.isArray(o.pricingTiers) && o.pricingTiers.length) {
    const prices = o.pricingTiers.map((t) => t.price).filter((p) => p !== '' && p != null)
    if (!prices.length) return ''
    const nums = prices.map(Number).filter((n) => !isNaN(n))
    if (!nums.length) return prices.join(' / ')
    const min = Math.min(...nums), max = Math.max(...nums)
    return min === max ? `R$ ${min}` : `R$ ${min} – ${max}`
  }
  const single = o.pricingTiers?.[0]?.price
  return single ? `R$ ${single}` : ''
}

function onProductSelected(sub) {
  const o = lookupProduct(sub.productName)
  if (!o) return
  if (!sub.avgTicketEstimate) {
    const summary = priceSummary(o)
    if (summary) sub.avgTicketEstimate = summary
  }
  save()
}

const analysis = computed(() => funnelAnalysis(store.plan.funnel))

const ROLE_LABEL = { TOF: 'Topo de funil', MOF: 'Meio de funil', BOF: 'Fundo de funil' }
const ROLE_VARIANT = { TOF: 'info', MOF: 'warning', BOF: 'success' }

function save() { store.save() }

// Ao preencher Qtd + % de uma etapa, calcula a Qtd das etapas seguintes em cascata.
function propagateStages(stages, fromIdx) {
  for (let i = fromIdx; i < stages.length - 1; i++) {
    const count = Number(stages[i].count)
    const conv = Number(stages[i].conversionToNext)
    const hasCount = stages[i].count !== '' && stages[i].count != null && !isNaN(count)
    const hasConv = stages[i].conversionToNext !== '' && stages[i].conversionToNext != null && !isNaN(conv)
    if (!hasCount || !hasConv) break
    stages[i + 1].count = Math.round(count * conv / 100)
  }
}

function onStageChange(stages, i) {
  propagateStages(stages, i)
  save()
}

function addStage() {
  const lastIdx = f.stages.length - 1
  f.stages.splice(lastIdx, 0, { name: 'Nova etapa', count: '', conversionToNext: '' })
  save()
}

function removeStage(i) {
  if (f.stages.length <= 2) { alert('Mantenha pelo menos 2 etapas.'); return }
  f.stages.splice(i, 1)
  save()
}

function addChannel() {
  f.channels = f.channels || []
  f.channels.push({ name: '', mixPct: '', costPerLead: '' })
  save()
}

function removeChannel(i) {
  f.channels.splice(i, 1)
  save()
}

const MAX_SUB_FUNNELS = 3

function addSubFunnel() {
  if (f.perProduct.length >= MAX_SUB_FUNNELS) return
  f.perProduct.push({
    productName: '',
    funnelRole: '',
    funnelRoleReason: '',
    avgTicketEstimate: '',
    bottleneck: '',
    playbook: '',
    upsellTo: '',
    crossSellTo: '',
    upsellNotes: '',
    stages: [
      { name: 'Topo', count: '', conversionToNext: '' },
      { name: 'Cliente', count: '', conversionToNext: null }
    ],
    channels: []
  })
  save()
}
function removeSubFunnel(i) { f.perProduct.splice(i, 1); save() }

function addSubStage(sub) {
  const lastIdx = sub.stages.length - 1
  sub.stages.splice(lastIdx, 0, { name: 'Nova etapa', count: '', conversionToNext: '' })
  save()
}
function removeSubStage(sub, i) {
  if (sub.stages.length <= 2) { alert('Mantenha pelo menos 2 etapas.'); return }
  sub.stages.splice(i, 1)
  save()
}
function addSubChannel(sub) {
  sub.channels = sub.channels || []
  sub.channels.push({ name: '', mixPct: '', costPerLead: '', rationale: '' })
  save()
}
function removeSubChannel(sub, i) { sub.channels.splice(i, 1); save() }
</script>

<template>
  <div>
    <HelpBox>
      <strong>Como funciona:</strong> preencha quantos passam por cada etapa hoje (opcional) e a
      <strong>taxa de conversão</strong> para a próxima. Defina o ticket médio e a meta mensal:
      o sistema diz <em>quantos visitantes você precisa</em>.
    </HelpBox>

    <div class="funnel-mode-switch">
      <BaseSwitch v-model="isPerProduct" />
      <div>
        <strong>{{ isPerProduct ? 'Múltiplos funis (1 por produto)' : 'Funil único' }}</strong>
        <div class="muted" style="font-size:12px">
          {{ isPerProduct
            ? 'Cada produto tem seu próprio funil, com etapas, canais, upsell e cross-sell entre eles.'
            : 'Um único funil agrega todos os produtos. Use se a dinâmica de venda é parecida.' }}
        </div>
      </div>
    </div>

    <AiHelperButton agent="salesFunnelArchitect" label="Montar funil sugerido para seu segmento" />

    <!-- Ticket, ciclo, meta -->
    <div class="card" style="margin-top:12px">
      <FormGrid :cols="2">
        <BaseField v-if="!isPerProduct" label="Ticket médio">
          <BaseMoneyInput v-model="f.avgTicket" placeholder="350" @update:model-value="save" />
        </BaseField>
        <BaseField v-if="!isPerProduct" label="Ciclo de venda (dias)">
          <BaseInput v-model="f.salesCycleDays" type="number" placeholder="Ex: 30" @update:model-value="save" />
        </BaseField>
        <BaseField :label="isPerProduct ? 'Meta de receita mensal (total)' : 'Meta de receita mensal'" :span="2">
          <BaseMoneyInput v-model="f.monthlyRevenueGoal" placeholder="100.000" @update:model-value="save" />
        </BaseField>
      </FormGrid>
      <p v-if="isPerProduct" class="muted" style="font-size:12px; margin: 8px 0 0">
        Em modo múltiplos funis, ticket médio e ciclo de venda ficam em cada sub-funil — esses campos globais não se aplicam.
      </p>
    </div>

    <!-- Etapas -->
    <div v-if="!isPerProduct" class="card">
      <h4 style="margin:0 0 10px">Etapas do funil</h4>
      <div v-for="(s, i) in f.stages" :key="i" class="stage-row">
        <input class="input" v-model="s.name" placeholder="Nome da etapa" @input="save" />
        <input class="input" type="number" v-model="s.count" placeholder="Qtd atual" @input="onStageChange(f.stages, i)" />
        <template v-if="i < f.stages.length - 1">
          <input class="input" type="number" min="0" max="100" v-model="s.conversionToNext" placeholder="% → próxima" @input="onStageChange(f.stages, i)" />
        </template>
        <div v-else class="muted" style="align-self:center">(final)</div>
        <button class="btn-icon" aria-label="Remover etapa" @click="removeStage(i)"><X :size="16" /></button>
      </div>
      <button class="btn-add" @click="addStage">+ Adicionar etapa</button>
    </div>

    <!-- Canais -->
    <div v-if="!isPerProduct" class="card">
      <h4 style="margin:0 0 10px">Canais de aquisição <small class="muted">(opcional)</small></h4>
      <div v-for="(ch, i) in (f.channels || [])" :key="i" class="channel-row">
        <input class="input" v-model="ch.name" placeholder="Ex: Google Ads / Indicação / Outbound" @input="save" />
        <input class="input" type="number" v-model="ch.mixPct" placeholder="% do mix" @input="save" />
        <input class="input" type="number" v-model="ch.costPerLead" placeholder="R$ / lead" @input="save" />
        <button class="btn-icon" aria-label="Remover canal" @click="removeChannel(i)"><X :size="16" /></button>
      </div>
      <button class="btn-add" @click="addChannel">+ Adicionar canal</button>
      <PartnerTip :href="FOORGE.whatsapp" cta="Conhecer o Foorge">
        Social media e mídia paga costumam ser o canal mais caro da lista — entre
        agência, tráfego e o tempo gasto produzindo conteúdo. Uma forma de baixar
        esse custo é automatizar o Instagram e as respostas no WhatsApp com IA, em
        vez de terceirizar.
      </PartnerTip>
    </div>

    <!-- Sub-funis por produto -->
    <div v-if="isPerProduct" class="card">
      <div class="sub-funnel-head">
        <h4 style="margin:0">Funil por produto</h4>
        <small class="muted">Cada produto tem dinâmica própria — TOF/MOF/BOF, etapas, canais e relações de upsell/cross-sell.</small>
      </div>

      <div v-for="(sub, si) in f.perProduct" :key="si" class="sub-funnel">
        <div class="sub-funnel__head">
          <select
            class="input sub-funnel__name"
            v-model="sub.productName"
            @change="onProductSelected(sub)"
          >
            <option value="">Selecione um produto cadastrado…</option>
            <option v-for="opt in productOptions" :key="opt" :value="opt">{{ opt }}</option>
          </select>
          <select class="input" v-model="sub.funnelRole" @change="save">
            <option value="">Papel no funil…</option>
            <option value="TOF">TOF — Topo (atração)</option>
            <option value="MOF">MOF — Meio (qualificação)</option>
            <option value="BOF">BOF — Fundo (alta intenção)</option>
          </select>
          <span v-if="sub.funnelRole" class="role-tag" :data-role="sub.funnelRole">
            {{ ROLE_LABEL[sub.funnelRole] }}
          </span>
          <button class="btn-icon" aria-label="Remover sub-funil" @click="removeSubFunnel(si)" title="Remover sub-funil"><X :size="16" /></button>
        </div>

        <div v-if="sub.funnelRoleReason" class="muted sub-funnel__reason">
          {{ sub.funnelRoleReason }}
        </div>

        <div v-if="lookupProduct(sub.productName)" class="product-card">
          <div class="product-card__meta">
            <span v-if="lookupProduct(sub.productName).type" class="product-tag">
              {{ TYPE_LABEL[lookupProduct(sub.productName).type] || lookupProduct(sub.productName).type }}
            </span>
            <span v-if="lookupProduct(sub.productName).billing" class="product-tag">
              {{ BILLING_LABEL[lookupProduct(sub.productName).billing] || lookupProduct(sub.productName).billing }}
            </span>
            <span v-if="priceSummary(lookupProduct(sub.productName))" class="product-tag product-tag--price">
              {{ priceSummary(lookupProduct(sub.productName)) }}
            </span>
            <span v-if="lookupProduct(sub.productName).marginPct" class="product-tag">
              margem {{ lookupProduct(sub.productName).marginPct }}%
            </span>
            <span v-if="lookupProduct(sub.productName).revenuePct" class="product-tag">
              {{ lookupProduct(sub.productName).revenuePct }}% da receita
            </span>
          </div>
          <p v-if="lookupProduct(sub.productName).description" class="product-card__desc">
            {{ lookupProduct(sub.productName).description }}
          </p>
        </div>
        <div v-else-if="sub.productName" class="alert warning" style="font-size:12px; padding: 6px 10px; margin-top: 8px">
          <AlertTriangle :size="14" /> "{{ sub.productName }}" não está cadastrado no passo Produto.
        </div>

        <FormGrid :cols="2" style="margin-top:8px">
          <BaseField label="Ticket estimado">
            <BaseInput v-model="sub.avgTicketEstimate" placeholder="Ex: R$ 50/mês" @update:model-value="save" />
          </BaseField>
          <BaseField label="Gargalo esperado">
            <BaseInput v-model="sub.bottleneck" placeholder="Onde costuma travar" @update:model-value="save" />
          </BaseField>
        </FormGrid>

        <div class="sub-funnel__section">
          <strong>Relação com outros produtos</strong>
          <FormGrid :cols="2">
            <BaseField label="Upsell para">
              <select class="input" v-model="sub.upsellTo" @change="save">
                <option value="">— nenhum —</option>
                <option v-for="opt in productOptions.filter(o => o !== sub.productName)" :key="opt" :value="opt">
                  {{ opt }}
                </option>
              </select>
            </BaseField>
            <BaseField label="Cross-sell para">
              <select class="input" v-model="sub.crossSellTo" @change="save">
                <option value="">— nenhum —</option>
                <option v-for="opt in productOptions.filter(o => o !== sub.productName)" :key="opt" :value="opt">
                  {{ opt }}
                </option>
              </select>
            </BaseField>
          </FormGrid>
          <BaseField label="Notas sobre upsell/cross-sell">
            <BaseInput
              v-model="sub.upsellNotes"
              placeholder="Ex: clientes do Foorge que ficam 3 meses recebem oferta da Mentoria"
              @update:model-value="save"
            />
          </BaseField>
        </div>

        <div class="sub-funnel__section">
          <strong>Etapas</strong>
          <div v-for="(s, i) in sub.stages" :key="i" class="stage-row">
            <input class="input" v-model="s.name" placeholder="Nome da etapa" @input="save" />
            <input class="input" type="number" v-model="s.count" placeholder="Qtd atual" @input="onStageChange(sub.stages, i)" />
            <input
              v-if="i < sub.stages.length - 1"
              class="input"
              type="number" min="0" max="100"
              v-model="s.conversionToNext"
              placeholder="% → próxima"
              @input="onStageChange(sub.stages, i)"
            />
            <div v-else class="muted" style="align-self:center">(final)</div>
            <button class="btn-icon" aria-label="Remover etapa" @click="removeSubStage(sub, i)"><X :size="16" /></button>
          </div>
          <button class="btn-add" @click="addSubStage(sub)">+ Adicionar etapa</button>
        </div>

        <div class="sub-funnel__section">
          <strong>Canais deste produto</strong>
          <div v-for="(ch, i) in (sub.channels || [])" :key="i" class="channel-row">
            <input class="input" v-model="ch.name" placeholder="Ex: Meta Ads" @input="save" />
            <input class="input" type="number" v-model="ch.mixPct" placeholder="% do mix" @input="save" />
            <input class="input" type="number" v-model="ch.costPerLead" placeholder="R$ / lead" @input="save" />
            <button class="btn-icon" aria-label="Remover canal" @click="removeSubChannel(sub, i)"><X :size="16" /></button>
          </div>
          <button class="btn-add" @click="addSubChannel(sub)">+ Adicionar canal</button>
        </div>

        <div v-if="sub.playbook" class="sub-funnel__playbook">
          <strong>Playbook:</strong> {{ sub.playbook }}
        </div>
      </div>

      <button
        class="btn-add"
        :disabled="f.perProduct.length >= MAX_SUB_FUNNELS"
        @click="addSubFunnel"
      >+ Adicionar sub-funil de produto</button>
      <p v-if="f.perProduct.length >= MAX_SUB_FUNNELS" class="muted" style="font-size:12px; margin:6px 0 0">
        Limite de {{ MAX_SUB_FUNNELS }} funis de produto para manter a análise de IA enxuta e barata.
      </p>
    </div>

    <!-- Cálculo reverso -->
    <div v-if="analysis.neededClients" class="card">
      <h4 style="margin:0 0 10px">Cálculo reverso</h4>
      <template v-if="analysis.allRatesFilled">
        <p style="margin:0 0 10px">
          <strong>Para faturar {{ formatMoney(Number(f.monthlyRevenueGoal)) }}/mês com ticket de {{ formatMoney(Number(f.avgTicket)) }}, você precisa:</strong>
        </p>
        <div class="funnel-viz">
          <div
            v-for="(s, i) in analysis.reverseFlow"
            :key="i"
            class="funnel-stage"
            :style="{ width: ((s.count / analysis.reverseFlow[0].count) * 100) + '%' }"
          >
            <span class="fs-name">{{ s.stage }}</span>
            <span class="fs-count">{{ s.count.toLocaleString('pt-BR') }}</span>
          </div>
        </div>
      </template>
      <template v-else>
        <div class="alert warning"><AlertTriangle :size="16" /> Preencha as taxas de conversão para ver o cálculo reverso.</div>
        <p><strong>Clientes necessários:</strong> {{ analysis.neededClients }} / mês</p>
      </template>
      <div v-if="analysis.bottleneck" class="alert info" style="margin-top:14px">
        <Search :size="16" /> <strong>Gargalo:</strong> {{ analysis.bottleneck.stage }}, apenas {{ analysis.bottleneck.rate.toFixed(1) }}% convertem.
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tokens' as t;

.funnel-mode-switch {
  display: flex;
  align-items: flex-start;
  gap: t.$space-3;
  padding: t.$space-3;
  background: t.$color-bg-soft;
  border: 1px solid t.$color-border;
  border-radius: t.$radius-md;
  margin-bottom: t.$space-3;
}

.sub-funnel-head {
  display: flex;
  flex-direction: column;
  gap: t.$space-1;
  margin-bottom: t.$space-3;
}

.sub-funnel {
  border: 1px solid t.$color-border;
  border-radius: t.$radius-md;
  padding: t.$space-3;
  margin-bottom: t.$space-3;
  background: t.$color-bg-soft;

  &__head {
    display: grid;
    grid-template-columns: 2fr 1fr auto auto;
    gap: t.$space-2;
    align-items: center;
  }

  &__name { font-weight: 600; }

  &__reason {
    font-size: t.$font-size-xs;
    margin-top: t.$space-2;
    font-style: italic;
  }

  &__section {
    margin-top: t.$space-3;
    display: flex;
    flex-direction: column;
    gap: t.$space-2;

    > strong {
      font-size: t.$font-size-sm;
      color: t.$color-text-light;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
  }

  &__playbook {
    margin-top: t.$space-3;
    padding: t.$space-2 t.$space-3;
    background: t.$color-primary-soft;
    border-left: 3px solid t.$color-primary;
    border-radius: t.$radius-sm;
    font-size: t.$font-size-sm;
  }
}

.product-card {
  margin-top: t.$space-2;
  padding: t.$space-2 t.$space-3;
  background: t.$color-surface;
  border: 1px solid t.$color-border;
  border-radius: t.$radius-sm;

  &__meta {
    display: flex;
    flex-wrap: wrap;
    gap: t.$space-1;
  }

  &__desc {
    margin: t.$space-2 0 0;
    font-size: t.$font-size-xs;
    color: t.$color-text-light;
    line-height: 1.5;
  }
}

.product-tag {
  display: inline-block;
  padding: 2px t.$space-2;
  border-radius: t.$radius-sm;
  background: t.$color-bg-soft;
  border: 1px solid t.$color-border;
  font-size: t.$font-size-xs;
  color: t.$color-text-light;

  &--price {
    background: t.$color-primary-soft;
    border-color: t.$color-primary;
    color: t.$color-text;
    font-weight: 600;
  }
}

.role-tag {
  display: inline-flex;
  align-items: center;
  padding: 2px t.$space-2;
  border-radius: t.$radius-sm;
  font-size: t.$font-size-xs;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;

  &[data-role="TOF"] { background: rgba(59, 130, 246, 0.15); color: #3b82f6; }
  &[data-role="MOF"] { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
  &[data-role="BOF"] { background: rgba(16, 185, 129, 0.15); color: #10b981; }
}

@include t.respond-down(t.$bp-md) {
  .sub-funnel__head {
    grid-template-columns: 1fr auto;
    grid-template-rows: auto auto;

    > :nth-child(1) { grid-column: 1 / -1; }
    > :nth-child(3) { grid-column: 1 / 2; }
  }
}
</style>
