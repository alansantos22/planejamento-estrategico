<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  placeholder: { type: String, default: '' },
  prefix: { type: String, default: 'R$' },
  size: { type: String, default: 'md' }
})
const emit = defineEmits(['update:modelValue'])

const display = computed(() => {
  const n = Number(props.modelValue)
  if (!props.modelValue && props.modelValue !== 0) return ''
  if (!Number.isFinite(n)) return ''
  return n.toLocaleString('pt-BR')
})

function onInput(e) {
  const digits = String(e.target.value || '').replace(/\D+/g, '')
  if (!digits) {
    emit('update:modelValue', '')
    e.target.value = ''
    return
  }
  const n = parseInt(digits, 10)
  emit('update:modelValue', n)
  // Reformata em tempo real para manter os separadores conforme o usuário digita.
  e.target.value = n.toLocaleString('pt-BR')
}
</script>

<template>
  <div class="money" :class="[`is-${size}`]">
    <span class="money__prefix">{{ prefix }}</span>
    <input
      type="text"
      inputmode="numeric"
      :value="display"
      :placeholder="placeholder"
      class="money__input"
      @input="onInput"
    />
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tokens' as t;

.money {
  display: flex;
  align-items: stretch;
  width: 100%;
  border: 1px solid t.$color-border;
  border-radius: t.$radius-md;
  background: t.$color-surface;
  overflow: hidden;
  transition: border-color 0.2s, box-shadow 0.2s;

  &:focus-within {
    @include t.focus-ring;
  }

  &__prefix {
    padding: 0 t.$space-3;
    display: flex;
    align-items: center;
    background: t.$color-bg-soft;
    color: t.$color-text-light;
    font-size: t.$font-size-sm;
    border-right: 1px solid t.$color-border;
    user-select: none;
  }

  &__input {
    flex: 1;
    border: 0;
    outline: 0;
    background: transparent;
    color: t.$color-text;
    font-family: inherit;
    padding: t.$space-3 - 2px t.$space-3;
    font-size: t.$font-size-md;
  }

  &.is-sm .money__input {
    padding: t.$space-2 t.$space-3 - 2px;
    font-size: t.$font-size-sm;
  }
}
</style>
