import type { FastifyInstance } from 'fastify';

export interface IdentityGateConfig {
  /** Tailnet login (e.g. "dean@github") this backend trusts. Unset = fail-open. */
  trustedUser?: string;
}

export interface IdentityCheckResult {
  ok: boolean;
  reason?: string;
}

/**
 * Validates the `Tailscale-User-Login` header `tailscale serve` injects
 * against the configured trusted user, following collie's
 * COLLIE_TRUSTED_USER pattern (see bridge/server.ts's checkAccess in
 * ~/repos/reference/collie) with one deliberate departure: collie lets a
 * *missing* header through unchanged (it also supports a raw reverse-proxy
 * deployment where the header is legitimately never present), but
 * code-relay only ever runs behind `tailscale serve` — so once a trusted
 * user is configured, a request with no header at all didn't come through
 * the tunnel and is rejected, not treated as trusted.
 *
 * An unconfigured trusted user fails open (matches collie): this backend
 * still binds Tailscale-only regardless, so an unconfigured gate is a
 * lesser exposure than the app refusing to run at all before it's fully
 * configured.
 */
export function checkTailscaleIdentity(
  headerValue: string | undefined,
  config: IdentityGateConfig,
): IdentityCheckResult {
  if (!config.trustedUser) return { ok: true };
  if (!headerValue) return { ok: false, reason: 'missing Tailscale-User-Login header' };
  if (headerValue !== config.trustedUser) return { ok: false, reason: 'identity not trusted' };
  return { ok: true };
}

const EXEMPT_PATHS = new Set(['/health']);

/**
 * Registers a global onRequest gate enforcing checkTailscaleIdentity() on
 * every route except /health (left open for uptime monitoring — it leaks no
 * session data). Call once per server instance, before route registration.
 */
export function registerIdentityGate(server: FastifyInstance, config: IdentityGateConfig): void {
  if (!config.trustedUser) {
    server.log.warn(
      'CODE_RELAY_TRUSTED_USER is empty — any tailnet device/user that reaches this backend gets full access. Set it to your tailnet login.',
    );
  }

  server.addHook('onRequest', async (request, reply) => {
    if (EXEMPT_PATHS.has(request.url)) return;

    const header = request.headers['tailscale-user-login'];
    const headerValue = Array.isArray(header) ? header[0] : header;
    const result = checkTailscaleIdentity(headerValue, config);
    if (!result.ok) {
      reply.code(403);
      return reply.send({ ok: false, reason: result.reason });
    }
  });
}
