/**
 * Gerador de logo: iniciais + cor de fundo derivada do hash do nome.
 * Sem upload, sem dependências.
 *
 * Paleta baseada no laranja Pumpkin (#d35400) + neutros, escolhida
 * pra que qualquer cor combine com a identidade do produto.
 */

const PALETTE = [
  '#d35400', // pumpkin primário
  '#ba4a00',
  '#e67e22',
  '#a04000',
  '#7e5109',
  '#1f6f8b', // azul-petróleo
  '#2c3e50', // grafite
  '#5d6d7e'  // ardósia
]

/** Hash simples e estável (djb2). */
function hashCode(str) {
  let h = 5381
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) + str.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

export function pickColor(name) {
  const seed = (name || '').trim().toLowerCase() || 'empresa'
  return PALETTE[hashCode(seed) % PALETTE.length]
}

/** Extrai a inicial (1 ou 2 letras) do nome da empresa. */
export function pickInitials(name) {
  const trimmed = (name || '').trim()
  if (!trimmed) return '?'
  const parts = trimmed.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0][0].toUpperCase()
  // Pega a primeira letra das duas primeiras palavras, ignorando preposições curtas comuns.
  const skip = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'the', 'of'])
  const meaningful = parts.filter((p) => !skip.has(p.toLowerCase()))
  const head = meaningful.length >= 2 ? meaningful : parts
  return (head[0][0] + head[1][0]).toUpperCase()
}

/** Devolve { initials, color } prontos pra renderizar. */
export function generateLogo(name) {
  return {
    initials: pickInitials(name),
    color: pickColor(name)
  }
}
