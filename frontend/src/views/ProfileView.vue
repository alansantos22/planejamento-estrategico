<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePlanStore } from '@/stores/plan'
import { migrate } from '@/stores/defaultState'
import { getPublicProfile, sharePlan } from '@/services/planApi'
import { strategicHealthScore, icpFitScore, marketAnalysis, prioritizeActions } from '@/lib/scoring'
import { formatMoney } from '@/lib/formatters'
import { generateLogo } from '@/lib/logoGen'
import BaseButton from '@/components/common/BaseButton.vue'

const route = useRoute()
const router = useRouter()
const store = usePlanStore()

const slug = computed(() => route.params.slug || null)
const remotePlan = ref(null)
const loading = ref(false)
const loadError = ref(null)
const shareSlug = ref(null)
const shareCopied = ref(false)
const sharing = ref(false)

// Modo "público" (com slug) vs. modo "preview interno" (dashboard)
const isPublic = computed(() => !!slug.value)

async function loadPublic(s) {
  loading.value = true
  loadError.value = null
  try {
    const result = await getPublicProfile(s)
    if (!result) {
      loadError.value = 'Perfil não encontrado.'
      remotePlan.value = null
      return
    }
    // O backend devolve { data, publicSlug, updatedAt } — passa pelo migrate para garantir shape.
    remotePlan.value = migrate(result.data)
  } catch (err) {
    loadError.value = err.message || 'Falha ao carregar perfil.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  if (slug.value) loadPublic(slug.value)
})

watch(slug, (s) => {
  if (s) loadPublic(s)
  else remotePlan.value = null
})

const plan = computed(() => (isPublic.value ? remotePlan.value : store.plan))

const ready = computed(() => !isPublic.value || (!loading.value && !!remotePlan.value))

const company = computed(() => plan.value?.company || {})
const companyName = computed(() => company.value.name || 'Empresa sem nome')
const logo = computed(() => generateLogo(companyName.value))

const health = computed(() => (plan.value ? strategicHealthScore(plan.value) : null))
const primaryPersona = computed(() => {
  const personas = plan.value?.icp?.personas || []
  return personas.find((p) => p.primary) || personas[0] || null
})
const primaryPersonaFit = computed(() => (primaryPersona.value ? icpFitScore(primaryPersona.value) : null))
const market = computed(() => marketAnalysis(plan.value?.market || {}))
const topActions = computed(() => prioritizeActions(plan.value?.actions || []).slice(0, 5))

const dimLabels = {
  clareza: 'Clareza',
  mercado: 'Mercado',
  execucao: 'Execução',
  comercial: 'Comercial',
  diferenciacao: 'Diferenciação'
}

const tagline = computed(() => {
  const st = plan.value?.pricing?.statement || {}
  if (st.benefit && st.icp) return `Para ${st.icp.toLowerCase()}, ${st.benefit.toLowerCase()}.`
  if (plan.value?.vision?.purpose) return plan.value.vision.purpose
  if (st.product) return st.product
  return null
})

const sizeLabel = computed(() => {
  const s = company.value.size || ''
  if (!s) return ''
  return s
})

const lead = computed(() => plan.value?.lead || {})

async function shareProfile() {
  sharing.value = true
  try {
    const generated = await sharePlan()
    shareSlug.value = generated
    if (generated) {
      const url = `${window.location.origin}${window.location.pathname}#/perfil/${generated}`
      try {
        await navigator.clipboard.writeText(url)
        shareCopied.value = true
        setTimeout(() => (shareCopied.value = false), 2500)
      } catch (_) {
        prompt('Copie o link do perfil:', url)
      }
    }
  } catch (err) {
    alert('Falha ao gerar link de compartilhamento: ' + err.message)
  } finally {
    sharing.value = false
  }
}

function goBack() {
  if (isPublic.value) router.push({ name: 'landing' })
  else router.push({ name: 'dashboard' })
}

function printProfile() {
  window.print()
}
</script>

