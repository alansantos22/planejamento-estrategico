/**
 * Definição dos 16 passos do wizard.
 *
 * `modeOnly: 'completo'` filtra o passo no modo enxuto.
 * `validate(plan)` retorna null se ok, string com mensagem de erro caso contrário.
 */

import CompanyStep from './steps/CompanyStep.vue'
import VisionStep from './steps/VisionStep.vue'
import IcpStep from './steps/IcpStep.vue'
import MarketStep from './steps/MarketStep.vue'
import CompetitionStep from './steps/CompetitionStep.vue'
import SwotStep from './steps/SwotStep.vue'
import TowsStep from './steps/TowsStep.vue'
import IshikawaStep from './steps/IshikawaStep.vue'
import ProductStep from './steps/ProductStep.vue'
import PricingStep from './steps/PricingStep.vue'
import CanvasStep from './steps/CanvasStep.vue'
import FunnelStep from './steps/FunnelStep.vue'
import ForecastStep from './steps/ForecastStep.vue'
import MetricsStep from './steps/MetricsStep.vue'
import OkrsStep from './steps/OkrsStep.vue'
import ActionsStep from './steps/ActionsStep.vue'

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
    id: 'icp',
    title: 'Cliente Ideal (ICP / Personas)',
    desc: 'Defina quem é o cliente ideal. Quanto mais específico, melhor o resto do plano.',
    component: IcpStep,
    validate: (plan) => {
      if (!(plan.icp.personas || []).length) return 'Adicione ao menos 1 persona.'
      if (!plan.icp.personas.some((p) => p.primary)) return 'Marque uma persona como primária.'
      return null
    }
  },
  {
    id: 'market',
    title: 'Tamanho do Mercado (TAM / SAM / SOM)',
    desc: 'Quanto vale o mercado total, o que você consegue endereçar e o que pretende capturar.',
    component: MarketStep
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
    title: 'SWOT Cruzada (TOWS) — Estratégias Sugeridas',
    desc: 'O sistema cruzou automaticamente seus principais itens para sugerir direções estratégicas.',
    component: TowsStep
  },
  {
    id: 'ishikawa',
    title: 'Ishikawa — Causa Raiz',
    desc: 'Defina o problema central e mapeie as possíveis causas pelos 6Ms.',
    modeOnly: 'completo',
    component: IshikawaStep
  },
  {
    id: 'product',
    title: 'Produto-foco / Portfólio',
    desc: 'Liste suas ofertas. O sistema identifica qual produto deve receber o foco (80/20).',
    component: ProductStep
  },
  {
    id: 'pricing',
    title: 'Posicionamento + Pricing',
    desc: 'Defina sua mensagem-chave e onde seu preço se posiciona no mercado.',
    component: PricingStep
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
      'Configure as etapas, taxas de conversão e meta — o sistema calcula reverso quantos leads você precisa.',
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
