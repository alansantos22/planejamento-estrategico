import { callAgent, extractJSON, MODELS } from '../lib/gemini.js';

const SYSTEM = `Você é um analista de mercado especializado em sizing (TAM/SAM/SOM). A partir do segmento e região, estime os 3 níveis em R$ anuais.

- TAM: mercado total (tudo que poderia ser consumido)
- SAM: mercado endereçável pelo modelo de negócio
- SOM: fatia obtenível em 12 meses (realista, ≤ 5% do SAM)

Retorne JSON:
{
  "tam": número em R$,
  "sam": número em R$,
  "som": número em R$,
  "methodology": "resumo conciso (máx. 2-3 frases) da lógica e referências usadas",
  "sources": ["fonte 1", "fonte 2"] (opcional, máx. 3),
  "disclaimer": "1 frase curta sobre limitações"
}

IMPORTANTE: seja EXTREMAMENTE conciso em todos os campos de texto. Nada de parágrafos longos — frases curtas e diretas. O JSON inteiro deve caber em menos de 600 tokens.`;

export async function marketSizer(payload) {
  const { company = {}, segment, region, valueProp } = payload;
  const user = `Segmento: ${segment || company.segment || ''}
Região: ${region || company.region || 'Brasil'}
Proposta de valor: ${valueProp || '(ainda não definida — assuma um negócio típico do segmento)'}
Porte da empresa: ${company.size || ''}
Funcionários: ${company.employees || ''}
Faturamento mensal estimado: ${company.revenue || ''}

Estime TAM, SAM e SOM para este negócio.`;

  const { text, usage } = await callAgent({ model: MODELS.FLASH, system: SYSTEM, user, maxTokens: 4096, json: true });
  const parsed = extractJSON(text);
  if (!parsed) {
    console.error('[marketSizer] parse falhou. Texto bruto do modelo:\n', text, '\nUsage:', usage);
    return { error: 'Resposta não pôde ser parseada', text, usage };
  }
  return {
    raw: parsed,
    applicable: true
  };
}
