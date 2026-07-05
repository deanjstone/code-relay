# CLAUDE.md — code-relay

Provider-agnostic PWA remote console for AI coding agents.

## What this is

**Frontend** (`apps/web`): Vite 6 + React 19 + TypeScript + Tailwind v4 → deployed to Cloudflare Pages  
**Backend** (`apps/server`): Fastify + TypeScript → deployed as systemd service on homelab  
**Packages**: `@code-relay/types` (domain model), `@code-relay/api` (client), `@code-relay/ui` (shared components), `@code-relay/shared` (utilities)

## Key docs

- `docs/PRD.md` — full product requirements
- `docs/TODO.md` — backlog

## Architecture principles

- The React PWA never talks to ACP directly — always via the Fastify backend
- All provider events are normalised to `RelayEvent` (defined in `packages/types`)
- Backend binds to Tailscale IP only — no public exposure
- No Docker; systemd native on Ubuntu homelab
- Cloudflare Pages hosts the static frontend only

## Running locally

```bash
# Install all workspace deps
pnpm install

# Start both apps
pnpm dev

# Or individually
cd apps/web && pnpm dev
cd apps/server && pnpm dev
```

## Deployment

- **Frontend**: Cloudflare Pages — push to `main` triggers deploy
- **Backend**: `systemd/code-relay-server.service` on homelab (see `systemd/`)
