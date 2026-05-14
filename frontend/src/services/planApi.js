/**
 * Cliente HTTP para o backend Fastify de planejamento.
 *
 * Endpoints (server/src/routes):
 *   GET    /plans/:id
 *   PUT    /plans/:id
 *   DELETE /plans/:id
 *   POST   /agents/:name   (usado pelo aiHelper, não por este módulo)
 */

const DEFAULT_BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

// planId NÃO é mais hardcoded — vem do cookie de sessão emitido pelo backend.
// `me` é só um placeholder de URL: o backend ignora o :id e usa o cookie.
export const PLAN_ID = 'me'

let backendOverride = null
let sessionInfoCache = null   // { planId, finalReportUsed }
let sessionPromise = null

export function setBackendUrl(url) {
  backendOverride = (url || '').trim().replace(/\/$/, '') || null
  // Trocou backend? Invalida sessão local — o novo backend tem outro cookie.
  sessionInfoCache = null
  sessionPromise = null
}

export function getBackendUrl() {
  return (backendOverride || DEFAULT_BACKEND).replace(/\/$/, '')
}

async function http(path, init = {}) {
  const res = await fetch(`${getBackendUrl()}${path}`, {
    credentials: 'include',
    ...init
  })
  if (res.status === 404) return { status: 404, body: null }
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    let parsed = null
    try { parsed = JSON.parse(text) } catch (_) {}
    const err = new Error(parsed?.message || `${init.method || 'GET'} ${path} falhou (${res.status})`)
    err.status = res.status
    err.body = parsed
    throw err
  }
  const body = res.status === 204 ? null : await res.json().catch(() => null)
  return { status: res.status, body }
}

/** Garante que a sessão (cookie httpOnly) está estabelecida com o backend. */
export async function ensureSession() {
  if (sessionInfoCache) return sessionInfoCache
  if (sessionPromise) return sessionPromise
  sessionPromise = http('/session')
    .then(({ body }) => {
      sessionInfoCache = body || null
      return sessionInfoCache
    })
    .finally(() => { sessionPromise = null })
  return sessionPromise
}

/** Lê do cache local — chame ensureSession() antes. */
export function getSessionInfo() {
  return sessionInfoCache
}

/** Atualiza o cache local quando o backend devolve novo status (ex: após cota esgotar). */
export function markFinalReportUsed() {
  if (sessionInfoCache) sessionInfoCache.finalReportUsed = true
}

export async function getPlan(id = PLAN_ID) {
  await ensureSession()
  const { status, body } = await http(`/plans/${id}`)
  if (status === 404) return null
  return body?.data ?? null
}

export async function putPlan(plan, id = PLAN_ID) {
  await ensureSession()
  const { body } = await http(`/plans/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(plan)
  })
  return body
}

export async function deletePlan(id = PLAN_ID) {
  const { body } = await http(`/plans/${id}`, { method: 'DELETE' })
  return body
}

// keepalive PUT — usado no beforeunload do store, sobrevive ao fechar a aba
export function putPlanKeepalive(plan, id = PLAN_ID) {
  try {
    fetch(`${getBackendUrl()}/plans/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(plan),
      keepalive: true,
      credentials: 'include'
    })
  } catch (_) {
    /* nada a fazer */
  }
}

// ===== Perfil público (Fase D) =====
export async function sharePlan(id = PLAN_ID) {
  const { body } = await http(`/plans/${id}/share`, { method: 'POST' })
  return body?.slug || null
}

export async function getPublicProfile(slug) {
  const { status, body } = await http(`/public/profile/${slug}`)
  if (status === 404) return null
  return body
}
