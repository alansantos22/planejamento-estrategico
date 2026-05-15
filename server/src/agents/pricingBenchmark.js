import { callAgent, extractJSON, MODELS } from '../lib/gemini.js';

const SYSTEM = `Você é um especialista em pricing strategy. A partir de um produto/oferta e segmento, estime a faixa de preço típica do mercado brasileiro (ou da região indicada).

Retorne:
- marketMin: preço mínimo praticado
- marketMedian: mediana de mercado
- marketMax: preço máximo (premium)
- modelType: "assinatura mensal" | "por projeto" | "por uso" | "produto único" | etc.
- rationale: como você chegou nesses números (referenciando produtos/categorias semelhantes)
- disclaimer: aviso de que é estimativa, usuário deve validar

Retorne JSON:
{
  "marketMin": número,
  "marketMedian": número,
  "marketMax": número,
  "modelType": "...",
  "rationale": "...",
  "disclaimer": "...",
  "similarProducts": [{name, priceRange, notes}, ...]
}`;

export async function pricingBenchmark(payload) {
  const { company = {}, segment, product = [], personas = [] } = payload;
  const focus = product[0] || {};
  const user = `Segmento: ${segment || company.segment || ''}
Região: ${company.region || 'Brasil'}
Produto-foco: ${focus.name || '(genérico para o segmento)'}
Persona principal: ${(personas[0] || {}).name || ''} (orçamento típico ${(personas[0] || {}).budget || '?'})

Estime a faixa de preço de mercado para este produto.`;

  const { text } = await callAgent({ model: MODELS.FLASH, system: SYSTEM, user, maxTokens: 6000, json: true });
  const parsed = extractJSON(text);
  if (!parsed) return { error: 'Resposta não pôde ser parseada', text };
  // formato para a UI:
  return {
    suggestions: [{
      title: `Faixa de preço estimada (${parsed.modelType || '?'})`,
      text: `Min: R$ ${parsed.marketMin}\nMediana: R$ ${parsed.marketMedian}\nMax: R$ ${parsed.marketMax}\n\n${parsed.rationale || ''}\n\n⚠ ${parsed.disclaimer || 'Estimativa: valide com pesquisa real.'}`
    },
    ...(parsed.similarProducts || []).map(p => ({
      title: `Produto similar: ${p.name}`,
      text: `${p.priceRange}\n${p.notes || ''}`
    }))],
    raw: parsed,
    applicable: false
  };
}
