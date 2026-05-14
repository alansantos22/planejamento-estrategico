import { callAgent, extractJSON, MODELS } from '../lib/gemini.js';

const SYSTEM = `Você é um especialista em vendas com 15+ anos de experiência em B2B, B2C, SaaS, Serviços e Indústria. Sua tarefa é desenhar um funil de vendas adequado para o segmento e ICP do cliente.

Considere:
- Ciclo de venda típico do segmento (transacional curto vs. consultivo longo)
- Etapas adequadas (varia por modelo: produto vs. serviço, B2B vs. B2C)
- Taxas de conversão realistas POR ETAPA segundo benchmarks do mercado
- Canais e custos esperados

Para cada etapa do funil:
- name: nome
- typicalRate: taxa de conversão típica para a próxima etapa (%)
- benchmark: faixa esperada para o segmento
- watchOut: o que pode reduzir essa taxa

Retorne JSON:
{
  "stages": [{name, typicalRate, benchmark, watchOut}, ...],
  "expectedBottleneck": "etapa onde costuma travar, e por quê",
  "channelRecommendations": [{name, mixPct, costPerLeadEstimate, rationale}, ...],
  "playbook": "3-5 ações concretas para melhorar este funil",
  "rationale": "lógica do desenho"
}`;

export async function salesFunnelArchitect(payload) {
  const { company = {}, personas = [], avgTicket, salesCycleDays, monthlyRevenueGoal, segment } = payload;
  const primary = personas.find(p => p.primary) || personas[0] || {};
  const user = `Empresa: ${company.name || ''}
Segmento: ${segment || company.segment || ''}
Persona primária: ${primary.name || ''} (${primary.role || ''} em ${primary.companySize || ''})
Dor: ${primary.pain || ''}
Canal preferido: ${primary.channel || ''}
Autoridade: ${primary.authority || ''}

Ticket médio: R$ ${avgTicket || '?'}
Ciclo: ${salesCycleDays || '?'} dias
Meta mensal: R$ ${monthlyRevenueGoal || '?'}

Desenhe o funil ideal para este contexto, com taxas de conversão típicas do segmento.`;

  const { text } = await callAgent({ model: MODELS.PRO, system: SYSTEM, user, maxTokens: 2500, json: true });
  const parsed = extractJSON(text);
  if (!parsed) return { error: 'Resposta não pôde ser parseada', text };

  const stagesText = (parsed.stages || []).map((s, i) =>
    `${i + 1}. ${s.name}: taxa típica ${s.typicalRate}% (faixa: ${s.benchmark || '?'})\n   Atenção: ${s.watchOut || ''}`
  ).join('\n\n');

  return {
    suggestions: [
      { title: 'Funil sugerido', text: stagesText },
      { title: 'Gargalo esperado', text: parsed.expectedBottleneck || 'n/d' },
      { title: 'Canais recomendados', text: (parsed.channelRecommendations || []).map(c => `- ${c.name} (${c.mixPct}% do mix, ~R$ ${c.costPerLeadEstimate}/lead): ${c.rationale}`).join('\n') },
      { title: 'Playbook de melhoria', text: parsed.playbook || '' }
    ],
    raw: parsed,
    applicable: false
  };
}
