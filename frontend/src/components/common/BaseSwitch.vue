<script setup>
defineProps({
  modelValue: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false }
})
defineEmits(['update:modelValue'])
</script>

<template>
  <label class="base-switch" :class="{ 'is-disabled': disabled }">
    <input
      type="checkbox"
      :checked="modelValue"
      :disabled="disabled"
      @change="$emit('update:modelValue', $event.target.checked)"
    />
    <span class="base-switch__slider" />
  </label>
</template>

<style lang="scss" scoped>
@use '@/styles/tokens' as t;

.base-switch {
  position: relative;
  display: inline-block;
  width: 52px;
  height: 28px;
  flex-shrink: 0;

  &.is-disabled {
    opacity: 0.5;
    cursor: not-allowed;

    .base-switch__slider { cursor: not-allowed; }
  }

  input {
    opacity: 0;
    width: 0;
    height: 0;

    &:checked + .base-switch__slider {
      background: t.$color-primary;

      &::before {
        transform: translateX(24px);
      }
    }
  }

  &__slider {
    position: absolute;
    cursor: pointer;
    inset: 0;
    background: #ccc;
    border-radius: 28px;
    transition: background 0.3s;

    &::before {
      content: '';
      position: absolute;
      height: 22px;
      width: 22px;
      left: 3px;
      bottom: 3px;
      background: #fff;
      border-radius: 50%;
      transition: transform 0.3s;
    }
  }
}
</style>
