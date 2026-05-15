<script setup>
import { ref } from 'vue'
import { Sun, Moon } from 'lucide-vue-next'
import BaseButton from '@/components/common/BaseButton.vue'
import { useThemeStore } from '@/stores/theme'

const emit = defineEmits(['restart', 'export', 'import'])
const fileInput = ref(null)
const theme = useThemeStore()

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
        <button
          type="button"
          class="theme-toggle"
          :aria-label="theme.isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'"
          :title="theme.isDark ? 'Tema claro' : 'Tema escuro'"
          @click="theme.toggle()"
        >
          <Sun v-if="theme.isDark" :size="18" aria-hidden="true" />
          <Moon v-else :size="18" aria-hidden="true" />
        </button>
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
    align-items: center;
    gap: t.$space-1;
  }
}

.theme-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  margin-left: t.$space-2;
  background: transparent;
  border: 1px solid t.$color-border;
  border-radius: t.$radius-pill;
  color: t.$color-text;
  cursor: pointer;
  font-size: t.$font-size-md;
  line-height: 1;
  transition: background-color 0.2s, border-color 0.2s, color 0.2s;

  &:hover {
    background: t.$color-bg-soft;
    border-color: t.$color-primary;
    color: t.$color-primary;
  }

  &:focus-visible {
    @include t.focus-ring;
  }
}
</style>
