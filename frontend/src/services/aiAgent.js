/**
 * Cliente do backend de agentes de IA.
 *
 * - Cada agente é POST /agents/<name>.
 * - O payload é montado com `buildPayload` para enviar só o mínimo
 *   que cada agente precisa.
 */

function hashPayload(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0
  }
  return Math.abs(h).toString(36)
}

function summarizeSwot(swot) {
  if (!swot) return {}
  const top = (list) => (list || []).filter((i) => (i.text || '').trim()).slice(0, 5).map((i) => i.text)
  return {
    strengths: top(swot.strengths),
    weaknesses: top(swot.weaknesses),
    opportunities: top(swot.opportunities),
    threats: top(swot.threats)
  }
}

function summarizeFunnel(f) {
  if (!f) return {}
  return {
    stages: (f.stages || []).map((s) => ({ name: s.name, count: s.count, rate: s.conversionToNext })),
    avgTicket: f.avgTicket,
    goal: f.monthlyRevenueGoal,
    cycle: f.salesCycleDays
  }
}

function summarizeCompetition(c) {
  if (!c) return {}
  return {
    criteria: c.criteria,
    competitors: (c.competitors || []).map((x) => ({ name: x.name, scores: x.scores }))
  }
}

export function buildPayload(agentName, state) {
  const company = state.company || {}
  const base = { company, mode: state.mode }

  switch (agentName) {
    case 'personaDetector':
      return {
        ...base,
        segment: company.segment,
        valueProp: state.canvas?.valueProp,
        swot: summarizeSwot(state.swot)
      }
    case 'idealPersonaCoach':
      return { ...base, personas: state.icp?.personas || [] }
    case 'swotDetector':
      return { ...base, canvas: state.canvas, personas: state.icp?.personas || [] }
    case 'problemDetector':
      return {
        ...base,
        swot: summarizeSwot(state.swot),
        metrics: state.metrics,
        funnel: summarizeFunnel(state.funnel)
      }
    case 'competitorResearcher':
      return {
        ...base,
        segment: company.segment,
        region: company.region,
        valueProp: state.canvas?.valueProp
      }
    case 'productIdeaGenerator':
      return {
        ...base,
        personas: state.icp?.personas || [],
        swot: summarizeSwot(state.swot),
        competition: summarizeCompetition(state.competition)
      }
    case 'pricingBenchmark':
      return {
        ...base,
        segment: company.segment,
        product: state.product?.offerings || [],
        personas: state.icp?.personas || []
      }
    case 'marketSizer':
      return {
        ...base,
        segment: company.segment,
        region: company.region,
        valueProp: state.canvas?.valueProp
      }
    case 'salesFunnelArchitect':
      return {
        ...base,
        personas: state.icp?.personas || [],
        avgTicket: state.funnel?.avgTicket,
        salesCycleDays: state.funnel?.salesCycleDays,
        monthlyRevenueGoal: state.funnel?.monthlyRevenueGoal,
        segment: company.segment
      }
    case 'insightsCoach':
      return { ...base, plan: state }
    default:
      return base
  }
}

export function payloadCacheKey(agentName, payload) {
  return `${agentName}|${hashPayload(JSON.stringify(payload))}`
}

export async function callAgent(backendUrl, agentName, payload) {
  const url = `${(backendUrl || '').replace(/\/$/, '')}/agents/${agentName}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) throw new Error(`Backend retornou ${res.status}`)
  return res.json()
}

/**
 * Aplica as sugestões retornadas pelo agente diretamente no `state`
 * (mutável — esperado dentro da action do store). Apenas alguns
 * agentes têm sugestões aplicáveis; os demais só exibem.
 */
export function applySuggestions(agentName, result, state) {
  const sugg = result.suggestions || []
  switch (agentName) {
    case 'personaDetector':
      state.icp = state.icp || { personas: [] }
      sugg.forEach((p) => state.icp.personas.push({ ...p, primary: false }))
      if (state.icp.personas.length && !state.icp.personas.some((p) => p.primary)) {
        state.icp.personas[0].primary = true
      }
      break
    case 'swotDetector':
      ;['strengths', 'weaknesses', 'opportunities', 'threats'].forEach((q) => {
        if (Array.isArray(result[q])) {
          state.swot[q].push(...result[q])
        }
      })
      break
    case 'competitorResearcher':
      state.competition = state.competition || { criteria: [], competitors: [] }
      sugg.forEach((c) =>
        state.competition.competitors.push({
          name: c.name || '',
          scores: c.scores || {},
          notes: c.notes || ''
        })
      )
      break
    case 'productIdeaGenerator':
      state.product = state.product || { offerings: [] }
      sugg.forEach((o) =>
        state.product.offerings.push({
          name: o.name || o.title || '',
          revenuePct: o.revenuePct || '',
          effortPct: o.effortPct || '',
          marginPct: o.marginPct || ''
        })
      )
      break
  }
}
