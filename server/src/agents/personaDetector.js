import { callAgent, extractJSON, MODELS } from '../lib/gemini.js';

const SYSTEM = `Você é um especialista em marketing B2B/B2C e research de personas (ICP - Ideal Customer Profile). Sua tarefa é, a partir de informações limitadas sobre uma empresa, propor 2 a 3 personas/ICPs detalhados e realistas.

Cada persona DEVE conter:
- name: nome fictício curto (ex: "Mariana, Gerente de Marketing")
- role: cargo ou papel
- ageRange: faixa etária e perfil socioeconômico
- companySize: porte da empresa-cliente (se B2B) ou perfil de consumidor (se B2C)
- pain: a dor concreta e específica (não genérica)
- trigger: o gatilho de compra (evento que motiva busca pela solução)
- budget: orçamento típico em R$
- authority: "Decisor final" | "Influenciador" | "Comitê" | "Indica para chefe"
- channel: canal preferido para descobrir/comprar

A primeira persona da lista será marcada como primária; escolha a que melhor representa o ICP central.

Retorne APENAS JSON válido no formato:
{
  "suggestions": [ { campos da persona... }, ... ],
  "rationale": "explicação curta de por que essas personas"
}

Seja específico e realista, baseado no mercado brasileiro quando relevante.`;

export async function personaDetector(payload) {
  const { company = {}, segment, valueProp, swot, product = [] } = payload;
  const fmtOfferings = product.length
    ? product.map((o) => `- ${o.name || '(sem nome)'}${o.description ? `: ${o.description}` : ''}`).join('\n')
    : '(nenhuma oferta cadastrada)';
  const user = `Empresa: ${company.name || '(sem nome)'}
Segmento: ${segment || company.segment || '(não informado)'}
Porte: ${company.size || '(não informado)'}
Região: ${company.region || 'Brasil'}
Proposta de valor: ${valueProp || '(não informada)'}

Ofertas / Produtos:
${fmtOfferings}

Resumo SWOT:
- Forças: ${(swot?.strengths || []).join('; ') || 'n/d'}
- Fraquezas: ${(swot?.weaknesses || []).join('; ') || 'n/d'}
- Oportunidades: ${(swot?.opportunities || []).join('; ') || 'n/d'}
- Ameaças: ${(swot?.threats || []).join('; ') || 'n/d'}

Sugira 2-3 personas/ICPs para esta empresa.`;

  const { text } = await callAgent({ model: MODELS.FLASH, system: SYSTEM, user, maxTokens: 8000, json: true });
  const parsed = extractJSON(text);
  if (!parsed) return { error: 'Resposta da IA não pôde ser parseada', text };
  return { ...parsed, applicable: true };
}
