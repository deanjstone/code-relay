import { afterEach, describe, expect, it, vi } from 'vitest'
import { getEngineStatus, launchSession, listPackages, listProjects, runPrompt, searchVault } from '../src/lib/api.js'

describe('launchSession', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('POSTs to /sessions/launch with the given name and prompt', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ ok: true, name: 'AGENT' }), { status: 200 })
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await launchSession({ name: 'AGENT', prompt: 'hello' })

    expect(result).toEqual({ ok: true, name: 'AGENT' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/sessions/launch')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual({ name: 'AGENT', prompt: 'hello' })
  })

  it('returns the lgn5_unreachable reason from a 503 response', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ ok: false, reason: 'lgn5_unreachable' }), { status: 503 })
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await launchSession({})

    expect(result).toEqual({ ok: false, reason: 'lgn5_unreachable' })
  })
})

describe('runPrompt', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('POSTs to /run with the given prompt and returns the text result', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ text: 'hi there' }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await runPrompt('hello')

    expect(result).toEqual({ text: 'hi there' })
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/run')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual({ prompt: 'hello' })
  })

  it('returns the engine_unreachable reason from a 503 response', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: false, reason: 'engine_unreachable' }), { status: 503 }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await runPrompt('hello')

    expect(result).toEqual({ ok: false, reason: 'engine_unreachable' })
  })
})

describe('searchVault', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('GETs /search with q and k and returns results', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ results: [{ fileName: 'a.md', chunk: 'x', score: 0.9 }] }), { status: 200 })
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await searchVault('foo', 3)

    expect(result).toEqual({ results: [{ fileName: 'a.md', chunk: 'x', score: 0.9 }] })
    const [url] = fetchMock.mock.calls[0] as [string]
    expect(url).toContain('/search')
    expect(url).toContain('q=foo')
    expect(url).toContain('k=3')
  })
})

describe('getEngineStatus', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('GETs /engine/status and returns ok', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await getEngineStatus()

    expect(result).toEqual({ ok: true })
    const [url] = fetchMock.mock.calls[0] as [string]
    expect(url).toContain('/engine/status')
  })
})

describe('listProjects', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('GETs /projects and returns the project list', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ projects: ['argus', 'code-relay'] }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await listProjects()

    expect(result).toEqual({ projects: ['argus', 'code-relay'] })
    const [url] = fetchMock.mock.calls[0] as [string]
    expect(url).toContain('/projects')
  })
})

describe('listPackages', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('GETs /projects/:name/packages and returns the package list', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ packages: [{ rel: 'packages/agent-cli' }] }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await listPackages('argus')

    expect(result).toEqual({ packages: [{ rel: 'packages/agent-cli' }] })
    const [url] = fetchMock.mock.calls[0] as [string]
    expect(url).toContain('/projects/argus/packages')
  })
})
