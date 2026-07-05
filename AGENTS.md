# AGENTS.md — Code Relay

Guide for AI coding agents contributing to this project.

## What this project is

Code Relay is a provider-agnostic PWA remote console for AI coding agents. It lets you control and monitor Claude Code (and future agents) from a mobile PWA over a private Tailscale network.

## Repository layout

```
apps/web/       React 19 + Vite + Tailwind v4 — Cloudflare Pages
apps/server/    Fastify + TypeScript — homelab systemd service
packages/
  types/        RelayEvent union type — the core protocol contract
  api/          HTTP + WebSocket client for apps/web
  ui/           Shared React components
  shared/       Pure utilities (no React, no Node-specific APIs)
```

## Core invariant

**The RelayEvent stream is the contract.** Every provider emits `RelayEvent`s; the frontend only consumes `RelayEvent`s. Do not bypass this layer.

## Stack

- TypeScript everywhere — strict mode, no `any`
- pnpm workspaces; internal packages referenced as `workspace:*`
- Tailwind v4 via Vite plugin — no config file, `@import "tailwindcss"` in CSS
- Fastify v5 for the backend
- No Docker (systemd on Ubuntu)

## Conventions

- `const` over `let`; arrow functions for callbacks; named functions for top-level
- Async/await only — no `.then()` chains
- No silent catches — always `catch (error) { throw error }` or explicit handling
- No commented-out code

## Where to look

- `docs/PRD.md` — full requirements
- `docs/TODO.md` — current backlog
- `packages/types/src/index.ts` — RelayEvent definitions
- `apps/server/src/index.ts` — Fastify entry point

## Running

```bash
pnpm install
pnpm dev          # starts all apps in parallel
```
