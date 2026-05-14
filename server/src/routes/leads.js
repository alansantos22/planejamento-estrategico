/**
 * CRUD de leads. Cada lead é vinculado a um plano (1:1) e atualizado
 * progressivamente conforme o usuário avança pelos primeiros passos do wizard.
 */
import { upsertLead, getLead, listLeads, deleteLead } from '../lib/db.js';

const VALID_ID    = /^[a-zA-Z0-9_-]{1,64}$/;
const VALID_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STATUSES    = new Set(['in_progress', 'completed', 'abandoned']);

// Limpa input do payload em campos seguros. Aceita os nomes camelCase usados pelo
// frontend e os converte para snake_case do banco.
function pickLeadFields(body) {
  if (!body || typeof body !== 'object') return {};
  const map = {
    personName:  'person_name',
    companyName: 'company_name',
    email:       'email',
    phone:       'phone',
    status:      'status',
    lastStep:    'last_step',
    utmSource:   'utm_source',
    utmMedium:   'utm_medium',
    utmCampaign: 'utm_campaign',
    referrer:    'referrer'
  };
  const out = {};
  for (const [src, dst] of Object.entries(map)) {
    if (body[src] === undefined || body[src] === null) continue;
    const v = String(body[src]).trim();
    if (!v) continue;
    if (dst === 'email' && !VALID_EMAIL.test(v)) continue;     // ignora email malformado, não bloqueia o request
    if (dst === 'status' && !STATUSES.has(v)) continue;
    out[dst] = v.slice(0, dst === 'referrer' ? 500 : 200);
  }
  return out;
}

export async function registerLeadRoutes(fastify) {
  // planId é determinado pela sessão (cookie), não pelo path — evita IDOR.
  fastify.get('/leads/:planId', async (req, reply) => {
    const { planId } = await req.requireSession();
    const lead = await getLead(planId);
    if (!lead) {
      reply.code(404);
      return { error: 'Lead não encontrado.' };
    }
    return lead;
  });

  // upsert progressivo — chamado a cada passo do wizard que capta um campo
  fastify.put('/leads/:planId', async (req, reply) => {
    const { planId } = await req.requireSession();
    const fields = pickLeadFields(req.body);
    const lead = await upsertLead(planId, fields);
    return lead;
  });

  // Endpoint admin — protegido por header simples; só lista se a env LEADS_ADMIN_TOKEN existir
  fastify.get('/leads', async (req, reply) => {
    const required = process.env.LEADS_ADMIN_TOKEN;
    if (!required) {
      reply.code(403);
      return { error: 'Listagem de leads desabilitada. Configure LEADS_ADMIN_TOKEN.' };
    }
    if (req.headers['x-admin-token'] !== required) {
      reply.code(401);
      return { error: 'Token inválido.' };
    }
    const { status, limit, offset } = req.query;
    const rows = await listLeads({
      status: STATUSES.has(status) ? status : undefined,
      limit:  Math.min(Number(limit) || 100, 500),
      offset: Math.max(Number(offset) || 0, 0)
    });
    return { leads: rows, count: rows.length };
  });

  fastify.delete('/leads/:planId', async (req, reply) => {
    const { planId } = await req.requireSession();
    const removed = await deleteLead(planId);
    return { ok: true, removed };
  });
}
