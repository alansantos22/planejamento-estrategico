<script setup>
defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  rows: { type: [String, Number], default: null }
})
defineEmits(['update:modelValue'])
</script>

<template>
  <textarea
    :value="modelValue"
    :placeholder="placeholder"
    :rows="rows"
    class="base-textarea"
    @input="$emit('update:modelValue', $event.target.value)"
  />
</template>

<style lang="scss" scoped>
@use '@/styles/tokens' as t;

.base-textarea {
  width: 100%;
  min-height: 70px;
  padding: t.$space-3 - 2px t.$space-3;
  border: 1px solid t.$color-border;
  border-radius: t.$radius-md;
  background: t.$color-surface;
  color: t.$color-text;
  font-family: inherit;
  font-size: t.$font-size-md;
  resize: vertical;
  transition: border-color 0.2s, box-shadow 0.2s;

  &:focus {
    @include t.focus-ring;
  }
}
</style>
