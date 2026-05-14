import { getPlan, savePlan, deletePlan, ensurePublicSlug, getPlanBySlug } from '../lib/db.js';

const VALID_ID = /^[a-zA-Z0-9_-]{1,64}$/;
const VALID_SLUG = /^[a-z0-9]{6,20}$/;

// Campos do estado que NÃO devem aparecer no perfil público.
const PUBLIC_BLACKLIST = ['lead', 'ai'];

function buildPublicProfile(plan) {
  const data = plan.data || {};
  const out = {};
  for (const k of Object.keys(data)) {
    if (!PUBLIC_BLACKLIST.includes(k)) out[k] = data[k];
  }
  return {
    publicSlug: plan.publicSlug,
    updatedAt: plan.updatedAt,
    data: out
  };
}

// planId vem da sessão (cookie), NUNCA da URL — o :id na URL é ignorado pra
// evitar que um cliente leia/grave plano de outra pessoa só trocando a string.
async function ownedPlanId(req, reply) {
  const s = await req.requireSession();
  return s.planId;
}

export async function registerPlanRoutes(fastify) {
  fastify.get('/plans/:id', async (req, reply) => {
    const id = await ownedPlanId(req, reply);
    const plan = await getPlan(id);
    if (!plan) {
      reply.code(404);
      return { error: 'Plano não encontrado.' };
    }
    return plan;
  });

  fastify.put('/plans/:id', async (req, reply) => {
    const id = await ownedPlanId(req, reply);
    const data = req.body;
    if (!data || typeof data !== 'object') {
      reply.code(400);
      return { error: 'Corpo da requisição deve ser um objeto JSON com o estado do plano.' };
    }
    return savePlan(id, data);
  });

  fastify.delete('/plans/:id', async (req, reply) => {
    const id = await ownedPlanId(req, reply);
    const removed = await deletePlan(id);
    return { ok: true, removed };
  });

  // ===== Perfil público (Fase D) =====

  // Gera (ou retorna) o slug público para um plano. Idempotente.
  fastify.post('/plans/:id/share', async (req, reply) => {
    const id = await ownedPlanId(req, reply);
    const plan = await getPlan(id);
    if (!plan) {
      reply.code(404);
      return { error: 'Plano não encontrado.' };
    }
    const slug = await ensurePublicSlug(id);
    return { slug };
  });

  // Versão pública read-only do plano (sem lead, sem ai.cache). Cacheável por 60s.
  fastify.get('/public/profile/:slug', async (req, reply) => {
    const { slug } = req.params;
    if (!VALID_SLUG.test(slug)) {
      reply.code(400);
      return { error: 'Slug inválido.' };
    }
    const plan = await getPlanBySlug(slug);
    if (!plan) {
      reply.code(404);
      return { error: 'Perfil não encontrado.' };
    }
    reply.header('Cache-Control', 'public, max-age=60');
    return buildPublicProfile(plan);
  });
}
