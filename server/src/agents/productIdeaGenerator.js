import { callAgent, extractJSON, MODELS } from '../lib/gemini.js';

const SYSTEM = `Você é um especialista em product strategy. A partir do ICP, das forças da empresa e dos gaps competitivos, sugira 3 ideias de produto/oferta alinhadas com o negócio.

Para cada ideia:
- name: nome curto da oferta
- description: 1-2 frases descrevendo o que é
- targetPersona: para qual persona faz mais sentido
- revenuePct: % estimada de receita que poderia gerar (palpite)
- effortPct: % estimada de esforço necessário
- marginPct: margem estimada
- rationale: por que essa ideia faz sentido (cruza com forças/oportunidades/gaps)

Retorne JSON:
{
  "suggestions": [{name, description, targetPersona, revenuePct, effortPct, marginPct, rationale}, ...],
  "rationale": "lógica geral"
}

Seja realista; não invente ofertas mirabolantes que a empresa não tem capacidade de entregar.`;

export async function productIdeaGenerator(payload) {
  const { company = {}, personas = [], swot = {}, competition = {} } = payload;
  const user = `Empresa: ${company.name || ''} (${company.segment || ''})

Personas:
${personas.map(p => `- ${p.name}: dor "${p.pain || ''}", orçamento ${p.budget || '?'}`).join('\n') || '(nenhuma)'}

Forças: ${(swot.strengths || []).join('; ')}
Oportunidades: ${(swot.opportunities || []).join('; ')}

Concorrentes mapeados:
${(competition.competitors || []).map(c => `- ${c.name}: ${JSON.stringify(c.scores || {})}`).join('\n') || '(nenhum)'}

Sugira 3 ideias de produto/oferta que aproveitem as forças, atendam às dores das personas e diferenciem dos concorrentes.`;

  const { text } = await callAgent({ model: MODELS.PRO, system: SYSTEM, user, maxTokens: 6000, json: true });
  const parsed = extractJSON(text);
  if (!parsed) return { error: 'Resposta não pôde ser parseada', text };
  return { ...parsed, applicable: true };
}
