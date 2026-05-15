<template>
  <footer class="app-footer">
    <div class="container">
      <p>Feito por <a href="https://unli.com.br" target="_blank" rel="noopener noreferrer"><strong>Unli Studio</strong></a></p>
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

  a {
    color: inherit;
    text-decoration: none;

    &:hover {
      color: t.$color-primary;
      text-decoration: underline;
    }
  }
}
</style>
