/**
 * Algoritmos sistêmicos do planejamento — porto direto da versão antiga em JS puro.
 * Sem dependências externas, sem reatividade — funções puras.
 */

const clamp = (n, min, max) => Math.max(min, Math.min(max, Number(n) || 0))
const avg = (arr) => (arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : 0)
const sum = (arr) => arr.reduce((s, x) => s + x, 0)
const round1 = (n) => Math.round((n || 0) * 10) / 10

// ===== SWOT SCORE =====
export function itemScore(item) {
  const i = clamp(Number(item.impact) || 0, 0, 10)
  const c = clamp(Number(item.confidence) || 0, 0, 10)
  return (i * c) / 10
}

export function quadrantScore(items) {
  if (!items || !items.length) return 0
  return sum(items.map(itemScore)) / items.length
}

export function swotProfile(swot) {
  const s = quadrantScore(swot.strengths)
  const w = quadrantScore(swot.weaknesses)
  const o = quadrantScore(swot.opportunities)
  const t = quadrantScore(swot.threats)
  const internalNet = s - w
  const externalNet = o - t

  let strategy, description
  if (internalNet >= 0 && externalNet >= 0) {
    strategy = 'Ofensiva (Crescimento)'
    description = 'Forças e Oportunidades dominam. Use suas vantagens para capturar o mercado.'
  } else if (internalNet >= 0 && externalNet < 0) {
    strategy = 'Defensiva (Manutenção)'
    description = 'Você é forte, mas o mercado é hostil. Use forças para mitigar ameaças.'
  } else if (internalNet < 0 && externalNet >= 0) {
    strategy = 'Reorientação (Reestruturação)'
    description = 'Mercado bom, mas há fraquezas internas. Corrija-as antes de avançar.'
  } else {
    strategy = 'Sobrevivência (Crítica)'
    description = 'Cenário desafiador. Foco em proteger o core e cortar custos.'
  }
  return { scores: { s, w, o, t }, internalNet, externalNet, strategy, description }
}

