<script setup>
import { computed, ref } from 'vue'
import { usePlanStore } from '@/stores/plan'
import { competitionAnalysis } from '@/lib/scoring'
import HelpBox from '@/components/common/HelpBox.vue'
import AiHelperButton from '@/components/ai/AiHelperButton.vue'

const store = usePlanStore()
const c = store.plan.competition

const newCrit = ref('')

const analysis = computed(() => competitionAnalysis(store.plan.competition))

function save() { store.save() }

function addCriterion() {
  const v = newCrit.value.trim()
  if (v && !c.criteria.includes(v)) {
    c.criteria.push(v)
    newCrit.value = ''
    save()
  }
}

function removeCriterion(i) {
  const removed = c.criteria[i]
  c.criteria.splice(i, 1)
  c.competitors.forEach(co => { if (co.scores) delete co.scores[removed] })
  if (c.selfScores) delete c.selfScores[removed]
  save()
}

function addCompetitor() {
  c.competitors.push({ name: '', scores: {} })
  save()
}

function removeCompetitor(i) {
  c.competitors.splice(i, 1)
  save()
}

function selfScore(cr) {
  return c.selfScores[cr] || ''
}
function setSelfScore(cr, val) {
  c.selfScores[cr] = val
  save()
}
function compScore(co, cr) {
  return co.scores?.[cr] || ''
}
function setCompScore(co, cr, val) {
  co.scores = co.scores || {}
  co.scores[cr] = val
  save()
}

function selfTotal() {
  return c.criteria.reduce((s, cr) => s + (Number(c.selfScores[cr]) || 0), 0)
}
function compTotal(co) {
  return c.criteria.reduce((s, cr) => s + (Number(co.scores?.[cr]) || 0), 0)
}
</script>

<template>
  <div>
    <HelpBox>
      <strong>Como usar:</strong> ajuste os critérios se quiser. Dê notas 1-5 para cada concorrente.
      O sistema calcula seu diferencial e identifica o "espaço em branco".
    </HelpBox>

    <AiHelperButton agent="competitorResearcher" label="Buscar concorrentes prováveis" />

    <!-- Critérios -->
    <div class="card" style="margin-top:12px">
      <h4 style="margin:0 0 10px">Critérios de avaliação</h4>
      <div class="chip-list">
        <span v-for="(cr, i) in c.criteria" :key="i" class="chip">
          {{ cr }} <button :data-del="i" @click="removeCriterion(i)">×</button>
        </span>
      </div>
      <div style="display:flex;gap:8px;margin-top:10px">
        <input class="input" v-model="newCrit" placeholder="Adicionar critério (ex: Inovação)" style="flex:1" @keyup.enter="addCriterion" />
        <button class="btn ghost sm" @click="addCriterion">+ Adicionar</button>
      </div>
    </div>

    <!-- Matriz -->
    <div class="card">
      <h4 style="margin:0 0 10px">Matriz competitiva</h4>
      <div style="overflow-x:auto">
        <table class="comp-matrix">
          <thead>
            <tr>
              <th>Empresa</th>
              <th v-for="cr in c.criteria" :key="cr">{{ cr }}</th>
              <th>Total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <!-- Você -->
            <tr class="self-row">
              <td><strong>Você</strong></td>
              <td v-for="cr in c.criteria" :key="cr">
                <input class="num" type="number" min="1" max="5" :value="selfScore(cr)" @input="setSelfScore(cr, $event.target.value)" />
              </td>
              <td class="total">{{ selfTotal() || 'n/d' }}</td>
              <td></td>
            </tr>
            <!-- Concorrentes -->
            <tr v-for="(co, i) in c.competitors" :key="i">
              <td>
                <input class="input" v-model="co.name" :placeholder="`Concorrente ${i + 1}`" @input="save" />
              </td>
              <td v-for="cr in c.criteria" :key="cr">
                <input class="num" type="number" min="1" max="5" :value="compScore(co, cr)" @input="setCompScore(co, cr, $event.target.value)" />
              </td>
              <td class="total">{{ compTotal(co) || 'n/d' }}</td>
              <td><button class="btn-icon" @click="removeCompetitor(i)">×</button></td>
            </tr>
          </tbody>
        </table>
      </div>
      <button class="btn-add" @click="addCompetitor">+ Adicionar concorrente</button>
    </div>

    <!-- Análise -->
    <div v-if="analysis.rankings.length" class="card">
      <h4 style="margin:0 0 10px">Análise</h4>
      <div class="dash-grid" style="margin-bottom:14px">
        <div class="dash-tile">
          <h4>Diferenciação média</h4>
          <div class="big">{{ (analysis.differentiationScore >= 0 ? '+' : '') + analysis.differentiationScore.toFixed(2) }}</div>
          <div class="desc">vs. média dos concorrentes</div>
        </div>
        <div class="dash-tile">
          <h4>Líder do ranking</h4>
          <div class="big">{{ analysis.rankings[0].name }}</div>
        </div>
        <div class="dash-tile">
          <h4>Espaço em branco</h4>
          <div class="big">{{ analysis.whitespace.length ? analysis.whitespace.join(', ') : 'n/d' }}</div>
          <div class="desc">{{ analysis.whitespace.length ? 'critérios fracos em todos' : 'todos os critérios cobertos' }}</div>
        </div>
      </div>
      <h5 style="margin:12px 0 6px">Ranking</h5>
      <ol style="margin:0;padding-left:20px">
        <li v-for="r in analysis.rankings" :key="r.name">{{ r.name }}: <strong>{{ r.total }}</strong> pts</li>
      </ol>
    </div>
  </div>
</template>
