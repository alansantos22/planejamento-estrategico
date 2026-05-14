<script setup>
defineProps({
  title: { type: String, default: '' },
  size: { type: String, default: 'md' }
})
const emit = defineEmits(['close'])

function handleOverlay(e) {
  if (e.target.classList.contains('base-modal__overlay')) emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div class="base-modal__overlay" @mousedown="handleOverlay">
      <div class="base-modal" :class="[`is-${size}`]" role="dialog">
        <header class="base-modal__head">
          <slot name="header">
            <h3>{{ title }}</h3>
          </slot>
          <button class="base-modal__close" aria-label="Fechar" @click="emit('close')">×</button>
        </header>
        <div class="base-modal__body">
          <slot />
        </div>
        <footer v-if="$slots.footer" class="base-modal__foot">
          <slot name="footer" />
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<style lang="scss" scoped>
@use '@/styles/tokens' as t;

.base-modal__overlay {
  position: fixed;
  inset: 0;
  background: t.$color-overlay;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: t.$z-modal;
  padding: t.$space-5;
  animation: fade-in 0.18s ease-out;
}

.base-modal {
  background: t.$color-surface;
  border-radius: t.$radius-lg;
  width: 100%;
  max-height: 85vh;
  overflow-y: auto;
  padding: t.$space-6;
  box-shadow: t.$shadow-xl;
  animation: pop-in 0.22s ease-out;

  &.is-sm { max-width: 420px; }
  &.is-md { max-width: 720px; }
  &.is-lg { max-width: 960px; }

  &__head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: t.$space-3;
    padding-bottom: t.$space-3;
    margin-bottom: t.$space-4;
    border-bottom: 1px solid t.$color-border;

    h3 {
      margin: 0;
      color: t.$color-primary;
      font-size: t.$font-size-xl;
    }
  }

  &__close {
    @include t.reset-button;
    font-size: t.$font-size-2xl;
    line-height: 1;
    color: t.$color-text-light;
    padding: t.$space-1 t.$space-2;
    border-radius: t.$radius-sm;

    &:hover {
      color: t.$color-danger;
      background: var(--color-danger-soft-hover);
    }
  }

  &__body {
    font-size: t.$font-size-md;
    line-height: t.$line-height-relaxed;
  }

  &__foot {
    display: flex;
    gap: t.$space-2;
    justify-content: flex-end;
    margin-top: t.$space-4;
    padding-top: t.$space-3;
    border-top: 1px solid t.$color-border;
  }
}
</style>
