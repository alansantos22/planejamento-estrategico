import { callAgent, extractJSON, MODELS } from '../lib/gemini.js';

const SYSTEM_SINGLE = `Você é um especialista em vendas com 15+ anos de experiência em B2B, B2C, SaaS, Serviços e Indústria. Sua tarefa é desenhar UM ÚNICO funil de vendas unificado que sirva o conjunto de produtos da empresa.

Considere:
- Produtos REAIS que a empresa vende (use as descrições e tipos — não invente outros)
- Ciclo de venda médio
- Etapas adequadas (varia por modelo: produto vs. serviço, B2B vs. B2C, low-ticket vs. high-ticket)
- Taxas de conversão realistas POR ETAPA segundo benchmarks do mercado
- Canais e custos esperados, alinhados ao(s) ICP(s)

Para cada etapa:
- name: nome
- typicalRate: taxa de conversão típica para a próxima etapa (%)
- benchmark: faixa esperada
- watchOut: o que pode reduzir essa taxa

Retorne JSON:
{
  "stages": [{name, typicalRate, benchmark, watchOut}, ...],
  "expectedBottleneck": "etapa onde costuma travar, e por quê",
  "channelRecommendations": [{name, mixPct, costPerLeadEstimate, rationale}, ...],
  "playbook": "3-5 ações concretas para melhorar este funil",
  "rationale": "lógica do desenho"
}

Tudo em PT-BR.`;

const SYSTEM_PER_PRODUCT = `Você é um especialista em vendas com 15+ anos de experiência em B2B, B2C, SaaS, Serviços e Indústria. Sua tarefa é desenhar UM FUNIL POR PRODUTO, mostrando como eles se conectam via upsell e cross-sell.

Considere:
- Produtos REAIS que a empresa vende (use as descrições e tipos — não invente outros)
- Cada produto tem ciclo, ticket, canais e dinâmica próprios
- Relacionamento entre produtos: qual leva a qual (upsell — produto mais caro/profundo) e qual complementa (cross-sell — mesma jornada)

Para CADA produto/oferta listada, retorne um sub-funil com:
- productName: nome EXATO do produto
- funnelRole: papel no funil estratégico do negócio — "TOF" (Topo — atração, baixo ticket, captura volume), "MOF" (Meio — qualificação, ticket médio), "BOF" (Fundo — alta intenção, alto ticket)
- funnelRoleReason: 1 frase explicando o papel
- stages: etapas próprias do produto, com {name, typicalRate, benchmark, watchOut}
- channelRecommendations: canais específicos PARA ESTE produto, com {name, mixPct, costPerLeadEstimate, rationale}
- avgTicketEstimate: ticket médio típico (R$)
- bottleneck: gargalo esperado
- playbook: 2-4 ações concretas
- upsellTo: nome de OUTRO produto da lista para onde este faz upsell (string vazia se não houver). Ex: TOF → MOF/BOF.
- crossSellTo: nome de OUTRO produto da lista que complementa este (string vazia se não houver)
- upsellNotes: como/quando o upsell ou cross-sell acontece (ex: "após 3 meses ativos no SaaS, ofertar mentoria")

Retorne JSON:
{
  "perProduct": [ ... um objeto por produto, na ordem da lista ... ],
  "rationale": "como o portfólio se encaixa: TOF/MOF/BOF e fluxo entre produtos"
}

Regras:
- EXATAMENTE um item por produto listado, na mesma ordem.
- Cada produto tem canais PRÓPRIOS — não copie de outro produto.
- Upsell/cross-sell só pode referenciar produtos que estão na lista (use o nome exato).
- Tudo em PT-BR.`;

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

function fmtList(arr, mapper) {
  if (!arr || !arr.length) return '(nenhum)';
  return arr.map(mapper).filter(Boolean).join('\n');
}

function fmtOffering(o) {
  const name = o.name || o.title || '(sem nome)';
  const type = o.type ? TYPE_LABEL[o.type] || o.type : '';
  const billing = o.billing ? BILLING_LABEL[o.billing] || o.billing : '';
  const meta = [type, billing, o.revenuePct ? `${o.revenuePct}% da receita` : null]
    .filter(Boolean).join(' · ');
  const desc = (o.description || '').trim();
  return `- ${name}${meta ? ` [${meta}]` : ''}${desc ? `\n    ${desc}` : ''}`;
}

function fmtPersona(p) {
  const tag = p.productName ? ` → ${p.productName}` : '';
  const head = `${p.name || 'Persona'}${tag}${p.primary ? ' (PRIMÁRIA)' : ''}`;
  const body = [
    p.role ? `cargo: ${p.role}` : null,
    p.companySize ? `porte: ${p.companySize}` : null,
    p.pain ? `dor: ${p.pain}` : null,
    p.trigger ? `gatilho: ${p.trigger}` : null,
    p.budget ? `orçamento: ${p.budget}` : null,
    p.authority ? `autoridade: ${p.authority}` : null,
    p.channel ? `canal: ${p.channel}` : null
  ].filter(Boolean).join(' | ');
  return `- ${head}\n    ${body}`;
}

