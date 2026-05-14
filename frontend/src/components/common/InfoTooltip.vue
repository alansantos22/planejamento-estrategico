<script setup>
defineProps({
  text: { type: String, default: '' },
  placement: { type: String, default: 'top' } // top | bottom
})
</script>

<template>
  <span class="info-tooltip" :class="`is-${placement}`" tabindex="0" :aria-label="text">
    <span class="info-tooltip__icon" aria-hidden="true">i</span>
    <span class="info-tooltip__bubble" role="tooltip">
      <slot>{{ text }}</slot>
    </span>
  </span>
</template>

<style lang="scss" scoped>
@use '@/styles/tokens' as t;

.info-tooltip {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  outline: 0;

  &__icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: t.$color-bg-soft;
    border: 1px solid t.$color-border;
    color: t.$color-text-light;
    font-size: 11px;
    font-weight: 700;
    font-style: italic;
    font-family: serif;
    line-height: 1;
    cursor: help;
    transition: background 0.15s, color 0.15s, border-color 0.15s;
  }

  &:hover &__icon,
  &:focus-visible &__icon {
    background: t.$color-primary;
    color: #fff;
    border-color: t.$color-primary;
  }

  &__bubble {
    position: absolute;
    left: 50%;
    transform: translateX(-50%) translateY(-4px);
    bottom: calc(100% + 6px);
    min-width: 200px;
    max-width: 280px;
    padding: t.$space-2 t.$space-3;
    background: #1f2937;
    color: #fff;
    font-size: t.$font-size-sm;
    font-weight: t.$font-weight-regular;
    line-height: 1.4;
    border-radius: t.$radius-md;
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.18);
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    transition: opacity 0.15s, transform 0.15s, visibility 0.15s;
    z-index: 50;
    white-space: normal;
    text-align: left;

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

  &.is-bottom &__bubble {
    bottom: auto;
    top: calc(100% + 6px);
    transform: translateX(-50%) translateY(4px);

    &::after {
      top: auto;
      bottom: 100%;
      border-top-color: transparent;
      border-bottom-color: #1f2937;
    }
  }

  &:hover &__bubble,
  &:focus-visible &__bubble {
    opacity: 1;
    visibility: visible;
    transform: translateX(-50%) translateY(0);
    pointer-events: auto;
  }
}
</style>
