/**
 * Renderers de cada etapa do wizard
 * Cada framework expõe: { id, title, desc, modeOnly?, render(state, save), validate(state) }
 */
const Frameworks = (() => {

  const h = (tag, attrs = {}, children = '') => {
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === 'class') el.className = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k === 'value') el.value = v;
      else el.setAttribute(k, v);
    });
    if (typeof children === 'string') el.innerHTML = children;
    else if (Array.isArray(children)) children.forEach(c => c && el.appendChild(c));
    else if (children) el.appendChild(children);
    return el;
  };

  // ============ WELCOME (passo 1) — captura nome + pergunta-isca ============
  const welcome = {
    id: 'welcome',
    title: 'Boas-vindas',
    desc: 'Antes de mergulhar no plano, queremos te conhecer um pouco.',
    render(state, save) {
      const l = state.lead = state.lead || { personName: '', email: '', phone: '', challengeHint: '' };
      const wrap = h('div', { class: 'card conv-card' });
      wrap.innerHTML = `
        <div class="conv-greet">Oi! 👋</div>
        <label class="field conv-field">
          <span class="conv-q">Como te chamo?</span>
          <input class="input conv-input" data-k="personName" value="${esc(l.personName)}" placeholder="Seu primeiro nome" maxlength="160" autocomplete="given-name" />
        </label>
        <label class="field conv-field">
          <span class="conv-q">Qual é o seu maior desafio estratégico hoje? <small>(uma frase basta)</small></span>
          <textarea data-k="challengeHint" placeholder="Ex: Crescer sem perder margem / encontrar nicho / reduzir CAC..." maxlength="500">${esc(l.challengeHint)}</textarea>
        </label>
        <p class="conv-hint muted">Sem cadastro. O plano fica salvo neste navegador enquanto você preenche.</p>
      `;
      wrap.querySelectorAll('[data-k]').forEach(inp => {
        inp.addEventListener('input', e => {
          const k = e.target.dataset.k;
          state.lead[k] = e.target.value;
          save();
          if (window.Leads) {
            if (k === 'personName')   window.Leads.upsertDebounced({ personName: e.target.value, lastStep: 'welcome' });
            if (k === 'challengeHint') window.Leads.upsertDebounced({ lastStep: 'welcome' });
          }
        });
      });
      return wrap;
    },
    // Não bloqueia — passo gentil.
    validate() { return null; }
  };

  // ============ COMPANY NAME (passo 2) ============
  const companyName = {
    id: 'companyName',
    title: 'Sua empresa',
    desc: 'Como sua empresa se chama? Esse nome aparece em tudo que o sistema gera.',
    render(state, save) {
      const c = state.company;
      const wrap = h('div', { class: 'card conv-card' });
      wrap.innerHTML = `
        <label class="field conv-field">
          <span class="conv-q">Nome da empresa</span>
          <input class="input conv-input" data-k="name" value="${esc(c.name)}" placeholder="Ex: Unli Studios" maxlength="200" autocomplete="organization" />
        </label>
        <p class="conv-hint muted">Pode ser o nome fantasia, marca ou projeto — o que você usa no dia a dia.</p>
      `;
      wrap.querySelector('[data-k]').addEventListener('input', e => {
        state.company.name = e.target.value;
        save();
        if (window.Leads) window.Leads.upsertDebounced({ companyName: e.target.value, lastStep: 'companyName' });
      });
      return wrap;
    },
    validate(state) {
      if (!state.company.name.trim()) return 'Informe o nome da empresa.';
      return null;
    }
  };

  // ============ COMPANY CONTEXT (passo 3) — porte, faturamento, tempo, região ============
  // Mantém id='company' por compatibilidade com referências externas e validação.
  const company = {
    id: 'company',
    title: 'Contexto da empresa',
    desc: 'Esses dados ajudam o sistema a calibrar benchmarks de mercado, pricing e funil.',
    render(state, save) {
      const c = state.company;
      const wrap = h('div', { class: 'card' });
      wrap.innerHTML = `
        <div class="form-grid cols-2">
          <label class="field">Segmento / setor
            <input class="input" data-k="segment" value="${esc(c.segment)}" placeholder="Ex: Tecnologia / SaaS" />
          </label>
          <label class="field">Porte
            <select class="input" data-k="size">
              ${opt(c.size, ['', 'Solo / MEI', 'Microempresa (até 9)', 'Pequena (10-49)', 'Média (50-249)', 'Grande (250+)'])}
            </select>
          </label>
          <label class="field">Faturamento mensal estimado <small>(opcional)</small>
            <select class="input" data-k="revenue">
              ${opt(c.revenue, ['', 'Até R$ 10 mil', 'R$ 10-50 mil', 'R$ 50-200 mil', 'R$ 200 mil - 1 mi', 'Acima de R$ 1 mi'])}
            </select>
          </label>
          <label class="field">Tempo de operação <small>(em anos)</small>
            <input class="input" type="number" min="0" data-k="age" value="${esc(c.age)}" placeholder="Ex: 3" />
          </label>
          <label class="field" style="grid-column:1/-1">Região de atuação <small>(opcional)</small>
            <input class="input" data-k="region" value="${esc(c.region || '')}" placeholder="Ex: Brasil — Sudeste, ou Global" />
          </label>
        </div>
      `;
      wrap.querySelectorAll('[data-k]').forEach(inp => {
        inp.addEventListener('input', e => {
          state.company[e.target.dataset.k] = e.target.value;
          save();
        });
      });
      return wrap;
    },
    validate() { return null; }
  };

  // ============ EMAIL DELIVERY (passo 4) — gancho: entrega do plano por e-mail ============
  const emailDelivery = {
    id: 'emailDelivery',
    title: 'Receba o plano por e-mail',
    desc: 'Quando você concluir o wizard, enviamos um resumo consolidado pra esse e-mail.',
    render(state, save) {
      const l = state.lead = state.lead || { personName: '', email: '', phone: '', challengeHint: '' };
      const wrap = h('div', { class: 'card conv-card' });
      wrap.innerHTML = `
        <label class="field conv-field">
          <span class="conv-q">Para onde enviamos o plano consolidado?</span>
          <input class="input conv-input" type="email" data-k="email" value="${esc(l.email)}" placeholder="seu@email.com" maxlength="200" autocomplete="email" inputmode="email" />
          <span class="conv-feedback muted" data-feedback></span>
        </label>
        <p class="conv-hint muted">Sem newsletter automática. O e-mail é só pra você receber o seu próprio plano e poder voltar a editar depois.</p>
      `;
      const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const input = wrap.querySelector('[data-k]');
      const fb = wrap.querySelector('[data-feedback]');
      function updateFeedback() {
        const v = input.value.trim();
        if (!v) { fb.textContent = ''; fb.className = 'conv-feedback muted'; return; }
        if (EMAIL_RE.test(v)) { fb.textContent = '✓ formato válido'; fb.className = 'conv-feedback ok'; }
        else { fb.textContent = '⚠ verifique o e-mail'; fb.className = 'conv-feedback warn'; }
      }
      input.addEventListener('input', e => {
        state.lead.email = e.target.value;
        save();
        updateFeedback();
        if (window.Leads) window.Leads.upsertDebounced({ email: e.target.value, lastStep: 'emailDelivery' });
      });
      updateFeedback();
      return wrap;
    },
    // Não bloqueia — só destaca. Quem não quiser receber, pode pular.
    validate() { return null; }
  };

  // ============ COMPANY IDENTITY (passo 5) — telefone opcional ============
  const companyIdentity = {
    id: 'companyIdentity',
    title: 'Identidade da sua empresa',
    desc: 'No final do wizard, geramos um "perfil" da sua empresa estilo cartão de visita. Isso aqui só personaliza esse perfil.',
    render(state, save) {
      const l = state.lead = state.lead || { personName: '', email: '', phone: '', challengeHint: '' };
      const wrap = h('div', { class: 'card conv-card' });
      wrap.innerHTML = `
        <label class="field conv-field">
          <span class="conv-q">Telefone de contato <small>(opcional)</small></span>
          <input class="input conv-input" type="tel" data-k="phone" value="${esc(l.phone)}" placeholder="+55 (11) 99999-9999" maxlength="40" autocomplete="tel" inputmode="tel" />
        </label>
        <p class="conv-hint muted">Aparece no perfil final como canal de contato. Não compartilhamos com terceiros e não fazemos cold call.</p>
      `;
      const input = wrap.querySelector('[data-k]');
      input.addEventListener('input', e => {
        // Máscara leve: deixa entrar dígitos, espaços, +, (, ), -. Sem libs.
        const cleaned = e.target.value.replace(/[^\d+()\-\s]/g, '').slice(0, 40);
        if (cleaned !== e.target.value) e.target.value = cleaned;
        state.lead.phone = cleaned;
        save();
        if (window.Leads) window.Leads.upsertDebounced({ phone: cleaned, lastStep: 'companyIdentity' });
      });
      return wrap;
    },
    validate() { return null; }
  };

  // ============ VISION (modo completo) ============
  const vision = {
    id: 'vision',
    title: 'Direção Estratégica (Visão)',
    desc: 'Onde você quer chegar? Essa é a bússola que orienta todas as decisões.',
    modeOnly: 'completo',
    render(state, save) {
      const v = state.vision;
      const wrap = h('div', { class: 'card' });
      wrap.innerHTML = `
        <div class="help-box"><strong>Dica:</strong> Visão é qualitativa e inspiracional. Não precisa ser perfeita agora — pode evoluir.</div>
        <div class="form-grid">
          <label class="field">Propósito <small>Por que sua empresa existe?</small>
            <textarea data-k="purpose" placeholder="Ex: Mostrar que o Brasil é capaz de inovar em escala global">${esc(v.purpose)}</textarea>
          </label>
          <label class="field">Core <small>Qual é o seu DNA, sua essência?</small>
            <textarea data-k="core" placeholder="Ex: Criatividade na resolução de problemas">${esc(v.core)}</textarea>
          </label>
          <label class="field">Visão de 3 a 5 anos
            <textarea data-k="vision3to5" placeholder="Ex: Ser o maior hub de inovação e tecnologia do Brasil">${esc(v.vision3to5)}</textarea>
          </label>
          <label class="field">Sonho Grande <small>(BHAG - Big Hairy Audacious Goal)</small>
            <textarea data-k="bigDream" placeholder="Ex: Atingir status de unicórnio em 7 anos">${esc(v.bigDream)}</textarea>
          </label>
        </div>
      `;
      wrap.querySelectorAll('[data-k]').forEach(inp => {
        inp.addEventListener('input', e => {
          state.vision[e.target.dataset.k] = e.target.value;
          save();
        });
      });
      return wrap;
    },
    validate() { return null; }
  };

  // ============ ICP / Personas ============
  const icp = {
    id: 'icp',
    title: 'Cliente Ideal (ICP / Personas)',
    desc: 'Defina quem é o cliente ideal. Quanto mais específico, melhor o resto do plano.',
    render(state, save) {
      const wrap = h('div');
      wrap.innerHTML = `<div class="help-box">
        <strong>Dica:</strong> Marque <strong>uma persona como primária</strong> — ela puxa as decisões. Campos críticos: <strong>dor, orçamento e autoridade de decisão</strong>.
      </div>`;
      attachAIHelper(wrap, 'personaDetector', state, save, 'Sugerir personas a partir do contexto');

      const list = h('div'); wrap.appendChild(list);

      function renderList() {
        list.innerHTML = '';
        (state.icp.personas || []).forEach((p, i) => {
          const fit = Scoring.icpFitScore(p);
          const card = h('div', { class: 'persona-card' });
          card.innerHTML = `
            <div class="persona-head">
              <h5>Persona #${i + 1} ${p.primary ? '<span class="badge success">primária</span>' : ''}</h5>
              <div class="persona-fit">
                <span class="badge ${fit.color}">ICP Fit ${fit.score.toFixed(1)}/10</span>
                <span class="muted" style="font-size:12px">${fit.label}</span>
              </div>
              <button class="btn-icon" data-del>×</button>
            </div>
            <div class="form-grid cols-2">
              <label class="field">Nome da persona
                <input class="input" data-k="name" value="${esc(p.name)}" placeholder="Ex: Mariana — Gerente de Marketing" />
              </label>
              <label class="field">Cargo / papel
                <input class="input" data-k="role" value="${esc(p.role)}" placeholder="Ex: Gerente / Diretor / Solo" />
              </label>
              <label class="field">Porte da empresa-cliente <small>(se B2B)</small>
                <input class="input" data-k="companySize" value="${esc(p.companySize)}" placeholder="Ex: PME 10-50 funcionários" />
              </label>
              <label class="field">Faixa etária / perfil
                <input class="input" data-k="ageRange" value="${esc(p.ageRange)}" placeholder="Ex: 30-45 anos, classe B" />
              </label>
              <label class="field" style="grid-column:1/-1">Dor principal <small>(crítico)</small>
                <textarea data-k="pain" placeholder="Ex: Perde 10h/semana com tarefas manuais que poderiam ser automatizadas">${esc(p.pain)}</textarea>
              </label>
              <label class="field">Gatilho de compra
                <input class="input" data-k="trigger" value="${esc(p.trigger)}" placeholder="Ex: Após nova contratação que não rende" />
              </label>
              <label class="field">Orçamento típico <small>(crítico)</small>
                <input class="input" data-k="budget" value="${esc(p.budget)}" placeholder="Ex: R$ 500-2.000/mês" />
              </label>
              <label class="field">Autoridade de decisão <small>(crítico)</small>
                <select class="input" data-k="authority">
                  ${opt(p.authority, ['', 'Decisor final', 'Influenciador', 'Comitê', 'Indica para chefe'])}
                </select>
              </label>
              <label class="field">Canal preferido
                <input class="input" data-k="channel" value="${esc(p.channel)}" placeholder="Ex: LinkedIn / indicação / busca" />
              </label>
              <label class="field check-inline" style="grid-column:1/-1">
                <input type="checkbox" data-k="primary" ${p.primary ? 'checked' : ''} /> Esta é a persona <strong>primária</strong>
              </label>
            </div>
          `;
          card.querySelectorAll('[data-k]').forEach(inp => {
            inp.addEventListener('input', e => {
              const key = e.target.dataset.k;
              if (e.target.type === 'checkbox') {
                if (key === 'primary' && e.target.checked) {
                  state.icp.personas.forEach((x, j) => { x.primary = j === i; });
                } else {
                  p[key] = e.target.checked;
                }
              } else {
                p[key] = e.target.value;
              }
              save();
              if (key === 'primary') renderList();
              else {
                // atualizar fit em tempo real
                const ff = Scoring.icpFitScore(p);
                const badge = card.querySelector('.persona-fit .badge');
                badge.className = `badge ${ff.color}`;
                badge.textContent = `ICP Fit ${ff.score.toFixed(1)}/10`;
                card.querySelector('.persona-fit .muted').textContent = ff.label;
              }
            });
          });
          card.querySelector('[data-del]').addEventListener('click', () => {
            state.icp.personas.splice(i, 1); save(); renderList();
          });
          list.appendChild(card);
        });
      }
      renderList();

      const add = h('button', { class: 'btn-add' }, '+ Adicionar Persona');
      add.addEventListener('click', () => {
        state.icp.personas = state.icp.personas || [];
        const isFirst = state.icp.personas.length === 0;
        state.icp.personas.push({
          name: '', role: '', ageRange: '', companySize: '',
          pain: '', trigger: '', budget: '', authority: '', channel: '',
          primary: isFirst
        });
        save(); renderList();
      });
      wrap.appendChild(add);
      return wrap;
    },
    validate(state) {
      if (!(state.icp.personas || []).length) return 'Adicione ao menos 1 persona.';
      if (!state.icp.personas.some(p => p.primary)) return 'Marque uma persona como primária.';
      return null;
    }
  };

  // ============ MARKET (TAM/SAM/SOM) ============
  const market = {
    id: 'market',
    title: 'Tamanho do Mercado (TAM / SAM / SOM)',
    desc: 'Quanto vale o mercado total, o que você consegue endereçar e o que pretende capturar.',
    render(state, save) {
      const m = state.market;
      const wrap = h('div');
      wrap.innerHTML = `<div class="help-box">
        <strong>TAM</strong> = mercado total mundial/nacional. <strong>SAM</strong> = mercado que seu modelo atinge. <strong>SOM</strong> = fatia realista em 12 meses (≤ 5% do SAM).
      </div>`;

      const card = h('div', { class: 'card' });
      card.innerHTML = `
        <div class="form-grid cols-2">
          <label class="field">TAM — Mercado Total <small>(anual, R$)</small>
            <input class="input" type="number" data-k="tam" value="${esc(m.tam)}" placeholder="Ex: 50000000000" />
          </label>
          <label class="field">SAM — Endereçável <small>(anual, R$)</small>
            <input class="input" type="number" data-k="sam" value="${esc(m.sam)}" placeholder="Ex: 2000000000" />
          </label>
          <label class="field">SOM — Obtenível em 12 meses <small>(R$)</small>
            <input class="input" type="number" data-k="som" value="${esc(m.som)}" placeholder="Ex: 50000000" />
          </label>
          <label class="field">Período-base (meses)
            <input class="input" type="number" data-k="timeframeMonths" value="${esc(m.timeframeMonths)}" placeholder="12" />
          </label>
          <label class="field" style="grid-column:1/-1">Notas / fontes <small>(de onde vieram os números)</small>
            <textarea data-k="notes" placeholder="Ex: IBGE, ABComm, relatórios de associação setorial...">${esc(m.notes)}</textarea>
          </label>
        </div>
        <div id="marketResult" style="margin-top:18px"></div>
      `;
      wrap.appendChild(card);
      attachAIHelper(wrap, 'marketSizer', state, save, 'Estimar TAM/SAM/SOM');

      const updateResult = () => {
        const a = Scoring.marketAnalysis(state.market);
        const res = card.querySelector('#marketResult');
        if (!a.tam) { res.innerHTML = ''; return; }
        res.innerHTML = `
          <div class="pyramid">
            <div class="pyr-row tam" style="width:100%">
              <span class="pyr-label">TAM</span><span class="pyr-value">${fmtMoney(a.tam)}</span>
            </div>
            <div class="pyr-row sam" style="width:${clamp(a.samOfTam, 5, 95)}%">
              <span class="pyr-label">SAM</span><span class="pyr-value">${fmtMoney(a.sam)} <small>(${a.samOfTam.toFixed(1)}% do TAM)</small></span>
            </div>
            <div class="pyr-row som" style="width:${clamp(a.somOfSam, 2, 60)}%">
              <span class="pyr-label">SOM</span><span class="pyr-value">${fmtMoney(a.som)} <small>(${a.somOfSam.toFixed(1)}% do SAM)</small></span>
            </div>
          </div>
          ${a.alerts.length ? `<div class="alerts">${a.alerts.map(x => `<div class="alert warning">⚠ ${x}</div>`).join('')}</div>` : '<div class="alert success">✓ Tamanho de mercado coerente.</div>'}
        `;
      };
      card.querySelectorAll('[data-k]').forEach(inp => {
        inp.addEventListener('input', e => {
          state.market[e.target.dataset.k] = e.target.value;
          save(); updateResult();
        });
      });
      updateResult();
      return wrap;
    },
    validate() { return null; }
  };

  // ============ COMPETITION ============
  const competition = {
    id: 'competition',
    title: 'Análise de Concorrência',
    desc: 'Liste concorrentes e avalie cada um em critérios-chave (1 = fraco, 5 = excelente).',
    render(state, save) {
      const c = state.competition;
      const wrap = h('div');
      wrap.innerHTML = `<div class="help-box">
        <strong>Como usar:</strong> ajuste os critérios se quiser. Dê notas 1-5 para cada concorrente. O sistema calcula seu diferencial e identifica o "espaço em branco" (critérios em que <em>todos</em> são fracos).
      </div>`;
      attachAIHelper(wrap, 'competitorResearcher', state, save, 'Buscar concorrentes prováveis');

      // Critérios editáveis
      const critCard = h('div', { class: 'card' });
      critCard.innerHTML = `<h4 style="margin:0 0 10px">Critérios de avaliação</h4>
        <div class="chip-list" id="critList"></div>
        <div style="display:flex;gap:8px;margin-top:10px">
          <input class="input" id="newCrit" placeholder="Adicionar critério (ex: Inovação)" style="flex:1" />
          <button class="btn ghost sm" id="addCrit">+ Adicionar</button>
        </div>`;
      wrap.appendChild(critCard);

      const matrixWrap = h('div'); wrap.appendChild(matrixWrap);
      const analysisWrap = h('div'); wrap.appendChild(analysisWrap);

      function renderCriteria() {
        const list = critCard.querySelector('#critList');
        list.innerHTML = '';
        c.criteria.forEach((cr, i) => {
          const chip = h('span', { class: 'chip' });
          chip.innerHTML = `${esc(cr)} <button data-del="${i}">×</button>`;
          chip.querySelector('button').addEventListener('click', () => {
            c.criteria.splice(i, 1);
            (c.competitors || []).forEach(co => { if (co.scores) delete co.scores[cr]; });
            if (c.selfScores) delete c.selfScores[cr];
            if (c.axes.x === cr) c.axes.x = c.criteria[0] || '';
            if (c.axes.y === cr) c.axes.y = c.criteria[1] || '';
            save(); renderAll();
          });
          list.appendChild(chip);
        });
      }
      critCard.querySelector('#addCrit').addEventListener('click', () => {
        const v = critCard.querySelector('#newCrit').value.trim();
        if (v && !c.criteria.includes(v)) {
          c.criteria.push(v);
          critCard.querySelector('#newCrit').value = '';
          save(); renderAll();
        }
      });

      function renderMatrix() {
        matrixWrap.innerHTML = '';
        const card = h('div', { class: 'card' });
        card.innerHTML = `<h4 style="margin:0 0 10px">Matriz competitiva</h4>`;
        const table = h('table', { class: 'comp-matrix' });
        let html = `<thead><tr><th>Empresa</th>${c.criteria.map(cr => `<th>${esc(cr)}</th>`).join('')}<th>Total</th><th></th></tr></thead><tbody>`;
        // linha "Você"
        html += `<tr class="self-row"><td><strong>Você</strong></td>`;
        c.criteria.forEach(cr => {
          html += `<td><input class="num" type="number" min="1" max="5" data-self="${esc(cr)}" value="${esc(c.selfScores[cr] || '')}" /></td>`;
        });
        html += `<td class="total" data-self-total>—</td><td></td></tr>`;
        // concorrentes
        (c.competitors || []).forEach((co, i) => {
          html += `<tr><td><input class="input" data-comp-name="${i}" value="${esc(co.name)}" placeholder="Concorrente ${i + 1}" /></td>`;
          c.criteria.forEach(cr => {
            html += `<td><input class="num" type="number" min="1" max="5" data-comp="${i}" data-crit="${esc(cr)}" value="${esc(co.scores?.[cr] || '')}" /></td>`;
          });
          html += `<td class="total" data-comp-total="${i}">—</td>
            <td><button class="btn-icon" data-del-comp="${i}">×</button></td></tr>`;
        });
        html += `</tbody>`;
        table.innerHTML = html;
        card.appendChild(table);
        const add = h('button', { class: 'btn-add' }, '+ Adicionar concorrente');
        add.addEventListener('click', () => {
          c.competitors = c.competitors || [];
          c.competitors.push({ name: '', scores: {}, notes: '' });
          save(); renderAll();
        });
        card.appendChild(add);
        matrixWrap.appendChild(card);

        // listeners
        card.querySelectorAll('[data-self]').forEach(inp => {
          inp.addEventListener('input', e => {
            c.selfScores[e.target.dataset.self] = e.target.value;
            save(); updateTotals(); renderAnalysis();
          });
        });
        card.querySelectorAll('[data-comp-name]').forEach(inp => {
          inp.addEventListener('input', e => {
            c.competitors[+e.target.dataset.compName].name = e.target.value;
            save(); renderAnalysis();
          });
        });
        card.querySelectorAll('[data-comp]').forEach(inp => {
          inp.addEventListener('input', e => {
            const idx = +e.target.dataset.comp;
            const cr = e.target.dataset.crit;
            c.competitors[idx].scores = c.competitors[idx].scores || {};
            c.competitors[idx].scores[cr] = e.target.value;
            save(); updateTotals(); renderAnalysis();
          });
        });
        card.querySelectorAll('[data-del-comp]').forEach(btn => {
          btn.addEventListener('click', () => {
            c.competitors.splice(+btn.dataset.delComp, 1); save(); renderAll();
          });
        });
        updateTotals();
      }

      function updateTotals() {
        const selfTotal = c.criteria.reduce((s, cr) => s + (Number(c.selfScores[cr]) || 0), 0);
        const selfEl = matrixWrap.querySelector('[data-self-total]');
        if (selfEl) selfEl.textContent = selfTotal || '—';
        (c.competitors || []).forEach((co, i) => {
          const t = c.criteria.reduce((s, cr) => s + (Number(co.scores?.[cr]) || 0), 0);
          const el = matrixWrap.querySelector(`[data-comp-total="${i}"]`);
          if (el) el.textContent = t || '—';
        });
      }

      function renderAnalysis() {
        const a = Scoring.competitionAnalysis(c);
        if (!a.rankings.length) { analysisWrap.innerHTML = ''; return; }
        analysisWrap.innerHTML = `
          <div class="card">
            <h4 style="margin:0 0 10px">Análise</h4>
            <div class="dash-grid" style="margin-bottom:14px">
              ${tile('Diferenciação média', (a.differentiationScore >= 0 ? '+' : '') + a.differentiationScore.toFixed(2), 'vs. média dos concorrentes')}
              ${tile('Ranking geral', a.rankings[0].name, `top: ${a.rankings[0].total} pontos`)}
              ${tile('Espaço em branco', a.whitespace.length ? a.whitespace.join(', ') : '—', a.whitespace.length ? 'critérios fracos em todos' : 'todos os critérios cobertos')}
            </div>
            <h5 style="margin:12px 0 6px">Ranking</h5>
            <ol style="margin:0;padding-left:20px">
              ${a.rankings.map(r => `<li>${esc(r.name)} — <strong>${r.total}</strong> pts</li>`).join('')}
            </ol>
          </div>
        `;
      }

      function renderAll() {
        renderCriteria();
        renderMatrix();
        renderAnalysis();
      }
      renderAll();
      return wrap;
    },
    validate() { return null; }
  };

  // ============ PRODUCT FOCUS ============
  const product = {
    id: 'product',
    title: 'Produto-foco / Portfólio',
    desc: 'Liste suas ofertas. O sistema identifica qual produto deve receber o foco (80/20).',
    render(state, save) {
      const p = state.product;
      const wrap = h('div');
      wrap.innerHTML = `<div class="help-box">
        <strong>Regra:</strong> %receita e %esforço somam 100% no total. O sistema calcula <strong>eficiência</strong> (receita/esforço) e aponta produtos que <em>sangram</em> esforço sem retornar.
      </div>`;
      attachAIHelper(wrap, 'productIdeaGenerator', state, save, 'Sugerir ideias de produto');

      const list = h('div'); wrap.appendChild(list);
      const analysisWrap = h('div'); wrap.appendChild(analysisWrap);

      function renderList() {
        list.innerHTML = '';
        (p.offerings || []).forEach((o, i) => {
          const card = h('div', { class: 'offering-card' });
          card.innerHTML = `
            <h5>Oferta #${i + 1} <button class="btn-icon" data-del>×</button></h5>
            <div class="form-grid cols-2">
              <label class="field" style="grid-column:1/-1">Nome da oferta
                <input class="input" data-k="name" value="${esc(o.name)}" placeholder="Ex: Plano Pro / Consultoria mensal" />
              </label>
              <label class="field">% da receita
                <input class="input" type="number" min="0" max="100" data-k="revenuePct" value="${esc(o.revenuePct)}" placeholder="Ex: 60" />
              </label>
              <label class="field">% do esforço/tempo
                <input class="input" type="number" min="0" max="100" data-k="effortPct" value="${esc(o.effortPct)}" placeholder="Ex: 30" />
              </label>
              <label class="field">% margem
                <input class="input" type="number" min="-100" max="100" data-k="marginPct" value="${esc(o.marginPct)}" placeholder="Ex: 45" />
              </label>
            </div>
          `;
          card.querySelectorAll('[data-k]').forEach(inp => {
            inp.addEventListener('input', e => {
              o[e.target.dataset.k] = e.target.value;
              save(); renderAnalysis();
            });
          });
          card.querySelector('[data-del]').addEventListener('click', () => {
            p.offerings.splice(i, 1); save(); renderList(); renderAnalysis();
          });
          list.appendChild(card);
        });
      }

      function renderAnalysis() {
        const a = Scoring.productFocusAnalysis(p);
        if (!a.focus) { analysisWrap.innerHTML = ''; return; }
        const sumRev = (p.offerings || []).reduce((s, o) => s + (Number(o.revenuePct) || 0), 0);
        const sumEff = (p.offerings || []).reduce((s, o) => s + (Number(o.effortPct) || 0), 0);
        analysisWrap.innerHTML = `
          <div class="card">
            <h4 style="margin:0 0 10px">Análise 80/20</h4>
            <div class="dash-grid" style="margin-bottom:14px">
              ${tile('Produto-foco recomendado', esc(a.focus.name), `eficiência ${a.focus.efficiency.toFixed(2)}`)}
              ${tile('Estrelas', a.stars.map(s => esc(s.name)).join(', ') || '—', 'eficiência ≥ 1.2')}
              ${tile('Sangrias', a.bleeders.map(b => esc(b.name)).join(', ') || '—', 'esforço alto, receita baixa')}
            </div>
            ${(sumRev !== 100 || sumEff !== 100) ? `<div class="alert warning">⚠ Soma de %receita = ${sumRev}, %esforço = ${sumEff}. O ideal é 100 cada.</div>` : ''}
            <label class="field" style="margin-top:14px">Justificativa do foco
              <textarea id="focusReasoning" placeholder="Por que este é o produto-foco? Quais critérios pesaram?">${esc(p.focusReasoning)}</textarea>
            </label>
          </div>
        `;
        const t = analysisWrap.querySelector('#focusReasoning');
        if (t) t.addEventListener('input', e => { p.focusReasoning = e.target.value; save(); });
      }

      const add = h('button', { class: 'btn-add' }, '+ Adicionar Oferta');
      add.addEventListener('click', () => {
        p.offerings = p.offerings || [];
        p.offerings.push({ name: '', revenuePct: '', effortPct: '', marginPct: '' });
        save(); renderList(); renderAnalysis();
      });

      renderList();
      wrap.appendChild(add);
      renderAnalysis();
      return wrap;
    },
    validate() { return null; }
  };

  // ============ PRICING ============
  const pricing = {
    id: 'pricing',
    title: 'Posicionamento + Pricing',
    desc: 'Defina sua mensagem-chave e onde seu preço se posiciona no mercado.',
    render(state, save) {
      const pr = state.pricing;
      const wrap = h('div');
      wrap.innerHTML = `<div class="help-box">
        <strong>Statement de Posicionamento:</strong> "Para <em>[ICP]</em>, que <em>[problema]</em>, nós oferecemos <em>[produto]</em> que <em>[benefício]</em>, diferente de <em>[concorrente]</em> porque <em>[razão]</em>."
      </div>`;
      attachAIHelper(wrap, 'pricingBenchmark', state, save, 'Buscar faixa de preço do mercado');

      const card = h('div', { class: 'card' });
      const st = pr.statement || {};
      card.innerHTML = `
        <h4 style="margin:0 0 10px">Statement de Posicionamento</h4>
        <div class="form-grid cols-2">
          <label class="field">Para (ICP)
            <input class="input" data-st="icp" value="${esc(st.icp)}" placeholder="Ex: gerentes de marketing de PMEs" />
          </label>
          <label class="field">Que (problema)
            <input class="input" data-st="problem" value="${esc(st.problem)}" placeholder="Ex: gastam 10h/semana em relatórios manuais" />
          </label>
          <label class="field">Oferecemos (produto)
            <input class="input" data-st="product" value="${esc(st.product)}" placeholder="Ex: dashboard automatizado de marketing" />
          </label>
          <label class="field">Que (benefício)
            <input class="input" data-st="benefit" value="${esc(st.benefit)}" placeholder="Ex: economiza 8h/semana e mostra ROI por canal" />
          </label>
          <label class="field">Diferente de (concorrente)
            <input class="input" data-st="competitor" value="${esc(st.competitor)}" placeholder="Ex: planilhas e ferramentas genéricas" />
          </label>
          <label class="field">Porque (razão)
            <input class="input" data-st="reason" value="${esc(st.reason)}" placeholder="Ex: integração nativa com 20+ canais brasileiros" />
          </label>
        </div>
        <h4 style="margin:18px 0 10px">Pricing</h4>
        <div class="form-grid cols-2">
          <label class="field">Preço atual (R$)
            <input class="input" type="number" data-k="currentPrice" value="${esc(pr.currentPrice)}" placeholder="Ex: 297" />
          </label>
          <label class="field">Margem alvo (%)
            <input class="input" type="number" data-k="targetMargin" value="${esc(pr.targetMargin)}" placeholder="Ex: 60" />
          </label>
          <label class="field">Mercado — mín (R$)
            <input class="input" type="number" data-k="marketMin" value="${esc(pr.marketMin)}" placeholder="Ex: 99" />
          </label>
          <label class="field">Mercado — mediana (R$)
            <input class="input" type="number" data-k="marketMedian" value="${esc(pr.marketMedian)}" placeholder="Ex: 350" />
          </label>
          <label class="field">Mercado — máx (R$)
            <input class="input" type="number" data-k="marketMax" value="${esc(pr.marketMax)}" placeholder="Ex: 1500" />
          </label>
          <label class="field">Margem real atual (%)
            <input class="input" type="number" data-k="actualMargin" value="${esc(pr.actualMargin)}" placeholder="Ex: 52" />
          </label>
        </div>
        <div id="pricingResult" style="margin-top:16px"></div>
      `;
      wrap.appendChild(card);

      const updateResult = () => {
        const a = Scoring.pricingAnalysis(pr);
        const res = card.querySelector('#pricingResult');
        if (!a.strategy || a.strategy === '—') { res.innerHTML = ''; return; }
        const pos = clamp(a.position, 0, 100);
        res.innerHTML = `
          <div class="pricing-bar">
            <div class="pricing-track">
              <div class="pricing-marker" style="left:${pos}%" title="Seu preço"></div>
              <div class="pricing-median" title="Mediana de mercado"></div>
            </div>
            <div class="pricing-labels">
              <span>R$ ${pr.marketMin || '?'}</span>
              <span>R$ ${pr.marketMedian || '?'}</span>
              <span>R$ ${pr.marketMax || '?'}</span>
            </div>
          </div>
          <div class="dash-tile" style="margin-top:14px">
            <h4>Estratégia detectada</h4>
            <div class="big">${a.strategy}</div>
            <div class="desc"><span class="badge ${a.color}">${a.label}</span></div>
          </div>
        `;
      };
      card.querySelectorAll('[data-st]').forEach(inp => {
        inp.addEventListener('input', e => {
          pr.statement = pr.statement || {};
          pr.statement[e.target.dataset.st] = e.target.value;
          save();
        });
      });
      card.querySelectorAll('[data-k]').forEach(inp => {
        inp.addEventListener('input', e => {
          pr[e.target.dataset.k] = e.target.value;
          save(); updateResult();
        });
      });
      updateResult();
      return wrap;
    },
    validate() { return null; }
  };

  // ============ FUNNEL ============
  const funnel = {
    id: 'funnel',
    title: 'Funil de Vendas',
    desc: 'Configure as etapas, taxas de conversão e meta — o sistema calcula reverso quantos leads você precisa.',
    render(state, save) {
      const f = state.funnel;
      const wrap = h('div');
      wrap.innerHTML = `<div class="help-box">
        <strong>Como funciona:</strong> preencha quantos passam por cada etapa hoje (opcional) e a <strong>taxa de conversão</strong> para a próxima. Defina o ticket médio + meta mensal — o sistema diz <em>quantos visitantes você precisa</em>.
      </div>`;
      attachAIHelper(wrap, 'salesFunnelArchitect', state, save, 'Montar funil sugerido para seu segmento');

      // Topo: ticket, ciclo, meta
      const topCard = h('div', { class: 'card' });
      topCard.innerHTML = `
        <div class="form-grid cols-2">
          <label class="field">Ticket médio (R$)
            <input class="input" type="number" data-k="avgTicket" value="${esc(f.avgTicket)}" placeholder="Ex: 350" />
          </label>
          <label class="field">Ciclo de venda (dias)
            <input class="input" type="number" data-k="salesCycleDays" value="${esc(f.salesCycleDays)}" placeholder="Ex: 30" />
          </label>
          <label class="field">Meta de receita mensal (R$)
            <input class="input" type="number" data-k="monthlyRevenueGoal" value="${esc(f.monthlyRevenueGoal)}" placeholder="Ex: 100000" />
          </label>
        </div>
      `;
      wrap.appendChild(topCard);
      topCard.querySelectorAll('[data-k]').forEach(inp => {
        inp.addEventListener('input', e => {
          f[e.target.dataset.k] = e.target.value;
          save(); renderAnalysis();
        });
      });

      // Etapas
      const stagesCard = h('div', { class: 'card' });
      stagesCard.innerHTML = `<h4 style="margin:0 0 10px">Etapas do funil</h4>`;
      const stagesList = h('div'); stagesCard.appendChild(stagesList);
      wrap.appendChild(stagesCard);

      function renderStages() {
        stagesList.innerHTML = '';
        f.stages.forEach((s, i) => {
          const isLast = i === f.stages.length - 1;
          const row = h('div', { class: 'stage-row' });
          row.innerHTML = `
            <input class="input" data-sname value="${esc(s.name)}" placeholder="Nome da etapa" />
            <input class="input" type="number" data-scount value="${esc(s.count)}" placeholder="Qtd atual" />
            ${!isLast ? `<input class="input" type="number" min="0" max="100" data-srate value="${esc(s.conversionToNext)}" placeholder="% → próxima" />` : '<div class="muted" style="align-self:center">(final)</div>'}
            <button class="btn-icon" data-del>×</button>
          `;
          row.querySelector('[data-sname]').addEventListener('input', e => { s.name = e.target.value; save(); renderAnalysis(); });
          row.querySelector('[data-scount]').addEventListener('input', e => { s.count = e.target.value; save(); renderAnalysis(); });
          if (!isLast) {
            row.querySelector('[data-srate]').addEventListener('input', e => { s.conversionToNext = e.target.value; save(); renderAnalysis(); });
          }
          row.querySelector('[data-del]').addEventListener('click', () => {
            if (f.stages.length <= 2) { alert('Mantenha pelo menos 2 etapas.'); return; }
            f.stages.splice(i, 1); save(); renderStages(); renderAnalysis();
          });
          stagesList.appendChild(row);
        });
      }
      const addStage = h('button', { class: 'btn-add' }, '+ Adicionar etapa');
      addStage.addEventListener('click', () => {
        f.stages.splice(f.stages.length - 1, 0, { name: 'Nova etapa', count: '', conversionToNext: '' });
        save(); renderStages(); renderAnalysis();
      });
      stagesCard.appendChild(addStage);

      // Canais
      const channelsCard = h('div', { class: 'card' });
      channelsCard.innerHTML = `<h4 style="margin:0 0 10px">Canais de aquisição <small class="muted">(opcional)</small></h4>`;
      const chList = h('div'); channelsCard.appendChild(chList);
      wrap.appendChild(channelsCard);

      function renderChannels() {
        chList.innerHTML = '';
        (f.channels || []).forEach((ch, i) => {
          const row = h('div', { class: 'channel-row' });
          row.innerHTML = `
            <input class="input" data-cname value="${esc(ch.name)}" placeholder="Ex: Google Ads / Indicação / Outbound" />
            <input class="input" type="number" data-cmix value="${esc(ch.mixPct)}" placeholder="% do mix" />
            <input class="input" type="number" data-ccost value="${esc(ch.costPerLead)}" placeholder="R$ / lead" />
            <button class="btn-icon" data-cdel>×</button>
          `;
          row.querySelector('[data-cname]').addEventListener('input', e => { ch.name = e.target.value; save(); });
          row.querySelector('[data-cmix]').addEventListener('input', e => { ch.mixPct = e.target.value; save(); });
          row.querySelector('[data-ccost]').addEventListener('input', e => { ch.costPerLead = e.target.value; save(); });
          row.querySelector('[data-cdel]').addEventListener('click', () => {
            f.channels.splice(i, 1); save(); renderChannels();
          });
          chList.appendChild(row);
        });
      }
      const addCh = h('button', { class: 'btn-add' }, '+ Adicionar canal');
      addCh.addEventListener('click', () => {
        f.channels = f.channels || [];
        f.channels.push({ name: '', mixPct: '', costPerLead: '' });
        save(); renderChannels();
      });
      channelsCard.appendChild(addCh);

      // Análise reversa
      const analysisWrap = h('div'); wrap.appendChild(analysisWrap);
      function renderAnalysis() {
        const a = Scoring.funnelAnalysis(f);
        if (!a.neededClients) { analysisWrap.innerHTML = ''; return; }
        analysisWrap.innerHTML = `
          <div class="card">
            <h4 style="margin:0 0 10px">Cálculo reverso</h4>
            ${a.allRatesFilled ? `
              <p style="margin:0 0 10px"><strong>Para faturar ${fmtMoney(Number(f.monthlyRevenueGoal))}/mês com ticket de ${fmtMoney(Number(f.avgTicket))}, você precisa:</strong></p>
              <div class="funnel-viz">
                ${a.reverseFlow.map((s, i) => {
                  const max = a.reverseFlow[0].count;
                  const pct = (s.count / max) * 100;
                  return `<div class="funnel-stage" style="width:${pct}%">
                    <span class="fs-name">${esc(s.stage)}</span>
                    <span class="fs-count">${s.count.toLocaleString('pt-BR')}</span>
                  </div>`;
                }).join('')}
              </div>
            ` : `<div class="alert warning">⚠ Preencha as taxas de conversão para ver o cálculo reverso.</div>
                <p><strong>Clientes necessários:</strong> ${a.neededClients} / mês</p>`}
            ${a.bottleneck ? `<div class="alert info" style="margin-top:14px">🔍 <strong>Gargalo:</strong> ${esc(a.bottleneck.stage)} — apenas ${a.bottleneck.rate.toFixed(1)}% convertem.</div>` : ''}
          </div>
        `;
      }

      renderStages();
      renderChannels();
      renderAnalysis();
      return wrap;
    },
    validate() { return null; }
  };

  // ============ FORECAST ============
  const forecast = {
    id: 'forecast',
    title: 'Projeção de Vendas (12 meses)',
    desc: 'Combina seu funil + retenção + crescimento mensal para projetar receita ao longo do ano.',
    render(state, save) {
      const f = state.forecast;
      const wrap = h('div');
      wrap.innerHTML = `<div class="help-box">
        <strong>Cenários:</strong> pessimista (metade do crescimento), realista (esperado) e otimista (1.5x). Baseado nos dados do funil e ticket médio.
      </div>`;

      const card = h('div', { class: 'card' });
      card.innerHTML = `
        <div class="form-grid cols-2">
          <label class="field">Crescimento mensal esperado (%)
            <input class="input" type="number" step="0.1" data-k="growthRatePct" value="${esc(f.growthRatePct)}" placeholder="Ex: 8" />
          </label>
          <label class="field">Retenção mensal (%)
            <input class="input" type="number" step="0.1" data-k="retentionPct" value="${esc(f.retentionPct)}" placeholder="Ex: 92" />
          </label>
          <label class="field">Período (meses)
            <input class="input" type="number" data-k="months" value="${esc(f.months)}" min="3" max="36" />
          </label>
          <label class="field">Cenário ativo
            <select class="input" data-k="scenario">
              ${opt(f.scenario, ['pessimista', 'realista', 'otimista'])}
            </select>
          </label>
        </div>
        <div id="forecastResult" style="margin-top:16px"></div>
      `;
      wrap.appendChild(card);

      const updateResult = () => {
        const proj = Scoring.forecastProjection(state);
        const res = card.querySelector('#forecastResult');
        if (!proj.months.length) {
          res.innerHTML = '<div class="alert warning">⚠ Preencha o funil (ticket + clientes atuais) para projetar.</div>';
          return;
        }
        const max = Math.max(...proj.months.map(m => m.revenue));
        res.innerHTML = `
          <div class="dash-tile" style="margin-bottom:14px">
            <h4>Receita acumulada (${proj.scenario})</h4>
            <div class="big">${fmtMoney(proj.totalRevenue)}</div>
            <div class="desc">em ${proj.months.length} meses</div>
          </div>
          <div class="forecast-chart">
            ${proj.months.map(m => `
              <div class="fc-bar" title="Mês ${m.month}: ${fmtMoney(m.revenue)} (${m.activeBase} clientes)">
                <div class="fc-fill" style="height:${(m.revenue / max) * 100}%"></div>
                <span class="fc-label">${m.month}</span>
              </div>
            `).join('')}
          </div>
        `;
      };
      card.querySelectorAll('[data-k]').forEach(inp => {
        inp.addEventListener('input', e => {
          state.forecast[e.target.dataset.k] = e.target.value;
          save(); updateResult();
        });
      });
      updateResult();
      return wrap;
    },
    validate() { return null; }
  };

  // ============ SWOT ============
  const swot = {
    id: 'swot',
    title: 'Diagnóstico SWOT',
    desc: 'Liste os principais pontos. Para cada item, dê notas de Impacto e Confiança (1-10).',
    render(state, save) {
      const wrap = h('div');
      wrap.innerHTML = `<div class="help-box">
        <strong>Como pontuar:</strong> <strong>Impacto</strong> = quão relevante é para o negócio. <strong>Confiança</strong> = quão certo você está. Score do item = (Impacto × Confiança) ÷ 10.
      </div>`;
      attachAIHelper(wrap, 'swotDetector', state, save, 'Sugerir itens da SWOT a partir do contexto');
      const grid = h('div', { class: 'swot-grid' });
      grid.appendChild(makeBlock('s', 'Forças (S)', 'Vantagens internas, controláveis', state.swot.strengths, save));
      grid.appendChild(makeBlock('w', 'Fraquezas (W)', 'Limitações internas, controláveis', state.swot.weaknesses, save));
      grid.appendChild(makeBlock('o', 'Oportunidades (O)', 'Tendências externas favoráveis', state.swot.opportunities, save));
      grid.appendChild(makeBlock('t', 'Ameaças (T)', 'Riscos externos', state.swot.threats, save));
      wrap.appendChild(grid);
      return wrap;
    },
    validate(state) {
      const total = state.swot.strengths.length + state.swot.weaknesses.length +
        state.swot.opportunities.length + state.swot.threats.length;
      if (total < 4) return 'Preencha pelo menos 1 item em cada quadrante (mínimo 4 itens).';
      return null;
    }
  };

  function makeBlock(cls, title, hint, list, save) {
    const block = h('div', { class: `swot-block ${cls}` });
    block.innerHTML = `<h4>${title}</h4><div class="hint">${hint}</div>
      <div class="row-head"><span>Descrição</span><span>Impacto</span><span>Confiança</span><span></span></div>`;
    const itemsWrap = h('div');
    block.appendChild(itemsWrap);

    function renderItems() {
      itemsWrap.innerHTML = '';
      list.forEach((item, idx) => {
        const row = h('div', { class: 'item-row' });
        row.innerHTML = `
          <input class="input" placeholder="Ex: Equipe enxuta e ágil" value="${esc(item.text || '')}" />
          <input class="num" type="number" min="1" max="10" value="${item.impact || ''}" placeholder="1-10" />
          <input class="num" type="number" min="1" max="10" value="${item.confidence || ''}" placeholder="1-10" />
          <button class="btn-icon" title="Remover">×</button>
        `;
        const [txt, imp, conf, del] = row.querySelectorAll('input,button');
        txt.addEventListener('input', () => { item.text = txt.value; save(); });
        imp.addEventListener('input', () => { item.impact = imp.value; save(); });
        conf.addEventListener('input', () => { item.confidence = conf.value; save(); });
        del.addEventListener('click', () => { list.splice(idx, 1); save(); renderItems(); });
        itemsWrap.appendChild(row);
      });
    }
    renderItems();

    const addBtn = h('button', { class: 'btn-add' }, '+ Adicionar item');
    addBtn.addEventListener('click', () => {
      list.push({ text: '', impact: 7, confidence: 7 });
      save();
      renderItems();
    });
    block.appendChild(addBtn);
    return block;
  }

  // ============ TOWS ============
  const tows = {
    id: 'tows',
    title: 'SWOT Cruzada (TOWS) — Estratégias Sugeridas',
    desc: 'O sistema cruzou automaticamente seus principais itens para sugerir direções estratégicas.',
    render(state) {
      const t = Scoring.buildTOWS(state.swot);
      const profile = Scoring.swotProfile(state.swot);
      const wrap = h('div');
      wrap.innerHTML = `
        <div class="card">
          <h3 style="margin:0 0 6px;color:var(--primary)">Perfil estratégico recomendado: ${profile.strategy}</h3>
          <p class="muted" style="margin:0 0 14px">${profile.description}</p>
          <div class="dash-grid" style="margin:0">
            ${tile('Forças (média)', profile.scores.s.toFixed(1))}
            ${tile('Fraquezas (média)', profile.scores.w.toFixed(1))}
            ${tile('Oportunidades (média)', profile.scores.o.toFixed(1))}
            ${tile('Ameaças (média)', profile.scores.t.toFixed(1))}
          </div>
        </div>

        <div class="tows-grid">
          ${towsCell('FO — Estratégias Ofensivas', 'Use forças para capturar oportunidades', t.FO)}
          ${towsCell('FA — Estratégias Defensivas', 'Use forças para mitigar ameaças', t.FA)}
          ${towsCell('WO — Estratégias de Reorientação', 'Corrija fraquezas para aproveitar oportunidades', t.WO)}
          ${towsCell('WA — Estratégias de Sobrevivência', 'Reduza fraquezas e proteja-se de ameaças', t.WA)}
        </div>
      `;
      return wrap;
    },
    validate() { return null; }
  };

  // ============ CANVAS (modo completo) ============
  const canvas = {
    id: 'canvas',
    title: 'Business Model Canvas',
    desc: 'Visão de uma página do seu modelo de negócio.',
    modeOnly: 'completo',
    render(state, save) {
      const c = state.canvas;
      const wrap = h('div', { class: 'card' });
      const fields = [
        ['segments', 'Segmentos de Clientes', 'Para quem você cria valor?'],
        ['valueProp', 'Proposta de Valor', 'Que problema resolve / dor sana?'],
        ['channels', 'Canais', 'Como entrega valor (vendas/distribuição)?'],
        ['relationship', 'Relacionamento', 'Self-service, atendimento, comunidade...'],
        ['revenue', 'Fontes de Receita', 'Como ganha dinheiro?'],
        ['resources', 'Recursos Principais', 'Ativos críticos (humanos, tecnológicos)'],
        ['activities', 'Atividades-chave', 'O que precisa fazer todo dia?'],
        ['partners', 'Parceiros-chave', 'Quem é essencial para o modelo?'],
        ['costs', 'Estrutura de Custos', 'Principais custos fixos e variáveis']
      ];
      wrap.innerHTML = `<div class="form-grid cols-2">
        ${fields.map(([k, label, hint]) => `
          <label class="field">${label} <small>${hint}</small>
            <textarea data-k="${k}" placeholder="${hint}">${esc(c[k] || '')}</textarea>
          </label>
        `).join('')}
      </div>`;
      wrap.querySelectorAll('[data-k]').forEach(inp => {
        inp.addEventListener('input', e => {
          state.canvas[e.target.dataset.k] = e.target.value;
          save();
        });
      });
      return wrap;
    },
    validate() { return null; }
  };

  // ============ ISHIKAWA (modo completo) ============
  const ishikawa = {
    id: 'ishikawa',
    title: 'Ishikawa — Causa Raiz',
    desc: 'Defina o problema central e mapeie as possíveis causas pelos 6Ms.',
    modeOnly: 'completo',
    render(state, save) {
      const wrap = h('div');
      const ish = state.ishikawa;
      const cats = [
        ['method', 'Método', 'Processos, regras, procedimentos'],
        ['machine', 'Máquina', 'Equipamentos, software, ferramentas'],
        ['material', 'Material', 'Insumos, dados, matérias-primas'],
        ['people', 'Mão de Obra', 'Treinamento, capacidade, motivação'],
        ['measure', 'Medida', 'KPIs, métricas, acompanhamento'],
        ['environment', 'Meio Ambiente', 'Cultura, mercado, condições externas']
      ];
      wrap.innerHTML = `
        <div class="card">
          <label class="field">Problema central / efeito observado
            <input class="input" id="ishProblem" value="${esc(ish.problem)}" placeholder="Ex: Taxa de cancelamento subiu 15%" />
          </label>
        </div>
      `;
      attachAIHelper(wrap, 'problemDetector', state, save, 'Sugerir problemas e causas-raiz');
      const grid = h('div', { class: 'swot-grid' });
      grid.innerHTML = cats.map(([k, name, hint]) => `
        <div class="swot-block">
          <h4>${name}</h4><div class="hint">${hint}</div>
          <textarea data-cat="${k}" placeholder="Liste possíveis causas (uma por linha)">${(ish.causes[k] || []).join('\n')}</textarea>
        </div>
      `).join('');
      wrap.appendChild(grid);

      wrap.querySelector('#ishProblem').addEventListener('input', e => {
        state.ishikawa.problem = e.target.value; save();
      });
      wrap.querySelectorAll('[data-cat]').forEach(t => {
        t.addEventListener('input', e => {
          state.ishikawa.causes[e.target.dataset.cat] =
            e.target.value.split('\n').map(s => s.trim()).filter(Boolean);
          save();
        });
      });
      return wrap;
    },
    validate() { return null; }
  };

  // ============ OKRs ============
  const okrs = {
    id: 'okrs',
    title: 'Objetivos e Resultados-Chave (OKRs)',
    desc: 'Defina 2 a 4 objetivos qualitativos e seus resultados-chave mensuráveis (90 dias).',
    render(state, save) {
      const wrap = h('div');
      wrap.innerHTML = `<div class="help-box">
        <strong>Regra de ouro:</strong> Objetivo é qualitativo e inspirador. Key Result é <strong>obrigatoriamente quantificável</strong> (números, %, R$, prazo).
      </div>`;
      const list = h('div');
      wrap.appendChild(list);

      function render() {
        list.innerHTML = '';
        state.okrs.forEach((okr, oi) => {
          const card = h('div', { class: 'okr-card' });
          card.innerHTML = `
            <h5>Objetivo #${oi + 1}
              <button class="btn-icon" data-del-okr="${oi}">×</button>
            </h5>
            <label class="field">Objetivo (qualitativo)
              <input class="input" data-okr-obj value="${esc(okr.objective || '')}" placeholder="Ex: Tornar-se referência em automação para PMEs" />
            </label>
            <div class="kr-list" data-krs></div>
            <button class="btn-add" data-add-kr>+ Adicionar Resultado-Chave (KR)</button>
          `;
          card.querySelector('[data-okr-obj]').addEventListener('input', e => {
            okr.objective = e.target.value; save();
          });
          card.querySelector('[data-del-okr]').addEventListener('click', () => {
            state.okrs.splice(oi, 1); save(); render();
          });
          const krsWrap = card.querySelector('[data-krs]');
          (okr.krs || []).forEach((kr, ki) => {
            const measurable = Scoring.isMeasurable(kr.text || '');
            const row = h('div', { class: 'kr-row' });
            row.innerHTML = `
              <input class="input" placeholder="Ex: Aumentar MRR de R$ 50 mil para R$ 80 mil em 90 dias" value="${esc(kr.text || '')}" />
              <span class="measurable-tag ${measurable ? 'ok' : 'no'}">${measurable ? '✓ Mensurável' : '⚠ Não mensurável'}</span>
            `;
            const inp = row.querySelector('input');
            inp.addEventListener('input', () => {
              kr.text = inp.value;
              const tag = row.querySelector('.measurable-tag');
              const ok = Scoring.isMeasurable(inp.value);
              tag.className = `measurable-tag ${ok ? 'ok' : 'no'}`;
              tag.textContent = ok ? '✓ Mensurável' : '⚠ Não mensurável';
              save();
            });
            krsWrap.appendChild(row);
          });
          card.querySelector('[data-add-kr]').addEventListener('click', () => {
            okr.krs = okr.krs || [];
            okr.krs.push({ text: '' });
            save(); render();
          });
          list.appendChild(card);
        });
      }
      render();
      const addBtn = h('button', { class: 'btn-add' }, '+ Adicionar Objetivo');
      addBtn.addEventListener('click', () => {
        state.okrs.push({ objective: '', krs: [{ text: '' }] });
        save(); render();
      });
      wrap.appendChild(addBtn);
      return wrap;
    },
    validate(state) {
      const filled = (state.okrs || []).filter(o => (o.objective || '').trim());
      if (!filled.length) return 'Adicione ao menos 1 objetivo.';
      return null;
    }
  };

  // ============ 5W2H ============
  const fiveW2H = {
    id: 'actions',
    title: 'Plano de Ação (5W2H)',
    desc: 'Detalhe as iniciativas prioritárias. As notas Impacto/Confiança/Facilidade calculam o ICE Score.',
    render(state, save) {
      const wrap = h('div');
      wrap.innerHTML = `<div class="help-box">
        <strong>ICE Score</strong> = média de Impacto + Confiança + Facilidade (1-10). Use para priorizar o que fazer primeiro.
      </div>`;
      const list = h('div'); wrap.appendChild(list);

      function render() {
        list.innerHTML = '';
        state.actions.forEach((a, i) => {
          const ice = Scoring.iceScore(a).toFixed(1);
          const card = h('div', { class: 'action-card' });
          card.innerHTML = `
            <h5>Ação #${i + 1} <span class="badge info">ICE ${ice}</span>
              <button class="btn-icon" data-del>×</button>
            </h5>
            <div class="form-grid cols-2">
              <label class="field">O quê? (What)
                <input class="input" data-k="what" value="${esc(a.what || '')}" placeholder="O que será feito" />
              </label>
              <label class="field">Por quê? (Why)
                <input class="input" data-k="why" value="${esc(a.why || '')}" placeholder="Justificativa estratégica" />
              </label>
              <label class="field">Onde? (Where)
                <input class="input" data-k="where" value="${esc(a.where || '')}" placeholder="Setor / canal" />
              </label>
              <label class="field">Quando? (When)
                <input class="input" data-k="when" value="${esc(a.when || '')}" placeholder="Prazo / data" />
              </label>
              <label class="field">Quem? (Who)
                <input class="input" data-k="who" value="${esc(a.who || '')}" placeholder="Responsável" />
              </label>
              <label class="field">Como? (How)
                <input class="input" data-k="how" value="${esc(a.how || '')}" placeholder="Método / passo a passo" />
              </label>
              <label class="field">Quanto custa? (How much)
                <input class="input" data-k="howmuch" value="${esc(a.howmuch || '')}" placeholder="R$ ou tempo de equipe" />
              </label>
              <div></div>
              <label class="field">Impacto (1-10)
                <input class="input" type="number" min="1" max="10" data-k="impact" value="${a.impact || ''}" />
              </label>
              <label class="field">Confiança (1-10)
                <input class="input" type="number" min="1" max="10" data-k="confidence" value="${a.confidence || ''}" />
              </label>
              <label class="field">Facilidade (1-10)
                <input class="input" type="number" min="1" max="10" data-k="ease" value="${a.ease || ''}" />
              </label>
            </div>
          `;
          card.querySelectorAll('[data-k]').forEach(inp => {
            inp.addEventListener('input', e => {
              a[e.target.dataset.k] = e.target.value;
              save();
              if (['impact', 'confidence', 'ease'].includes(e.target.dataset.k)) {
                card.querySelector('.badge').textContent = 'ICE ' + Scoring.iceScore(a).toFixed(1);
              }
            });
          });
          card.querySelector('[data-del]').addEventListener('click', () => {
            state.actions.splice(i, 1); save(); render();
          });
          list.appendChild(card);
        });
      }
      render();
      const add = h('button', { class: 'btn-add' }, '+ Adicionar Ação');
      add.addEventListener('click', () => {
        state.actions.push({ what: '', why: '', where: '', when: '', who: '', how: '', howmuch: '', impact: 7, confidence: 7, ease: 5 });
        save(); render();
      });
      wrap.appendChild(add);
      return wrap;
    },
    validate(state) {
      if (!state.actions.length) return 'Cadastre ao menos 1 ação.';
      return null;
    }
  };

  // ============ MÉTRICAS (modo completo) ============
  const metrics = {
    id: 'metrics',
    title: 'Métricas de Saúde (CAC / LTV)',
    desc: 'A relação LTV/CAC mostra se seu negócio é financeiramente sustentável.',
    modeOnly: 'completo',
    render(state, save) {
      const m = state.metrics;
      const wrap = h('div', { class: 'card' });
      wrap.innerHTML = `
        <div class="help-box">
          <strong>Faixas de saúde:</strong> &lt;3x crítico • 3-5x aceitável • <strong>5-10x ideal</strong> • &gt;10x subinvestindo em marketing.
        </div>
        <div class="form-grid cols-2">
          <label class="field">CAC — Custo de Aquisição (R$)
            <input class="input" type="number" data-k="cac" value="${esc(m.cac)}" placeholder="Ex: 200" />
          </label>
          <label class="field">LTV — Lifetime Value (R$)
            <input class="input" type="number" data-k="ltv" value="${esc(m.ltv)}" placeholder="Ex: 1500" />
          </label>
          <label class="field">Ticket médio (R$) <small>(opcional)</small>
            <input class="input" type="number" data-k="tickets" value="${esc(m.tickets)}" placeholder="Ex: 250" />
          </label>
          <label class="field">Churn mensal (%) <small>(opcional)</small>
            <input class="input" type="number" step="0.1" data-k="churn" value="${esc(m.churn)}" placeholder="Ex: 4" />
          </label>
        </div>
        <div id="ltvResult" style="margin-top:14px"></div>
      `;
      const updateResult = () => {
        const lc = Scoring.ltvCacAnalysis(state.metrics);
        const res = wrap.querySelector('#ltvResult');
        if (lc.status === 'sem-dados') { res.innerHTML = ''; return; }
        res.innerHTML = `<div class="dash-tile">
          <h4>Relação LTV/CAC</h4>
          <div class="big">${lc.ratio.toFixed(2)}x</div>
          <div class="desc"><span class="badge ${lc.color}">${lc.label}</span></div>
        </div>`;
      };
      wrap.querySelectorAll('[data-k]').forEach(inp => {
        inp.addEventListener('input', e => {
          state.metrics[e.target.dataset.k] = e.target.value;
          save(); updateResult();
        });
      });
      updateResult();
      return wrap;
    },
    validate() { return null; }
  };

  // ===== AI Helper Button =====
  function attachAIHelper(wrap, agentName, state, save, label) {
    if (!window.AIHelper) return;
    const btn = window.AIHelper.createButton(agentName, state, save, label);
    wrap.appendChild(btn);
  }

  // ===== Helpers =====
  function esc(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }
  function opt(current, options) {
    return options.map(o => `<option value="${esc(o)}" ${o === current ? 'selected' : ''}>${o || '— selecione —'}</option>`).join('');
  }
  function tile(label, value, desc = '') {
    return `<div class="dash-tile"><h4>${label}</h4><div class="big">${value}</div>${desc ? `<div class="desc">${desc}</div>` : ''}</div>`;
  }
  function towsCell(title, tag, items) {
    return `<div class="tows-cell">
      <span class="strategy-tag">${tag}</span>
      <h4>${title}</h4>
      ${items.length
        ? `<ul>${items.map(i => `<li>${esc(i.text)}</li>`).join('')}</ul>`
        : '<p class="muted" style="font-size:13px;margin:0">Adicione mais itens na SWOT para gerar sugestões.</p>'}
    </div>`;
  }
  function fmtMoney(n) {
    if (!n) return 'R$ 0';
    const num = Number(n);
    if (num >= 1e9) return 'R$ ' + (num / 1e9).toFixed(1) + ' bi';
    if (num >= 1e6) return 'R$ ' + (num / 1e6).toFixed(1) + ' mi';
    if (num >= 1e3) return 'R$ ' + (num / 1e3).toFixed(0) + ' mil';
    return 'R$ ' + num.toLocaleString('pt-BR');
  }
  function clamp(n, mn, mx) { return Math.max(mn, Math.min(mx, Number(n) || 0)); }

  return {
    welcome, companyName, company, emailDelivery, companyIdentity,
    vision, icp, market, competition, product, pricing, funnel, forecast,
    swot, tows, canvas, ishikawa, okrs, fiveW2H, metrics,
    esc, tile, fmtMoney
  };
})();
