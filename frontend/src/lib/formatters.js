/**
 * Formatadores comuns — moeda, número, etc.
 */

export function formatMoney(n) {
  if (n === null || n === undefined || n === '') return 'R$ 0'
  const num = Number(n)
  if (!Number.isFinite(num) || num === 0) return 'R$ 0'
  if (num >= 1e9) return `R$ ${(num / 1e9).toFixed(1)} bi`
  if (num >= 1e6) return `R$ ${(num / 1e6).toFixed(1)} mi`
  if (num >= 1e3) return `R$ ${(num / 1e3).toFixed(0)} mil`
  return `R$ ${num.toLocaleString('pt-BR')}`
}

export function formatNumber(n) {
  const num = Number(n)
  if (!Number.isFinite(num)) return '0'
  return num.toLocaleString('pt-BR')
}

export function clamp(n, min, max) {
  return Math.max(min, Math.min(max, Number(n) || 0))
}

export function clampPct(n, min = 0, max = 100) {
  return clamp(n, min, max)
}

const CAUSE_LABELS = {
  method: 'Método',
  machine: 'Máquina',
  material: 'Material',
  people: 'Mão de Obra',
  measure: 'Medida',
  environment: 'Meio Ambiente'
}

export function ishikawaCauseLabel(key) {
  return CAUSE_LABELS[key] || key
}
