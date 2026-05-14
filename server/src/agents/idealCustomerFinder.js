import { callAgent, extractJSON, MODELS } from '../lib/gemini.js';

const SYSTEM = `Você é um consultor estratégico sênior especialista em definição de cliente ideal (ICP).

Sua tarefa: a partir de TODO o contexto da empresa (segmento, proposta de valor, SWOT, concorrência, produtos, personas atuais, funil), propor de 1 a 3 perfis de cliente ideal que maximizem a chance de sucesso da empresa, e listar mudanças concretas que a empresa precisaria fazer para conquistar esses clientes.

Pense como alguém que enxerga oportunidades que o dono do negócio normalmente não vê. Seja específico, evite genéricos.

Retorne APENAS JSON neste formato exato:
{
  "idealCustomers": [
    {
      "name": "Nome curto da persona (ex: Mariana, Gestora de PME)",
      "role": "cargo / papel",
      "companySize": "porte (se B2B) ou '' ",
      "ageRange": "faixa etária / perfil",
      "pain": "dor principal, específica e não genérica",
      "trigger": "gatilho de compra",
      "budget": "orçamento típico",
      "authority": "autoridade de decisão (Decisor final / Influenciador / Comitê / Indica para chefe)",
      "channel": "canal preferido para alcançar",
      "fitScore": 8,
      "reasoning": "por que esse cliente faz sentido dado o contexto da empresa"
    }
  ],
  "companyChanges": [
    {
      "area": "Produto | Pricing | Canal | Mensagem | Operação | Marca | Equipe",
      "change": "mudança concreta e específica",
      "why": "por que essa mudança é necessária para alcançar os clientes ideais"
    }
  ],
  "suggestions": [
    { "title": "Resumo da sugestão", "text": "explicação completa juntando cliente ideal + mudanças relacionadas" }
  ],
  "rationale": "Síntese de 2-3 frases sobre o racional geral."
}

Regras:
- 1 a 3 clientes ideais; qualidade acima de quantidade.
- 3 a 6 mudanças concretas na empresa.
- Tudo em PT-BR.
- Nada de itens genéricos como "melhorar atendimento". Seja específico ao contexto.`;

function fmtList(arr, mapper) {
  if (!arr || !arr.length) return '(nenhum)';
  return arr.map(mapper).filter(Boolean).join('\n');
}

export async function idealCustomerFinder(payload) {
  const {
    company = {},
    valueProp = '',
    canvas = {},
    swot = {},
    personas = [],
    competition = {},
    product = [],
    pricing = {},
    funnel = {}
  } = payload;

  const user = `# Contexto da Empresa
Nome: ${company.name || '(sem nome)'}
Segmento: ${company.segment || ''}
Porte: ${company.size || ''}
Região: ${company.region || ''}
Faturamento mensal: ${company.revenue || ''}
Tempo de operação: ${company.age || ''} anos

# Proposta de Valor
${valueProp || canvas.valueProp || '(não definida)'}

# Canvas (resumo)
- Segmentos atuais: ${canvas.segments || ''}
- Canais: ${canvas.channels || ''}
- Relacionamento: ${canvas.relationship || ''}
- Recursos-chave: ${canvas.resources || ''}
- Atividades-chave: ${canvas.activities || ''}

# Personas atuais (rascunho do usuário)
${fmtList(personas, (p) => `- ${p.name || 'Persona'}: dor="${p.pain || ''}", orçamento="${p.budget || ''}", autoridade="${p.authority || ''}"`)}

# SWOT (top itens)
Forças: ${(swot.strengths || []).join(' | ') || '(nenhuma)'}
Fraquezas: ${(swot.weaknesses || []).join(' | ') || '(nenhuma)'}
Oportunidades: ${(swot.opportunities || []).join(' | ') || '(nenhuma)'}
Ameaças: ${(swot.threats || []).join(' | ') || '(nenhuma)'}

# Concorrência
Critérios: ${(competition.criteria || []).join(', ')}
Concorrentes: ${fmtList(competition.competitors, (c) => `- ${c.name}`)}

# Produtos/Ofertas
${fmtList(product, (o) => `- ${o.name || o.title || ''}${o.revenuePct ? ` (${o.revenuePct}% da receita)` : ''}`)}

# Pricing
- Preço atual: ${pricing.currentPrice || ''}
- Mediana de mercado: ${pricing.marketMedian || ''}
- Estratégia: ${pricing.strategy || ''}

# Funil (resumo)
- Ticket médio: ${funnel.avgTicket || ''}
- Meta mensal: ${funnel.monthlyRevenueGoal || ''}
- Ciclo de vendas: ${funnel.salesCycleDays || ''} dias

Com base nesse contexto, proponha 1-3 clientes ideais e as mudanças necessárias para conquistá-los.`;

  const { text } = await callAgent({
    model: MODELS.PRO,
    system: SYSTEM,
    user,
    maxTokens: 3500,
    json: true
  });

  const parsed = extractJSON(text);
  if (!parsed) return { error: 'Resposta não pôde ser parseada', text };
  return { ...parsed, applicable: Array.isArray(parsed.idealCustomers) && parsed.idealCustomers.length > 0 };
}
