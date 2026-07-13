import { describe, expect, it, vi } from 'vitest';
import Fastify from 'fastify';
import { registerSessionsRoutes } from '../src/routes/sessions.js';

function buildServer(fetchImpl: typeof fetch) {
  const server = Fastify();
  registerSessionsRoutes(server, {
    lgn5ListenerUrl: 'http://lgn5.test:3748',
    fetchImpl,
  });
  return server;
}

describe('POST /sessions/launch', () => {
  it('returns 503 { ok: false, reason: "lgn5_unreachable" } when the health check fails', async () => {
    const fetchImpl = vi.fn(async (url: string | URL) => {
      if (String(url).endsWith('/health')) throw new Error('connect refused');
      throw new Error('should not reach /launch when health check fails');
    }) as unknown as typeof fetch;

    const server = buildServer(fetchImpl);
    const res = await server.inject({ method: 'POST', url: '/sessions/launch', payload: {} });

    expect(res.statusCode).toBe(503);
    expect(res.json()).toEqual({ ok: false, reason: 'lgn5_unreachable' });
  });

  it('proxies to LGN5 and returns its result when healthy', async () => {
    const fetchImpl = vi.fn(async (url: string | URL) => {
      const u = String(url);
      if (u.endsWith('/health')) return new Response(JSON.stringify({ ok: true }), { status: 200 });
      if (u.endsWith('/launch')) return new Response(JSON.stringify({ ok: true, name: 'AGENT' }), { status: 200 });
      throw new Error(`unexpected url ${u}`);
    }) as unknown as typeof fetch;

    const server = buildServer(fetchImpl);
    const res = await server.inject({ method: 'POST', url: '/sessions/launch', payload: { name: 'AGENT' } });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true, name: 'AGENT' });
  });

  it('returns 502 { ok: false, reason: "launch_failed" } when LGN5 is healthy but the launch itself fails', async () => {
    const fetchImpl = vi.fn(async (url: string | URL) => {
      const u = String(url);
      if (u.endsWith('/health')) return new Response(JSON.stringify({ ok: true }), { status: 200 });
      if (u.endsWith('/launch')) return new Response(JSON.stringify({ ok: false }), { status: 500 });
      throw new Error(`unexpected url ${u}`);
    }) as unknown as typeof fetch;

    const server = buildServer(fetchImpl);
    const res = await server.inject({ method: 'POST', url: '/sessions/launch', payload: {} });

    expect(res.statusCode).toBe(502);
    expect(res.json()).toEqual({ ok: false, reason: 'launch_failed' });
  });
});
