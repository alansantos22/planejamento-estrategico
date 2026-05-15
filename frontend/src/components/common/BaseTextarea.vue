<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  rows: { type: [String, Number], default: null },
  maxlength: { type: [String, Number], default: 500 }
})
defineEmits(['update:modelValue'])

const count = computed(() => (props.modelValue || '').length)
const max = computed(() => Number(props.maxlength) || 500)
</script>

<template>
  <div class="base-textarea-wrap">
    <textarea
      :value="modelValue"
      :placeholder="placeholder"
      :rows="rows"
      :maxlength="max"
      class="base-textarea"
      @input="$emit('update:modelValue', $event.target.value)"
    />
    <span class="base-textarea__counter" :class="{ 'is-limit': count >= max }">
      {{ count }}/{{ max }}
    </span>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tokens' as t;

.base-textarea-wrap {
  position: relative;
  display: block;
}

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

  &__counter {
    position: absolute;
    right: t.$space-2;
    bottom: t.$space-1;
    font-size: t.$font-size-xs;
    color: t.$color-text-light;
    background: t.$color-surface;
    padding: 0 t.$space-1;
    border-radius: t.$radius-sm;
    pointer-events: none;

    &.is-limit { color: t.$color-warning; font-weight: t.$font-weight-semi; }
  }
}
</style>
