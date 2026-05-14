<script setup>
defineProps({
  variant: { type: String, default: 'primary' },
  size: { type: String, default: 'md' },
  type: { type: String, default: 'button' },
  disabled: { type: Boolean, default: false },
  block: { type: Boolean, default: false }
})
</script>

<template>
  <button
    :type="type"
    :disabled="disabled"
    class="base-button"
    :class="[`is-${variant}`, `is-${size}`, { 'is-block': block }]"
  >
    <slot />
  </button>
</template>

<style lang="scss" scoped>
@use '@/styles/tokens' as t;

.base-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: t.$space-2;
  font-family: inherit;
  font-weight: t.$font-weight-semi;
  border-radius: t.$radius-md;
  border: 1px solid transparent;
  cursor: pointer;
  transition: background-color 0.2s, color 0.2s, transform 0.2s, box-shadow 0.2s, border-color 0.2s;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  // ===== sizes
  &.is-sm {
    padding: t.$space-2 t.$space-3;
    font-size: t.$font-size-sm;
  }
  &.is-md {
    padding: t.$space-3 t.$space-5 - 2px;
    font-size: t.$font-size-base;
  }
  &.is-lg {
    padding: t.$space-4 t.$space-7;
    font-size: t.$font-size-lg;
  }

  &.is-block {
    width: 100%;
  }

  // ===== variants
  &.is-primary {
    background: t.$color-primary;
    color: #fff;

    &:hover:not(:disabled) {
      background: t.$color-primary-hover;
      box-shadow: t.$shadow-lg;
      transform: translateY(-1px);
    }
  }

  &.is-ghost {
    background: transparent;
    color: t.$color-text;
    border-color: t.$color-border;

    &:hover:not(:disabled) {
      border-color: t.$color-primary;
      color: t.$color-primary;
    }
  }

  &.is-danger {
    background: t.$color-danger;
    color: #fff;

    &:hover:not(:disabled) {
      filter: brightness(0.92);
    }
  }

  &.is-link {
    background: none;
    border: none;
    color: t.$color-text-light;
    padding: t.$space-2 t.$space-3;
    font-size: t.$font-size-md;
    font-weight: t.$font-weight-regular;
    border-radius: t.$radius-sm;

    &:hover:not(:disabled) {
      background: t.$color-bg-soft;
      color: t.$color-primary;
    }
  }

  &.is-icon {
    padding: t.$space-2 - 1px t.$space-2;
    background: transparent;
    border: 1px solid t.$color-border;
    color: t.$color-danger;
    border-radius: t.$radius-sm;
    font-size: t.$font-size-md;
    font-weight: t.$font-weight-bold;
    line-height: 1;

    &:hover:not(:disabled) {
      background: #fff5f5;
      border-color: t.$color-danger;
    }
  }

  &.is-add {
    background: t.$color-bg-soft;
    border: 1px dashed t.$color-primary;
    color: t.$color-primary;
    padding: t.$space-2 t.$space-3;
    font-size: t.$font-size-sm;
    width: 100%;
    margin-top: t.$space-2;
    border-radius: t.$radius-sm;

    &:hover:not(:disabled) {
      background: t.$color-primary;
      color: #fff;
    }
  }

  &.is-ai {
    background: linear-gradient(135deg, #8e44ad, #3498db);
    color: #fff;
    padding: t.$space-3 t.$space-4;
    font-size: t.$font-size-sm;
    margin-bottom: t.$space-4;

    &:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(142, 68, 173, 0.3);
    }
  }
}
</style>