export async function salesFunnelArchitect(payload) {
  const {
    company = {},
    funnelMode = 'single',
    personas = [],
    product = [],
    productFocus = '',
    valueProp = '',
    channels = '',
    avgTicket,
    salesCycleDays,
    monthlyRevenueGoal,
    segment
  } = payload;

  const isPerProduct = funnelMode === 'perProduct';

  const user = `Modo de funil escolhido pelo usuário: ${isPerProduct ? 'MÚLTIPLOS FUNIS (um por produto, com upsell/cross-sell)' : 'FUNIL ÚNICO unificado'}

Empresa: ${company.name || ''}
Segmento: ${segment || company.segment || ''}
Porte: ${company.size || ''}
Região: ${company.region || ''}

# Proposta de valor
${valueProp || '(não definida)'}

# Produtos/Ofertas REAIS (desenhe o funil para estes — não invente outros)
${fmtList(product, fmtOffering)}
${productFocus ? `\nFoco/racional do portfólio: ${productFocus}` : ''}

# Personas / ICPs (cada um pode estar vinculado a um produto via "→ Produto")
${fmtList(personas, fmtPersona)}

# Métricas do funil
- Ticket médio: R$ ${avgTicket || '?'}
- Ciclo de vendas: ${salesCycleDays || '?'} dias
- Meta mensal: R$ ${monthlyRevenueGoal || '?'}
- Canais atuais (Canvas): ${channels || '(não definidos)'}

${isPerProduct
  ? 'Desenhe UM SUB-FUNIL POR PRODUTO listado, classificando cada um como TOF/MOF/BOF e mapeando upsell/cross-sell entre eles. Cada produto deve ter canais próprios.'
  : 'Desenhe UM ÚNICO funil unificado, com taxas de conversão típicas, considerando os produtos reais acima.'}`;

  const system = isPerProduct ? SYSTEM_PER_PRODUCT : SYSTEM_SINGLE;
  const { text } = await callAgent({ model: MODELS.PRO, system, user, maxTokens: 8000, json: true });
  const parsed = extractJSON(text);
  if (!parsed) return { error: 'Resposta não pôde ser parseada', text };

  if (isPerProduct) {
    const perProductSuggestions = (parsed.perProduct || []).map((p) => {
      const stagesBlock = (p.stages || []).map((s, i) =>
        `  ${i + 1}. ${s.name}: ${s.typicalRate}% (${s.benchmark || '?'})${s.watchOut ? ` — atenção: ${s.watchOut}` : ''}`
      ).join('\n');
      const channelsBlock = (p.channelRecommendations || []).map((c) =>
        `  - ${c.name} (${c.mixPct}% do mix, ~R$ ${c.costPerLeadEstimate}/lead): ${c.rationale}`
      ).join('\n');
      const relations = [
        p.upsellTo ? `Upsell → ${p.upsellTo}` : null,
        p.crossSellTo ? `Cross-sell → ${p.crossSellTo}` : null
      ].filter(Boolean).join(' · ');
      const text = [
        `Papel no funil: ${p.funnelRole || '?'} — ${p.funnelRoleReason || ''}`,
        p.avgTicketEstimate ? `Ticket estimado: ${p.avgTicketEstimate}` : null,
        relations || null,
        p.upsellNotes ? `Como/quando: ${p.upsellNotes}` : null,
        stagesBlock ? `Etapas:\n${stagesBlock}` : null,
        channelsBlock ? `Canais:\n${channelsBlock}` : null,
        p.bottleneck ? `Gargalo: ${p.bottleneck}` : null,
        p.playbook ? `Playbook: ${p.playbook}` : null
      ].filter(Boolean).join('\n\n');
      return { title: `Sub-funil — ${p.productName || 'Produto'}`, text };
    });

    return {
      suggestions: [
        ...perProductSuggestions,
        parsed.rationale ? { title: 'Racional do portfólio', text: parsed.rationale } : null
      ].filter(Boolean),
      raw: { ...parsed, mode: 'perProduct' },
      applicable: Array.isArray(parsed.perProduct) && parsed.perProduct.length > 0
    };
  }

  const stagesText = (parsed.stages || []).map((s, i) =>
    `${i + 1}. ${s.name}: taxa típica ${s.typicalRate}% (faixa: ${s.benchmark || '?'})\n   Atenção: ${s.watchOut || ''}`
  ).join('\n\n');

  const channelsText = (parsed.channelRecommendations || [])
    .map(c => `- ${c.name} (${c.mixPct}% do mix, ~R$ ${c.costPerLeadEstimate}/lead): ${c.rationale}`)
    .join('\n');

  return {
    suggestions: [
      { title: 'Funil sugerido', text: stagesText },
      { title: 'Gargalo esperado', text: parsed.expectedBottleneck || 'n/d' },
      { title: 'Canais recomendados', text: channelsText },
      { title: 'Playbook de melhoria', text: parsed.playbook || '' }
    ],
    raw: { ...parsed, mode: 'single' },
    applicable: Array.isArray(parsed.stages) && parsed.stages.length > 0
  };
}
