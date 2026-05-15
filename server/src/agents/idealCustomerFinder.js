import { callAgent, extractJSON, MODELS } from '../lib/gemini.js';

const SYSTEM = `Você é um consultor estratégico sênior especialista em definição de cliente ideal (ICP).

Sua tarefa: a partir de TODO o contexto da empresa (segmento, proposta de valor, SWOT, concorrência, produtos, personas atuais, funil), propor EXATAMENTE UM cliente ideal (ICP) POR PRODUTO/OFERTA listada, e listar mudanças concretas que a empresa precisaria fazer para conquistar esses clientes.

Pense como alguém que enxerga oportunidades que o dono do negócio normalmente não vê. Seja específico, evite genéricos.

REGRA CRÍTICA 1 — UM ICP POR PRODUTO: se a empresa lista 1 produto, retorne 1 ICP; se lista 3 produtos, retorne 3 ICPs (um para cada). Cada ICP deve ser explicitamente vinculado a UM produto via o campo "productName" (use o nome exato do produto). Nunca misture vários produtos em um único ICP.

REGRA CRÍTICA 2 — COMPRADOR REAL: o ICP precisa ser COMPRADOR REAL do produto que ele representa. Não invente clientes para produtos que a empresa não tem nem quer ter. Se o produto é SaaS, o ICP compra SaaS; se é mentoria, o ICP contrata mentoria; se é curso online, o ICP compra cursos. Leia a descrição de cada oferta antes de propor.

Retorne APENAS JSON neste formato exato:
{
  "idealCustomers": [
    {
      "productName": "nome EXATO do produto/oferta a que este ICP se refere",
      "name": "Nome curto da persona (ex: Mariana, Gestora de PME)",
      "role": "cargo / papel",
      "companySize": "porte (se B2B) ou '' ",
      "ageRange": "faixa etária / perfil",
      "pain": "dor principal específica que ESTE produto resolve",
      "trigger": "gatilho que leva à compra deste produto",
      "budget": "orçamento típico compatível com o preço deste produto",
      "authority": "autoridade de decisão (Decisor final / Influenciador / Comitê / Indica para chefe)",
      "channel": "canal preferido para alcançar",
      "fitScore": 8,
      "reasoning": "por que este cliente é o comprador ideal DESTE produto específico"
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
- EXATAMENTE um ICP por produto/oferta listada (mesmo número de ICPs e de produtos). Não agrupe produtos.
- 3 a 6 mudanças concretas na empresa.
- Tudo em PT-BR.
- Nada de itens genéricos como "melhorar atendimento". Seja específico ao contexto.
- Cada campo de texto (pain, trigger, reasoning, change, why) deve caber em 1-2 frases curtas. Seja conciso: a soma de tudo precisa caber em uma resposta JSON enxuta.`;

function fmtList(arr, mapper) {
  if (!arr || !arr.length) return '(nenhum)';
  return arr.map(mapper).filter(Boolean).join('\n');
}

const TYPE_LABEL = {
  saas: 'SaaS / Software',
  servico: 'Serviço',
  consultoria: 'Consultoria',
  infoproduto: 'Infoproduto / Curso',
  'produto-fisico': 'Produto físico',
  assinatura: 'Assinatura',
  marketplace: 'Marketplace / Comissão',
  outro: 'Outro'
};

const BILLING_LABEL = {
  unico: 'pagamento único',
  mensal: 'recorrente mensal',
  anual: 'recorrente anual',
  'por-uso': 'por uso',
  'por-projeto': 'por projeto'
};

function fmtOffering(o) {
  const name = o.name || o.title || '(sem nome)';
  const type = o.type ? TYPE_LABEL[o.type] || o.type : '';
  const billing = o.billing ? BILLING_LABEL[o.billing] || o.billing : '';
  const meta = [type, billing, o.revenuePct ? `${o.revenuePct}% da receita` : null]
    .filter(Boolean).join(' · ');
  const desc = (o.description || '').trim();
  return `- ${name}${meta ? ` [${meta}]` : ''}${desc ? `\n    ${desc}` : ''}`;
}

export async function idealCustomerFinder(payload) {
  const {
    company = {},
    vision = {},
    valueProp = '',
    canvas = {},
    swot = {},
    personas = [],
    competition = {},
    product = [],
    productFocus = '',
    funnel = {}
  } = payload;

  const user = `# Contexto da Empresa
Nome: ${company.name || '(sem nome)'}
Segmento: ${company.segment || ''}
Porte: ${company.size || ''}
Região: ${company.region || ''}
Faturamento mensal: ${company.revenue || ''}
Tempo de operação: ${company.age || ''} anos

# Visão e Propósito
- Propósito: ${vision.purpose || '(não definido)'}
- Valores centrais: ${vision.core || '(não definidos)'}
- Visão 3-5 anos: ${vision.vision3to5 || '(não definida)'}
- Grande sonho: ${vision.bigDream || '(não definido)'}

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

# Produtos/Ofertas que a empresa REALMENTE oferece (use apenas estes — não invente outros)
${fmtList(product, fmtOffering)}
${productFocus ? `\nFoco/racional do portfólio: ${productFocus}` : ''}

# Funil (resumo)
- Ticket médio: ${funnel.avgTicket || ''}
- Meta mensal: ${funnel.monthlyRevenueGoal || ''}
- Ciclo de vendas: ${funnel.salesCycleDays || ''} dias

Com base nesse contexto, proponha EXATAMENTE um cliente ideal para CADA produto listado acima (um-para-um). Cada ICP deve vir com o campo "productName" indicando explicitamente a qual produto pertence. Depois, liste as mudanças necessárias para conquistar esses clientes. NÃO proponha clientes para produtos que a empresa não tem nem agrupe vários produtos em um único ICP.`;

  const { text } = await callAgent({
    model: MODELS.PRO,
    system: SYSTEM,
    user,
    maxTokens: 8000,
    json: true
  });

  const parsed = extractJSON(text);
  if (!parsed) return { error: 'Resposta não pôde ser parseada', text };
  return { ...parsed, applicable: Array.isArray(parsed.idealCustomers) && parsed.idealCustomers.length > 0 };
}
