<script setup>
import { ref } from 'vue'
import BaseButton from '@/components/common/BaseButton.vue'

const emit = defineEmits(['restart', 'export', 'import'])
const fileInput = ref(null)

function onImportClick() {
  fileInput.value?.click()
}

function onFileChange(e) {
  const file = e.target.files[0]
  if (file) emit('import', file)
  e.target.value = ''
}
</script>

<template>
  <header class="topbar">
    <div class="container topbar__inner">
      <RouterLink :to="{ name: 'landing' }" class="topbar__brand">
        <span class="topbar__mark">●</span>
        <span class="topbar__text">Planejamento<strong>Estratégico</strong></span>
      </RouterLink>

      <nav class="topbar__nav">
        <BaseButton variant="link" @click="emit('restart')">Recomeçar</BaseButton>
        <BaseButton variant="link" @click="emit('export')">Exportar</BaseButton>
        <BaseButton variant="link" @click="onImportClick">Importar</BaseButton>
        <input ref="fileInput" type="file" accept="application/json" hidden @change="onFileChange" />
      </nav>
    </div>
  </header>
</template>

<style lang="scss" scoped>
@use '@/styles/tokens' as t;

.topbar {
  background: t.$color-surface;
  border-bottom: 1px solid t.$color-border;
  position: sticky;
  top: 0;
  z-index: t.$z-sticky;

  &__inner {
    @include t.flex-between;
    height: 60px;
  }

  &__brand {
    @include t.flex(row, flex-start, center, t.$space-2);
    font-size: t.$font-size-xl;
    color: t.$color-text;
    text-decoration: none;

    strong {
      color: t.$color-primary;
      margin-left: 2px;
    }
  }

  &__mark {
    color: t.$color-primary;
    font-size: t.$font-size-2xl;
  }

  &__nav {
    display: flex;
    gap: t.$space-1;
  }
}
</style>
