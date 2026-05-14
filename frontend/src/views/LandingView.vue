<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseSwitch from '@/components/common/BaseSwitch.vue'
import { usePlanStore } from '@/stores/plan'

const planStore = usePlanStore()
const router = useRouter()

const features = [
  { title: 'ICP + Mercado', desc: 'Personas, TAM/SAM/SOM e mapa competitivo.' },
  { title: 'Produto + Pricing', desc: 'Identifica o produto-foco e a estratégia de preço.' },
  { title: 'Funil + Forecast', desc: 'Cálculo reverso de leads e projeção de 12 meses.' },
  { title: 'SWOT + OKRs + 5W2H', desc: 'Diagnóstico, objetivos mensuráveis e plano de ação.' },
  { title: 'Assistente IA', desc: 'Botão "me dê ideias" em cada etapa (opcional).' },
  { title: 'Exportação dos dados', desc: 'Planejamento salvo localmente. Exporte para PDF.' }
]

const fullMode = computed({
  get: () => planStore.isFullMode,
  set: (v) => planStore.setMode(v ? 'completo' : 'enxuto')
})

function start() {
  if (typeof planStore.plan.currentStep !== 'number') planStore.plan.currentStep = 0
  router.push({ name: 'wizard' })
}
</script>

<template>
  <section class="landing-view">
    <div class="container hero">
      <h1>
        Construa o <span class="hl">Planejamento Estratégico</span> da sua empresa em minutos
      </h1>
      <p class="hero__lead">
        Wizard guiado que cobre ICP, mercado, concorrência, produto-foco, pricing, funil de vendas,
        SWOT, OKRs e plano de ação — com cálculos automáticos e
        <strong>assistente de IA opcional</strong> para sugerir ideias quando você travar.
      </p>

      <div class="mode-switch">
        <div>
          <h3>Modo Completo</h3>
          <p class="muted">Inclui Visão, Business Model Canvas, Ishikawa e Métricas CAC/LTV.</p>
        </div>
        <BaseSwitch v-model="fullMode" />
      </div>

      <BaseButton variant="primary" size="lg" @click="start">Começar agora →</BaseButton>

      <div class="features">
        <div v-for="f in features" :key="f.title" class="feature">
          <h4>{{ f.title }}</h4>
          <p>{{ f.desc }}</p>
        </div>
      </div>
    </div>
  </section>
</template>

<style lang="scss" scoped>
@use '@/styles/tokens' as t;

.landing-view {
  padding-top: t.$space-5;
}

.hero {
  text-align: center;
  padding-top: t.$space-8;

  h1 {
    font-size: t.$font-size-4xl;
    line-height: t.$line-height-tight;
    margin-bottom: t.$space-4;
    color: t.$color-text;
  }

  &__lead {
    font-size: t.$font-size-lg;
    max-width: 680px;
    margin: 0 auto t.$space-7;
    color: t.$color-text-light;
  }
}

.mode-switch {
  @include t.flex-between;
  background: t.$color-surface;
  border: 1px solid t.$color-border;
  border-radius: t.$radius-lg;
  box-shadow: t.$shadow-md;
  padding: t.$space-5;
  max-width: 520px;
  margin: 0 auto t.$space-6;
  text-align: left;

  h3 {
    margin: 0 0 t.$space-1;
    font-size: t.$font-size-lg;
  }

  p {
    margin: 0;
    font-size: t.$font-size-sm;
  }
}

.features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: t.$space-4;
  margin-top: t.$space-9;
  text-align: left;
}

.feature {
  background: t.$color-surface;
  padding: t.$space-5;
  border-radius: t.$radius-lg;
  border: 1px solid t.$color-border;

  h4 {
    margin: 0 0 t.$space-2;
    color: t.$color-primary;
    font-size: t.$font-size-lg - 1px;
  }

  p {
    margin: 0;
    font-size: t.$font-size-md;
    color: t.$color-text-light;
  }
}

@include t.respond-down(t.$bp-md) {
  .hero h1 {
    font-size: 28px;
  }
}
</style>
