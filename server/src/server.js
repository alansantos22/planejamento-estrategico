import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { registerAgentRoutes } from './routes/agents.js';
import { registerPlanRoutes } from './routes/plans.js';
import { registerLeadRoutes } from './routes/leads.js';
import { init as initDb, closePool } from './lib/db.js';

const PORT = Number(process.env.PORT) || 3001;
const ALLOWED = (process.env.ALLOWED_ORIGINS || '*').split(',').map(s => s.trim());

const fastify = Fastify({
  logger: { level: process.env.LOG_LEVEL || 'info' }
});

await fastify.register(cors, {
  origin: ALLOWED.includes('*') ? true : ALLOWED,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
});

await fastify.register(rateLimit, {
  max: 30,
  timeWindow: '1 minute',
  // /plans e /leads são chamados a cada digitação no wizard — não faz sentido limitar
  skip: (req) =>
    req.url.startsWith('/plans') ||
    req.url.startsWith('/leads') ||
    req.url === '/health'
});

fastify.get('/health', async () => ({ ok: true, ts: Date.now() }));

await registerAgentRoutes(fastify);
await registerPlanRoutes(fastify);
await registerLeadRoutes(fastify);

try {
  await initDb();
  await fastify.listen({ port: PORT, host: '0.0.0.0' });
  fastify.log.info(`🚀 Backend pronto em http://localhost:${PORT} (MySQL + Gemini)`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}

// Encerramento limpo do pool MySQL em SIGTERM/SIGINT (importante na VPS)
for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, async () => {
    fastify.log.info(`Recebido ${sig}, encerrando…`);
    try { await fastify.close(); } catch (_) {}
    try { await closePool(); } catch (_) {}
    process.exit(0);
  });
}
