<script setup>
defineProps({
  value: { type: Number, required: true },
  max: { type: Number, default: 100 },
  label: { type: String, default: '' }
})
</script>

<template>
  <div class="progress-wrap">
    <div class="progress-bar">
      <div class="progress-fill" :style="{ width: `${(value / max) * 100}%` }" />
    </div>
    <span v-if="label" class="progress-label">{{ label }}</span>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tokens' as t;

.progress-wrap {
  display: flex;
  align-items: center;
  gap: t.$space-3;
  margin-bottom: t.$space-4;
}

.progress-bar {
  flex: 1;
  height: 8px;
  background: t.$color-border;
  border-radius: t.$radius-xs;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, t.$color-primary, t.$color-secondary);
  width: 0%;
  transition: width 0.4s ease;
}

.progress-label {
  font-size: t.$font-size-sm;
  color: t.$color-text-light;
  white-space: nowrap;
}
</style>
