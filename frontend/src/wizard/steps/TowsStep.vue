<script setup>
import { computed } from 'vue'
import { usePlanStore } from '@/stores/plan'
import { buildTOWS, swotProfile } from '@/lib/scoring'

const store = usePlanStore()
const tows = computed(() => buildTOWS(store.plan.swot))
const profile = computed(() => swotProfile(store.plan.swot))
</script>

<template>
  <div>
    <div class="card">
      <h3 style="margin:0 0 6px;color:var(--primary)">
        Perfil estratégico recomendado: {{ profile.strategy }}
      </h3>
      <p class="muted" style="margin:0 0 14px">{{ profile.description }}</p>
      <div class="dash-grid" style="margin:0">
        <div class="dash-tile"><h4>Forças (média)</h4><div class="big">{{ profile.scores.s.toFixed(1) }}</div></div>
        <div class="dash-tile"><h4>Fraquezas (média)</h4><div class="big">{{ profile.scores.w.toFixed(1) }}</div></div>
        <div class="dash-tile"><h4>Oportunidades (média)</h4><div class="big">{{ profile.scores.o.toFixed(1) }}</div></div>
        <div class="dash-tile"><h4>Ameaças (média)</h4><div class="big">{{ profile.scores.t.toFixed(1) }}</div></div>
      </div>
    </div>

    <div class="tows-grid">
      <div class="tows-cell">
        <span class="strategy-tag">Use forças para capturar oportunidades</span>
        <h4>FO: Estratégias Ofensivas</h4>
        <ul v-if="tows.FO.length">
          <li v-for="(item, i) in tows.FO" :key="i">{{ item.text }}</li>
        </ul>
        <p v-else class="muted" style="font-size:13px;margin:0">Adicione mais itens na SWOT para gerar sugestões.</p>
      </div>
      <div class="tows-cell">
        <span class="strategy-tag">Use forças para mitigar ameaças</span>
        <h4>FA: Estratégias Defensivas</h4>
        <ul v-if="tows.FA.length">
          <li v-for="(item, i) in tows.FA" :key="i">{{ item.text }}</li>
        </ul>
        <p v-else class="muted" style="font-size:13px;margin:0">Adicione mais itens na SWOT para gerar sugestões.</p>
      </div>
      <div class="tows-cell">
        <span class="strategy-tag">Corrija fraquezas para aproveitar oportunidades</span>
        <h4>WO: Estratégias de Reorientação</h4>
        <ul v-if="tows.WO.length">
          <li v-for="(item, i) in tows.WO" :key="i">{{ item.text }}</li>
        </ul>
        <p v-else class="muted" style="font-size:13px;margin:0">Adicione mais itens na SWOT para gerar sugestões.</p>
      </div>
      <div class="tows-cell">
        <span class="strategy-tag">Reduza fraquezas e proteja-se de ameaças</span>
        <h4>WA: Estratégias de Sobrevivência</h4>
        <ul v-if="tows.WA.length">
          <li v-for="(item, i) in tows.WA" :key="i">{{ item.text }}</li>
        </ul>
        <p v-else class="muted" style="font-size:13px;margin:0">Adicione mais itens na SWOT para gerar sugestões.</p>
      </div>
    </div>
  </div>
</template>
