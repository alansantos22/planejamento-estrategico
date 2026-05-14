/**
 * Cliente do backend de agentes de IA.
 *
 * - Cada agente é POST /agents/<name>.
 * - O payload é montado com `buildPayload` para enviar só o mínimo
 *   que cada agente precisa.
 */

export const AGENT_LABELS = {
  personaDetector: 'Sugerir personas',
  idealPersonaCoach: 'Avaliar personas',
  swotDetector: 'Sugerir SWOT',
  problemDetector: 'Detectar problemas',
  competitorResearcher: 'Pesquisar concorrentes',
  productIdeaGenerator: 'Gerar ideias de produto',
  pricingBenchmark: 'Benchmark de preço',
  marketSizer: 'Estimar TAM / SAM / SOM',
  salesFunnelArchitect: 'Modelar funil de vendas',
  insightsCoach: 'Relatório final',
  idealCustomerFinder: 'Propor cliente ideal'
}

export function agentLabel(name) {
  return AGENT_LABELS[name] || name
}

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
    case 'idealCustomerFinder':
      return {
        ...base,
        valueProp: state.canvas?.valueProp,
        canvas: state.canvas,
        swot: summarizeSwot(state.swot),
        personas: state.icp?.personas || [],
        competition: summarizeCompetition(state.competition),
        product: state.product?.offerings || [],
        pricing: state.pricing,
        funnel: summarizeFunnel(state.funnel)
      }
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
    credentials: 'include', // envia/recebe cookie pe_session
    body: JSON.stringify(payload)
  })
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    const err = new Error(body?.message || `Backend retornou ${res.status}`)
    err.status = res.status
    err.code = body?.error
    throw err
  }
  return body
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
    case 'idealCustomerFinder':
      state.icp = state.icp || { personas: [] }
      ;(result.idealCustomers || []).forEach((c) => {
        state.icp.personas.push({
          name: c.name || '',
          role: c.role || '',
          ageRange: c.ageRange || '',
          companySize: c.companySize || '',
          pain: c.pain || '',
          trigger: c.trigger || '',
          budget: c.budget || '',
          authority: c.authority || '',
          channel: c.channel || '',
          primary: false
        })
      })
      if (state.icp.personas.length && !state.icp.personas.some((p) => p.primary)) {
        state.icp.personas[0].primary = true
      }
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
    case 'marketSizer': {
      const raw = result.raw || {}
      state.market = state.market || {}
      if (raw.tam != null) state.market.tam = Math.round(Number(raw.tam) || 0)
      if (raw.sam != null) state.market.sam = Math.round(Number(raw.sam) || 0)
      if (raw.som != null) state.market.som = Math.round(Number(raw.som) || 0)
      const notes = [raw.methodology, raw.sources?.length ? `Fontes: ${raw.sources.join(', ')}` : null]
        .filter(Boolean).join('\n')
      if (notes) state.market.notes = notes
      break
    }
  }
}
