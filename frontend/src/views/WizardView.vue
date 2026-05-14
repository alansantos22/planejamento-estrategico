<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { usePlanStore } from '@/stores/plan'
import { filteredSteps } from '@/wizard/steps'
import BaseButton from '@/components/common/BaseButton.vue'
import ProgressBar from '@/components/common/ProgressBar.vue'

const planStore = usePlanStore()
const router = useRouter()

const steps = computed(() => filteredSteps(planStore.plan.mode))
const stepIndex = computed(() => {
  const i = planStore.plan.currentStep || 0
  return Math.min(Math.max(0, i), steps.value.length - 1)
})
const currentStep = computed(() => steps.value[stepIndex.value])
const progress = computed(() => ((stepIndex.value + 1) / steps.value.length) * 100)
const isLast = computed(() => stepIndex.value === steps.value.length - 1)

function prev() {
  planStore.setStep(stepIndex.value - 1)
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function next() {
  const step = currentStep.value
  const err = step.validate?.(planStore.plan)
  if (err) {
    alert(err)
    return
  }
  if (isLast.value) {
    planStore.saveNow().finally(() => router.push({ name: 'dashboard' }))
  } else {
    planStore.setStep(stepIndex.value + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}
</script>

<template>
  <section class="wizard-view">
    <div class="container">
      <header class="wizard__head">
        <ProgressBar
          :value="progress"
          :label="`Passo ${stepIndex + 1} de ${steps.length}`"
        />
        <h2 class="wizard__title">{{ currentStep.title }}</h2>
        <p class="step-desc muted">{{ currentStep.desc }}</p>
      </header>

      <div class="wizard__container">
        <component :is="currentStep.component" />
      </div>

      <div class="wizard__actions">
        <BaseButton variant="ghost" :disabled="stepIndex === 0" @click="prev">← Voltar</BaseButton>
        <BaseButton variant="primary" @click="next">
          {{ isLast ? 'Ver Resumo →' : 'Continuar →' }}
        </BaseButton>
      </div>
    </div>
  </section>
</template>

<style lang="scss" scoped>
@use '@/styles/tokens' as t;

.wizard-view {
  padding-top: t.$space-2;
}

.wizard {
  &__head {
    margin-bottom: t.$space-6;
  }

  &__title {
    font-size: t.$font-size-3xl;
    margin: 0 0 t.$space-2;
    color: t.$color-text;
  }

  &__container {
    margin-bottom: t.$space-6;
  }

  &__actions {
    @include t.flex-between;
    gap: t.$space-3;
    position: sticky;
    bottom: t.$space-4;
    background: t.$color-bg;
    padding: t.$space-3 0;
  }
}

.step-desc {
  margin: 0;
  font-size: t.$font-size-md;
}

@include t.respond-down(t.$bp-md) {
  .wizard__title {
    font-size: t.$font-size-2xl;
  }
}
</style>
