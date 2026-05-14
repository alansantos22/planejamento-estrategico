<script setup>
defineProps({
  variant: { type: String, default: 'info' } // success | warning | danger | info
})
</script>

<template>
  <span class="base-badge" :class="`is-${variant}`">
    <slot />
  </span>
</template>

<style lang="scss" scoped>
@use '@/styles/tokens' as t;

.base-badge {
  display: inline-block;
  font-size: t.$font-size-xxs;
  font-weight: t.$font-weight-semi;
  padding: 3px t.$space-3 - 2px;
  border-radius: t.$radius-pill;
  white-space: nowrap;

  &.is-success {
    @include t.status-fill('success');
  }
  &.is-warning {
    @include t.status-fill('warning');
  }
  &.is-danger {
    @include t.status-fill('danger');
  }
  &.is-info {
    @include t.status-fill('info');
  }
}
</style>
