import type { FastifyInstance } from 'fastify';
import { checkHealth } from '../lib/health.js';

interface RunRequestBody {
  prompt: string;
}

interface SearchQuery {
  q: string;
  k?: string;
}

export interface EngineRouteOptions {
  agentEngineUrl: string;
  fetchImpl?: typeof fetch;
  healthTimeoutMs?: number;
}

export function registerEngineRoutes(server: FastifyInstance, options: EngineRouteOptions): void {
  const fetchFn = options.fetchImpl ?? fetch;
  const healthTimeoutMs = options.healthTimeoutMs ?? 2000;

  server.post<{ Body: RunRequestBody }>('/run', async (request, reply) => {
    const healthy = await checkHealth(fetchFn, options.agentEngineUrl, healthTimeoutMs);
    if (!healthy) {
      reply.code(503);
      return { ok: false, reason: 'engine_unreachable' };
    }

    const res = await fetchFn(`${options.agentEngineUrl}/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: request.body.prompt }),
    });

    reply.code(res.status);
    return (await res.json()) as unknown;
  });

  server.get<{ Querystring: SearchQuery }>('/search', async (request, reply) => {
    const healthy = await checkHealth(fetchFn, options.agentEngineUrl, healthTimeoutMs);
    if (!healthy) {
      reply.code(503);
      return { ok: false, reason: 'engine_unreachable' };
    }

    const params = new URLSearchParams({ q: request.query.q });
    if (request.query.k) params.set('k', request.query.k);

    const res = await fetchFn(`${options.agentEngineUrl}/vector/search?${params.toString()}`);
    reply.code(res.status);
    return (await res.json()) as unknown;
  });

  server.get('/engine/status', async () => {
    const ok = await checkHealth(fetchFn, options.agentEngineUrl, healthTimeoutMs);
    return { ok };
  });
}
