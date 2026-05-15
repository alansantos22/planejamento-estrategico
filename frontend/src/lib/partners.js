/**
 * Parcerias da Unli exibidas de forma discreta dentro do planejamento.
 * Fonte única dos links de contato — WhatsApp com mensagem pré-preenchida
 * para identificar a origem do lead.
 */

const WHATSAPP = '5511911019666'

function waLink(text) {
  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`
}

// Foorge — IA para Instagram e WhatsApp. Reduz custo de social media e atendimento.
export const FOORGE = {
  site: 'https://www.foorge.com.br',
  whatsapp: waLink(
    'Olá! Vim pelo Planejamento Estratégico da Unli e quero saber como o Foorge ' +
      'pode reduzir meu custo de social media e atendimento.'
  )
}

// Mentoria Unli Studio para imobiliárias ("Imobiliária do Futuro").
export const MENTORIA_IMOBILIARIAS = {
  whatsapp: waLink(
    'Olá! Vim pelo Planejamento Estratégico da Unli e tenho interesse na ' +
      'mentoria para imobiliárias.'
  )
}

// Detecta se a empresa do plano atua no mercado imobiliário.
export function isImobiliaria(segment) {
  return /imobili|im[oó]ve|corret|real estate/i.test(segment || '')
}
