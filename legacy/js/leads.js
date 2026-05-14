/**
 * Cliente do endpoint de leads. Captura distribuída pelos 5 primeiros passos
 * do wizard — nunca aparece como formulário corrido.
 *
 * Convenções:
 *  - Mesma URL de backend do Storage (window.BACKEND_URL ou meta tag).
 *  - planId fixo 'default', alinhado com Storage.
 *  - upsert() é fire-and-forget. Erros só vão ao console — nunca bloqueiam o wizard.
 */
const Leads = (() => {
  const PLAN_ID = 'default';
  let captured = false;
  let completed = false;

  function backendUrl() {
    if (typeof window !== 'undefined') {
      if (window.BACKEND_URL) return String(window.BACKEND_URL).replace(/\/$/, '');
      const meta = document.querySelector('meta[name="backend-url"]');
      if (meta?.content) return meta.content.replace(/\/$/, '');
    }
    return 'http://localhost:3001';
  }

  function leadUrl() {
    return `${backendUrl()}/leads/${PLAN_ID}`;
  }

  // Lê UTMs e referrer da pageview atual. Idempotente — chamar mais de uma vez
  // não dispara requests extras.
  function capture() {
    if (captured || typeof window === 'undefined') return;
    captured = true;
    try {
      const params = new URLSearchParams(window.location.search);
      const payload = {};
      const utmSource   = params.get('utm_source');
      const utmMedium   = params.get('utm_medium');
      const utmCampaign = params.get('utm_campaign');
      const referrer    = document.referrer;
      if (utmSource)   payload.utmSource   = utmSource;
      if (utmMedium)   payload.utmMedium   = utmMedium;
      if (utmCampaign) payload.utmCampaign = utmCampaign;
      if (referrer)    payload.referrer    = referrer;
      if (Object.keys(payload).length) upsert(payload);
    } catch (_) { /* nada a fazer */ }
  }

  async function upsert(fields) {
    if (!fields || !Object.keys(fields).length) return null;
    try {
      const res = await fetch(leadUrl(), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
        keepalive: true
      });
      if (!res.ok) {
        console.warn('Falha ao registrar lead.', res.status);
        return null;
      }
      return res.json();
    } catch (e) {
      console.warn('Erro de rede ao registrar lead.', e);
      return null;
    }
  }

  // Acumula campos e dispara um único upsert depois de DEBOUNCE_MS de inatividade.
  // Útil para inputs textuais (nome, email, telefone) que disparariam dezenas de
  // requests enquanto o usuário digita.
  const DEBOUNCE_MS = 600;
  let pending = {};
  let timer = null;
  function upsertDebounced(fields) {
    if (!fields) return;
    Object.assign(pending, fields);
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      const snapshot = pending;
      pending = {};
      timer = null;
      upsert(snapshot);
    }, DEBOUNCE_MS);
  }

  function markCompleted() {
    if (timer) { clearTimeout(timer); timer = null; }
    completed = true;
    const merged = { ...pending, status: 'completed' };
    pending = {};
    return upsert(merged);
  }

  // Versão síncrona-friendly chamada pelo beforeunload. fetch keepalive ainda
  // funciona durante o unload e respeita CORS (sendBeacon não suporta preflight).
  function markAbandonedSync(state) {
    if (completed) return; // já concluiu — não rebaixar pra abandoned.
    try {
      const stepIdx = Number(state?.currentStep);
      if (!Number.isFinite(stepIdx) || stepIdx < 0) return;
      fetch(leadUrl(), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'abandoned', lastStep: String(stepIdx) }),
        keepalive: true
      });
    } catch (_) { /* nada a fazer */ }
  }

  return { capture, upsert, upsertDebounced, markCompleted, markAbandonedSync };
})();

if (typeof window !== 'undefined') window.Leads = Leads;
