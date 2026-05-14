<template>
  <footer class="app-footer">
    <div class="container">
      <p>MVP gratuito • Plano persistido em SQLite no backend local • Feito por <strong>MeChame</strong></p>
    </div>
  </footer>
</template>

<style lang="scss" scoped>
@use '@/styles/tokens' as t;

.app-footer {
  background: t.$color-surface;
  border-top: 1px solid t.$color-border;
  padding: t.$space-5 0;
  margin-top: t.$space-8;

  p {
    text-align: center;
    font-size: t.$font-size-sm;
    color: t.$color-text-light;
  }
}
</style>
