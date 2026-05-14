/**
 * Controller principal - navegação, modo enxuto/completo, dashboard
 */
(async function () {
  let state = await Storage.load();

  const F = Frameworks;

  // ===== Sequência do wizard =====
  // Passos 1–5 fazem captura distribuída de lead (nome, empresa, contexto, email, telefone).
  // Enxuto:  Welcome → CompanyName → CompanyContext → Email → Identity → ICP → Mercado → Concorrência → SWOT → TOWS → Produto → Pricing → Funil → Forecast → OKRs → Ações
  // Completo: + Visão (após CompanyContext), + Canvas (após Pricing), + Ishikawa (após TOWS), + Métricas (após Forecast)
  const allSteps = [
    F.welcome,
    F.companyName,
    F.company,           // contexto da empresa (porte, faturamento, tempo, região)
    F.emailDelivery,
    F.companyIdentity,
    F.vision,            // completo
    F.icp,
    F.market,
    F.competition,
    F.swot,
    F.tows,
    F.ishikawa,          // completo
    F.product,
    F.pricing,
    F.canvas,            // completo
    F.funnel,
    F.forecast,
    F.metrics,           // completo
    F.okrs,
    F.fiveW2H
  ];

  // Captura UTMs / referrer da primeira pageview. Idempotente.
  if (window.Leads) window.Leads.capture();

  function steps() {
    return allSteps.filter(s => !s.modeOnly || s.modeOnly === state.mode);
  }

  // ===== Screens =====
  const screens = ['landing', 'wizard', 'dashboard'];
  function showScreen(id) {
    screens.forEach(s => document.getElementById(s).classList.toggle('active', s === id));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function save() { Storage.save(state); }

  // ===== Wizard =====
  const stepContainer = document.getElementById('stepContainer');
  const stepTitle = document.getElementById('stepTitle');
  const stepDesc = document.getElementById('stepDesc');
  const progressFill = document.getElementById('progressFill');
  const progressLabel = document.getElementById('progressLabel');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');

  function renderStep() {
    const list = steps();
    if (state.currentStep < 0) state.currentStep = 0;
    if (state.currentStep >= list.length) state.currentStep = list.length - 1;
    const step = list[state.currentStep];

    stepTitle.textContent = step.title;
    stepDesc.textContent = step.desc;
    stepContainer.innerHTML = '';
    stepContainer.appendChild(step.render(state, save));

    const pct = ((state.currentStep + 1) / list.length) * 100;
    progressFill.style.width = pct + '%';
    progressLabel.textContent = `Passo ${state.currentStep + 1} de ${list.length}`;
    prevBtn.disabled = state.currentStep === 0;
    nextBtn.textContent = state.currentStep === list.length - 1 ? 'Ver Resumo →' : 'Continuar →';
    save();
  }

  prevBtn.addEventListener('click', () => {
    state.currentStep--;
    renderStep();
  });

  nextBtn.addEventListener('click', () => {
    const list = steps();
    const step = list[state.currentStep];
    const err = step.validate ? step.validate(state) : null;
    if (err) { alert(err); return; }
    if (state.currentStep === list.length - 1) {
      if (window.Leads) window.Leads.markCompleted();
      renderDashboard();
      showScreen('dashboard');
    } else {
      // Registra avanço no lead — usa o id do step concluído como referência humana.
      if (window.Leads) window.Leads.upsertDebounced({ lastStep: step.id });
      state.currentStep++;
      renderStep();
    }
  });

  // ===== Landing =====
  const modeToggle = document.getElementById('modeFullToggle');
  modeToggle.checked = state.mode === 'completo';
  modeToggle.addEventListener('change', () => {
    state.mode = modeToggle.checked ? 'completo' : 'enxuto';
    state.currentStep = 0;
    save();
  });

  document.getElementById('startBtn').addEventListener('click', () => {
    if (typeof state.currentStep !== 'number') state.currentStep = 0;
    showScreen('wizard');
    renderStep();
  });

  // ===== Topbar actions =====
  document.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const action = btn.dataset.action;
      if (action === 'restart') {
        if (confirm('Tem certeza que deseja apagar todo o plano e recomeçar?')) {
          state = await Storage.reset();
          modeToggle.checked = false;
          showScreen('landing');
        }
      } else if (action === 'export') {
        Storage.exportJSON(state);
      } else if (action === 'import') {
        document.getElementById('importFile').click();
      } else if (action === 'settings') {
        openSettings();
      }
    });
  });

  document.getElementById('importFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      state = await Storage.importJSON(file);
      modeToggle.checked = state.mode === 'completo';
      alert('Plano importado com sucesso!');
      renderDashboard();
      showScreen('dashboard');
    } catch (err) {
      alert('Erro ao importar: ' + err.message);
    }
  });

  // ===== Settings (IA backend URL) =====
  function openSettings() {
    const url = prompt('URL do backend de IA (deixe vazio pra desabilitar):', state.ai?.backendUrl || '');
    if (url === null) return;
    state.ai = state.ai || {};
    state.ai.backendUrl = url.trim();
    save();
    alert('Configuração salva.');
  }

  // ===== Dashboard =====
  document.getElementById('backToWizard').addEventListener('click', () => {
    showScreen('wizard');
    renderStep();
  });

  function renderDashboard() {
    const c = document.getElementById('dashboardContent');
    const health = Scoring.strategicHealthScore(state);
    const score = Scoring.overallScore(state);
    const profile = Scoring.swotProfile(state.swot);
    const tows = Scoring.buildTOWS(state.swot);
    const prioritized = Scoring.prioritizeActions(state.actions);
    const lc = Scoring.ltvCacAnalysis(state.metrics);
    const market = Scoring.marketAnalysis(state.market || {});
    const compAn = Scoring.competitionAnalysis(state.competition || {});
    const prodAn = Scoring.productFocusAnalysis(state.product || {});
    const priceAn = Scoring.pricingAnalysis(state.pricing || {});
    const funAn = Scoring.funnelAnalysis(state.funnel || {});
    const forec = Scoring.forecastProjection(state);
    const alerts = Scoring.coherenceChecks(state);

    const dimLabels = {
      clareza: 'Clareza Estratégica',
      mercado: 'Conhecimento de Mercado',
      execucao: 'Capacidade de Execução',
      comercial: 'Saúde Comercial',
      diferenciacao: 'Diferenciação Competitiva'
    };
    const dimColor = (v) => v >= 80 ? 'success' : v >= 65 ? 'good' : v >= 50 ? 'warn' : 'bad';

    let html = `
      <div class="health-hero grade-${health.gradeColor}">
        <div class="health-badge">
          <div class="health-grade">${health.grade}</div>
          <div class="health-total">${health.total}<span>/100</span></div>
        </div>
        <div class="health-info">
          <div class="health-title">Saúde Estratégica</div>
          <div class="health-sub">${health.gradeLabel}</div>
          ${health.penalties.length ? `<div class="health-penalty">−${Math.abs(health.penalties.reduce((s,p)=>s+p.points,0))} pts em penalidades (${health.penalties.length})</div>` : ''}
        </div>
      </div>

      <div class="dash-section">
        <h3>Breakdown por dimensão</h3>
        <div class="health-bars">
          ${Object.entries(health.breakdown).map(([k, v]) => `
            <div class="health-bar-row">
              <div class="hb-label">${dimLabels[k]}</div>
              <div class="hb-track"><div class="hb-fill ${dimColor(v)}" style="width:${v}%"></div></div>
              <div class="hb-value">${v}</div>
            </div>
          `).join('')}
        </div>
      </div>

      ${health.explanations.length ? `
        <div class="dash-section">
          <details class="health-tips" open>
            <summary>💡 Pontos a melhorar (top ${health.explanations.length})</summary>
            <ul class="health-tip-list">
              ${health.explanations.map(e => `<li>${F.esc(e)}</li>`).join('')}
            </ul>
          </details>
        </div>
      ` : ''}

      <div class="score-hero">
        <div class="score-number">${score.total.toFixed(1)}</div>
        <div class="score-label">SCORE GERAL DO PLANO (0-10)</div>
        <div class="score-classification">${score.classification}</div>
      </div>

      <div class="dash-grid">
        ${F.tile('Empresa', F.esc(state.company.name) || '—', F.esc(state.company.segment))}
        ${F.tile('Modo', state.mode === 'completo' ? 'Completo' : 'Enxuto')}
        ${F.tile('Estratégia SWOT', profile.strategy)}
        ${state.mode === 'completo' && lc.status !== 'sem-dados'
          ? F.tile('LTV/CAC', lc.ratio.toFixed(2) + 'x', `<span class="badge ${lc.color}">${lc.label}</span>`)
          : ''}
      </div>

      <div class="dash-section">
        <h3>Decomposição do Score</h3>
        <div class="dash-grid">
          ${F.tile('ICP', score.breakdown.icp.toFixed(1) + '/10')}
          ${F.tile('Mercado', score.breakdown.market.toFixed(1) + '/10')}
          ${F.tile('Concorrência', score.breakdown.competition.toFixed(1) + '/10')}
          ${F.tile('SWOT', score.breakdown.swot.toFixed(1) + '/10')}
          ${F.tile('Produto-foco', score.breakdown.product.toFixed(1) + '/10')}
          ${F.tile('Pricing', score.breakdown.pricing.toFixed(1) + '/10')}
          ${F.tile('Funil', score.breakdown.funnel.toFixed(1) + '/10')}
          ${F.tile('Forecast', score.breakdown.forecast.toFixed(1) + '/10')}
          ${F.tile('OKRs', score.breakdown.okr.toFixed(1) + '/10')}
          ${F.tile('Ações', score.breakdown.actions.toFixed(1) + '/10')}
          ${state.mode === 'completo' ? F.tile('Métricas', score.breakdown.metrics.toFixed(1) + '/10') : ''}
        </div>
      </div>
    `;

    // Alerts de coerência
    if (alerts.length) {
      html += `<div class="dash-section">
        <h3>⚠ Pontos de Atenção</h3>
        <div class="alerts-block">
          ${alerts.map(a => `<div class="alert ${a.level}">${F.esc(a.msg)}</div>`).join('')}
        </div>
      </div>`;
    }

    // Visão (modo completo)
    if (state.mode === 'completo' && (state.vision.purpose || state.vision.vision3to5)) {
      html += `<div class="dash-section">
        <h3>Direção Estratégica</h3>
        <div class="card">
          ${state.vision.purpose ? `<p><strong>Propósito:</strong> ${F.esc(state.vision.purpose)}</p>` : ''}
          ${state.vision.core ? `<p><strong>Core:</strong> ${F.esc(state.vision.core)}</p>` : ''}
          ${state.vision.vision3to5 ? `<p><strong>Visão 3-5 anos:</strong> ${F.esc(state.vision.vision3to5)}</p>` : ''}
          ${state.vision.bigDream ? `<p><strong>Sonho Grande:</strong> ${F.esc(state.vision.bigDream)}</p>` : ''}
        </div>
      </div>`;
    }

    // ICP / Personas
    if ((state.icp?.personas || []).length) {
      html += `<div class="dash-section">
        <h3>Cliente Ideal</h3>
        <div class="dash-grid">
          ${state.icp.personas.map(p => {
            const fit = Scoring.icpFitScore(p);
            return `<div class="card persona-summary">
              <div style="display:flex;justify-content:space-between;align-items:start;gap:8px">
                <h4 style="margin:0">${F.esc(p.name) || 'Persona sem nome'} ${p.primary ? '<span class="badge success">primária</span>' : ''}</h4>
                <span class="badge ${fit.color}">${fit.score.toFixed(1)}/10</span>
              </div>
              <p class="muted" style="margin:6px 0 10px;font-size:13px">${F.esc(p.role)} — ${F.esc(p.companySize)}</p>
              ${p.pain ? `<p style="margin:4px 0;font-size:13px"><strong>Dor:</strong> ${F.esc(p.pain)}</p>` : ''}
              ${p.budget ? `<p style="margin:4px 0;font-size:13px"><strong>Orçamento:</strong> ${F.esc(p.budget)}</p>` : ''}
              ${p.channel ? `<p style="margin:4px 0;font-size:13px"><strong>Canal:</strong> ${F.esc(p.channel)}</p>` : ''}
            </div>`;
          }).join('')}
        </div>
      </div>`;
    }

    // Mercado
    if (market.tam) {
      html += `<div class="dash-section">
        <h3>Posição no Mercado</h3>
        <div class="card">
          <div class="pyramid">
            <div class="pyr-row tam" style="width:100%">
              <span class="pyr-label">TAM</span><span class="pyr-value">${F.fmtMoney(market.tam)}</span>
            </div>
            <div class="pyr-row sam" style="width:${Math.max(5, Math.min(95, market.samOfTam))}%">
              <span class="pyr-label">SAM</span><span class="pyr-value">${F.fmtMoney(market.sam)} (${market.samOfTam.toFixed(1)}%)</span>
            </div>
            <div class="pyr-row som" style="width:${Math.max(2, Math.min(60, market.somOfSam))}%">
              <span class="pyr-label">SOM</span><span class="pyr-value">${F.fmtMoney(market.som)} (${market.somOfSam.toFixed(1)}%)</span>
            </div>
          </div>
        </div>
      </div>`;
    }

    // Concorrência
    if (compAn.rankings.length) {
      html += `<div class="dash-section">
        <h3>Análise Competitiva</h3>
        <div class="card">
          <div class="dash-grid" style="margin-bottom:12px">
            ${F.tile('Diferenciação', (compAn.differentiationScore >= 0 ? '+' : '') + compAn.differentiationScore.toFixed(2), 'vs. média concorrentes')}
            ${F.tile('Líder do ranking', compAn.rankings[0].name)}
            ${F.tile('Espaço em branco', compAn.whitespace.length ? compAn.whitespace.join(', ') : '—')}
          </div>
        </div>
      </div>`;
    }

    // SWOT resumida
    html += `<div class="dash-section">
      <h3>SWOT — Top itens</h3>
      <div class="swot-grid">
        ${swotSummary('Forças', Scoring.topItems(state.swot.strengths, 5), 's')}
        ${swotSummary('Fraquezas', Scoring.topItems(state.swot.weaknesses, 5), 'w')}
        ${swotSummary('Oportunidades', Scoring.topItems(state.swot.opportunities, 5), 'o')}
        ${swotSummary('Ameaças', Scoring.topItems(state.swot.threats, 5), 't')}
      </div>
    </div>`;

    // TOWS
    html += `<div class="dash-section">
      <h3>Estratégias Cruzadas (TOWS)</h3>
      <div class="tows-grid">
        ${towsCell('FO — Ofensivas', tows.FO)}
        ${towsCell('FA — Defensivas', tows.FA)}
        ${towsCell('WO — Reorientação', tows.WO)}
        ${towsCell('WA — Sobrevivência', tows.WA)}
      </div>
    </div>`;

    // Produto-foco
    if (prodAn.focus) {
      html += `<div class="dash-section">
        <h3>Produto-foco</h3>
        <div class="card">
          <div class="dash-grid" style="margin-bottom:12px">
            ${F.tile('Foco recomendado', F.esc(prodAn.focus.name), `eficiência ${prodAn.focus.efficiency.toFixed(2)}`)}
            ${F.tile('Estrelas', prodAn.stars.map(s => F.esc(s.name)).join(', ') || '—')}
            ${F.tile('Sangrias', prodAn.bleeders.map(b => F.esc(b.name)).join(', ') || '—')}
          </div>
          ${state.product.focusReasoning ? `<p><strong>Justificativa:</strong> ${F.esc(state.product.focusReasoning)}</p>` : ''}
        </div>
      </div>`;
    }

    // Pricing
    if (priceAn.strategy && priceAn.strategy !== '—') {
      const st = state.pricing.statement || {};
      html += `<div class="dash-section">
        <h3>Posicionamento + Pricing</h3>
        <div class="card">
          ${st.icp ? `<p><strong>Posicionamento:</strong> Para <em>${F.esc(st.icp)}</em>, que <em>${F.esc(st.problem)}</em>, oferecemos <em>${F.esc(st.product)}</em> que <em>${F.esc(st.benefit)}</em>, diferente de <em>${F.esc(st.competitor)}</em> porque <em>${F.esc(st.reason)}</em>.</p>` : ''}
          <div class="dash-grid">
            ${F.tile('Estratégia', priceAn.strategy, `<span class="badge ${priceAn.color}">${priceAn.label}</span>`)}
            ${F.tile('Preço atual', 'R$ ' + (state.pricing.currentPrice || '—'))}
            ${F.tile('Mediana mercado', 'R$ ' + (state.pricing.marketMedian || '—'))}
          </div>
        </div>
      </div>`;
    }

    // Funil
    if (funAn.neededClients) {
      html += `<div class="dash-section">
        <h3>Funil de Vendas</h3>
        <div class="card">
          <p><strong>Para faturar R$ ${Number(state.funnel.monthlyRevenueGoal).toLocaleString('pt-BR')}/mês</strong> com ticket de R$ ${Number(state.funnel.avgTicket).toLocaleString('pt-BR')}, você precisa de <strong>${funAn.neededClients}</strong> clientes/mês.</p>
          ${funAn.allRatesFilled ? `<div class="funnel-viz">
            ${funAn.reverseFlow.map(s => {
              const max = funAn.reverseFlow[0].count;
              const pct = (s.count / max) * 100;
              return `<div class="funnel-stage" style="width:${pct}%">
                <span class="fs-name">${F.esc(s.stage)}</span>
                <span class="fs-count">${s.count.toLocaleString('pt-BR')}</span>
              </div>`;
            }).join('')}
          </div>` : ''}
          ${funAn.bottleneck ? `<div class="alert info">🔍 <strong>Gargalo:</strong> ${F.esc(funAn.bottleneck.stage)} — ${funAn.bottleneck.rate.toFixed(1)}% conversão</div>` : ''}
        </div>
      </div>`;
    }

    // Forecast
    if (forec.months.length) {
      const max = Math.max(...forec.months.map(m => m.revenue));
      html += `<div class="dash-section">
        <h3>Projeção de Receita (${forec.scenario})</h3>
        <div class="card">
          <div class="dash-tile" style="margin-bottom:14px">
            <h4>Total acumulado em ${forec.months.length} meses</h4>
            <div class="big">${F.fmtMoney(forec.totalRevenue)}</div>
          </div>
          <div class="forecast-chart">
            ${forec.months.map(m => `
              <div class="fc-bar" title="Mês ${m.month}: ${F.fmtMoney(m.revenue)}">
                <div class="fc-fill" style="height:${(m.revenue / max) * 100}%"></div>
                <span class="fc-label">${m.month}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>`;
    }

    // OKRs
    if (state.okrs.length) {
      html += `<div class="dash-section"><h3>Objetivos & Resultados-Chave</h3>`;
      state.okrs.forEach((okr, i) => {
        if (!(okr.objective || '').trim()) return;
        html += `<div class="okr-card">
          <h5>Objetivo #${i + 1}</h5>
          <p style="margin:0 0 10px"><strong>${F.esc(okr.objective)}</strong></p>
          ${(okr.krs || []).filter(k => (k.text || '').trim()).map(k => {
            const m = Scoring.isMeasurable(k.text);
            return `<div class="kr-row">
              <span>• ${F.esc(k.text)}</span>
              <span class="measurable-tag ${m ? 'ok' : 'no'}">${m ? '✓ mensurável' : '⚠ não mensurável'}</span>
            </div>`;
          }).join('')}
        </div>`;
      });
      html += `</div>`;
    }

    // Ações priorizadas
    if (prioritized.length) {
      html += `<div class="dash-section">
        <h3>Plano de Ação Priorizado (ICE Score)</h3>
        <table class="simple">
          <thead><tr><th>#</th><th>O quê</th><th>Quem</th><th>Quando</th><th>ICE</th></tr></thead>
          <tbody>
            ${prioritized.map((a, i) => `<tr>
              <td>${i + 1}</td>
              <td>${F.esc(a.what)}</td>
              <td>${F.esc(a.who)}</td>
              <td>${F.esc(a.when)}</td>
              <td><strong>${a.ice.toFixed(1)}</strong></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
    }

    // Ishikawa
    if (state.mode === 'completo' && state.ishikawa.problem) {
      html += `<div class="dash-section">
        <h3>Análise de Causa Raiz</h3>
        <div class="card">
          <p><strong>Problema:</strong> ${F.esc(state.ishikawa.problem)}</p>
          <div class="form-grid cols-2">
            ${Object.entries(state.ishikawa.causes).map(([k, list]) => list.length ? `
              <div><strong>${capCat(k)}</strong><ul>${list.map(x => `<li>${F.esc(x)}</li>`).join('')}</ul></div>
            ` : '').join('')}
          </div>
        </div>
      </div>`;
    }

    // Revisão IA
    if (state.ai?.backendUrl && window.AIHelper) {
      html += `<div class="dash-section" id="aiReviewSection">
        <h3>🤖 Revisão com IA</h3>
        <div class="card">
          <p>Peça à IA para analisar o plano completo e apontar inconsistências, riscos e oportunidades não exploradas.</p>
          <div id="aiReviewMount"></div>
        </div>
      </div>`;
    }

    c.innerHTML = html;

    // Monta botão de revisão IA depois do innerHTML
    if (state.ai?.backendUrl && window.AIHelper) {
      const mount = document.getElementById('aiReviewMount');
      if (mount) {
        mount.appendChild(window.AIHelper.createButton('insightsCoach', state, save, 'Revisar plano completo'));
      }
    }
  }

  function swotSummary(title, items, cls) {
    return `<div class="swot-block ${cls}">
      <h4>${title}</h4>
      ${items.length
        ? `<ul style="margin:0;padding-left:18px">${items.map(i => `<li>${F.esc(i.text)} <span class="muted">(${i.score.toFixed(1)})</span></li>`).join('')}</ul>`
        : '<p class="muted" style="margin:0;font-size:13px">Nenhum item.</p>'}
    </div>`;
  }

  function towsCell(title, items) {
    return `<div class="tows-cell">
      <h4>${title}</h4>
      ${items.length
        ? `<ul>${items.map(i => `<li>${F.esc(i.text)}</li>`).join('')}</ul>`
        : '<p class="muted" style="font-size:13px;margin:0">—</p>'}
    </div>`;
  }

  function capCat(k) {
    return ({ method: 'Método', machine: 'Máquina', material: 'Material', people: 'Mão de Obra', measure: 'Medida', environment: 'Meio Ambiente' })[k] || k;
  }
})();
