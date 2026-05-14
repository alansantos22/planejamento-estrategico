<script setup>
defineProps({
  cols: { type: [Number, String], default: 1 }
})
</script>

<template>
  <div class="form-grid" :class="`cols-${cols}`">
    <slot />
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tokens' as t;

.form-grid {
  display: grid;
  gap: t.$space-4;

  &.cols-2 {
    grid-template-columns: 1fr 1fr;
  }

  @include t.respond-down(t.$bp-md) {
    &.cols-2 {
      grid-template-columns: 1fr;
    }
  }
}
</style>
