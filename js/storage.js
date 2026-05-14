/**
 * Storage layer — persiste o plano em SQLite via API REST (server/Fastify).
 * Sem localStorage/sessionStorage: todo o estado vive no backend.
 *
 * Convenções:
 *  - Plano único por instalação, identificado pelo slug PLAN_ID ('default').
 *  - load()/reset()/importJSON() são async.
 *  - save(state) é fire-and-forget e debounciado (300ms) para não inundar o backend
 *    enquanto o usuário digita. O estado em memória do app.js continua a fonte da verdade
 *    durante a sessão.
 *
 * Override da URL: defina window.BACKEND_URL antes deste script, ou via <meta name="backend-url">.
 */
const Storage = (() => {
  const PLAN_ID = 'default';
  const VERSION = 2;
  const LEGACY_SS_KEYS = ['mechame_planning_v2', 'mechame_planning_v1'];

  function backendUrl() {
    if (typeof window !== 'undefined') {
      if (window.BACKEND_URL) return String(window.BACKEND_URL).replace(/\/$/, '');
      const meta = document.querySelector('meta[name="backend-url"]');
      if (meta?.content) return meta.content.replace(/\/$/, '');
    }
    return 'http://localhost:3001';
  }

  const defaultState = () => ({
    version: VERSION,
    createdAt: new Date().toISOString(),
    mode: 'enxuto',
    currentStep: 0,

    company: { name: '', segment: '', size: '', revenue: '', age: '', region: '' },

    vision: { purpose: '', core: '', vision3to5: '', bigDream: '' },

    icp: {
      personas: []
    },

    market: {
      tam: '', tamUnit: 'BRL',
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
      marketMin: '', marketMedian: '', marketMax: '',
      targetMargin: '', actualMargin: '',
      strategy: ''
    },

    funnel: {
      stages: [
        { name: 'Visitantes', count: '', conversionToNext: '' },
        { name: 'Leads',      count: '', conversionToNext: '' },
        { name: 'MQL',        count: '', conversionToNext: '' },
        { name: 'SQL',        count: '', conversionToNext: '' },
        { name: 'Propostas',  count: '', conversionToNext: '' },
        { name: 'Clientes',   count: '', conversionToNext: null }
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

    lead: {
      personName: '',
      email: '',
      phone: '',
      challengeHint: ''
    },

    swot: { strengths: [], weaknesses: [], opportunities: [], threats: [] },
    canvas: {
      segments: '', valueProp: '', channels: '', relationship: '',
      revenue: '', resources: '', activities: '', partners: '', costs: ''
    },
    ishikawa: { problem: '', causes: { method: [], machine: [], material: [], people: [], measure: [], environment: [] } },
    okrs: [],
    actions: [],
    metrics: { cac: '', ltv: '', tickets: '', churn: '' },

    ai: {
      backendUrl: 'http://localhost:3001',
      cache: {}
    }
  });

  function migrate(parsed) {
    if (!parsed || typeof parsed !== 'object') return defaultState();
    if (!parsed.version || parsed.version < VERSION) {
      parsed.version = VERSION;
    }
    return deepMerge(defaultState(), parsed);
  }

  function deepMerge(target, source) {
    if (Array.isArray(source)) return source.slice();
    if (source && typeof source === 'object') {
      const out = Array.isArray(target) ? [] : { ...target };
      Object.keys(source).forEach(k => {
        out[k] = (k in target && typeof target[k] === 'object' && target[k] !== null && !Array.isArray(target[k]))
          ? deepMerge(target[k], source[k])
          : source[k];
      });
      return out;
    }
    return source !== undefined ? source : target;
  }

  // ===== HTTP =====
  async function apiGet() {
    const res = await fetch(`${backendUrl()}/plans/${PLAN_ID}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`GET /plans falhou (${res.status})`);
    const body = await res.json();
    return body.data ?? null;
  }

  async function apiPut(state) {
    const res = await fetch(`${backendUrl()}/plans/${PLAN_ID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state)
    });
    if (!res.ok) throw new Error(`PUT /plans falhou (${res.status})`);
    return res.json();
  }

  async function apiDelete() {
    const res = await fetch(`${backendUrl()}/plans/${PLAN_ID}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`DELETE /plans falhou (${res.status})`);
    return res.json();
  }

  // ===== Migração one-shot do sessionStorage antigo =====
  function readLegacySession() {
    if (typeof sessionStorage === 'undefined') return null;
    for (const key of LEGACY_SS_KEYS) {
      try {
        const raw = sessionStorage.getItem(key);
        if (raw) return JSON.parse(raw);
      } catch (_) { /* ignora JSON inválido */ }
    }
    return null;
  }

  function clearLegacySession() {
    if (typeof sessionStorage === 'undefined') return;
    LEGACY_SS_KEYS.forEach(k => sessionStorage.removeItem(k));
  }

  // ===== API pública =====
  async function load() {
    try {
      const remote = await apiGet();
      if (remote) {
        // Se ainda houver algo no sessionStorage de versões antigas, descarta.
        clearLegacySession();
        return migrate(remote);
      }

      // Backend vazio: tenta migrar dados que sobraram em sessionStorage.
      const legacy = readLegacySession();
      if (legacy) {
        const migrated = migrate(legacy);
        try {
          await apiPut(migrated);
          clearLegacySession();
        } catch (e) {
          console.warn('Falha ao migrar dados antigos para o backend.', e);
        }
        return migrated;
      }

      return defaultState();
    } catch (e) {
      console.warn('Falha ao carregar plano do backend, usando estado vazio.', e);
      return defaultState();
    }
  }

  // ===== Save debouncing =====
  let saveTimer = null;
  let pendingState = null;
  let inflight = null;

  function flushSave() {
    if (!pendingState) return Promise.resolve();
    const snapshot = pendingState;
    pendingState = null;
    inflight = apiPut(snapshot).catch(err => {
      console.error('Falha ao salvar plano.', err);
    }).finally(() => { inflight = null; });
    return inflight;
  }

  function save(state) {
    pendingState = state;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveTimer = null;
      flushSave();
    }, 300);
  }

  async function saveNow(state) {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    pendingState = state;
    await flushSave();
    if (inflight) await inflight;
  }

  async function reset() {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    pendingState = null;
    try { await apiDelete(); }
    catch (e) { console.warn('Falha ao apagar plano no backend.', e); }
    return defaultState();
  }

  function exportJSON(state) {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().split('T')[0];
    const name = (state.company.name || 'plano').replace(/[^\w-]/g, '_');
    a.href = url;
    a.download = `planejamento-${name}-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importJSON(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const parsed = JSON.parse(e.target.result);
          const merged = migrate(parsed);
          await saveNow(merged);
          resolve(merged);
        } catch (err) { reject(err); }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  // Garante que mudanças pendentes sejam persistidas antes de o usuário sair.
  // fetch keepalive funciona com JSON e respeita CORS (sendBeacon não suporta preflight).
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      const finalState = pendingState;
      if (saveTimer && finalState) {
        clearTimeout(saveTimer);
        saveTimer = null;
        try {
          fetch(`${backendUrl()}/plans/${PLAN_ID}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(finalState),
            keepalive: true
          });
        } catch (_) { /* nada a fazer */ }
      }
      // Sinaliza ao backend que o usuário saiu no meio do wizard.
      // Só marca abandoned se ainda não terminou (dashboard = passo final concluído).
      if (typeof window.Leads?.markAbandonedSync === 'function' && finalState) {
        try { window.Leads.markAbandonedSync(finalState); } catch (_) {}
      }
    });
  }

  return { load, save, saveNow, reset, exportJSON, importJSON, defaultState };
})();
