<script setup>
import { computed } from 'vue'
import BaseButton from '@/components/common/BaseButton.vue'
import { usePlanStore } from '@/stores/plan'
import { useAiAgent } from '@/composables/useAiAgent'

const props = defineProps({
  agent: { type: String, required: true },
  label: { type: String, default: 'Assistente, me dê ideias' }
})

const planStore = usePlanStore()
const { isRunning, run } = useAiAgent()

const disabled = computed(() => !planStore.aiBackendUrl)
const title = computed(() =>
  disabled.value ? 'Configure a URL do backend de IA em "Config" no topo' : ''
)

function onClick() {
  run(props.agent)
}
</script>

<template>
  <BaseButton
    variant="ai"
    size="sm"
    :disabled="isRunning"
    :title="title"
    class="ai-helper-btn"
    :class="{ 'is-faded': disabled }"
    @click="onClick"
  >
    <span>🤖</span>
    <span>{{ isRunning ? 'Pensando…' : label }}</span>
  </BaseButton>
</template>

<style lang="scss" scoped>
.ai-helper-btn.is-faded {
  opacity: 0.6;
}
</style>
