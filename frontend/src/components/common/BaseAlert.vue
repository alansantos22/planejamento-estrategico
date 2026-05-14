<script setup>
defineProps({
  variant: { type: String, default: 'info' } // info | warning | danger | success
})
</script>

<template>
  <div class="base-alert" :class="`is-${variant}`">
    <slot />
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tokens' as t;

.base-alert {
  padding: t.$space-3 - 2px t.$space-4 - 2px;
  border-radius: t.$radius-md;
  font-size: t.$font-size-sm;
  line-height: t.$line-height-base;
  border-left: 4px solid t.$color-info;
  background: t.$color-info-soft;
  color: t.$color-info-fore;

  &.is-warning {
    border-left-color: t.$color-warning;
    background: t.$color-warning-soft;
    color: t.$color-warning-fore;
  }
  &.is-danger {
    border-left-color: t.$color-danger;
    background: t.$color-danger-soft;
    color: t.$color-danger-fore;
  }
  &.is-success {
    border-left-color: t.$color-success;
    background: t.$color-success-soft;
    color: t.$color-success-fore;
  }
}
</style>
