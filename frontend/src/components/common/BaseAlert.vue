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
  background: #eaf3fb;
  color: #1f4e79;

  &.is-warning {
    border-left-color: t.$color-warning;
    background: #fff8e6;
    color: #7a5a00;
  }
  &.is-danger {
    border-left-color: t.$color-danger;
    background: #fde9e7;
    color: #7a1c14;
  }
  &.is-success {
    border-left-color: t.$color-success;
    background: #e6f7ec;
    color: #14532d;
  }
}
</style>
