import { describe, expect, it, vi } from 'vitest';
import Fastify from 'fastify';
import { checkTailscaleIdentity, registerIdentityGate } from '../src/lib/identity-gate.js';

describe('checkTailscaleIdentity', () => {
  it('passes any request when no trusted user is configured (fail-open, matches collie)', () => {
    expect(checkTailscaleIdentity(undefined, {})).toEqual({ ok: true });
    expect(checkTailscaleIdentity('someone@example.com', {})).toEqual({ ok: true });
  });

  it('passes when the header matches the configured trusted user', () => {
    expect(checkTailscaleIdentity('dean@example.com', { trustedUser: 'dean@example.com' })).toEqual({ ok: true });
  });

  it('rejects when the header is present but does not match', () => {
    const result = checkTailscaleIdentity('someone-else@example.com', { trustedUser: 'dean@example.com' });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/not trusted/i);
  });

  it('rejects when a trusted user is configured but the header is missing entirely', () => {
    // Deliberately stricter than collie's checkAccess (which lets a missing header
    // through): code-relay only ever runs behind `tailscale serve`, so a real
    // request always carries this header. A missing header means the request
    // bypassed the tunnel — reject it rather than treat it as trusted.
    const result = checkTailscaleIdentity(undefined, { trustedUser: 'dean@example.com' });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/missing/i);
  });
});

describe('registerIdentityGate', () => {
  function buildServer(trustedUser?: string) {
    const server = Fastify();
    registerIdentityGate(server, { trustedUser });
    server.get('/protected', async () => ({ ok: true }));
    server.get('/health', async () => ({ status: 'ok' }));
    return server;
  }

  it('allows a request whose Tailscale-User-Login header matches', async () => {
    const server = buildServer('dean@example.com');
    const res = await server.inject({
      method: 'GET',
      url: '/protected',
      headers: { 'tailscale-user-login': 'dean@example.com' },
    });
    expect(res.statusCode).toBe(200);
  });

  it('rejects with 403 when the header does not match', async () => {
    const server = buildServer('dean@example.com');
    const res = await server.inject({
      method: 'GET',
      url: '/protected',
      headers: { 'tailscale-user-login': 'attacker@example.com' },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toEqual({ ok: false, reason: expect.stringMatching(/not trusted/i) });
  });

  it('rejects with 403 when the header is missing and a trusted user is configured', async () => {
    const server = buildServer('dean@example.com');
    const res = await server.inject({ method: 'GET', url: '/protected' });
    expect(res.statusCode).toBe(403);
  });

  it('allows any request when no trusted user is configured', async () => {
    const server = buildServer(undefined);
    const res = await server.inject({ method: 'GET', url: '/protected' });
    expect(res.statusCode).toBe(200);
  });

  it('exempts /health from the gate even when a trusted user is configured, so monitoring keeps working', async () => {
    const server = buildServer('dean@example.com');
    const res = await server.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
  });

  it('logs a startup warning when registered without a trusted user', () => {
    const server = Fastify();
    const warn = vi.spyOn(server.log, 'warn').mockImplementation(() => server.log);

    registerIdentityGate(server, {});

    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/CODE_RELAY_TRUSTED_USER.*empty/i));
  });

  it('does not warn at startup when a trusted user is configured', () => {
    const server = Fastify();
    const warn = vi.spyOn(server.log, 'warn').mockImplementation(() => server.log);

    registerIdentityGate(server, { trustedUser: 'dean@example.com' });

    expect(warn).not.toHaveBeenCalled();
  });
});
