<script setup>
defineProps({
  modelValue: { type: [String, Number], default: '' },
  type: { type: String, default: 'text' },
  placeholder: { type: String, default: '' },
  min: { type: [String, Number], default: null },
  max: { type: [String, Number], default: null },
  step: { type: [String, Number], default: null },
  size: { type: String, default: 'md' }
})
defineEmits(['update:modelValue'])
</script>

<template>
  <input
    :value="modelValue"
    :type="type"
    :placeholder="placeholder"
    :min="min"
    :max="max"
    :step="step"
    class="base-input"
    :class="[`is-${size}`]"
    @input="$emit('update:modelValue', $event.target.value)"
  />
</template>

<style lang="scss" scoped>
@use '@/styles/tokens' as t;

.base-input {
  width: 100%;
  border: 1px solid t.$color-border;
  border-radius: t.$radius-md;
  background: t.$color-surface;
  color: t.$color-text;
  font-family: inherit;
  transition: border-color 0.2s, box-shadow 0.2s;

  &.is-sm {
    padding: t.$space-2 t.$space-3 - 2px;
    font-size: t.$font-size-sm;
  }
  &.is-md {
    padding: t.$space-3 - 2px t.$space-3;
    font-size: t.$font-size-md;
  }
  &.is-num {
    text-align: center;
    padding: t.$space-2 t.$space-1;
    font-size: t.$font-size-sm;
    border-radius: t.$radius-sm;
  }

  &:focus {
    @include t.focus-ring;
  }
}
</style>
