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
export const PLAN_ID = 'default'

let backendOverride = null

export function setBackendUrl(url) {
  backendOverride = (url || '').trim().replace(/\/$/, '') || null
}

export function getBackendUrl() {
  return (backendOverride || DEFAULT_BACKEND).replace(/\/$/, '')
}

async function http(path, init = {}) {
  const res = await fetch(`${getBackendUrl()}${path}`, init)
  if (res.status === 404) return { status: 404, body: null }
  if (!res.ok) {
    throw new Error(`${init.method || 'GET'} ${path} falhou (${res.status})`)
  }
  const body = res.status === 204 ? null : await res.json().catch(() => null)
  return { status: res.status, body }
}

export async function getPlan(id = PLAN_ID) {
  const { status, body } = await http(`/plans/${id}`)
  if (status === 404) return null
  return body?.data ?? null
}

export async function putPlan(plan, id = PLAN_ID) {
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
      keepalive: true
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
