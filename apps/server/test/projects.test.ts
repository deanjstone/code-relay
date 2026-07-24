import { describe, expect, it, vi } from 'vitest';
import Fastify from 'fastify';
import { registerProjectsRoutes } from '../src/routes/projects.js';

function buildServer(fetchImpl: typeof fetch) {
  const server = Fastify();
  registerProjectsRoutes(server, {
    lgn5ListenerUrl: 'http://lgn5.test:3748',
    fetchImpl,
  });
  return server;
}

describe('GET /projects', () => {
  it('returns 503 { ok: false, reason: "lgn5_unreachable" } when the health check fails', async () => {
    const fetchImpl = vi.fn(async (url: string | URL) => {
      if (String(url).endsWith('/health')) throw new Error('connect refused');
      throw new Error('should not reach /projects when health check fails');
    }) as unknown as typeof fetch;

    const server = buildServer(fetchImpl);
    const res = await server.inject({ method: 'GET', url: '/projects' });

    expect(res.statusCode).toBe(503);
    expect(res.json()).toEqual({ ok: false, reason: 'lgn5_unreachable' });
  });

  it('proxies to LGN5 and returns its result when healthy', async () => {
    const fetchImpl = vi.fn(async (url: string | URL) => {
      const u = String(url);
      if (u.endsWith('/health')) return new Response(JSON.stringify({ ok: true }), { status: 200 });
      if (u.endsWith('/projects')) return new Response(JSON.stringify({ projects: ['argus', 'code-relay'] }), { status: 200 });
      throw new Error(`unexpected url ${u}`);
    }) as unknown as typeof fetch;

    const server = buildServer(fetchImpl);
    const res = await server.inject({ method: 'GET', url: '/projects' });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ projects: ['argus', 'code-relay'] });
  });
});

describe('GET /projects/:name/packages', () => {
  it('returns 503 { ok: false, reason: "lgn5_unreachable" } when the health check fails', async () => {
    const fetchImpl = vi.fn(async (url: string | URL) => {
      if (String(url).endsWith('/health')) throw new Error('connect refused');
      throw new Error('should not reach packages route when health check fails');
    }) as unknown as typeof fetch;

    const server = buildServer(fetchImpl);
    const res = await server.inject({ method: 'GET', url: '/projects/argus/packages' });

    expect(res.statusCode).toBe(503);
    expect(res.json()).toEqual({ ok: false, reason: 'lgn5_unreachable' });
  });

  it('proxies to LGN5 with the right project name and returns packages', async () => {
    const fetchImpl = vi.fn(async (url: string | URL) => {
      const u = String(url);
      if (u.endsWith('/health')) return new Response(JSON.stringify({ ok: true }), { status: 200 });
      if (u.endsWith('/projects/argus/packages')) {
        return new Response(JSON.stringify({ packages: [{ rel: 'packages/agent-cli' }] }), { status: 200 });
      }
      throw new Error(`unexpected url ${u}`);
    }) as unknown as typeof fetch;

    const server = buildServer(fetchImpl);
    const res = await server.inject({ method: 'GET', url: '/projects/argus/packages' });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ packages: [{ rel: 'packages/agent-cli' }] });
  });

  it('returns 404 when LGN5 reports the project is unknown', async () => {
    const fetchImpl = vi.fn(async (url: string | URL) => {
      const u = String(url);
      if (u.endsWith('/health')) return new Response(JSON.stringify({ ok: true }), { status: 200 });
      if (u.endsWith('/projects/does-not-exist/packages')) {
        return new Response(JSON.stringify({ ok: false, error: 'project not found: does-not-exist' }), { status: 404 });
      }
      throw new Error(`unexpected url ${u}`);
    }) as unknown as typeof fetch;

    const server = buildServer(fetchImpl);
    const res = await server.inject({ method: 'GET', url: '/projects/does-not-exist/packages' });

    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ ok: false, error: 'project not found: does-not-exist' });
  });
});
