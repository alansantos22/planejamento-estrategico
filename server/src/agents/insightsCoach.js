import { callAgent, extractJSON, MODELS } from '../lib/gemini.js';

const SYSTEM = `Você é um consultor sênior de estratégia que faz uma revisão crítica do plano estratégico completo de uma empresa. Olha o plano de forma sistêmica e identifica:

1. INCONSISTÊNCIAS: onde uma seção contradiz outra (ICP B2B com canais B2C; meta de receita incompatível com funil; etc.)
2. RISCOS: coisas que podem dar errado mas não foram mapeadas
3. OPORTUNIDADES NÃO EXPLORADAS: algo no plano sugere uma direção que o autor não percebeu

Para cada item:
- type: "inconsistencia" | "risco" | "oportunidade"
- title: nome curto
- text: explicação com evidências do próprio plano (cite seções)
- recommendation: 1 ação concreta

Retorne JSON:
{
  "suggestions": [{type, title, text, recommendation}, ...],
  "executiveSummary": "2-3 frases resumindo o estado do plano",
  "topPriority": "qual a coisa mais urgente a corrigir"
}

Seja direto. Aponte o que importa, não tudo.`;

export async function insightsCoach(payload) {
  const plan = payload.plan || {};
  // Resumimos pra não estourar tokens
  const compact = JSON.stringify({
    company: plan.company,
    vision: plan.vision,
    icp: { personas: (plan.icp?.personas || []).map(p => ({ name: p.name, role: p.role, pain: p.pain, budget: p.budget, primary: p.primary })) },
    market: plan.market,
    competition: { criteria: plan.competition?.criteria, selfScores: plan.competition?.selfScores, competitors: (plan.competition?.competitors || []).map(c => ({ name: c.name, scores: c.scores })) },
    swot: {
      strengths: (plan.swot?.strengths || []).filter(i => i.text).map(i => i.text),
      weaknesses: (plan.swot?.weaknesses || []).filter(i => i.text).map(i => i.text),
      opportunities: (plan.swot?.opportunities || []).filter(i => i.text).map(i => i.text),
      threats: (plan.swot?.threats || []).filter(i => i.text).map(i => i.text)
    },
    product: plan.product,
    pricing: plan.pricing,
    funnel: { stages: plan.funnel?.stages, avgTicket: plan.funnel?.avgTicket, goal: plan.funnel?.monthlyRevenueGoal, cycle: plan.funnel?.salesCycleDays },
    forecast: plan.forecast,
    metrics: plan.metrics,
    okrs: (plan.okrs || []).map(o => ({ obj: o.objective, krs: (o.krs || []).map(k => k.text) })),
    actions: (plan.actions || []).map(a => ({ what: a.what, why: a.why, when: a.when }))
  }, null, 2);

  const user = `Analise o plano estratégico completo abaixo e identifique 3 inconsistências + 3 riscos + 3 oportunidades não exploradas:

\`\`\`json
${compact}
\`\`\``;

  const { text } = await callAgent({ model: MODELS.PRO, system: SYSTEM, user, maxTokens: 8000, json: true });
  const parsed = extractJSON(text);
  if (!parsed) return { error: 'Resposta não pôde ser parseada', text };
  return { ...parsed, applicable: false };
}
