export interface LaunchSessionParams {
  name?: string
  prompt?: string
  project?: string
  subPath?: string
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

export interface RunPromptResult {
  text?: string
  ok?: boolean
  reason?: string
  error?: string
}

export async function runPrompt(prompt: string): Promise<RunPromptResult> {
  const res = await fetch(`${API_BASE}/run`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ prompt }),
  })
  return (await res.json()) as RunPromptResult
}

export interface SearchResult {
  fileName: string
  chunk: string
  score: number
}

export interface SearchVaultResult {
  results?: SearchResult[]
  ok?: boolean
  reason?: string
  error?: string
}

export async function searchVault(query: string, k?: number): Promise<SearchVaultResult> {
  const params = new URLSearchParams({ q: query })
  if (k !== undefined) params.set('k', String(k))
  const res = await fetch(`${API_BASE}/search?${params.toString()}`)
  return (await res.json()) as SearchVaultResult
}

export interface EngineStatusResult {
  ok: boolean
}

export async function getEngineStatus(): Promise<EngineStatusResult> {
  const res = await fetch(`${API_BASE}/engine/status`)
  return (await res.json()) as EngineStatusResult
}

export interface ListProjectsResult {
  projects?: string[]
  ok?: boolean
  reason?: string
}

export async function listProjects(): Promise<ListProjectsResult> {
  const res = await fetch(`${API_BASE}/projects`)
  return (await res.json()) as ListProjectsResult
}

export interface ProjectPackage {
  rel: string
}

export interface ListPackagesResult {
  packages?: ProjectPackage[]
  ok?: boolean
  reason?: string
  error?: string
}

export async function listPackages(name: string): Promise<ListPackagesResult> {
  const res = await fetch(`${API_BASE}/projects/${encodeURIComponent(name)}/packages`)
  return (await res.json()) as ListPackagesResult
}
