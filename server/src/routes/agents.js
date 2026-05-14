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
  insightsCoach
};

export async function registerAgentRoutes(fastify) {
  fastify.get('/agents', async () => ({ agents: Object.keys(agents) }));

  fastify.post('/agents/:name', async (req, reply) => {
    const name = req.params.name;
    const agent = agents[name];
    if (!agent) {
      reply.code(404);
      return { error: `Agente "${name}" não existe. Disponíveis: ${Object.keys(agents).join(', ')}` };
    }

    try {
      const result = await agent(req.body || {});
      return result;
    } catch (err) {
      fastify.log.error({ err, agent: name }, 'Falha no agente');
      reply.code(500);
      return { error: err.message || 'Erro interno no agente' };
    }
  });
}
