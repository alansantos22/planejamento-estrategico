import { personaDetector } from '../agents/personaDetector.js';
import { idealPersonaCoach } from '../agents/idealPersonaCoach.js';
import { swotDetector } from '../agents/swotDetector.js';
import { problemDetector } from '../agents/problemDetector.js';
import { competitorResearcher } from '../agents/competitorResearcher.js';
import { productIdeaGenerator } from '../agents/productIdeaGenerator.js';
import { pricingBenchmark } from '../agents/pricingBenchmark.js';
import { marketSizer } from '../agents/marketSizer.js';
import { salesFunnelArchitect } from '../agents/salesFunnelArchitect.js';
import { insightsCoach } from '../agents/insightsCoach.js';
import { idealCustomerFinder } from '../agents/idealCustomerFinder.js';
import { sanitizeDeep, sanitizeOutput } from '../lib/sanitize.js';
import { getIpUsage, markIpUsage } from '../lib/db.js';

// Agentes que consomem cota de "1 uso por IP" (gera o relatório final com IA).
// Os demais agentes ficam livres — o usuário pode iterar nos passos do wizard.
const ONE_SHOT_AGENTS = new Set(['insightsCoach']);

const agents = {
  personaDetector,
  idealPersonaCoach,
  swotDetector,
  problemDetector,
  competitorResearcher,
  productIdeaGenerator,
  pricingBenchmark,
  marketSizer,
  salesFunnelArchitect,
  insightsCoach,
  idealCustomerFinder
};

// Apenas nomes whitelisted são executáveis — :name é validado contra a chave.
const VALID_NAME = /^[a-zA-Z]{1,40}$/;
const MAX_BODY_BYTES = 64 * 1024;

export async function registerAgentRoutes(fastify) {
  fastify.get('/agents', async () => ({ agents: Object.keys(agents) }));

  fastify.post('/agents/:name', async (req, reply) => {
    const name = req.params.name;
    if (!VALID_NAME.test(name) || !Object.prototype.hasOwnProperty.call(agents, name)) {
      reply.code(404);
      return { error: 'Agente desconhecido.' };
    }
    const agent = agents[name];

    // Liga sessão (cookie). PlanId é da sessão, não do payload.
    const session = await req.requireSession();
    const ip = req.clientIp();

    // Bloqueio "1 uso por IP" para agentes de relatório final.
    if (ONE_SHOT_AGENTS.has(name)) {
      const used = await getIpUsage(ip, name);
      if (used) {
        reply.code(403);
        return {
          error: 'cota_esgotada',
          message: 'O relatório final já foi gerado por este IP. Você ainda pode editar o plano e baixar o resultado anterior.'
        };
      }
    }

    // Limita payload — defesa contra flooding do contexto do LLM.
    const rawBody = req.body || {};
    try {
      const size = Buffer.byteLength(JSON.stringify(rawBody), 'utf8');
      if (size > MAX_BODY_BYTES) {
        reply.code(413);
        return { error: 'Payload muito grande.' };
      }
    } catch {
      reply.code(400);
      return { error: 'Payload inválido.' };
    }

    // Sanitiza recursivamente TODO o input do usuário antes que algum agente
    // monte seu prompt — neutraliza prompt-injection, controle/zero-width, fences.
    const safeBody = sanitizeDeep(rawBody) || {};

    try {
      const result = await agent(safeBody);
      // Sucesso — marca o IP como tendo consumido a cota (só pra ONE_SHOT_AGENTS).
      if (ONE_SHOT_AGENTS.has(name)) {
        markIpUsage(ip, session.planId, name).catch(err =>
          fastify.log.warn({ err }, 'Falha ao gravar ip_usage')
        );
      }
      // Defesa em profundidade na saída: remove tags HTML, trunca strings.
      return sanitizeOutput(result);
    } catch (err) {
      fastify.log.error({ err, agent: name, stack: err?.stack }, 'Falha no agente');
      reply.code(500);
      const body = { error: 'Erro interno no agente' };
      // Em dev, devolve a mensagem real pra aparecer no modal do frontend.
      if (process.env.NODE_ENV !== 'production') {
        body.message = err?.message || String(err);
      }
      return body;
    }
  });
}
