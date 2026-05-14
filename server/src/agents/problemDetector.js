import { callAgent, extractJSON, MODELS } from '../lib/gemini.js';

const SYSTEM = `Você é um consultor de gestão que faz "perguntas duras" — identifica problemas e riscos que o empreendedor não está vendo. A partir da SWOT, métricas e funil, aponte 3-6 problemas/riscos não capturados.

Para cada problema:
- title: nome curto do problema
- text: descrição com possíveis causas (formato Ishikawa: método/máquina/material/mão de obra/medida/meio-ambiente quando aplicável)
- severity: "alta" | "média" | "baixa"

Retorne JSON:
{
  "suggestions": [{title, text, severity}, ...],
  "rationale": "padrões que você detectou"
}

Seja direto. Não suavize.`;

export async function problemDetector(payload) {
  const { company = {}, swot = {}, metrics = {}, funnel = {} } = payload;
  const user = `Empresa: ${company.name || ''} (${company.segment || ''})

SWOT-resumo:
- Forças: ${(swot.strengths || []).join('; ')}
- Fraquezas: ${(swot.weaknesses || []).join('; ')}
- Oportunidades: ${(swot.opportunities || []).join('; ')}
- Ameaças: ${(swot.threats || []).join('; ')}

Métricas:
- CAC: ${metrics.cac || '?'}
- LTV: ${metrics.ltv || '?'}
- Churn: ${metrics.churn || '?'}%
- Ticket: ${metrics.tickets || '?'}

Funil:
- Ticket médio: ${funnel.avgTicket || '?'}
- Ciclo: ${funnel.cycle || '?'} dias
- Meta mensal: ${funnel.goal || '?'}
- Etapas: ${(funnel.stages || []).map(s => `${s.name}=${s.count || '?'}`).join(', ')}

Identifique problemas e riscos que não estão sendo capturados.`;

  const { text } = await callAgent({ model: MODELS.PRO, system: SYSTEM, user, maxTokens: 2000, json: true });
  const parsed = extractJSON(text);
  if (!parsed) return { error: 'Resposta não pôde ser parseada', text };
  return { ...parsed, applicable: false };
}
