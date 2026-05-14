/**
 * Estado padrão do plano — equivalente ao `defaultState` antigo.
 *
 * `migrate()` faz deepMerge com este shape, então qualquer campo que faltar
 * num plano vindo do backend ou de importação é preenchido com a estrutura aqui.
 */

export const STATE_VERSION = 2

export function defaultState() {
  return {
    version: STATE_VERSION,
    createdAt: new Date().toISOString(),
    mode: 'enxuto',
    currentStep: 0,

    company: { name: '', segment: '', size: '', employees: '', revenue: '', age: '', region: '' },

    vision: { purpose: '', core: '', vision3to5: '', bigDream: '' },

    icp: { personas: [] },

    market: {
      tam: '',
      tamUnit: 'BRL',
      sam: '',
      som: '',
      timeframeMonths: 12,
      notes: ''
    },

    competition: {
      criteria: ['Preço', 'Qualidade', 'Atendimento', 'Marca'],
      competitors: [],
      selfScores: {},
      axes: { x: 'Preço', y: 'Qualidade' }
    },

    product: {
      offerings: [],
      focusReasoning: ''
    },

    pricing: {
      statement: { icp: '', problem: '', product: '', benefit: '', competitor: '', reason: '' },
      currentPrice: '',
      marketMin: '',
      marketMedian: '',
      marketMax: '',
      targetMargin: '',
      actualMargin: '',
      strategy: ''
    },

    funnel: {
      stages: [
        { name: 'Visitantes', count: '', conversionToNext: '' },
        { name: 'Leads', count: '', conversionToNext: '' },
        { name: 'MQL', count: '', conversionToNext: '' },
        { name: 'SQL', count: '', conversionToNext: '' },
        { name: 'Propostas', count: '', conversionToNext: '' },
        { name: 'Clientes', count: '', conversionToNext: null }
      ],
      avgTicket: '',
      salesCycleDays: '',
      monthlyRevenueGoal: '',
      channels: []
    },

    forecast: {
      scenario: 'realista',
      growthRatePct: '',
      retentionPct: '',
      months: 12
    },

    swot: { strengths: [], weaknesses: [], opportunities: [], threats: [] },

    canvas: {
      segments: '',
      valueProp: '',
      channels: '',
      relationship: '',
      revenue: '',
      resources: '',
      activities: '',
      partners: '',
      costs: ''
    },

    ishikawa: {
      problem: '',
      causes: { method: [], machine: [], material: [], people: [], measure: [], environment: [] }
    },

    okrs: [],
    actions: [],
    metrics: { cac: '', ltv: '', tickets: '', churn: '' },

    ai: {
      backendUrl: 'http://localhost:3001',
      assistantEnabled: false,
      cache: {},
      appliedAgents: []
    }
  }
}

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

function deepMerge(target, source) {
  if (Array.isArray(source)) return source.slice()
  if (isPlainObject(source)) {
    const out = isPlainObject(target) ? { ...target } : {}
    Object.keys(source).forEach((k) => {
      out[k] = isPlainObject(target?.[k]) && isPlainObject(source[k])
        ? deepMerge(target[k], source[k])
        : source[k]
    })
    return out
  }
  return source !== undefined ? source : target
}

export function migrate(parsed) {
  if (!parsed || typeof parsed !== 'object') return defaultState()
  const base = defaultState()
  if (!parsed.version || parsed.version < STATE_VERSION) {
    parsed.version = STATE_VERSION
  }
  return deepMerge(base, parsed)
}
