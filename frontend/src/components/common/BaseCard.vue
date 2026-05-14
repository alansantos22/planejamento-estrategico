<script setup>
defineProps({
  title: { type: String, default: '' },
  flush: { type: Boolean, default: false }
})
</script>

<template>
  <section class="base-card" :class="{ 'is-flush': flush }">
    <header v-if="title || $slots.header" class="base-card__head">
      <slot name="header">
        <h4>{{ title }}</h4>
      </slot>
    </header>
    <div class="base-card__body">
      <slot />
    </div>
    <footer v-if="$slots.footer" class="base-card__foot">
      <slot name="footer" />
    </footer>
  </section>
</template>

<style lang="scss" scoped>
@use '@/styles/tokens' as t;

.base-card {
  background: t.$color-surface;
  border: 1px solid t.$color-border;
  border-radius: t.$radius-lg;
  box-shadow: t.$shadow-md;
  padding: t.$space-6;
  margin-bottom: t.$space-4;

  &.is-flush {
    padding: 0;
  }

  &__head {
    margin-bottom: t.$space-3;

    h4 {
      margin: 0;
      font-size: t.$font-size-lg;
      color: t.$color-text;
    }
  }

  &__foot {
    margin-top: t.$space-4;
    padding-top: t.$space-3;
    border-top: 1px solid t.$color-border;
  }
}
</style>
