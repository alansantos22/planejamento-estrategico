<script setup>
defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], default: 'n/d' },
  desc: { type: String, default: '' }
})
</script>

<template>
  <div class="dash-tile">
    <h4>{{ label }}</h4>
    <div class="dash-tile__value">{{ value }}</div>
    <div v-if="desc || $slots.desc" class="dash-tile__desc">
      <slot name="desc">
        <span>{{ desc }}</span>
      </slot>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tokens' as t;

.dash-tile {
  background: t.$color-surface;
  padding: t.$space-5 - 2px;
  border-radius: t.$radius-lg;
  border: 1px solid t.$color-border;

  h4 {
    margin: 0 0 t.$space-2 - 2px;
    font-size: t.$font-size-sm;
    color: t.$color-text-light;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  &__value {
    font-size: t.$font-size-2xl;
    font-weight: t.$font-weight-bold;
    color: t.$color-primary;
  }

  &__desc {
    font-size: t.$font-size-xs;
    color: t.$color-text-light;
    margin-top: t.$space-1;
  }
}
</style>
