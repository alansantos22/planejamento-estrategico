import { callAgent, extractJSON, MODELS } from '../lib/gemini.js';

const SYSTEM = `Você é um analista de mercado especializado em identificar concorrentes. A partir do segmento e proposta de valor de uma empresa, liste 3-5 concorrentes prováveis (diretos e indiretos) e estime notas 1-5 em critérios padrão.

Critérios padrão: Preço, Qualidade, Atendimento, Marca (use estes a menos que o input traga outros).

Para cada concorrente:
- name: nome real ou plausível da empresa
- scores: { "Preço": N, "Qualidade": N, ... } com notas 1-5
- notes: 1 frase sobre posicionamento

⚠ IMPORTANTE: deixe claro no campo "disclaimer" que essas são estimativas baseadas em conhecimento geral, podem estar desatualizadas, e o usuário deve validar manualmente.

Retorne JSON:
{
  "suggestions": [{name, scores, notes}, ...],
  "disclaimer": "...",
  "rationale": "como você selecionou"
}`;

export async function competitorResearcher(payload) {
  const { company = {}, segment, region, valueProp } = payload;
  const user = `Empresa: ${company.name || ''}
Segmento: ${segment || company.segment || ''}
Região: ${region || company.region || 'Brasil'}
Proposta de valor: ${valueProp || ''}

Liste 3-5 concorrentes prováveis e dê notas 1-5 em Preço, Qualidade, Atendimento e Marca.`;

  const { text } = await callAgent({ model: MODELS.FLASH, system: SYSTEM, user, maxTokens: 6000, json: true });
  const parsed = extractJSON(text);
  if (!parsed) return { error: 'Resposta não pôde ser parseada', text };
  return { ...parsed, applicable: true };
}
