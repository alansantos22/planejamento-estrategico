/**
 * Sessão por cookie httpOnly.
 *
 *  - Cliente nunca conhece/manipula o planId — só o cookie.
 *  - Pra resumir trabalho: o frontend chama GET /session e recebe { planId, ... }.
 *  - O cookie é criado na primeira visita (POST /session) e dura 30 dias.
 *
 * Pra que o decorator `request.session` esteja disponível nas outras rotas,
 * este módulo deve ser registrado ANTES delas no server.js.
 */
import { createSession, findSession, touchSession, getIpUsage } from '../lib/db.js';

const COOKIE_NAME = 'pe_session';
const MAX_AGE_DAYS = 30;
const FINAL_REPORT_AGENT = 'insightsCoach';

function cookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    sameSite: isProd ? 'none' : 'lax', // 'none' requer secure=true (cross-site)
    secure: isProd,
    path: '/',
    maxAge: 60 * 60 * 24 * MAX_AGE_DAYS
  };
}

function clientIp(req) {
  // Confiar em X-Forwarded-For exige TRUST_PROXY=true (na frente do Cloudflare/Nginx).
  if (process.env.TRUST_PROXY === 'true') {
    const xff = req.headers['x-forwarded-for'];
    if (xff) return String(xff).split(',')[0].trim();
    if (req.headers['cf-connecting-ip']) return String(req.headers['cf-connecting-ip']);
  }
  return req.ip;
}

/**
 * Resolve ou cria a sessão da request. Faz o "set-cookie" automaticamente quando cria.
 * Retorna sempre { planId, ipHash } — nunca null.
 */
async function ensureSession(req, reply) {
  const token = req.cookies?.[COOKIE_NAME];
  if (token) {
    const found = await findSession(token);
    if (found) {
      // Atualiza o IP se mudou (silenciosamente)
      const ip = clientIp(req);
      if (ip) touchSession(token, ip).catch(() => {});
      return { ...found, token };
    }
  }
  const ip = clientIp(req);
  const created = await createSession(ip);
  reply.setCookie(COOKIE_NAME, created.token, cookieOptions());
  return { planId: created.planId, ipHash: null, token: created.token };
}

export async function registerSessionRoutes(fastify) {
  // Disponibiliza pra outras rotas: const s = await req.requireSession(reply)
  fastify.decorateRequest('requireSession', null);
  fastify.decorateRequest('clientIp', null);
  fastify.addHook('onRequest', async (req, reply) => {
    req.requireSession = () => ensureSession(req, reply);
    req.clientIp = () => clientIp(req);
  });

  // GET /session — devolve o estado atual da sessão. Cria se ainda não houver.
  fastify.get('/session', async (req, reply) => {
    const s = await ensureSession(req, reply);
    const ip = clientIp(req);
    const finalUsed = await getIpUsage(ip, FINAL_REPORT_AGENT);
    return {
      planId: s.planId,
      finalReportUsed: !!finalUsed,
      finalReportAgent: FINAL_REPORT_AGENT
    };
  });
}
