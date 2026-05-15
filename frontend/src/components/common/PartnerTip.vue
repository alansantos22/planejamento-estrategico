<script setup>
import { ExternalLink } from 'lucide-vue-next'

defineProps({
  href: { type: String, required: true },
  cta: { type: String, default: 'Saiba mais' }
})
</script>

<template>
  <p class="partner-tip">
    <slot />
    <a :href="href" target="_blank" rel="noopener noreferrer">
      {{ cta }} <ExternalLink :size="13" />
    </a>
  </p>
</template>

<style lang="scss" scoped>
@use '@/styles/tokens' as t;

.partner-tip {
  margin: t.$space-3 0 0;
  font-size: t.$font-size-xs;
  color: t.$color-text-light;
  line-height: t.$line-height-relaxed;

  a {
    color: t.$color-primary;
    font-weight: 600;
    text-decoration: none;
    white-space: nowrap;

    svg { vertical-align: -0.12em; }

    &:hover { text-decoration: underline; }
  }
}
</style>
