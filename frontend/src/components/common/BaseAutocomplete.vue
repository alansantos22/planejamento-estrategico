<script setup>
import { computed, ref, watch, nextTick, onBeforeUnmount } from 'vue'
import { X } from 'lucide-vue-next'

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  options: { type: Array, required: true },
  placeholder: { type: String, default: '' },
  size: { type: String, default: 'md' },
  maxResults: { type: Number, default: 8 },
  otherLabel: { type: String, default: 'Outro' },
  otherPlaceholder: { type: String, default: 'Descreva...' }
})
const emit = defineEmits(['update:modelValue'])

const wrapper = ref(null)
const inputEl = ref(null)
const otherInputEl = ref(null)
const open = ref(false)
const highlight = ref(-1)
const otherMode = ref(false)

const normalized = computed(() => {
  const list = (props.options || []).map((opt) =>
    typeof opt === 'object' && opt !== null
      ? { value: String(opt.value ?? opt.label ?? ''), label: String(opt.label ?? opt.value ?? '') }
      : { value: String(opt), label: String(opt) }
  )
  const hasOther = list.some((o) => o.value === props.otherLabel)
  if (!hasOther) list.push({ value: props.otherLabel, label: props.otherLabel, isOther: true })
  else list.find((o) => o.value === props.otherLabel).isOther = true
  return list
})

function stripAccents(s) {
  return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

const filtered = computed(() => {
  const all = normalized.value
  const other = all.find((o) => o.isOther)
  const rest = all.filter((o) => !o.isOther)
  const q = stripAccents(props.modelValue || '').trim()
  const matched = q ? rest.filter((o) => stripAccents(o.label).includes(q)) : rest
  const limited = matched.slice(0, Math.max(1, props.maxResults - 1))
  return other ? [...limited, other] : limited
})

function onInput(e) {
  otherMode.value = false
  emit('update:modelValue', e.target.value)
  open.value = true
  highlight.value = -1
}

function onFocus() {
  if (!otherMode.value) open.value = true
}

function select(opt) {
  if (opt.isOther) {
    otherMode.value = true
    emit('update:modelValue', '')
    open.value = false
    highlight.value = -1
    nextTick(() => otherInputEl.value?.focus())
    return
  }
  otherMode.value = false
  emit('update:modelValue', opt.value)
  open.value = false
  highlight.value = -1
  nextTick(() => inputEl.value?.blur())
}

function onOtherInput(e) {
  emit('update:modelValue', e.target.value)
}

function clearOther() {
  otherMode.value = false
  emit('update:modelValue', '')
  nextTick(() => inputEl.value?.focus())
}

function onKeydown(e) {
  if (!open.value && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
    open.value = true
    return
  }
  if (!open.value) return
  const max = filtered.value.length - 1
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    highlight.value = highlight.value >= max ? 0 : highlight.value + 1
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    highlight.value = highlight.value <= 0 ? max : highlight.value - 1
  } else if (e.key === 'Enter') {
    if (highlight.value >= 0 && filtered.value[highlight.value]) {
      e.preventDefault()
      select(filtered.value[highlight.value])
    } else {
      open.value = false
    }
  } else if (e.key === 'Escape') {
    open.value = false
  }
}

function onDocClick(e) {
  if (!wrapper.value) return
  if (!wrapper.value.contains(e.target)) open.value = false
}

watch(open, (v) => {
  if (v) document.addEventListener('mousedown', onDocClick)
  else document.removeEventListener('mousedown', onDocClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onDocClick)
})

const mainDisplay = computed(() => (otherMode.value ? props.otherLabel : props.modelValue))
</script>

<template>
  <div ref="wrapper" class="ac-wrapper">
    <input
      ref="inputEl"
      :value="mainDisplay"
      :placeholder="placeholder"
      :readonly="otherMode"
      type="text"
      autocomplete="off"
      class="base-input"
      :class="[`is-${size}`, { 'is-other-locked': otherMode }]"
      @input="onInput"
      @focus="onFocus"
      @keydown="onKeydown"
    />
    <ul v-if="open && filtered.length" class="ac-menu" role="listbox">
      <li
        v-for="(opt, i) in filtered"
        :key="opt.value"
        class="ac-option"
        :class="{ 'is-highlighted': i === highlight, 'is-other': opt.isOther }"
        role="option"
        :aria-selected="i === highlight"
        @mousedown.prevent="select(opt)"
        @mouseenter="highlight = i"
      >
        {{ opt.label }}
      </li>
    </ul>

    <div v-if="otherMode" class="ac-other">
      <input
        ref="otherInputEl"
        :value="modelValue"
        :placeholder="otherPlaceholder"
        type="text"
        autocomplete="off"
        class="base-input is-md"
        @input="onOtherInput"
      />
      <button type="button" class="ac-other__clear" aria-label="Voltar à lista" title="Voltar à lista" @click="clearOther"><X :size="18" /></button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tokens' as t;

.ac-wrapper {
  position: relative;
  width: 100%;
}

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

  &:focus {
    @include t.focus-ring;
  }

  &.is-other-locked {
    background: t.$color-bg-soft;
    color: t.$color-text-light;
    cursor: pointer;
  }
}

.ac-menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 50;
  max-height: 260px;
  overflow-y: auto;
  margin: 0;
  padding: 4px;
  list-style: none;
  background: t.$color-surface;
  border: 1px solid t.$color-border;
  border-radius: t.$radius-md;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.ac-option {
  padding: t.$space-2 t.$space-3;
  border-radius: t.$radius-sm;
  font-size: t.$font-size-sm;
  color: t.$color-text;
  cursor: pointer;

  &.is-highlighted,
  &:hover {
    background: t.$color-bg-soft;
  }

  &.is-other {
    border-top: 1px solid t.$color-border;
    margin-top: 4px;
    padding-top: t.$space-2 + 2px;
    font-style: italic;
    color: t.$color-text-light;
  }
}

.ac-other {
  position: relative;
  margin-top: 6px;

  &__clear {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: transparent;
    font-size: 20px;
    line-height: 1;
    color: t.$color-text-light;
    cursor: pointer;
    padding: 0 4px;

    &:hover { color: t.$color-text; }
  }
}
</style>
