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
  "methodology": "como você chegou nos números — referências, fontes, lógica",
  "sources": ["fonte 1", "fonte 2"] (opcional),
  "disclaimer": "aviso sobre limitações da estimativa"
}`;

export async function marketSizer(payload) {
  const { company = {}, segment, region, valueProp } = payload;
  const user = `Segmento: ${segment || company.segment || ''}
Região: ${region || company.region || 'Brasil'}
Proposta de valor: ${valueProp || ''}
Porte da empresa: ${company.size || ''}

Estime TAM, SAM e SOM para este negócio.`;

  const { text } = await callAgent({ model: MODELS.FLASH, system: SYSTEM, user, maxTokens: 1500, json: true });
  const parsed = extractJSON(text);
  if (!parsed) return { error: 'Resposta não pôde ser parseada', text };
  return {
    suggestions: [{
      title: 'TAM / SAM / SOM estimados',
      text: `TAM: R$ ${Number(parsed.tam || 0).toLocaleString('pt-BR')}
SAM: R$ ${Number(parsed.sam || 0).toLocaleString('pt-BR')}
SOM: R$ ${Number(parsed.som || 0).toLocaleString('pt-BR')}

Metodologia:
${parsed.methodology || ''}

${parsed.sources ? 'Fontes citadas: ' + parsed.sources.join(', ') : ''}

⚠ ${parsed.disclaimer || 'Estimativa — refine com fontes oficiais (IBGE, associações setoriais).'}`
    }],
    raw: parsed,
    applicable: false
  };
}
