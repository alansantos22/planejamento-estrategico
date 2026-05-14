<template>
  <div class="help-box">
    <slot />
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tokens' as t;

.help-box {
  background: t.$color-bg-soft;
  border-left: 4px solid t.$color-primary;
  padding: t.$space-3 t.$space-4 - 2px;
  border-radius: t.$radius-sm;
  font-size: t.$font-size-sm;
  margin-bottom: t.$space-4;

  :deep(strong) {
    color: t.$color-primary;
  }

  :deep(em) {
    font-style: italic;
  }
}
</style>
