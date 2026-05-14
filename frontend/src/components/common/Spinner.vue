<template>
  <div class="spinner" aria-label="Carregando" role="status" />
</template>

<style lang="scss" scoped>
@use '@/styles/tokens' as t;

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid t.$color-bg-soft;
  border-top-color: t.$color-primary;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
</style>
