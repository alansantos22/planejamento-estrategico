<script setup>
defineProps({
  label: { type: String, default: '' },
  hint: { type: String, default: '' },
  inline: { type: Boolean, default: false },
  span: { type: [Number, String], default: null }
})
</script>

<template>
  <label class="base-field" :class="{ 'is-inline': inline }" :style="span ? { gridColumn: `span ${span}` } : null">
    <span v-if="label || $slots.label" class="base-field__label">
      <slot name="label">{{ label }}</slot>
      <small v-if="hint">{{ hint }}</small>
    </span>
    <slot />
  </label>
</template>

<style lang="scss" scoped>
@use '@/styles/tokens' as t;

.base-field {
  display: flex;
  flex-direction: column;
  gap: t.$space-2 - 2px;
  font-size: t.$font-size-sm;
  font-weight: t.$font-weight-semi;
  color: t.$color-text;

  &__label {
    display: flex;
    align-items: center;
    gap: t.$space-2;
    flex-wrap: wrap;

    small {
      font-weight: t.$font-weight-regular;
      color: t.$color-text-light;
    }
  }

  &.is-inline {
    flex-direction: row;
    align-items: center;
    gap: t.$space-2;
    font-weight: t.$font-weight-regular;
  }
}
</style>
