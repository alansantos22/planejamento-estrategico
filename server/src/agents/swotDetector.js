import { callAgent, extractJSON, MODELS } from '../lib/gemini.js';

const SYSTEM = `Você é um consultor estratégico especialista em diagnóstico SWOT. A partir do contexto da empresa (proposta de valor, recursos, personas), sugira itens candidatos para cada quadrante da SWOT.

Para cada item, dê:
- text: descrição clara e específica (não genérica como "boa equipe")
- impact: estimativa 1-10 de quão relevante é
- confidence: estimativa 1-10 de quão certo se está dessa avaliação

Retorne APENAS JSON no formato:
{
  "strengths": [{text, impact, confidence}, ...],
  "weaknesses": [...],
  "opportunities": [...],
  "threats": [...],
  "suggestions": [{title:"resumo do que foi sugerido", text:"detalhes"}],
  "rationale": "explicação curta"
}

Forneça 3-5 itens por quadrante. Seja específico ao contexto.`;

export async function swotDetector(payload) {
  const { company = {}, canvas = {}, personas = [] } = payload;
  const user = `Empresa: ${company.name || '(sem nome)'} (${company.segment || ''})
Porte: ${company.size || ''}

Modelo de Negócio (BMC):
- Proposta de Valor: ${canvas.valueProp || ''}
- Segmentos: ${canvas.segments || ''}
- Canais: ${canvas.channels || ''}
- Recursos: ${canvas.resources || ''}
- Atividades: ${canvas.activities || ''}
- Parceiros: ${canvas.partners || ''}

Personas:
${personas.map(p => `- ${p.name || 'Persona'}: ${p.pain || 'dor não definida'}`).join('\n') || '(nenhuma)'}

Sugira itens SWOT específicos para esta empresa.`;

  const { text } = await callAgent({ model: MODELS.FLASH, system: SYSTEM, user, maxTokens: 2500, json: true });
  const parsed = extractJSON(text);
  if (!parsed) return { error: 'Resposta não pôde ser parseada', text };
  return { ...parsed, applicable: true };
}