export function topItems(items, n = 3) {
  return [...(items || [])]
    .filter((it) => (it.text || '').trim())
    .map((it) => ({ ...it, score: itemScore(it) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
}

export function buildTOWS(swot) {
  const S = topItems(swot.strengths)
  const W = topItems(swot.weaknesses)
  const O = topItems(swot.opportunities)
  const T = topItems(swot.threats)
  const cross = (a, b, template) =>
    a
      .flatMap((x) =>
        b.map((y) => ({
          text: template(x.text, y.text),
          score: (x.score + y.score) / 2
        }))
      )
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
  return {
    FO: cross(S, O, (s, o) => `Usar "${s}" para capturar "${o}"`),
    FA: cross(S, T, (s, t) => `Usar "${s}" para mitigar "${t}"`),
    WO: cross(W, O, (w, o) => `Corrigir "${w}" para aproveitar "${o}"`),
    WA: cross(W, T, (w, t) => `Reduzir "${w}" para se defender de "${t}"`)
  }
}

// ===== OKR =====
const measurableRegex =
  /(\d+\s*%|\d+\s*(reais|R\$)|R\$\s*\d|\d+\s*(dias|semanas|meses|trimestre|trimestres|ano|anos)|\d+\s*(clientes|usuarios|usuários|leads|pedidos|vendas|nps)|\d+x|\d+,\d+|\d{2,})/i

export function isMeasurable(text) {
  return !!text && measurableRegex.test(text)
}

export function okrQualityScore(okrs) {
  if (!okrs || !okrs.length) return 0
  let totalKrs = 0
  let measurable = 0
  okrs.forEach((o) =>
    (o.krs || []).forEach((kr) => {
      if ((kr.text || '').trim()) {
        totalKrs++
        if (isMeasurable(kr.text)) measurable++
      }
    })
  )
  return totalKrs ? (measurable / totalKrs) * 10 : 0
}

// ===== ICE =====
export function iceScore(action) {
  const i = clamp(Number(action.impact) || 0, 0, 10)
  const c = clamp(Number(action.confidence) || 0, 0, 10)
  const e = clamp(Number(action.ease) || 0, 0, 10)
  return (i + c + e) / 3
}

export function prioritizeActions(actions) {
  return [...(actions || [])]
    .map((a) => ({ ...a, ice: iceScore(a) }))
    .sort((a, b) => b.ice - a.ice)
}

// ===== LTV/CAC =====
export function ltvCacAnalysis(metrics) {
  const cac = Number(metrics.cac) || 0
  const ltv = Number(metrics.ltv) || 0
  if (!cac || !ltv) return { ratio: 0, status: 'sem-dados', label: 'Sem dados', color: 'info' }
  const ratio = ltv / cac
  if (ratio < 3) return { ratio, status: 'critico', label: 'Crítico: você gasta demais para adquirir', color: 'danger' }
  if (ratio < 5) return { ratio, status: 'aceitavel', label: 'Aceitável, mas pode melhorar', color: 'warning' }
  if (ratio <= 10) return { ratio, status: 'ideal', label: 'Ideal, saudável e escalável', color: 'success' }
  return { ratio, status: 'subinvestido', label: 'Subinvestindo, pode acelerar marketing', color: 'info' }
}

// ===== ICP Fit =====
export function icpFitScore(persona) {
  if (!persona) return { score: 0, color: 'danger', label: 'Sem dados' }
  const fields = ['name', 'role', 'companySize', 'pain', 'trigger', 'budget', 'authority', 'channel']
  const filled = fields.filter((f) => (persona[f] || '').toString().trim()).length
  const completeness = (filled / fields.length) * 10

  const critical = ['pain', 'budget', 'authority'].filter(
    (f) => (persona[f] || '').toString().trim().length >= 5
  ).length
  const criticalBonus = (critical / 3) * 2

  const score = Math.min(10, completeness * 0.8 + criticalBonus)
  if (score >= 7) return { score: round1(score), color: 'success', label: 'ICP bem definido' }
  if (score >= 4) return { score: round1(score), color: 'warning', label: 'ICP parcial: refine os campos críticos' }
  return { score: round1(score), color: 'danger', label: 'ICP vago: defina dor, orçamento e autoridade' }
}

export function icpOverallScore(icp) {
  const personas = (icp && icp.personas) || []
  if (!personas.length) return 0
  const scores = personas.map((p) => icpFitScore(p).score)
  const primaryIdx = personas.findIndex((p) => p.primary)
  if (primaryIdx >= 0 && personas.length > 1) {
    const others = scores.filter((_, i) => i !== primaryIdx)
    return scores[primaryIdx] * 0.6 + (others.reduce((s, x) => s + x, 0) / others.length) * 0.4
  }
  return scores.reduce((s, x) => s + x, 0) / scores.length
}

// ===== Mercado =====
export function marketAnalysis(market) {
  const tam = Number(market.tam) || 0
  const sam = Number(market.sam) || 0
  const som = Number(market.som) || 0
  const alerts = []
  let score = 0

  if (!tam || !sam || !som) {
    return { tam, sam, som, samOfTam: 0, somOfSam: 0, score: 0, alerts: ['Preencha TAM, SAM e SOM'] }
  }
  const samOfTam = (sam / tam) * 100
  const somOfSam = (som / sam) * 100

  if (sam > tam) alerts.push('SAM não pode ser maior que TAM')
  if (som > sam) alerts.push('SOM não pode ser maior que SAM')
  if (somOfSam > 5)
    alerts.push(`SOM = ${somOfSam.toFixed(1)}% do SAM: meta agressiva para 1 ano (recomendado ≤ 5%)`)
  if (samOfTam > 50)
    alerts.push(
      `SAM = ${samOfTam.toFixed(1)}% do TAM: verifique se o mercado endereçável é realmente tão amplo`
    )

  score = 10
  if (sam > tam || som > sam) score -= 5
  if (somOfSam > 5) score -= 2
  if (somOfSam > 10) score -= 2
  score = Math.max(0, score)

  return { tam, sam, som, samOfTam, somOfSam, score, alerts }
}

// ===== Competição =====
export function competitionAnalysis(competition) {
  const competitors = competition.competitors || []
  const criteria = competition.criteria || []
  const selfScores = competition.selfScores || {}
  if (!competitors.length || !criteria.length) {
    return { differentiationScore: 0, whitespace: [], rankings: [], diffs: [], score: 0 }
  }

  const diffs = criteria.map((c) => {
    const compAvg = avg(competitors.map((co) => Number(co.scores?.[c]) || 0))
    const self = Number(selfScores[c]) || 0
    return { criterion: c, self, competitorsAvg: compAvg, delta: self - compAvg }
  })

  const differentiationScore = avg(diffs.map((d) => d.delta))

  const whitespace = criteria.filter((c) =>
    competitors.every((co) => (Number(co.scores?.[c]) || 0) < 3)
  )

  const rankings = [
    { name: 'Você', total: sum(criteria.map((c) => Number(selfScores[c]) || 0)) },
    ...competitors.map((co) => ({
      name: co.name || '(sem nome)',
      total: sum(criteria.map((c) => Number(co.scores?.[c]) || 0))
    }))
  ].sort((a, b) => b.total - a.total)

  let score = 5 + differentiationScore
  if (competitors.length >= 3) score += 1
  if (whitespace.length) score += 1
  score = clamp(score, 0, 10)

  return { differentiationScore, whitespace, rankings, diffs, score }
}

// ===== Produto-foco (80/20) =====
export function productFocusAnalysis(product) {
  const offerings = (product.offerings || []).filter((o) => (o.name || '').trim())
  if (!offerings.length) return { focus: null, bleeders: [], stars: [], enriched: [], score: 0 }

  const enriched = offerings.map((o) => {
    const rev = Number(o.revenuePct) || 0
    const eff = Number(o.effortPct) || 0
    const margin = Number(o.marginPct) || 0
    const efficiency = eff > 0 ? rev / eff : rev > 0 ? 10 : 0
    return { ...o, efficiency, score: efficiency * (1 + margin / 100) }
  })

  enriched.sort((a, b) => b.score - a.score)
  const stars = enriched.filter((o) => o.efficiency >= 1.2)
  const bleeders = enriched.filter((o) => o.efficiency < 0.7 && (Number(o.effortPct) || 0) >= 15)
  const focus = enriched[0] || null

  let score = 0
  if (focus) {
    score = 5
    if (focus.efficiency >= 1.5) score += 2
    if (stars.length >= 1) score += 1
    if (bleeders.length === 0) score += 2
  }
  return { focus, stars, bleeders, enriched, score: clamp(score, 0, 10) }
}

// ===== Funil =====
export function funnelAnalysis(funnel) {
  const stages = funnel.stages || []
  const ticket = Number(funnel.avgTicket) || 0
  const goal = Number(funnel.monthlyRevenueGoal) || 0

  if (!stages.length || !ticket || !goal) {
    return { stages, neededClients: 0, reverseFlow: [], bottleneck: null, allRatesFilled: false, score: 0 }
  }

  const neededClients = Math.ceil(goal / ticket)
  const rates = stages.slice(0, -1).map((s) => (Number(s.conversionToNext) || 0) / 100)
  const allRatesFilled = rates.every((r) => r > 0)

  let reverseFlow = []
  if (allRatesFilled) {
    let needed = neededClients
    reverseFlow = [{ stage: stages[stages.length - 1].name, count: needed }]
    for (let i = stages.length - 2; i >= 0; i--) {
      needed = Math.ceil(needed / rates[i])
      reverseFlow.unshift({ stage: stages[i].name, count: needed })
    }
  }

  let bottleneck = null
  if (rates.length) {
    const positiveRates = rates.filter((r) => r > 0)
    if (positiveRates.length) {
      const minRate = Math.min(...positiveRates)
      const idx = rates.indexOf(minRate)
      if (idx >= 0 && minRate > 0) {
        bottleneck = {
          stage: `${stages[idx].name} → ${stages[idx + 1].name}`,
          rate: minRate * 100
        }
      }
    }
  }

  let score = 3
  if (ticket) score += 1
  if (goal) score += 1
  if (allRatesFilled) score += 3
  if (funnel.salesCycleDays) score += 1
  if ((funnel.channels || []).length) score += 1
  return { stages, neededClients, reverseFlow, bottleneck, allRatesFilled, score: clamp(score, 0, 10) }
}

// ===== Forecast =====
// Projeta uma série mensal a partir de uma base inicial, crescimento e retenção.
function projectSeries({ ticket, lastCount, growthPct, retentionPct, months, scenario }) {
  const retention = clamp(Number(retentionPct) || 0, 0, 100) / 100
  const growth = (Number(growthPct) || 0) / 100
  const scenarios = {
    pessimista: { g: growth * 0.5, r: retention * 0.9 },
    realista: { g: growth, r: retention },
    otimista: { g: growth * 1.5, r: Math.min(1, retention * 1.05) }
  }
  const sc = scenarios[scenario] || scenarios.realista

  const points = []
  let activeBase = lastCount
  let totalRevenue = 0
  for (let m = 1; m <= months; m++) {
    const newClients = Math.round(lastCount * Math.pow(1 + sc.g, m - 1))
    activeBase = Math.round(activeBase * sc.r) + newClients
    const monthRevenue = activeBase * ticket
    totalRevenue += monthRevenue
    points.push({ month: m, newClients, activeBase, revenue: monthRevenue })
  }
  return { points, totalRevenue }
}

// Projeta um produto a partir de "novos clientes / mês".
// recorrente: a base acumula (retenção); unico: receita = só os novos do mês.
function projectProductSeries({ ticket, perMonth, growthPct, retentionPct, months, scenario, billingType }) {
  const retention = clamp(Number(retentionPct) || 0, 0, 100) / 100
  const growth = (Number(growthPct) || 0) / 100
  const scenarios = {
    pessimista: { g: growth * 0.5, r: retention * 0.9 },
    realista: { g: growth, r: retention },
    otimista: { g: growth * 1.5, r: Math.min(1, retention * 1.05) }
  }
  const sc = scenarios[scenario] || scenarios.realista
  const oneTime = billingType === 'unico'

  const points = []
  let activeBase = 0
  let totalRevenue = 0
  for (let m = 1; m <= months; m++) {
    const newClients = Math.round(perMonth * Math.pow(1 + sc.g, m - 1))
    let revenue
    if (oneTime) {
      // pagamento único: cada cliente paga uma vez, sem base recorrente
      activeBase = newClients
      revenue = newClients * ticket
    } else {
      activeBase = Math.round(activeBase * sc.r) + newClients
      revenue = activeBase * ticket
    }
    totalRevenue += revenue
    points.push({ month: m, newClients, activeBase, revenue })
  }
  return { points, totalRevenue }
}

export function forecastProjection(state) {
  const f = state.forecast || {}
  const funnel = state.funnel || {}
  const months = Math.min(36, Math.max(1, Number(f.months) || 12))
  const scenario = f.scenario

  if (f.mode === 'perProduct') {
    const items = (f.perProduct || []).slice(0, 3)
    const valid = items.filter(
      (it) => (Number(it.avgTicket) || 0) > 0 && (Number(it.currentClients) || 0) > 0
    )
    if (!valid.length) {
      return { months: [], totalRevenue: 0, scenario, score: 0, perProduct: [] }
    }
    const merged = []
    const perProduct = []
    let totalRevenue = 0
    valid.forEach((it) => {
      const billingType = it.billingType === 'unico' ? 'unico' : 'recorrente'
      const series = projectProductSeries({
        ticket: Number(it.avgTicket) || 0,
        perMonth: Number(it.currentClients) || 0,
        growthPct: it.growthRatePct,
        retentionPct: it.retentionPct,
        months,
        scenario,
        billingType
      })
      perProduct.push({
        name: it.productName || '(sem nome)',
        billingType,
        totalRevenue: series.totalRevenue,
        months: series.points.map((p) => ({
          month: p.month,
          revenue: p.revenue,
          activeBase: p.activeBase
        }))
      })
      totalRevenue += series.totalRevenue
      series.points.forEach((p, i) => {
        if (!merged[i]) merged[i] = { month: i + 1, newClients: 0, activeBase: 0, revenue: 0 }
        merged[i].newClients += p.newClients
        merged[i].activeBase += p.activeBase
        merged[i].revenue += p.revenue
      })
    })
    let score = 6
    if (valid.every((it) => it.growthRatePct !== undefined && it.growthRatePct !== '')) score += 2
    if (months >= 12) score += 2
    return { months: merged, totalRevenue, scenario, score: clamp(score, 0, 10), perProduct }
  }

  const ticket = Number(funnel.avgTicket) || 0
  const stages = funnel.stages || []
  const lastCount = Number(stages.length ? stages[stages.length - 1].count : 0) || 0
  if (!ticket || !lastCount) {
    return { months: [], totalRevenue: 0, scenario, score: 0, perProduct: [] }
  }
  const series = projectSeries({
    ticket,
    lastCount,
    growthPct: f.growthRatePct,
    retentionPct: f.retentionPct,
    months,
    scenario
  })

  let score = 3
  if (Number(f.retentionPct)) score += 3
  if (f.growthRatePct !== undefined && f.growthRatePct !== '') score += 2
  if (months >= 12) score += 2
  return {
    months: series.points,
    totalRevenue: series.totalRevenue,
    scenario,
    score: clamp(score, 0, 10),
    perProduct: []
  }
}

// ===== Coerência cruzada =====
export function coherenceChecks(state) {
  const alerts = []

  const personas = state.icp?.personas || []
  const segText = (state.canvas?.segments || '').toLowerCase()
  const isB2B =
    personas.some((p) =>
      /empresa|b2b|gerente|diretor|cto|ceo|cfo/i.test((p.role || '') + ' ' + (p.companySize || ''))
    ) || /b2b|empresa/.test(segText)
  const channelsText = (state.canvas?.channels || '').toLowerCase()
  if (isB2B && /tiktok|instagram\s+orgânico|b2c/.test(channelsText)) {
    alerts.push({ level: 'warning', msg: 'ICP parece B2B mas canais sugerem público B2C; verifique alinhamento.' })
  }

  const ticket = Number(state.funnel?.avgTicket) || 0
  const goal = Number(state.funnel?.monthlyRevenueGoal) || 0
  const lastStage = state.funnel?.stages?.[state.funnel?.stages?.length - 1]
  const currentClients = Number(lastStage?.count) || 0
  if (ticket && goal) {
    const needed = goal / ticket
    if (currentClients && needed > currentClients * 3) {
      alerts.push({
        level: 'warning',
        msg: `Meta exige ~${Math.ceil(needed)} clientes/mês; você está em ${currentClients}. Gap >3x; revise meta ou capacidade.`
      })
    }
  }

  // Meta de receita anual não pode ultrapassar o SOM (mercado alcançável em 12 meses).
  const som = Number(state.market?.som) || 0
  if (som && goal) {
    const goalAnnual = goal * 12
    if (goalAnnual > som) {
      alerts.push({
        level: 'warning',
        msg: `Meta anual (~R$ ${Math.round(goalAnnual).toLocaleString('pt-BR')}) excede o SOM (R$ ${Math.round(som).toLocaleString('pt-BR')}) em ${(goalAnnual / som).toFixed(1)}x; revise a meta ou o tamanho do mercado alcançável.`
      })
    }
  }

  ;(state.okrs || []).forEach((o) =>
    (o.krs || []).forEach((kr) => {
      const m = (kr.text || '').match(/(\d{2,5})\s*(clientes|usuarios|usuários|leads|vendas)/i)
      if (m && ticket) {
        const krCount = Number(m[1])
        const lastFunnel = currentClients || 0
        if (lastFunnel && krCount > lastFunnel * 5) {
          alerts.push({
            level: 'warning',
            msg: `KR "${kr.text.slice(0, 60)}..." pede ${krCount}, funil atual entrega ${lastFunnel}.`
          })
        }
      }
    })
  )

  const focus = productFocusAnalysis(state.product || {}).focus
  if (
    focus &&
    state.canvas?.valueProp &&
    !state.canvas.valueProp.toLowerCase().includes((focus.name || '').toLowerCase().slice(0, 4))
  ) {
    alerts.push({
      level: 'info',
      msg: `Produto-foco "${focus.name}" não aparece explicitamente na Proposta de Valor do BMC.`
    })
  }

  if (personas.length && !personas.some((p) => p.primary)) {
    alerts.push({ level: 'warning', msg: 'Você definiu personas mas nenhuma está marcada como primária.' })
  }

  return alerts
}

// =====================================================
// ===== FASE C — Strategic Health Score (0–100) =====
// =====================================================
// Inspirado em Balanced Scorecard, EOS Company Checkup,
// Strategic Readiness Score, PIMS e VRIO.
// Determinístico, sem IA.

const _filled = (v) => !!(v && String(v).trim())

function clarezaDim(state) {
  const focusFilled = _filled((state.product || {}).focusReasoning)
  // Modo enxuto não tem o passo Visão — clareza vem só da justificativa do foco.
  if (state.mode !== 'completo') return focusFilled ? 100 : 0

  const v = state.vision || {}
  const visionFields = ['purpose', 'core', 'vision3to5', 'bigDream']
  const visionFilled = visionFields.filter((k) => _filled(v[k])).length
  const visionPts = (visionFilled / visionFields.length) * 60

  const focusPts = focusFilled ? 40 : 0
  return clamp(visionPts + focusPts, 0, 100)
}

function mercadoDim(state) {
  const icpPts = (icpOverallScore(state.icp || {}) / 10) * 40

  const m = marketAnalysis(state.market || {})
  let mktPts = 0
  if (m.tam && m.sam && m.som && !(m.sam > m.tam) && !(m.som > m.sam)) {
    mktPts = 20
    if (m.somOfSam > 5) mktPts -= 10
    if (m.somOfSam > 10) mktPts -= 5
  }

  const comp = state.competition || {}
  const competitors = comp.competitors || []
  const criteria = comp.criteria || []
  let compPts = 0
  if (competitors.length >= 3 && criteria.length >= 4) compPts = 40
  else if (competitors.length >= 2 && criteria.length >= 3) compPts = 25
  else if (competitors.length >= 1) compPts = 10

  return clamp(icpPts + Math.max(0, mktPts) + compPts, 0, 100)
}

function execucaoDim(state) {
  const okrs = state.okrs || []
  let totalKrs = 0
  let measurable = 0
  okrs.forEach((o) =>
    (o.krs || []).forEach((kr) => {
      if (_filled(kr.text)) {
        totalKrs++
        if (isMeasurable(kr.text)) measurable++
      }
    })
  )
  const okrPts = totalKrs ? (measurable / totalKrs) * 40 : 0

  const actions = (state.actions || []).filter((a) => _filled(a.what))
  const withDeadline = actions.filter((a) => _filled(a.when)).length
  const deadlinePts = actions.length ? (withDeadline / actions.length) * 40 : 0
  const countPts = actions.length >= 3 ? 20 : (actions.length / 3) * 20

  return clamp(okrPts + deadlinePts + countPts, 0, 100)
}

function comercialDim(state) {
  const lc = ltvCacAnalysis(state.metrics || {})
  let lcPts
  if (lc.status === 'ideal') lcPts = 50
  else if (lc.status === 'subinvestido') lcPts = 40
  else if (lc.status === 'aceitavel') lcPts = 30
  else if (lc.status === 'critico') lcPts = 10
  else lcPts = 25 // sem-dados: crédito parcial pra não punir modo enxuto

  const funAn = funnelAnalysis(state.funnel || {})
  const stages = (state.funnel || {}).stages || []
  const currentTop = Number(stages[0]?.count) || 0
  let funnelPts = 0
  if (funAn.allRatesFilled && funAn.reverseFlow.length) {
    const leadsNecessarios = funAn.reverseFlow[0].count
    if (currentTop && leadsNecessarios <= currentTop * 1.5) funnelPts = 50
    else if (currentTop && leadsNecessarios <= currentTop * 3) funnelPts = 30
    else funnelPts = 15
  } else if (funAn.neededClients) {
    funnelPts = 18
  }

  return clamp(lcPts + funnelPts, 0, 100)
}

function diferenciacaoDim(state) {
  const compAn = competitionAnalysis(state.competition || {})
  if (!compAn.diffs || !compAn.diffs.length) return 0
  const norm = ((compAn.differentiationScore + 5) / 10) * 100
  let bonus = 0
  if (compAn.whitespace && compAn.whitespace.length) bonus += 5
  return clamp(norm + bonus, 0, 100)
}

function dimExplainClareza(state) {
  const focusFilled = _filled((state.product || {}).focusReasoning)
  if (state.mode !== 'completo') {
    if (!focusFilled) {
      return 'justifique qual é o produto-foco e por quê (campo "Justificativa" em Produto).'
    }
    return 'detalhe a justificativa do produto-foco para deixar a estratégia inequívoca.'
  }
  const v = state.vision || {}
  if (!['purpose', 'core', 'vision3to5', 'bigDream'].some((k) => _filled(v[k]))) {
    return 'preencha propósito, valores e visão de 3 a 5 anos para ancorar o plano.'
  }
  if (!focusFilled) {
    return 'justifique qual é o produto-foco e por quê (campo "Justificativa" em Produto).'
  }
  return 'detalhe propósito e foco para deixar a estratégia inequívoca.'
}

function dimExplainMercado(state) {
  const personas = (state.icp && state.icp.personas) || []
  if (!personas.length) return 'defina ao menos uma persona com dor, orçamento e autoridade.'
  const m = marketAnalysis(state.market || {})
  if (!m.tam || !m.sam || !m.som) return 'preencha TAM, SAM e SOM para dimensionar o mercado.'
  const comp = state.competition || {}
  if ((comp.competitors || []).length < 3) return 'mapeie pelo menos 3 concorrentes na matriz competitiva.'
  if ((comp.criteria || []).length < 4) return 'use ao menos 4 critérios para comparar concorrentes.'
  return 'reforce ICP, sizing de mercado e matriz competitiva.'
}

function dimExplainExecucao(state) {
  const okrs = state.okrs || []
  let totalKrs = 0
  let measurable = 0
  okrs.forEach((o) =>
    (o.krs || []).forEach((kr) => {
      if (_filled(kr.text)) {
        totalKrs++
        if (isMeasurable(kr.text)) measurable++
      }
    })
  )
  if (totalKrs === 0) return 'defina OKRs com resultados-chave mensuráveis (número, %, prazo).'
  if (measurable / totalKrs < 0.6) return 'torne os KRs mensuráveis: inclua números, % ou prazos.'

  const actions = (state.actions || []).filter((a) => _filled(a.what))
  if (actions.length < 3) return 'cadastre pelo menos 3 ações 5W2H prioritárias.'
  const withDeadline = actions.filter((a) => _filled(a.when)).length
  if (withDeadline / actions.length < 0.7) return 'defina prazos (campo "Quando") nas ações pendentes.'
  return 'amarre KRs e ações com prazos claros para garantir execução.'
}

function dimExplainComercial(state) {
  const lc = ltvCacAnalysis(state.metrics || {})
  if (lc.status === 'critico') {
    return `LTV/CAC em ${lc.ratio.toFixed(2)}x; abaixo de 3:1, reduza CAC ou aumente retenção.`
  }
  if (lc.status === 'sem-dados' && state.mode === 'completo') {
    return 'preencha CAC, LTV e churn para validar a equação econômica.'
  }

  const funAn = funnelAnalysis(state.funnel || {})
  if (!funAn.allRatesFilled) return 'complete as taxas de conversão entre estágios do funil.'
  const currentTop = Number((state.funnel?.stages || [])[0]?.count) || 0
  const leadsNecessarios = funAn.reverseFlow[0]?.count || 0
  if (currentTop && leadsNecessarios > currentTop * 1.5) {
    return `funil reverso exige ${leadsNecessarios} entradas, você tem ${currentTop}: gap grande na meta.`
  }
  return 'refine LTV/CAC e viabilidade do funil para sustentar a meta.'
}

function dimExplainDiferenciacao(state) {
  const compAn = competitionAnalysis(state.competition || {})
  if (!compAn.diffs || !compAn.diffs.length) {
    return 'preencha a matriz competitiva (concorrentes e critérios) para medir diferenciação.'
  }
  if (compAn.differentiationScore < 0) {
    return 'você está atrás da média dos concorrentes: encontre eixos onde liderar.'
  }
  return 'reforce critérios em que você já se destaca e explore espaços em branco no mercado.'
}

export function strategicHealthScore(state) {
  const dims = {
    clareza: clarezaDim(state),
    mercado: mercadoDim(state),
    execucao: execucaoDim(state),
    comercial: comercialDim(state),
    diferenciacao: diferenciacaoDim(state)
  }

  const weights = {
    clareza: 0.2,
    mercado: 0.25,
    execucao: 0.2,
    comercial: 0.25,
    diferenciacao: 0.1
  }

  const weighted =
    dims.clareza * weights.clareza +
    dims.mercado * weights.mercado +
    dims.execucao * weights.execucao +
    dims.comercial * weights.comercial +
    dims.diferenciacao * weights.diferenciacao

  const penalties = []

  const visionAnyFilled = ['purpose', 'core', 'vision3to5', 'bigDream'].some((k) =>
    _filled((state.vision || {})[k])
  )
  // Só penaliza Visão no modo completo — no modo enxuto o passo Visão nem aparece.
  if (state.mode === 'completo' && !visionAnyFilled)
    penalties.push({ reason: 'Visão estratégica vazia', points: -5 })

  const personas = (state.icp && state.icp.personas) || []
  if (!personas.length) penalties.push({ reason: 'ICP sem nenhuma persona definida', points: -5 })
  else if (!personas.some((p) => p.primary))
    penalties.push({ reason: 'ICP sem persona primária marcada', points: -5 })

  const swotCount = ['strengths', 'weaknesses', 'opportunities', 'threats'].reduce(
    (n, k) => n + ((state.swot || {})[k] || []).filter((it) => _filled(it.text)).length,
    0
  )
  if (swotCount === 0) penalties.push({ reason: 'SWOT vazia', points: -5 })

  const okrsWithObj = (state.okrs || []).filter((o) => _filled(o.objective)).length
  if (okrsWithObj === 0) penalties.push({ reason: 'OKRs sem objetivo definido', points: -5 })

  const actionsCount = (state.actions || []).filter((a) => _filled(a.what)).length
  if (actionsCount === 0) penalties.push({ reason: 'Plano de ação 5W2H vazio', points: -5 })

  const alerts = coherenceChecks(state) || []
  alerts.forEach((a) => {
    if (a.level === 'warning' || a.level === 'danger') {
      penalties.push({ reason: `Coerência: ${a.msg}`, points: -3 })
    }
  })

  const mkt = marketAnalysis(state.market || {})
  if (mkt.somOfSam > 5) {
    penalties.push({
      reason: `SOM = ${mkt.somOfSam.toFixed(1)}% do SAM (recomendado ≤ 5%)`,
      points: -2
    })
  }

  const penaltyTotal = penalties.reduce((s, p) => s + p.points, 0)
  const total = clamp(Math.round(weighted + penaltyTotal), 0, 100)

  let grade, gradeLabel, gradeColor
  if (total >= 90) {
    grade = 'A+'
    gradeLabel = 'Plano sólido e coerente'
    gradeColor = 'success'
  } else if (total >= 80) {
    grade = 'A'
    gradeLabel = 'Bom, com 1 ou 2 pontos de atenção'
    gradeColor = 'success'
  } else if (total >= 65) {
    grade = 'B'
    gradeLabel = 'Funcional, falta refino'
    gradeColor = 'warning'
  } else if (total >= 50) {
    grade = 'C'
    gradeLabel = 'Lacunas significativas'
    gradeColor = 'warning'
  } else {
    grade = 'D'
    gradeLabel = 'Plano incipiente ou inconsistente'
    gradeColor = 'danger'
  }

  const explanations = []
  const dimOrder = [
    { key: 'comercial', name: 'Saúde Comercial', msg: dimExplainComercial(state) },
    { key: 'mercado', name: 'Conhecimento de Mercado', msg: dimExplainMercado(state) },
    { key: 'execucao', name: 'Capacidade de Execução', msg: dimExplainExecucao(state) },
    { key: 'clareza', name: 'Clareza Estratégica', msg: dimExplainClareza(state) },
    { key: 'diferenciacao', name: 'Diferenciação Competitiva', msg: dimExplainDiferenciacao(state) }
  ]
  dimOrder
    .filter((d) => dims[d.key] < 70 && d.msg)
    .sort((a, b) => dims[a.key] - dims[b.key])
    .slice(0, 3)
    .forEach((d) => explanations.push(`${d.name} (${Math.round(dims[d.key])}/100): ${d.msg}`))

  return {
    total,
    grade,
    gradeLabel,
    gradeColor,
    breakdown: {
      clareza: Math.round(dims.clareza),
      mercado: Math.round(dims.mercado),
      execucao: Math.round(dims.execucao),
      comercial: Math.round(dims.comercial),
      diferenciacao: Math.round(dims.diferenciacao)
    },
    penalties,
    explanations
  }
}

// ===== Lacunas do plano — o que falta preencher =====
// Retorna [{ stepId, items: ['descrição do que falta', ...] }] apenas para
// os passos que têm pendências, respeitando o modo (enxuto vs completo).
export function planGaps(state) {
  const isCompleto = state.mode === 'completo'
  const gaps = []
  const add = (stepId, items) => {
    const real = items.filter(Boolean)
    if (real.length) gaps.push({ stepId, items: real })
  }

  add('company', [!_filled((state.company || {}).name) && 'Nome da empresa'])

  if (isCompleto) {
    const v = state.vision || {}
    add('vision', [
      !_filled(v.purpose) && 'Propósito do negócio',
      !_filled(v.core) && 'Valores essenciais',
      !_filled(v.vision3to5) && 'Visão de 3 a 5 anos',
      !_filled(v.bigDream) && 'Grande sonho (BHAG)'
    ])
  }

  const m = state.market || {}
  add('market', [
    !_filled(m.tam) && 'TAM — tamanho do mercado total',
    !_filled(m.sam) && 'SAM — mercado endereçável',
    !_filled(m.som) && 'SOM — mercado alcançável'
  ])

  const offerings = (state.product || {}).offerings || []
  add('product', [
    !offerings.some((o) => _filled(o.name)) && 'Pelo menos uma oferta/produto',
    !_filled((state.product || {}).focusReasoning) && 'Justificativa do produto-foco'
  ])

  const comp = state.competition || {}
  add('competition', [
    (comp.competitors || []).filter((c) => _filled(c.name)).length < 3 &&
      'Pelo menos 3 concorrentes mapeados',
    (comp.criteria || []).length < 4 && 'Pelo menos 4 critérios de comparação'
  ])

  const swot = state.swot || {}
  const hasQuad = (k) => (swot[k] || []).some((it) => _filled(it.text))
  add('swot', [
    !hasQuad('strengths') && 'Pelo menos uma Força',
    !hasQuad('weaknesses') && 'Pelo menos uma Fraqueza',
    !hasQuad('opportunities') && 'Pelo menos uma Oportunidade',
    !hasQuad('threats') && 'Pelo menos uma Ameaça'
  ])

  const personas = (state.icp || {}).personas || []
  const icpItems = []
  if (!personas.length) {
    icpItems.push('Pelo menos uma persona de cliente ideal')
  } else {
    if (!personas.some((p) => p.primary)) icpItems.push('Marcar uma persona como primária')
    personas.forEach((p, i) => {
      const label = _filled(p.name) ? `Persona "${p.name}"` : `Persona ${i + 1}`
      const miss = []
      if (!_filled(p.pain)) miss.push('dor')
      if (!_filled(p.budget)) miss.push('orçamento')
      if (!_filled(p.authority)) miss.push('autoridade de compra')
      if (miss.length) icpItems.push(`${label}: falta ${miss.join(', ')}`)
    })
  }
  add('icp', icpItems)

  const funnel = state.funnel || {}
  const subRatesMissing = (st) =>
    (st || []).length > 1 && st.slice(0, -1).some((s) => !(Number(s.conversionToNext) > 0))
  if (funnel.mode === 'perProduct') {
    // Múltiplos funis: ticket médio fica em cada sub-funil, não no campo global.
    const subs = funnel.perProduct || []
    const funnelItems = []
    if (!_filled(funnel.monthlyRevenueGoal)) funnelItems.push('Meta de receita mensal (total)')
    if (!subs.length) {
      funnelItems.push('Pelo menos um sub-funil por produto')
    } else {
      subs.forEach((sub, i) => {
        const label = _filled(sub.productName)
          ? `Sub-funil "${sub.productName}"`
          : `Sub-funil ${i + 1}`
        const miss = []
        if (!_filled(sub.avgTicketEstimate)) miss.push('ticket médio')
        if (subRatesMissing(sub.stages)) miss.push('taxas de conversão entre etapas')
        if (miss.length) funnelItems.push(`${label}: falta ${miss.join(', ')}`)
      })
    }
    add('funnel', funnelItems)
  } else {
    const stages = funnel.stages || []
    add('funnel', [
      !stages.length && 'Etapas do funil de vendas',
      !_filled(funnel.avgTicket) && 'Ticket médio',
      !_filled(funnel.monthlyRevenueGoal) && 'Meta de receita mensal',
      subRatesMissing(stages) && 'Taxas de conversão entre as etapas'
    ])
  }

  const f = state.forecast || {}
  if (f.mode !== 'perProduct') {
    add('forecast', [
      !_filled(f.retentionPct) && 'Taxa de retenção mensal',
      !_filled(f.growthRatePct) && 'Taxa de crescimento mensal'
    ])
  }

  if (isCompleto) {
    const met = state.metrics || {}
    add('metrics', [
      !_filled(met.cac) && 'CAC — custo de aquisição de cliente',
      !_filled(met.ltv) && 'LTV — valor do cliente ao longo do tempo'
    ])
  }

  const okrs = state.okrs || []
  const okrItems = []
  if (!okrs.some((o) => _filled(o.objective))) {
    okrItems.push('Pelo menos um objetivo')
  } else {
    let totalKrs = 0
    let measurable = 0
    okrs.forEach((o) =>
      (o.krs || []).forEach((kr) => {
        if (_filled(kr.text)) {
          totalKrs++
          if (isMeasurable(kr.text)) measurable++
        }
      })
    )
    if (totalKrs === 0) okrItems.push('Resultados-chave para os objetivos')
    else if (measurable / totalKrs < 0.6)
      okrItems.push('Tornar os resultados-chave mensuráveis (número, % ou prazo)')
  }
  add('okrs', okrItems)

  const actions = (state.actions || []).filter((a) => _filled(a.what))
  const actionItems = []
  if (!actions.length) {
    actionItems.push('Pelo menos uma ação no plano 5W2H')
  } else {
    if (actions.length < 3) actionItems.push('Cadastrar pelo menos 3 ações prioritárias')
    const noDeadline = actions.filter((a) => !_filled(a.when)).length
    if (noDeadline)
      actionItems.push(
        `Definir prazo ("Quando") em ${noDeadline} ${noDeadline === 1 ? 'ação' : 'ações'}`
      )
  }
  add('actions', actionItems)

  return gaps
}

// ===== Score Geral =====
export function overallScore(state) {
  const swotItems = [
    ...(state.swot.strengths || []),
    ...(state.swot.weaknesses || []),
    ...(state.swot.opportunities || []),
    ...(state.swot.threats || [])
  ].filter((i) => (i.text || '').trim())
  const swotCompleteness = Math.min(swotItems.length / 8, 1) * 10

  const okrQuality = okrQualityScore(state.okrs)
  const okrCount = (state.okrs || []).filter((o) => (o.objective || '').trim()).length
  const okrCompleteness = Math.min(okrCount / 3, 1) * 10
  const okrFinal = okrQuality * 0.6 + okrCompleteness * 0.4

  const actionsCount = (state.actions || []).filter((a) => (a.what || '').trim()).length
  const actionsScore = Math.min(actionsCount / 3, 1) * 10

  const icpScore = icpOverallScore(state.icp || {})
  const marketScore = marketAnalysis(state.market || {}).score
  const competitionScore = competitionAnalysis(state.competition || {}).score
  const productScore = productFocusAnalysis(state.product || {}).score
  const funnelScore = funnelAnalysis(state.funnel || {}).score
  const forecastScore = forecastProjection(state).score

  let metricsScore = 0
  let metricsWeight = 0
  if (state.mode === 'completo') {
    const lc = ltvCacAnalysis(state.metrics || {})
    if (lc.status !== 'sem-dados') {
      metricsScore =
        lc.status === 'ideal' ? 10 : lc.status === 'aceitavel' ? 7 : lc.status === 'subinvestido' ? 8 : 4
      metricsWeight = 0.05
    }
  }

  const weights = {
    swot: 0.12,
    okr: 0.15,
    actions: 0.1,
    icp: 0.13,
    market: 0.08,
    competition: 0.08,
    product: 0.12,
    funnel: 0.16,
    forecast: 0.06
  }
  const totalW = Object.values(weights).reduce((s, x) => s + x, 0)
  const remaining = 1 - metricsWeight
  const norm = remaining / totalW

  const final =
    swotCompleteness * weights.swot * norm +
    okrFinal * weights.okr * norm +
    actionsScore * weights.actions * norm +
    icpScore * weights.icp * norm +
    marketScore * weights.market * norm +
    competitionScore * weights.competition * norm +
    productScore * weights.product * norm +
    funnelScore * weights.funnel * norm +
    forecastScore * weights.forecast * norm +
    metricsScore * metricsWeight

  let classification
  if (final >= 8) classification = 'Excelente'
  else if (final >= 6) classification = 'Bom'
  else if (final >= 4) classification = 'Em desenvolvimento'
  else classification = 'Inicial'

  return {
    total: Math.round(final * 10) / 10,
    classification,
    breakdown: {
      swot: round1(swotCompleteness),
      okr: round1(okrFinal),
      actions: round1(actionsScore),
      icp: round1(icpScore),
      market: round1(marketScore),
      competition: round1(competitionScore),
      product: round1(productScore),
      funnel: round1(funnelScore),
      forecast: round1(forecastScore),
      metrics: round1(metricsScore)
    }
  }
}
