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
        swot: summarizeSwot(state.swot),
        product: (state.product?.offerings || []).map((o) => ({ name: o.name, description: o.description, type: o.type }))
      }
    case 'idealPersonaCoach':
      return { ...base, personas: state.icp?.personas || [] }
    case 'swotDetector':
      return {
        ...base,
        canvas: state.canvas,
        personas: state.icp?.personas || [],
        product: (state.product?.offerings || []).map((o) => ({ name: o.name, description: o.description, type: o.type }))
      }
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
        funnelMode: state.funnel?.mode || 'single',
        personas: state.icp?.personas || [],
        product: state.product?.offerings || [],
        productFocus: state.product?.focusReasoning,
        valueProp: state.canvas?.valueProp,
        channels: state.canvas?.channels,
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
        vision: state.vision,
        valueProp: state.canvas?.valueProp,
        canvas: state.canvas,
        swot: summarizeSwot(state.swot),
        personas: state.icp?.personas || [],
        competition: summarizeCompetition(state.competition),
        product: state.product?.offerings || [],
        productFocus: state.product?.focusReasoning,
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
          name: c.productName ? `${c.name || 'Persona'} (${c.productName})` : (c.name || ''),
          productName: c.productName || '',
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
    case 'salesFunnelArchitect': {
      const raw = result.raw || {}
      state.funnel = state.funnel || {}
      const isPerProduct = raw.mode === 'perProduct'

      if (!isPerProduct && Array.isArray(raw.stages) && raw.stages.length) {
        const prev = state.funnel.stages || []
        state.funnel.stages = raw.stages.map((s, i) => {
          const match = prev.find((p) => (p.name || '').toLowerCase() === (s.name || '').toLowerCase())
          const isLast = i === raw.stages.length - 1
          return {
            name: s.name || '',
            count: match?.count || '',
            conversionToNext: isLast ? null : (s.typicalRate ?? '')
          }
        })
      }
      if (!isPerProduct && Array.isArray(raw.channelRecommendations) && raw.channelRecommendations.length) {
        state.funnel.channels = state.funnel.channels || []
        raw.channelRecommendations.forEach((c) => {
          const exists = state.funnel.channels.some((x) => (x.name || '').toLowerCase() === (c.name || '').toLowerCase())
          if (!exists) {
            state.funnel.channels.push({
              name: c.name || '',
              mixPct: c.mixPct ?? '',
              costPerLead: c.costPerLeadEstimate ?? ''
            })
          }
        })
      }
      if (isPerProduct && Array.isArray(raw.perProduct)) {
        const prevPP = state.funnel.perProduct || []
        state.funnel.perProduct = raw.perProduct.map((p) => {
          const prevMatch = prevPP.find((x) => (x.productName || '').toLowerCase() === (p.productName || '').toLowerCase())
          const stages = (p.stages || []).map((s, i, arr) => {
            const isLast = i === arr.length - 1
            const prevStage = prevMatch?.stages?.find((ps) => (ps.name || '').toLowerCase() === (s.name || '').toLowerCase())
            return {
              name: s.name || '',
              count: prevStage?.count || '',
              conversionToNext: isLast ? null : (s.typicalRate ?? ''),
              benchmark: s.benchmark || '',
              watchOut: s.watchOut || ''
            }
          })
          const channels = (p.channelRecommendations || []).map((c) => ({
            name: c.name || '',
            mixPct: c.mixPct ?? '',
            costPerLead: c.costPerLeadEstimate ?? '',
            rationale: c.rationale || ''
          }))
          return {
            productName: p.productName || '',
            funnelRole: p.funnelRole || '',
            funnelRoleReason: p.funnelRoleReason || '',
            avgTicketEstimate: p.avgTicketEstimate || '',
            bottleneck: p.bottleneck || '',
            playbook: p.playbook || '',
            upsellTo: p.upsellTo || '',
            crossSellTo: p.crossSellTo || '',
            upsellNotes: p.upsellNotes || '',
            stages,
            channels
          }
        })
      }
      break
    }
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
