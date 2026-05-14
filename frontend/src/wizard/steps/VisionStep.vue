<script setup>
import { usePlanStore } from '@/stores/plan'
import BaseField from '@/components/common/BaseField.vue'
import BaseTextarea from '@/components/common/BaseTextarea.vue'
import FormGrid from '@/components/common/FormGrid.vue'
import HelpBox from '@/components/common/HelpBox.vue'

const store = usePlanStore()
const v = store.plan.vision

function save() { store.save() }
</script>

<template>
  <div>
    <HelpBox>
      <strong>Dica:</strong> Visão é qualitativa e inspiracional. Não precisa ser perfeita agora; pode evoluir.
    </HelpBox>
    <div class="card">
      <FormGrid>
        <BaseField label="Propósito" hint="Por que sua empresa existe?">
          <BaseTextarea
            v-model="v.purpose"
            placeholder="Ex: Mostrar que o Brasil é capaz de inovar em escala global"
            @update:model-value="save"
          />
        </BaseField>
        <BaseField label="Core" hint="Qual é o seu DNA, sua essência?">
          <BaseTextarea
            v-model="v.core"
            placeholder="Ex: Criatividade na resolução de problemas"
            @update:model-value="save"
          />
        </BaseField>
        <BaseField label="Visão de 3 a 5 anos">
          <BaseTextarea
            v-model="v.vision3to5"
            placeholder="Ex: Ser o maior hub de inovação e tecnologia do Brasil"
            @update:model-value="save"
          />
        </BaseField>
        <BaseField label="Sonho Grande" hint="BHAG - Big Hairy Audacious Goal">
          <BaseTextarea
            v-model="v.bigDream"
            placeholder="Ex: Atingir status de unicórnio em 7 anos"
            @update:model-value="save"
          />
        </BaseField>
      </FormGrid>
    </div>
  </div>
</template>