<template>
  <section class="profile-view">
    <div v-if="!ready" class="container profile-loading">
      <p class="muted">Carregando perfil…</p>
    </div>

    <div v-else-if="loadError" class="container profile-loading">
      <p class="muted">{{ loadError }}</p>
      <BaseButton variant="ghost" @click="goBack">← Voltar</BaseButton>
    </div>

    <div v-else-if="plan" class="container">
      <!-- Ações no topo (não imprimem) -->
      <div class="profile-actions">
        <BaseButton variant="ghost" @click="goBack">
          {{ isPublic ? '← Voltar' : '← Editar plano' }}
        </BaseButton>
        <div class="profile-actions__right">
          <BaseButton v-if="!isPublic" variant="ghost" :disabled="sharing" @click="shareProfile">
            🔗 {{ shareCopied ? 'Link copiado!' : sharing ? 'Gerando…' : 'Compartilhar perfil' }}
          </BaseButton>
          <BaseButton variant="primary" @click="printProfile">🖨️ Imprimir / PDF</BaseButton>
        </div>
      </div>

      <!-- Header -->
      <header class="profile-header">
        <div class="logo-circle" :style="{ background: logo.color }">
          {{ logo.initials }}
        </div>
        <div class="profile-header__main">
          <h1 class="profile-header__name">{{ companyName }}</h1>
          <p v-if="tagline" class="profile-header__tagline">{{ tagline }}</p>
          <div class="profile-header__meta">
            <span v-if="company.segment">🏷 {{ company.segment }}</span>
            <span v-if="company.age">⏱ {{ company.age }}</span>
            <span v-if="company.region">🌐 {{ company.region }}</span>
          </div>
        </div>
        <div v-if="health" class="profile-header__score" :class="`grade-${health.gradeColor}`">
          <div class="profile-header__grade">{{ health.grade }}</div>
          <div class="profile-header__total">{{ health.total }}</div>
          <div class="profile-header__label">Saúde Estratégica</div>
        </div>
      </header>

      <div class="profile-grid">
        <!-- COLUNA PRINCIPAL -->
        <div class="profile-main">
          <!-- Sobre -->
          <section v-if="plan.vision?.purpose || plan.vision?.vision3to5" class="profile-card">
            <h3>Sobre</h3>
            <p v-if="plan.vision?.purpose"><strong>Propósito.</strong> {{ plan.vision.purpose }}</p>
            <p v-if="plan.vision?.vision3to5"><strong>Visão 3–5 anos.</strong> {{ plan.vision.vision3to5 }}</p>
            <p v-if="plan.vision?.bigDream"><strong>Sonho grande.</strong> {{ plan.vision.bigDream }}</p>
            <p v-if="plan.vision?.core" class="muted"><strong>Valores:</strong> {{ plan.vision.core }}</p>
          </section>

          <!-- Cliente ideal -->
          <section v-if="primaryPersona" class="profile-card">
            <h3>Cliente ideal</h3>
            <div class="persona-line">
              <div>
                <strong>{{ primaryPersona.name || 'Persona primária' }}</strong>
                <span v-if="primaryPersona.role" class="muted"> — {{ primaryPersona.role }}</span>
              </div>
              <span v-if="primaryPersonaFit" class="badge" :class="primaryPersonaFit.color">
                ICP Fit {{ primaryPersonaFit.score.toFixed(1) }}/10
              </span>
            </div>
            <p v-if="primaryPersona.pain"><strong>Dor:</strong> {{ primaryPersona.pain }}</p>
            <p v-if="primaryPersona.budget"><strong>Orçamento:</strong> {{ primaryPersona.budget }}</p>
            <p v-if="primaryPersona.channel"><strong>Onde encontrar:</strong> {{ primaryPersona.channel }}</p>
          </section>

          <!-- Posição no mercado -->
          <section v-if="market.tam" class="profile-card">
            <h3>Posição no mercado</h3>
            <div class="pyramid">
              <div class="pyr-row tam" style="width:100%">
                <span>TAM</span><span>{{ formatMoney(market.tam) }}</span>
              </div>
              <div
                class="pyr-row sam"
                :style="{ width: Math.max(15, Math.min(95, market.samOfTam)) + '%' }"
              >
                <span>SAM</span><span>{{ formatMoney(market.sam) }} ({{ market.samOfTam.toFixed(1) }}%)</span>
              </div>
              <div
                class="pyr-row som"
                :style="{ width: Math.max(8, Math.min(60, market.somOfSam)) + '%' }"
              >
                <span>SOM</span><span>{{ formatMoney(market.som) }} ({{ market.somOfSam.toFixed(1) }}%)</span>
              </div>
            </div>
          </section>

          <!-- Estratégia comercial -->
          <section v-if="plan.funnel?.monthlyRevenueGoal || plan.funnel?.avgTicket" class="profile-card">
            <h3>Estratégia comercial</h3>
            <p v-if="plan.funnel?.monthlyRevenueGoal">
              Meta de
              <strong>{{ formatMoney(plan.funnel.monthlyRevenueGoal) }}/mês</strong>
              com ticket médio de {{ formatMoney(plan.funnel.avgTicket) }}.
            </p>
            <p v-if="plan.pricing?.strategy">
              Estratégia de preço: <strong>{{ plan.pricing.strategy }}</strong>.
            </p>
          </section>

          <!-- Próximas ações -->
          <section v-if="topActions.length" class="profile-card">
            <h3>Próximas ações</h3>
            <ol class="action-list">
              <li v-for="(a, i) in topActions" :key="i">
                <strong>{{ a.what }}</strong>
                <span v-if="a.who"> — {{ a.who }}</span>
                <span v-if="a.when" class="muted"> ({{ a.when }})</span>
              </li>
            </ol>
          </section>
        </div>

        <!-- COLUNA LATERAL -->
        <aside class="profile-side">
          <section v-if="!isPublic && (lead.email || lead.phone)" class="profile-card profile-card--side">
            <h4>Contato</h4>
            <p v-if="lead.email">✉ {{ lead.email }}</p>
            <p v-if="lead.phone">📱 {{ lead.phone }}</p>
          </section>

          <section v-if="sizeLabel || company.revenue || company.region" class="profile-card profile-card--side">
            <h4>Detalhes</h4>
            <p v-if="sizeLabel"><strong>Porte:</strong> {{ sizeLabel }}</p>
            <p v-if="company.revenue"><strong>Faturamento:</strong> {{ company.revenue }}</p>
            <p v-if="company.region"><strong>Região:</strong> {{ company.region }}</p>
            <p v-if="company.age"><strong>Idade:</strong> {{ company.age }}</p>
          </section>

          <section v-if="health" class="profile-card profile-card--side">
            <h4>Score por dimensão</h4>
            <div class="side-bars">
              <div v-for="(value, key) in health.breakdown" :key="key" class="side-bar">
                <div class="side-bar__head">
                  <span>{{ dimLabels[key] }}</span>
                  <strong>{{ value }}</strong>
                </div>
                <div class="side-bar__track">
                  <div class="side-bar__fill" :style="{ width: value + '%' }" />
                </div>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  </section>
