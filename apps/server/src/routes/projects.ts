import type { FastifyInstance } from 'fastify';
import { checkHealth } from '../lib/health.js';

export interface ProjectsRouteOptions {
  lgn5ListenerUrl: string;
  fetchImpl?: typeof fetch;
  healthTimeoutMs?: number;
}

export function registerProjectsRoutes(server: FastifyInstance, options: ProjectsRouteOptions): void {
  const fetchFn = options.fetchImpl ?? fetch;
  const healthTimeoutMs = options.healthTimeoutMs ?? 2000;

  server.get('/projects', async (_request, reply) => {
    const healthy = await checkHealth(fetchFn, options.lgn5ListenerUrl, healthTimeoutMs);
    if (!healthy) {
      reply.code(503);
      return { ok: false, reason: 'lgn5_unreachable' };
    }

    const res = await fetchFn(`${options.lgn5ListenerUrl}/projects`);
    reply.code(res.status);
    return (await res.json()) as unknown;
  });

  server.get<{ Params: { name: string } }>('/projects/:name/packages', async (request, reply) => {
    const healthy = await checkHealth(fetchFn, options.lgn5ListenerUrl, healthTimeoutMs);
    if (!healthy) {
      reply.code(503);
      return { ok: false, reason: 'lgn5_unreachable' };
    }

    const res = await fetchFn(`${options.lgn5ListenerUrl}/projects/${encodeURIComponent(request.params.name)}/packages`);
    reply.code(res.status);
    return (await res.json()) as unknown;
  });
}
