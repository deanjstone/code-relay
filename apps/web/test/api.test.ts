import { afterEach, describe, expect, it, vi } from 'vitest'
import { launchSession } from '../src/lib/api.js'

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
