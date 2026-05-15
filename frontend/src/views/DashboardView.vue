<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { usePlanStore } from '@/stores/plan'
import {
  overallScore, swotProfile, buildTOWS, topItems,
  icpFitScore, marketAnalysis, competitionAnalysis,
  productFocusAnalysis, funnelAnalysis,
  forecastProjection, ltvCacAnalysis, prioritizeActions,
  coherenceChecks, strategicHealthScore
} from '@/lib/scoring'
import { formatMoney, ishikawaCauseLabel } from '@/lib/formatters'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseBadge from '@/components/common/BaseBadge.vue'
import AiHelperButton from '@/components/ai/AiHelperButton.vue'
import { throttleClick } from '@/lib/debounce'

const store = usePlanStore()
const router = useRouter()
const plan = store.plan

const health = computed(() => strategicHealthScore(plan))
const score = computed(() => overallScore(plan))

const dimLabels = {
  clareza: 'Clareza Estratégica',
  mercado: 'Conhecimento de Mercado',
  execucao: 'Capacidade de Execução',
  comercial: 'Saúde Comercial',
  diferenciacao: 'Diferenciação Competitiva'
}
const dimColor = (v) => (v >= 80 ? 'success' : v >= 65 ? 'good' : v >= 50 ? 'warn' : 'bad')
const penaltyTotal = computed(() =>
  Math.abs(health.value.penalties.reduce((s, p) => s + p.points, 0))
)
const profile = computed(() => swotProfile(plan.swot))
const tows = computed(() => buildTOWS(plan.swot))
const market = computed(() => marketAnalysis(plan.market || {}))
const compAn = computed(() => competitionAnalysis(plan.competition || {}))
const prodAn = computed(() => productFocusAnalysis(plan.product || {}))
const funAn = computed(() => funnelAnalysis(plan.funnel || {}))
const forec = computed(() => forecastProjection(plan))
const lc = computed(() => ltvCacAnalysis(plan.metrics || {}))
const alerts = computed(() => coherenceChecks(plan))
const prioritized = computed(() => prioritizeActions(plan.actions || []))

const maxForecastRevenue = computed(() => {
  const months = forec.value.months
  return months.length ? Math.max(...months.map((m) => m.revenue)) : 1
})

const ishikawaEntries = computed(() =>
  Object.entries(plan.ishikawa?.causes || {}).filter(([, list]) => list.length)
)

const aiBackendUrl = computed(() => store.aiBackendUrl)

const AI_TYPE_LABEL = {
  inconsistencia: 'Inconsistência',
  risco: 'Risco',
  oportunidade: 'Oportunidade'
}

function formatReviewDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return isNaN(d) ? '' : d.toLocaleString('pt-BR')
}

const alertIcon = {
  warning: '⚠',
  danger: '⛔',
  info: 'ℹ',
  success: '✓'
}

function goBack() {
  router.push({ name: 'wizard' })
}

// Throttle: window.print() abre diálogo nativo — cliques múltiplos empilham.
const printPlan = throttleClick(() => {
  window.print()
}, 2000)

function viewProfile() {
  router.push({ name: 'profile' })
}
</script>

