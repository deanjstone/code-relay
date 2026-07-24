import { describe, expect, it, vi } from 'vitest';
import Fastify from 'fastify';
import { registerEngineRoutes } from '../src/routes/engine.js';

function buildServer(fetchImpl: typeof fetch) {
  const server = Fastify();
  registerEngineRoutes(server, {
    agentEngineUrl: 'http://engine.test:3747',
    fetchImpl,
  });
  return server;
}

describe('POST /run', () => {
  it('returns 503 { ok: false, reason: "engine_unreachable" } when the health check fails', async () => {
    const fetchImpl = vi.fn(async (url: string | URL) => {
      if (String(url).endsWith('/health')) throw new Error('connect refused');
      throw new Error('should not reach /chat when health check fails');
    }) as unknown as typeof fetch;

    const server = buildServer(fetchImpl);
    const res = await server.inject({ method: 'POST', url: '/run', payload: { prompt: 'hi' } });

    expect(res.statusCode).toBe(503);
    expect(res.json()).toEqual({ ok: false, reason: 'engine_unreachable' });
  });

  it('proxies the prompt to /chat and relays the text result', async () => {
    const fetchImpl = vi.fn(async (url: string | URL, init?: RequestInit) => {
      const u = String(url);
      if (u.endsWith('/health')) return new Response(JSON.stringify({ ok: true }), { status: 200 });
      if (u.endsWith('/chat')) {
        const body = JSON.parse(String(init?.body)) as { message: string };
        expect(body.message).toBe('hello');
        return new Response(JSON.stringify({ text: 'hi there' }), { status: 200 });
      }
      throw new Error(`unexpected url ${u}`);
    }) as unknown as typeof fetch;

    const server = buildServer(fetchImpl);
    const res = await server.inject({ method: 'POST', url: '/run', payload: { prompt: 'hello' } });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ text: 'hi there' });
  });
});

describe('GET /search', () => {
  it('returns 503 { ok: false, reason: "engine_unreachable" } when the health check fails', async () => {
    const fetchImpl = vi.fn(async (url: string | URL) => {
      if (String(url).endsWith('/health')) throw new Error('connect refused');
      throw new Error('should not reach /vector/search when health check fails');
    }) as unknown as typeof fetch;

    const server = buildServer(fetchImpl);
    const res = await server.inject({ method: 'GET', url: '/search?q=foo&k=3' });

    expect(res.statusCode).toBe(503);
    expect(res.json()).toEqual({ ok: false, reason: 'engine_unreachable' });
  });

  it('passes q and k through to /vector/search and relays results', async () => {
    const fetchImpl = vi.fn(async (url: string | URL) => {
      const u = String(url);
      if (u.endsWith('/health')) return new Response(JSON.stringify({ ok: true }), { status: 200 });
      if (u.includes('/vector/search')) {
        expect(u).toContain('q=foo');
        expect(u).toContain('k=3');
        return new Response(JSON.stringify({ results: [{ fileName: 'a.md', chunk: 'x', score: 0.9 }] }), { status: 200 });
      }
      throw new Error(`unexpected url ${u}`);
    }) as unknown as typeof fetch;

    const server = buildServer(fetchImpl);
    const res = await server.inject({ method: 'GET', url: '/search?q=foo&k=3' });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ results: [{ fileName: 'a.md', chunk: 'x', score: 0.9 }] });
  });
});

describe('GET /engine/status', () => {
  it('returns { ok: true } when the engine health check succeeds', async () => {
    const fetchImpl = vi.fn(async (url: string | URL) => {
      if (String(url).endsWith('/health')) return new Response(JSON.stringify({ ok: true }), { status: 200 });
      throw new Error(`unexpected url ${String(url)}`);
    }) as unknown as typeof fetch;

    const server = buildServer(fetchImpl);
    const res = await server.inject({ method: 'GET', url: '/engine/status' });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });

  it('returns { ok: false } when the engine is unreachable', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('connect refused');
    }) as unknown as typeof fetch;

    const server = buildServer(fetchImpl);
    const res = await server.inject({ method: 'GET', url: '/engine/status' });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: false });
  });
});