</template>

<style lang="scss" scoped>
@use '@/styles/tokens' as t;

.profile-view {
  padding-block: t.$space-5 t.$space-10;
}

.profile-loading {
  text-align: center;
  padding-block: t.$space-10;

  .base-button { margin-top: t.$space-4; }
}

.profile-actions {
  display: flex;
  justify-content: space-between;
  margin-bottom: t.$space-5;
  gap: t.$space-3;
  flex-wrap: wrap;

  &__right { display: flex; gap: t.$space-2; }
}

/* Header */
.profile-header {
  background: t.$color-surface;
  border: 1px solid t.$color-border;
  border-radius: t.$radius-lg;
  padding: t.$space-6;
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: t.$space-5;
  align-items: center;
  box-shadow: t.$shadow-md;
  margin-bottom: t.$space-5;

  &__main { min-width: 0; }

  &__name {
    margin: 0 0 t.$space-1;
    font-size: t.$font-size-3xl;
    color: t.$color-text;
  }

  &__tagline {
    margin: 0 0 t.$space-3;
    font-size: t.$font-size-lg;
    color: t.$color-text-light;
    line-height: t.$line-height-relaxed;
  }

  &__meta {
    display: flex;
    flex-wrap: wrap;
    gap: t.$space-3;
    font-size: t.$font-size-sm;
    color: t.$color-text-light;
  }

  &__score {
    text-align: center;
    min-width: 130px;
    padding: t.$space-3 t.$space-4;
    border-radius: t.$radius-lg;
    background: linear-gradient(135deg, t.$color-primary, t.$color-secondary);
    color: #fff;

    &.grade-success { background: linear-gradient(135deg, t.$color-success, #2ecc71); }
    &.grade-warning { background: linear-gradient(135deg, t.$color-warning, #f1c40f); }
    &.grade-danger  { background: linear-gradient(135deg, t.$color-danger, #c0392b); }
  }

  &__grade {
    font-size: 36px;
    font-weight: 800;
    line-height: 1;
  }

  &__total {
    font-size: t.$font-size-lg;
    font-weight: 600;
    margin-top: t.$space-1;
  }

  &__label {
    font-size: t.$font-size-xs;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-top: t.$space-1;
    opacity: 0.9;
  }
}

.logo-circle {
  width: 88px;
  height: 88px;
  border-radius: t.$radius-circle;
  color: #fff;
  font-weight: 700;
  font-size: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  letter-spacing: -1px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.15);
}

/* Layout 2 colunas */
.profile-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: t.$space-5;
}

.profile-main, .profile-side {
  display: flex;
  flex-direction: column;
  gap: t.$space-4;
}

.profile-card {
  background: t.$color-surface;
  border: 1px solid t.$color-border;
  border-radius: t.$radius-lg;
  padding: t.$space-5;
  box-shadow: t.$shadow-md;

  h3 {
    margin: 0 0 t.$space-3;
    font-size: t.$font-size-xl;
    color: t.$color-text;
    border-bottom: 2px solid t.$color-bg-soft;
    padding-bottom: t.$space-2;
  }

  h4 {
    margin: 0 0 t.$space-2;
    font-size: t.$font-size-md;
    color: t.$color-primary;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  p {
    margin: t.$space-2 0;
    font-size: t.$font-size-md;
    line-height: t.$line-height-relaxed;
  }

  &--side {
    padding: t.$space-4;

    p {
      font-size: t.$font-size-sm;
      margin: t.$space-1 0;
    }
  }
}

.persona-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: t.$space-2;
  margin-bottom: t.$space-2;
}

.badge {
  display: inline-block;
  font-size: t.$font-size-xs;
  padding: 3px t.$space-3;
  border-radius: t.$radius-pill;
  font-weight: 600;

  &.success { background: t.$color-success-soft; color: t.$color-success-fore; }
  &.warning { background: t.$color-warning-soft; color: t.$color-warning-fore; }
  &.danger  { background: t.$color-danger-soft;  color: t.$color-danger-fore; }
  &.info    { background: t.$color-info-soft;    color: t.$color-info-fore; }
}

.pyramid {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: t.$space-1 + 2px;
  padding: t.$space-3 0;
}

.pyr-row {
  padding: t.$space-3 t.$space-4;
  border-radius: t.$radius-md;
  color: #fff;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  min-width: 200px;
  font-size: t.$font-size-sm;
  gap: t.$space-3;

  &.tam { background: t.$color-primary; }
  &.sam { background: t.$color-secondary; }
  &.som { background: t.$color-success; }
}

.action-list {
  margin: 0;
  padding-left: t.$space-5;
  font-size: t.$font-size-md;
  line-height: t.$line-height-relaxed;

  li { margin-bottom: t.$space-2; }
}

/* Side bars (compactas) */
.side-bars {
  display: flex;
  flex-direction: column;
  gap: t.$space-2 + 2px;
}

.side-bar {
  &__head {
    display: flex;
    justify-content: space-between;
    font-size: t.$font-size-xs;
    margin-bottom: 3px;
    color: t.$color-text;

    strong { color: t.$color-primary; }
  }

  &__track {
    height: 8px;
    background: t.$color-bg-soft;
    border-radius: t.$radius-sm;
    overflow: hidden;
  }

  &__fill {
    height: 100%;
    background: linear-gradient(90deg, t.$color-primary, t.$color-secondary);
    border-radius: t.$radius-sm;
  }
}

/* Responsivo */
@include t.respond-down(t.$bp-md) {
  .profile-grid { grid-template-columns: 1fr; }
  .profile-header {
    grid-template-columns: 1fr;
    text-align: center;
    justify-items: center;
  }
  .profile-header__meta { justify-content: center; }
  .logo-circle { width: 72px; height: 72px; font-size: 28px; }
}

/* Print */
@media print {
  .profile-actions { display: none !important; }
  .profile-view { padding: 0; }
  .profile-header,
  .profile-card {
    box-shadow: none;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .profile-header__score,
  .logo-circle,
  .pyr-row,
  .side-bar__fill {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
</style>
