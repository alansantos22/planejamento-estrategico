/**
 * Definição dos 16 passos do wizard.
 *
 * `modeOnly: 'completo'` filtra o passo no modo enxuto.
 * `validate(plan)` retorna null se ok, string com mensagem de erro caso contrário.
 */

import { defineAsyncComponent } from 'vue'

// Cada step vira um chunk próprio, baixado apenas quando o usuário chega nele.
// Reduz fortemente o JS inicial do wizard.
const asyncStep = (loader) => defineAsyncComponent(loader)

const CompanyStep     = asyncStep(() => import('./steps/CompanyStep.vue'))
const VisionStep      = asyncStep(() => import('./steps/VisionStep.vue'))
const IcpStep         = asyncStep(() => import('./steps/IcpStep.vue'))
const MarketStep      = asyncStep(() => import('./steps/MarketStep.vue'))
const CompetitionStep = asyncStep(() => import('./steps/CompetitionStep.vue'))
const SwotStep        = asyncStep(() => import('./steps/SwotStep.vue'))
const TowsStep        = asyncStep(() => import('./steps/TowsStep.vue'))
const IshikawaStep    = asyncStep(() => import('./steps/IshikawaStep.vue'))
const ProductStep     = asyncStep(() => import('./steps/ProductStep.vue'))
const CanvasStep      = asyncStep(() => import('./steps/CanvasStep.vue'))
const FunnelStep      = asyncStep(() => import('./steps/FunnelStep.vue'))
const ForecastStep    = asyncStep(() => import('./steps/ForecastStep.vue'))
const MetricsStep     = asyncStep(() => import('./steps/MetricsStep.vue'))
const OkrsStep        = asyncStep(() => import('./steps/OkrsStep.vue'))
const ActionsStep     = asyncStep(() => import('./steps/ActionsStep.vue'))

export const ALL_STEPS = [
  {
    id: 'company',
    title: 'Sua Empresa',
    desc: 'Comece nos contando sobre o seu negócio. Esses dados ajudam a contextualizar o plano.',
    component: CompanyStep,
    validate: (plan) => (!plan.company.name.trim() ? 'Informe o nome da empresa.' : null)
  },
  {
    id: 'vision',
    title: 'Direção Estratégica (Visão)',
    desc: 'Onde você quer chegar? Essa é a bússola que orienta todas as decisões.',
    modeOnly: 'completo',
    component: VisionStep
  },
  {
    id: 'market',
    title: 'Tamanho do Mercado (TAM / SAM / SOM)',
    desc: 'Quanto vale o mercado total, o que você consegue endereçar e o que pretende capturar.',
    component: MarketStep
  },
  {
    id: 'product',
    title: 'Produto-foco / Portfólio',
    desc: 'Liste suas ofertas. O sistema identifica qual produto deve receber o foco (80/20).',
    component: ProductStep
  },
  {
    id: 'competition',
    title: 'Análise de Concorrência',
    desc: 'Liste concorrentes e avalie cada um em critérios-chave (1 = fraco, 5 = excelente).',
    component: CompetitionStep
  },
  {
    id: 'swot',
    title: 'Diagnóstico SWOT',
    desc: 'Liste os principais pontos. Para cada item, dê notas de Impacto e Confiança (1-10).',
    component: SwotStep,
    validate: (plan) => {
      const total =
        plan.swot.strengths.length +
        plan.swot.weaknesses.length +
        plan.swot.opportunities.length +
        plan.swot.threats.length
      if (total < 4) return 'Preencha pelo menos 1 item em cada quadrante (mínimo 4 itens).'
      return null
    }
  },
  {
    id: 'tows',
    title: 'SWOT Cruzada (TOWS): Estratégias Sugeridas',
    desc: 'O sistema cruzou automaticamente seus principais itens para sugerir direções estratégicas.',
    component: TowsStep
  },
  {
    id: 'ishikawa',
    title: 'Ishikawa: Causa Raiz',
    desc: 'Defina o problema central e mapeie as possíveis causas pelos 6Ms.',
    modeOnly: 'completo',
    component: IshikawaStep
  },
  {
    id: 'icp',
    title: 'Cliente Ideal (ICP / Personas)',
    desc: 'Agora que já mapeamos empresa, SWOT e produto, podemos definir com precisão quem é o cliente ideal.',
    component: IcpStep,
    validate: (plan) => {
      if (!(plan.icp.personas || []).length) return 'Adicione ao menos 1 persona.'
      if (!plan.icp.personas.some((p) => p.primary)) return 'Marque uma persona como primária.'
      return null
    }
  },
  {
    id: 'canvas',
    title: 'Business Model Canvas',
    desc: 'Visão de uma página do seu modelo de negócio.',
    modeOnly: 'completo',
    component: CanvasStep
  },
  {
    id: 'funnel',
    title: 'Funil de Vendas',
    desc:
      'Configure as etapas, taxas de conversão e meta. O sistema calcula reverso quantos leads você precisa.',
    component: FunnelStep
  },
  {
    id: 'forecast',
    title: 'Projeção de Vendas (12 meses)',
    desc: 'Combina seu funil + retenção + crescimento mensal para projetar receita ao longo do ano.',
    component: ForecastStep
  },
  {
    id: 'metrics',
    title: 'Métricas de Saúde (CAC / LTV)',
    desc: 'A relação LTV/CAC mostra se seu negócio é financeiramente sustentável.',
    modeOnly: 'completo',
    component: MetricsStep
  },
  {
    id: 'okrs',
    title: 'Objetivos e Resultados-Chave (OKRs)',
    desc: 'Defina 2 a 4 objetivos qualitativos e seus resultados-chave mensuráveis (90 dias).',
    component: OkrsStep,
    validate: (plan) => {
      const filled = (plan.okrs || []).filter((o) => (o.objective || '').trim())
      return filled.length ? null : 'Adicione ao menos 1 objetivo.'
    }
  },
  {
    id: 'actions',
    title: 'Plano de Ação (5W2H)',
    desc: 'Detalhe as iniciativas prioritárias. As notas Impacto/Confiança/Facilidade calculam o ICE Score.',
    component: ActionsStep,
    validate: (plan) => (plan.actions.length ? null : 'Cadastre ao menos 1 ação.')
  }
]

export function filteredSteps(mode) {
  return ALL_STEPS.filter((s) => !s.modeOnly || s.modeOnly === mode)
}
