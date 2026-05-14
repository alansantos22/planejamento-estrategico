/**
 * AI Helper — botão "Assistente, me dê ideias" reutilizável.
 * Chama backend (Node/Fastify) que orquestra agentes especializados.
 * Se o backend estiver offline ou backendUrl vazio, esconde o botão.
 */
const AIHelper = (() => {

  function createButton(agentName, state, save, label) {
    const btn = document.createElement('button');
    btn.className = 'ai-helper-btn';
    btn.type = 'button';
    btn.innerHTML = `🤖 ${label || 'Assistente, me dê ideias'}`;

    const backend = (state.ai && state.ai.backendUrl || '').trim();
    if (!backend) {
      btn.title = 'Configure a URL do backend de IA em "Config" no topo';
      btn.style.opacity = '0.6';
    }

    btn.addEventListener('click', async () => {
      if (!backend) {
        alert('Configure a URL do backend de IA em "Config" no topo da página.');
        return;
      }
      await runAgent(agentName, state, save, btn);
    });
    return btn;
  }

  async function runAgent(agentName, state, save, btn) {
    const backend = state.ai.backendUrl.replace(/\/$/, '');
    const payload = buildPayload(agentName, state);

    // Cache local
    const cacheKey = `${agentName}|${hash(JSON.stringify(payload))}`;
    state.ai.cache = state.ai.cache || {};
    const cached = state.ai.cache[cacheKey];
    if (cached && Date.now() - cached.ts < 1000 * 60 * 30) {
      showModal(agentName, cached.result, state, save);
      return;
    }

    btn.disabled = true;
    const originalText = btn.innerHTML;
    btn.innerHTML = '🤖 Pensando...';
    showLoadingModal(agentName);

    try {
      const res = await fetch(`${backend}/agents/${agentName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(`Backend retornou ${res.status}`);
      const result = await res.json();
      state.ai.cache[cacheKey] = { ts: Date.now(), result };
      save();
      closeModal();
      showModal(agentName, result, state, save);
    } catch (err) {
      closeModal();
      alert('Erro ao chamar IA: ' + err.message + '\n\nVerifique se o backend está rodando em ' + backend);
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  }

  function buildPayload(agentName, state) {
    // Cada agente recebe só o que precisa
    const company = state.company || {};
    const base = { company, mode: state.mode };

    switch (agentName) {
      case 'personaDetector':
        return { ...base, segment: company.segment, valueProp: state.canvas?.valueProp, swot: summarize(state.swot) };
      case 'idealPersonaCoach':
        return { ...base, personas: state.icp?.personas || [] };
      case 'swotDetector':
        return { ...base, canvas: state.canvas, personas: state.icp?.personas || [] };
      case 'problemDetector':
        return { ...base, swot: summarize(state.swot), metrics: state.metrics, funnel: summarizeFunnel(state.funnel) };
      case 'competitorResearcher':
        return { ...base, segment: company.segment, region: company.region, valueProp: state.canvas?.valueProp };
      case 'productIdeaGenerator':
        return { ...base, personas: state.icp?.personas || [], swot: summarize(state.swot), competition: summarizeComp(state.competition) };
      case 'pricingBenchmark':
        return { ...base, segment: company.segment, product: state.product?.offerings || [], personas: state.icp?.personas || [] };
      case 'marketSizer':
        return { ...base, segment: company.segment, region: company.region, valueProp: state.canvas?.valueProp };
      case 'salesFunnelArchitect':
        return { ...base, personas: state.icp?.personas || [], avgTicket: state.funnel?.avgTicket, salesCycleDays: state.funnel?.salesCycleDays, monthlyRevenueGoal: state.funnel?.monthlyRevenueGoal, segment: company.segment };
      case 'insightsCoach':
        return { ...base, plan: state };
      default:
        return base;
    }
  }

  function summarize(swot) {
    if (!swot) return {};
    const top = (list) => (list || []).filter(i => (i.text || '').trim()).slice(0, 5).map(i => i.text);
    return {
      strengths: top(swot.strengths),
      weaknesses: top(swot.weaknesses),
      opportunities: top(swot.opportunities),
      threats: top(swot.threats)
    };
  }
  function summarizeFunnel(f) {
    if (!f) return {};
    return {
      stages: (f.stages || []).map(s => ({ name: s.name, count: s.count, rate: s.conversionToNext })),
      avgTicket: f.avgTicket, goal: f.monthlyRevenueGoal, cycle: f.salesCycleDays
    };
  }
  function summarizeComp(c) {
    if (!c) return {};
    return {
      criteria: c.criteria,
      competitors: (c.competitors || []).map(x => ({ name: x.name, scores: x.scores }))
    };
  }

  function hash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) { h = ((h << 5) - h + str.charCodeAt(i)) | 0; }
    return Math.abs(h).toString(36);
  }

  // ===== Modal =====
  function showLoadingModal(agentName) {
    closeModal();
    const overlay = document.createElement('div');
    overlay.className = 'ai-modal-overlay';
    overlay.id = 'aiModal';
    overlay.innerHTML = `
      <div class="ai-modal">
        <div class="ai-loading">
          <div class="ai-spinner"></div>
          <p>Consultando o assistente <strong>${agentName}</strong>...</p>
          <p class="muted" style="font-size:12px">Isso pode levar 10-30 segundos.</p>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
  }

  function showModal(agentName, result, state, save) {
    closeModal();
    const overlay = document.createElement('div');
    overlay.className = 'ai-modal-overlay';
    overlay.id = 'aiModal';

    let bodyHtml = '';
    if (result.error) {
      bodyHtml = `<div class="alert danger">${esc(result.error)}</div>`;
    } else if (Array.isArray(result.suggestions)) {
      bodyHtml = result.suggestions.map((s, i) => `
        <div class="ai-suggestion">
          ${s.title ? `<h5>${esc(s.title)}</h5>` : ''}
          <pre>${esc(typeof s === 'string' ? s : (s.text || s.content || JSON.stringify(s, null, 2)))}</pre>
        </div>
      `).join('');
    } else if (result.text) {
      bodyHtml = `<div class="ai-suggestion"><pre>${esc(result.text)}</pre></div>`;
    } else {
      bodyHtml = `<div class="ai-suggestion"><pre>${esc(JSON.stringify(result, null, 2))}</pre></div>`;
    }

    overlay.innerHTML = `
      <div class="ai-modal">
        <div class="ai-modal-head">
          <h3>🤖 ${agentName}</h3>
          <button class="btn-icon" id="aiClose">×</button>
        </div>
        <div class="ai-modal-body">${bodyHtml}</div>
        <div class="ai-modal-actions">
          ${result.applicable ? `<button class="btn primary" id="aiApply">Aplicar sugestões</button>` : ''}
          <button class="btn ghost" id="aiDismiss">Fechar</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('#aiClose').addEventListener('click', closeModal);
    overlay.querySelector('#aiDismiss').addEventListener('click', closeModal);
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });

    const applyBtn = overlay.querySelector('#aiApply');
    if (applyBtn && result.applicable) {
      applyBtn.addEventListener('click', () => {
        applySuggestions(agentName, result, state);
        save();
        closeModal();
        location.reload();
      });
    }
  }

  function closeModal() {
    const ex = document.getElementById('aiModal');
    if (ex) ex.remove();
  }

  function applySuggestions(agentName, result, state) {
    const sugg = result.suggestions || [];
    switch (agentName) {
      case 'personaDetector':
        state.icp = state.icp || { personas: [] };
        sugg.forEach(p => state.icp.personas.push({ ...p, primary: false }));
        if (state.icp.personas.length && !state.icp.personas.some(p => p.primary)) {
          state.icp.personas[0].primary = true;
        }
        break;
      case 'swotDetector':
        ['strengths', 'weaknesses', 'opportunities', 'threats'].forEach(q => {
          if (Array.isArray(result[q])) {
            state.swot[q].push(...result[q]);
          }
        });
        break;
      case 'competitorResearcher':
        state.competition = state.competition || { criteria: [], competitors: [] };
        sugg.forEach(c => state.competition.competitors.push({ name: c.name || '', scores: c.scores || {}, notes: c.notes || '' }));
        break;
      case 'productIdeaGenerator':
        state.product = state.product || { offerings: [] };
        sugg.forEach(o => state.product.offerings.push({
          name: o.name || o.title || '',
          revenuePct: o.revenuePct || '',
          effortPct: o.effortPct || '',
          marginPct: o.marginPct || ''
        }));
        break;
      // outros agentes apenas mostram, não aplicam
    }
  }

  function esc(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }

  return { createButton };
})();

// Expor globalmente para frameworks.js
window.AIHelper = AIHelper;
