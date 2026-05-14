<script setup>
defineProps({
  modelValue: { type: [String, Number], default: '' },
  options: { type: Array, required: true },
  placeholder: { type: String, default: '— selecione —' }
})
defineEmits(['update:modelValue'])

function normalize(opt) {
  if (typeof opt === 'object' && opt !== null) {
    return { value: opt.value ?? opt.label ?? '', label: opt.label ?? String(opt.value ?? '') }
  }
  return { value: opt, label: opt === '' ? '' : String(opt) }
}
</script>

<template>
  <select
    :value="modelValue"
    class="base-select"
    @change="$emit('update:modelValue', $event.target.value)"
  >
    <option
      v-for="opt in options.map(normalize)"
      :key="`${opt.value}-${opt.label}`"
      :value="opt.value"
    >
      {{ opt.label || placeholder }}
    </option>
  </select>
</template>

<style lang="scss" scoped>
@use '@/styles/tokens' as t;

.base-select {
  width: 100%;
  padding: t.$space-3 - 2px t.$space-3;
  border: 1px solid t.$color-border;
  border-radius: t.$radius-md;
  background: t.$color-surface;
  color: t.$color-text;
  font-family: inherit;
  font-size: t.$font-size-md;
  transition: border-color 0.2s, box-shadow 0.2s;

  &:focus {
    @include t.focus-ring;
  }
}
</style>