<template>
  <section class="dashboard-view">
    <div v-if="store.isLoading" class="container app-loading">
      <p class="muted">Carregando seu plano…</p>
    </div>
    <div v-else class="container">
      <div class="dash-head">
        <h2>Resumo do Plano Estratégico</h2>
        <div class="dash-actions">
          <BaseButton variant="ghost" @click="goBack">← Editar</BaseButton>
          <BaseButton variant="ghost" @click="viewProfile">👁 Ver perfil</BaseButton>
          <BaseButton variant="primary" @click="printPlan">🖨️ Imprimir / PDF</BaseButton>
        </div>
      </div>

      <!-- Strategic Health Score (Fase C) -->
      <div class="health-hero" :class="`grade-${health.gradeColor}`">
        <div class="health-badge">
          <div class="health-badge__grade">{{ health.grade }}</div>
          <div class="health-badge__total">{{ health.total }}<span>/100</span></div>
        </div>
        <div class="health-info">
          <div class="health-info__title">Saúde Estratégica</div>
          <div class="health-info__sub">{{ health.gradeLabel }}</div>
          <div v-if="health.penalties.length" class="health-info__penalty">
            −{{ penaltyTotal }} pts em penalidades ({{ health.penalties.length }})
          </div>
        </div>
      </div>

      <div class="dash-section">
        <h3>Breakdown por dimensão</h3>
        <div class="health-bars">
          <div
            v-for="(value, key) in health.breakdown"
            :key="key"
            class="health-bar-row"
          >
            <div class="hb-label">{{ dimLabels[key] }}</div>
            <div class="hb-track">
              <div
                class="hb-fill"
                :class="dimColor(value)"
                :style="{ width: value + '%' }"
              />
            </div>
            <div class="hb-value">{{ value }}</div>
          </div>
        </div>
      </div>

      <div v-if="health.explanations.length" class="dash-section">
        <details class="health-tips" open>
          <summary>💡 Pontos a melhorar (top {{ health.explanations.length }})</summary>
          <ul class="health-tip-list">
            <li v-for="(e, i) in health.explanations" :key="i">{{ e }}</li>
          </ul>
        </details>
      </div>

      <!-- Score Geral (0-10) -->
      <div class="score-hero">
        <div class="score-hero__number">{{ score.total.toFixed(1) }}</div>
        <div class="score-hero__label">SCORE GERAL DO PLANO (0-10)</div>
        <div class="score-hero__class">{{ score.classification }}</div>
      </div>

      <!-- Tiles de visão geral -->
      <div class="dash-grid">
        <div class="dash-tile">
          <h4>Empresa</h4>
          <div class="big">{{ plan.company.name || 'n/d' }}</div>
          <div class="desc">{{ plan.company.segment }}</div>
        </div>
        <div class="dash-tile">
          <h4>Modo</h4>
          <div class="big">{{ plan.mode === 'completo' ? 'Completo' : 'Enxuto' }}</div>
        </div>
        <div class="dash-tile">
          <h4>Estratégia SWOT</h4>
          <div class="big">{{ profile.strategy }}</div>
        </div>
        <div v-if="plan.mode === 'completo' && lc.status !== 'sem-dados'" class="dash-tile">
          <h4>LTV/CAC</h4>
          <div class="big">{{ lc.ratio.toFixed(2) }}x</div>
          <div class="desc"><BaseBadge :variant="lc.color">{{ lc.label }}</BaseBadge></div>
        </div>
      </div>

      <!-- Decomposição do score -->
      <div class="dash-section">
        <h3>Decomposição do Score</h3>
        <div class="dash-grid">
          <div class="dash-tile"><h4>ICP</h4><div class="big">{{ score.breakdown.icp.toFixed(1) }}/10</div></div>
          <div class="dash-tile"><h4>Mercado</h4><div class="big">{{ score.breakdown.market.toFixed(1) }}/10</div></div>
          <div class="dash-tile"><h4>Concorrência</h4><div class="big">{{ score.breakdown.competition.toFixed(1) }}/10</div></div>
          <div class="dash-tile"><h4>SWOT</h4><div class="big">{{ score.breakdown.swot.toFixed(1) }}/10</div></div>
          <div class="dash-tile"><h4>Produto-foco</h4><div class="big">{{ score.breakdown.product.toFixed(1) }}/10</div></div>
          <div class="dash-tile"><h4>Funil</h4><div class="big">{{ score.breakdown.funnel.toFixed(1) }}/10</div></div>
          <div class="dash-tile"><h4>Forecast</h4><div class="big">{{ score.breakdown.forecast.toFixed(1) }}/10</div></div>
          <div class="dash-tile"><h4>OKRs</h4><div class="big">{{ score.breakdown.okr.toFixed(1) }}/10</div></div>
          <div class="dash-tile"><h4>Ações</h4><div class="big">{{ score.breakdown.actions.toFixed(1) }}/10</div></div>
          <div v-if="plan.mode === 'completo'" class="dash-tile">
            <h4>Métricas</h4>
            <div class="big">{{ score.breakdown.metrics.toFixed(1) }}/10</div>
          </div>
        </div>
      </div>

      <!-- Alertas de coerência -->
      <div v-if="alerts.length" class="dash-section">
        <h3>⚠ Pontos de Atenção</h3>
        <div class="alerts-block">
          <div v-for="(a, i) in alerts" :key="i" class="alert" :class="a.level">
            <strong>{{ alertIcon[a.level] || '•' }}</strong> {{ a.msg }}
          </div>
        </div>
      </div>

      <!-- Direção Estratégica (modo completo) -->
      <div
        v-if="plan.mode === 'completo' && (plan.vision.purpose || plan.vision.vision3to5)"
        class="dash-section"
      >
        <h3>Direção Estratégica</h3>
        <div class="card">
          <p v-if="plan.vision.purpose"><strong>Propósito:</strong> {{ plan.vision.purpose }}</p>
          <p v-if="plan.vision.core"><strong>Core:</strong> {{ plan.vision.core }}</p>
          <p v-if="plan.vision.vision3to5"><strong>Visão 3-5 anos:</strong> {{ plan.vision.vision3to5 }}</p>
          <p v-if="plan.vision.bigDream"><strong>Sonho Grande:</strong> {{ plan.vision.bigDream }}</p>
        </div>
      </div>

      <!-- ICP / Personas -->
      <div v-if="(plan.icp?.personas || []).length" class="dash-section">
        <h3>Cliente Ideal</h3>
        <div class="dash-grid">
          <div v-for="(p, i) in plan.icp.personas" :key="i" class="card persona-summary">
            <div class="persona-summary__head">
              <h4>
                {{ p.name || 'Persona sem nome' }}
                <BaseBadge v-if="p.primary" variant="success">primária</BaseBadge>
              </h4>
              <BaseBadge :variant="icpFitScore(p).color">{{ icpFitScore(p).score.toFixed(1) }}/10</BaseBadge>
            </div>
            <p class="muted persona-summary__meta">{{ p.role }} · {{ p.companySize }}</p>
            <p v-if="p.pain" class="persona-summary__row"><strong>Dor:</strong> {{ p.pain }}</p>
            <p v-if="p.budget" class="persona-summary__row"><strong>Orçamento:</strong> {{ p.budget }}</p>
            <p v-if="p.channel" class="persona-summary__row"><strong>Canal:</strong> {{ p.channel }}</p>
          </div>
        </div>
      </div>

      <!-- Mercado -->
      <div v-if="market.tam" class="dash-section">
        <h3>Posição no Mercado</h3>
        <div class="card">
          <div class="pyramid">
            <div class="pyr-row tam" style="width:100%">
              <span class="pyr-label">TAM</span>
              <span class="pyr-value">{{ formatMoney(market.tam) }}</span>
            </div>
            <div class="pyr-row sam" :style="{ width: Math.max(5, Math.min(95, market.samOfTam)) + '%' }">
              <span class="pyr-label">SAM</span>
              <span class="pyr-value">{{ formatMoney(market.sam) }} ({{ market.samOfTam.toFixed(1) }}%)</span>
            </div>
            <div class="pyr-row som" :style="{ width: Math.max(2, Math.min(60, market.somOfSam)) + '%' }">
              <span class="pyr-label">SOM</span>
              <span class="pyr-value">{{ formatMoney(market.som) }} ({{ market.somOfSam.toFixed(1) }}%)</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Concorrência -->
      <div v-if="compAn.rankings.length" class="dash-section">
        <h3>Análise Competitiva</h3>
        <div class="card">
          <div class="dash-grid" style="margin-bottom:12px">
            <div class="dash-tile">
              <h4>Diferenciação</h4>
              <div class="big">{{ (compAn.differentiationScore >= 0 ? '+' : '') + compAn.differentiationScore.toFixed(2) }}</div>
              <div class="desc">vs. média concorrentes</div>
            </div>
            <div class="dash-tile">
              <h4>Líder do ranking</h4>
              <div class="big">{{ compAn.rankings[0].name }}</div>
            </div>
            <div class="dash-tile">
              <h4>Espaço em branco</h4>
              <div class="big">{{ compAn.whitespace.length ? compAn.whitespace.join(', ') : 'n/d' }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- SWOT: Top itens com score -->
      <div class="dash-section">
        <h3>SWOT: Top itens</h3>
        <div class="swot-grid">
          <div class="swot-block s">
            <h4>Forças</h4>
            <ul v-if="topItems(plan.swot.strengths, 5).length" class="swot-summary-list">
              <li v-for="(item, i) in topItems(plan.swot.strengths, 5)" :key="i">
                {{ item.text }} <span class="muted">({{ item.score.toFixed(1) }})</span>
              </li>
            </ul>
            <p v-else class="muted">Nenhum item.</p>
          </div>
          <div class="swot-block w">
            <h4>Fraquezas</h4>
            <ul v-if="topItems(plan.swot.weaknesses, 5).length" class="swot-summary-list">
              <li v-for="(item, i) in topItems(plan.swot.weaknesses, 5)" :key="i">
                {{ item.text }} <span class="muted">({{ item.score.toFixed(1) }})</span>
              </li>
            </ul>
            <p v-else class="muted">Nenhum item.</p>
          </div>
          <div class="swot-block o">
            <h4>Oportunidades</h4>
            <ul v-if="topItems(plan.swot.opportunities, 5).length" class="swot-summary-list">
              <li v-for="(item, i) in topItems(plan.swot.opportunities, 5)" :key="i">
                {{ item.text }} <span class="muted">({{ item.score.toFixed(1) }})</span>
              </li>
            </ul>
            <p v-else class="muted">Nenhum item.</p>
          </div>
          <div class="swot-block t">
            <h4>Ameaças</h4>
            <ul v-if="topItems(plan.swot.threats, 5).length" class="swot-summary-list">
              <li v-for="(item, i) in topItems(plan.swot.threats, 5)" :key="i">
                {{ item.text }} <span class="muted">({{ item.score.toFixed(1) }})</span>
              </li>
            </ul>
            <p v-else class="muted">Nenhum item.</p>
          </div>
        </div>
      </div>

      <!-- TOWS -->
      <div class="dash-section">
        <h3>Estratégias Cruzadas (TOWS)</h3>
        <div class="tows-grid">
          <div class="tows-cell">
            <h4>FO: Ofensivas</h4>
            <ul v-if="tows.FO.length"><li v-for="(item, i) in tows.FO" :key="i">{{ item.text }}</li></ul>
            <p v-else class="muted">n/d</p>
          </div>
          <div class="tows-cell">
            <h4>FA: Defensivas</h4>
            <ul v-if="tows.FA.length"><li v-for="(item, i) in tows.FA" :key="i">{{ item.text }}</li></ul>
            <p v-else class="muted">n/d</p>
          </div>
          <div class="tows-cell">
            <h4>WO: Reorientação</h4>
            <ul v-if="tows.WO.length"><li v-for="(item, i) in tows.WO" :key="i">{{ item.text }}</li></ul>
            <p v-else class="muted">n/d</p>
          </div>
          <div class="tows-cell">
            <h4>WA: Sobrevivência</h4>
            <ul v-if="tows.WA.length"><li v-for="(item, i) in tows.WA" :key="i">{{ item.text }}</li></ul>
            <p v-else class="muted">n/d</p>
          </div>
        </div>
      </div>

      <!-- Produto-foco (com estrelas, sangrias, justificativa) -->
      <div v-if="prodAn.focus" class="dash-section">
        <h3>Produto-foco</h3>
        <div class="card">
          <div class="dash-grid product-focus__tiles">
            <div class="dash-tile">
              <h4>Foco recomendado</h4>
              <div class="big">{{ prodAn.focus.name }}</div>
              <div class="desc">eficiência {{ prodAn.focus.efficiency.toFixed(2) }}</div>
            </div>
            <div class="dash-tile">
              <h4>Estrelas</h4>
              <div class="big">{{ prodAn.stars.map((s) => s.name).join(', ') || 'n/d' }}</div>
              <div class="desc">eficiência ≥ 1.2</div>
            </div>
            <div class="dash-tile">
              <h4>Sangrias</h4>
              <div class="big">{{ prodAn.bleeders.map((b) => b.name).join(', ') || 'n/d' }}</div>
              <div class="desc">esforço alto, receita baixa</div>
            </div>
          </div>
          <p v-if="plan.product?.focusReasoning" class="product-focus__reason">
            <strong>Justificativa:</strong> {{ plan.product.focusReasoning }}
          </p>
        </div>
      </div>

      <!-- Funil de Vendas (com mensagem completa) -->
      <div v-if="funAn.neededClients" class="dash-section">
        <h3>Funil de Vendas</h3>
        <div class="card">
          <p class="funnel-summary">
            <strong>Para faturar R$ {{ Number(plan.funnel.monthlyRevenueGoal).toLocaleString('pt-BR') }}/mês</strong>
            com ticket de R$ {{ Number(plan.funnel.avgTicket).toLocaleString('pt-BR') }},
            você precisa de <strong>{{ funAn.neededClients }}</strong> clientes/mês.
          </p>
          <div v-if="funAn.allRatesFilled" class="funnel-viz">
            <div
              v-for="(s, i) in funAn.reverseFlow"
              :key="i"
              class="funnel-stage"
              :style="{ width: ((s.count / funAn.reverseFlow[0].count) * 100) + '%' }"
            >
              <span class="fs-name">{{ s.stage }}</span>
              <span class="fs-count">{{ s.count.toLocaleString('pt-BR') }}</span>
            </div>
          </div>
          <div v-if="funAn.bottleneck" class="alert info funnel-bottleneck">
            🔍 <strong>Gargalo:</strong> {{ funAn.bottleneck.stage }},
            {{ funAn.bottleneck.rate.toFixed(1) }}% de conversão.
          </div>
        </div>
      </div>

      <!-- Forecast -->
      <div v-if="forec.months.length" class="dash-section">
        <h3>Projeção de Receita ({{ forec.scenario }})</h3>
        <div class="card">
          <div class="dash-tile" style="margin-bottom:14px">
            <h4>Total acumulado em {{ forec.months.length }} meses</h4>
            <div class="big">{{ formatMoney(forec.totalRevenue) }}</div>
          </div>
          <div class="forecast-chart">
            <div
              v-for="m in forec.months"
              :key="m.month"
              class="fc-bar"
              :title="`Mês ${m.month}: ${formatMoney(m.revenue)}`"
            >
              <div class="fc-fill" :style="{ height: ((m.revenue / maxForecastRevenue) * 100) + '%' }" />
              <span class="fc-label">{{ m.month }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- OKRs -->
      <div v-if="plan.okrs.length" class="dash-section">
        <h3>Objetivos & Resultados-Chave</h3>
        <div v-for="(okr, oi) in plan.okrs" :key="oi" class="okr-card">
          <h5>Objetivo #{{ oi + 1 }}</h5>
          <p class="okr-card__obj"><strong>{{ okr.objective }}</strong></p>
          <ul class="okr-card__krs">
            <li v-for="(kr, ki) in (okr.krs || [])" :key="ki">{{ kr.text }}</li>
          </ul>
        </div>
      </div>

      <!-- Plano de Ação 5W2H (prioritizado) -->
      <div v-if="prioritized.length" class="dash-section">
        <h3>Plano de Ação Priorizado (ICE Score)</h3>
        <table class="simple">
          <thead>
            <tr>
              <th>#</th>
              <th>O quê</th>
              <th>Quem</th>
              <th>Quando</th>
              <th>ICE</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(a, i) in prioritized" :key="i">
              <td>{{ i + 1 }}</td>
              <td>{{ a.what }}</td>
              <td>{{ a.who }}</td>
              <td>{{ a.when }}</td>
              <td><strong>{{ a.ice.toFixed(1) }}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Ishikawa (modo completo) -->
      <div
        v-if="plan.mode === 'completo' && plan.ishikawa?.problem"
        class="dash-section"
      >
        <h3>Análise de Causa Raiz</h3>
        <div class="card">
          <p><strong>Problema:</strong> {{ plan.ishikawa.problem }}</p>
          <div v-if="ishikawaEntries.length" class="form-grid cols-2 ishikawa-grid">
            <div v-for="[key, list] in ishikawaEntries" :key="key">
              <strong>{{ ishikawaCauseLabel(key) }}</strong>
              <ul>
                <li v-for="(cause, i) in list" :key="i">{{ cause }}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <!-- Canvas (modo completo) -->
      <div v-if="plan.mode === 'completo' && plan.canvas.valueProp" class="dash-section">
        <h3>Business Model Canvas</h3>
        <div class="card">
          <div class="form-grid cols-2 canvas-grid">
            <div v-if="plan.canvas.segments"><strong>Segmentos:</strong> {{ plan.canvas.segments }}</div>
            <div v-if="plan.canvas.valueProp"><strong>Proposta de Valor:</strong> {{ plan.canvas.valueProp }}</div>
            <div v-if="plan.canvas.channels"><strong>Canais:</strong> {{ plan.canvas.channels }}</div>
            <div v-if="plan.canvas.relationship"><strong>Relacionamento:</strong> {{ plan.canvas.relationship }}</div>
            <div v-if="plan.canvas.revenue"><strong>Receitas:</strong> {{ plan.canvas.revenue }}</div>
            <div v-if="plan.canvas.resources"><strong>Recursos:</strong> {{ plan.canvas.resources }}</div>
            <div v-if="plan.canvas.activities"><strong>Atividades:</strong> {{ plan.canvas.activities }}</div>
            <div v-if="plan.canvas.partners"><strong>Parceiros:</strong> {{ plan.canvas.partners }}</div>
            <div v-if="plan.canvas.costs"><strong>Custos:</strong> {{ plan.canvas.costs }}</div>
          </div>
        </div>
      </div>

      <!-- Revisão IA do plano completo -->
      <div v-if="aiBackendUrl || plan.aiReview" class="dash-section ai-review-section">
        <h3>🤖 Revisão com IA</h3>

        <div v-if="plan.aiReview" class="card ai-review">
          <p v-if="plan.aiReview.executiveSummary" class="ai-review__summary">
            {{ plan.aiReview.executiveSummary }}
          </p>

          <div
            v-for="(s, i) in plan.aiReview.suggestions"
            :key="i"
            class="ai-review__item"
            :class="`type-${s.type || 'info'}`"
          >
            <h4>
              <span v-if="s.type" class="ai-review__tag" :class="`tag-${s.type}`">
                {{ AI_TYPE_LABEL[s.type] || s.type }}
              </span>
              {{ s.title || `Item ${i + 1}` }}
            </h4>
            <p v-if="s.text || s.content">{{ s.text || s.content }}</p>
            <p v-if="s.recommendation" class="ai-review__reco">
              <strong>Recomendação:</strong> {{ s.recommendation }}
            </p>
          </div>

          <div v-if="plan.aiReview.topPriority" class="ai-review__priority">
            <strong>Prioridade máxima:</strong> {{ plan.aiReview.topPriority }}
          </div>

          <p v-if="plan.aiReview.generatedAt" class="muted ai-review__meta">
            Gerado em {{ formatReviewDate(plan.aiReview.generatedAt) }}
          </p>
        </div>

        <div v-else class="card">
          <p>
            Peça à IA para analisar o plano completo e apontar inconsistências, riscos e
            oportunidades não exploradas.
          </p>
          <AiHelperButton agent="insightsCoach" label="Revisar plano completo" />
        </div>
      </div>
    </div>
  </section>
</template>

<style lang="scss" scoped>
@use '@/styles/tokens' as t;

.dashboard-view {
  padding-bottom: t.$space-10;
}

.dash-section {
  margin-top: t.$space-8;

  h3 {
    margin: 0 0 t.$space-4;
  }
}

.persona-summary {
  padding: t.$space-4;

  &__head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: t.$space-2;

    h4 {
      margin: 0;
    }
  }

  &__meta {
    margin: t.$space-1 + 2px 0 t.$space-3;
    font-size: t.$font-size-sm;
  }

  &__row {
    margin: t.$space-1 0;
    font-size: t.$font-size-sm;
  }
}

.swot-summary-list {
  margin: 0;
  padding-left: t.$space-4 + 2px;
}

.product-focus__tiles {
  margin-bottom: t.$space-3;
}

.product-focus__reason {
  margin-top: t.$space-3;
}

.funnel-summary {
  margin: 0 0 t.$space-3;
}

.funnel-bottleneck {
  margin-top: t.$space-3;
}

.okr-card {
  &__obj {
    margin: 0 0 t.$space-3;
  }

  &__krs {
    margin: 0;
    padding-left: t.$space-4 + 2px;

    li {
      margin-bottom: t.$space-1 + 2px;
    }
  }
}

.ishikawa-grid {
  margin-top: t.$space-3;

  ul {
    margin: t.$space-1 0 0 t.$space-4;
    padding: 0;
  }
}

.canvas-grid {
  gap: t.$space-3;
}

/* ===== Revisão com IA ===== */
.ai-review {
  &__summary {
    background: t.$color-bg-soft;
    border-radius: t.$radius-sm;
    padding: t.$space-3 t.$space-4;
    margin: 0 0 t.$space-4;
    line-height: t.$line-height-relaxed;
  }

  &__item {
    background: t.$color-bg-soft;
    border-left: 4px solid t.$color-primary;
    border-radius: t.$radius-sm;
    padding: t.$space-3 t.$space-4;
    margin-bottom: t.$space-3;

    &.type-inconsistencia { border-left-color: t.$color-danger; }
    &.type-risco { border-left-color: t.$color-warning; }
    &.type-oportunidade { border-left-color: t.$color-success; }

    h4 {
      margin: 0 0 t.$space-2;
      color: t.$color-primary;
    }

    p {
      margin: t.$space-2 0 0;
      font-size: t.$font-size-sm;
      line-height: t.$line-height-relaxed;
    }
  }

  &__tag {
    display: inline-block;
    font-size: t.$font-size-xs;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 2px 8px;
    border-radius: t.$radius-pill;
    margin-right: t.$space-2;
    vertical-align: middle;
    background: #6b7280;
    color: #fff;

    &.tag-inconsistencia { background: t.$color-danger; }
    &.tag-risco { background: t.$color-warning; }
    &.tag-oportunidade { background: t.$color-success; }
  }

  &__priority {
    background: t.$color-primary-soft;
    border-left: 4px solid t.$color-primary;
    border-radius: t.$radius-sm;
    padding: t.$space-3 t.$space-4;
    margin-top: t.$space-4;
    font-size: t.$font-size-sm;
    line-height: t.$line-height-relaxed;
  }

  &__meta {
    margin: t.$space-3 0 0;
    font-size: t.$font-size-xs;
  }
}

/* ===== Strategic Health Score (Fase C) ===== */
.health-hero {
  display: flex;
  align-items: center;
  gap: t.$space-6;
  background: t.$color-surface;
  border: 1px solid t.$color-border;
  border-left: 6px solid t.$color-primary;
  border-radius: t.$radius-lg;
  padding: t.$space-6;
  box-shadow: t.$shadow-md;
  margin-top: t.$space-5;
  margin-bottom: t.$space-5;

  &.grade-success { border-left-color: t.$color-success; }
  &.grade-warning { border-left-color: t.$color-warning; }
  &.grade-danger  { border-left-color: t.$color-danger; }
}

.health-badge {
  flex: 0 0 auto;
  width: 130px;
  height: 130px;
  border-radius: t.$radius-circle;
  background: linear-gradient(135deg, t.$color-primary, t.$color-secondary);
  color: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 24px rgba(211, 84, 0, 0.25);

  .grade-success & {
    background: linear-gradient(135deg, t.$color-success, #2ecc71);
    box-shadow: 0 8px 24px rgba(39, 174, 96, 0.25);
  }
  .grade-warning & {
    background: linear-gradient(135deg, t.$color-warning, #f1c40f);
    box-shadow: 0 8px 24px rgba(243, 156, 18, 0.25);
  }
  .grade-danger & {
    background: linear-gradient(135deg, t.$color-danger, #c0392b);
    box-shadow: 0 8px 24px rgba(231, 76, 60, 0.25);
  }

  &__grade {
    font-size: 38px;
    font-weight: 800;
    line-height: 1;
    letter-spacing: -1px;
  }

  &__total {
    font-size: t.$font-size-lg;
    font-weight: 600;
    margin-top: t.$space-1;

    span {
      font-size: t.$font-size-xs;
      font-weight: 400;
      opacity: 0.8;
    }
  }
}

.health-info {
  flex: 1;
  min-width: 0;

  &__title {
    font-size: t.$font-size-xs;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    color: t.$color-text-light;
    font-weight: 600;
    margin-bottom: t.$space-1;
  }

  &__sub {
    font-size: t.$font-size-xl;
    font-weight: 600;
    color: t.$color-text;
    line-height: t.$line-height-tight;
  }

  &__penalty {
    margin-top: t.$space-2;
    display: inline-block;
    font-size: t.$font-size-xs;
    padding: 3px t.$space-3;
    border-radius: t.$radius-pill;
    background: t.$color-danger-soft;
    color: t.$color-danger-fore;
    font-weight: 600;
  }
}

.health-bars {
  background: t.$color-surface;
  border: 1px solid t.$color-border;
  border-radius: t.$radius-lg;
  padding: t.$space-5;
  box-shadow: t.$shadow-md;
  display: flex;
  flex-direction: column;
  gap: t.$space-3;
}

.health-bar-row {
  display: grid;
  grid-template-columns: 200px 1fr 50px;
  gap: t.$space-4;
  align-items: center;
}

.hb-label {
  font-size: t.$font-size-sm;
  font-weight: 600;
  color: t.$color-text;
}

.hb-track {
  height: 12px;
  background: t.$color-bg-soft;
  border-radius: t.$radius-sm;
  overflow: hidden;
}

.hb-fill {
  height: 100%;
  border-radius: t.$radius-sm;
  transition: width 0.5s ease;
  background: t.$color-primary;

  &.success { background: linear-gradient(90deg, t.$color-success, #2ecc71); }
  &.good    { background: linear-gradient(90deg, #16a085, #1abc9c); }
  &.warn    { background: linear-gradient(90deg, t.$color-warning, #f1c40f); }
  &.bad     { background: linear-gradient(90deg, t.$color-danger, #c0392b); }
}

.hb-value {
  font-size: t.$font-size-md;
  font-weight: 700;
  color: t.$color-text;
  text-align: right;
}

.health-tips {
  background: t.$color-surface;
  border: 1px solid t.$color-border;
  border-left: 4px solid t.$color-primary;
  border-radius: t.$radius-lg;
  padding: t.$space-4 t.$space-5;
  box-shadow: t.$shadow-md;

  > summary {
    cursor: pointer;
    font-weight: 600;
    color: t.$color-primary;
    list-style: none;

    &::-webkit-details-marker { display: none; }
    &::after {
      content: '▾';
      float: right;
      transition: transform 0.2s;
    }
  }

  &[open] > summary::after { transform: rotate(180deg); }
}

.health-tip-list {
  margin: t.$space-3 0 0;
  padding-left: t.$space-5;
  font-size: t.$font-size-md;
  color: t.$color-text;
  line-height: t.$line-height-relaxed;

  li { margin-bottom: t.$space-1 + 2px; }
}

@include t.respond-down(t.$bp-md) {
  .health-hero {
    flex-direction: column;
    text-align: center;
    gap: t.$space-4;
  }
  .health-badge { width: 110px; height: 110px; }
  .health-badge__grade { font-size: 32px; }
  .health-bar-row { grid-template-columns: 1fr; gap: t.$space-1; }
  .hb-value { text-align: left; }
}
</style>
