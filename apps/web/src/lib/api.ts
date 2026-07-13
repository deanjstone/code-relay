export interface LaunchSessionParams {
  name?: string
  prompt?: string
}

export interface LaunchSessionResult {
  ok: boolean
  name?: string
  reason?: string
}

const API_BASE = import.meta.env['VITE_API_BASE_URL'] ?? ''

export async function launchSession(params: LaunchSessionParams): Promise<LaunchSessionResult> {
  const res = await fetch(`${API_BASE}/sessions/launch`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(params),
  })
  return (await res.json()) as LaunchSessionResult
}
