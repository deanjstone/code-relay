import type { FastifyInstance } from 'fastify';

interface LaunchRequestBody {
  name?: string;
  prompt?: string;
}

export interface SessionsRouteOptions {
  lgn5ListenerUrl: string;
  fetchImpl?: typeof fetch;
  healthTimeoutMs?: number;
}

export function registerSessionsRoutes(server: FastifyInstance, options: SessionsRouteOptions): void {
  const fetchFn = options.fetchImpl ?? fetch;
  const healthTimeoutMs = options.healthTimeoutMs ?? 2000;

  server.post<{ Body: LaunchRequestBody }>('/sessions/launch', async (request, reply) => {
    const healthy = await checkHealth(fetchFn, options.lgn5ListenerUrl, healthTimeoutMs);
    if (!healthy) {
      reply.code(503);
      return { ok: false, reason: 'lgn5_unreachable' };
    }

    const launchRes = await fetchFn(`${options.lgn5ListenerUrl}/launch`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(request.body ?? {}),
    });

    if (!launchRes.ok) {
      reply.code(502);
      return { ok: false, reason: 'launch_failed' };
    }

    return (await launchRes.json()) as unknown;
  });
}

async function checkHealth(fetchFn: typeof fetch, baseUrl: string, timeoutMs: number): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetchFn(`${baseUrl}/health`, { signal: controller.signal });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}
