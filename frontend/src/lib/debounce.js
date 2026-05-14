/**
 * Throttle por "leading edge": dispara o handler na primeira chamada e ignora
 * as próximas até passar `waitMs`. Pensado pra cliques em botões que abrem
 * janelas de impressão / iniciam downloads — onde o efeito visível é caro.
 */
export function throttleClick(fn, waitMs = 1500) {
  let lastAt = 0
  return function throttled(...args) {
    const now = Date.now()
    if (now - lastAt < waitMs) return
    lastAt = now
    return fn.apply(this, args)
  }
}

/**
 * Wraps uma função async em um lock: enquanto a promise não resolve, novas
 * chamadas são descartadas. Útil pra evitar reentrância em handlers que fazem
 * I/O (export/import).
 */
export function singleFlight(fn) {
  let inflight = null
  return function wrapped(...args) {
    if (inflight) return inflight
    inflight = Promise.resolve(fn.apply(this, args))
      .finally(() => { inflight = null })
    return inflight
  }
}
