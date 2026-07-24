# code-relay — Architectural Constraints

This file is the permanent grounding document for Claude Code in this repository.
These rules are non-negotiable and must never be violated without explicit Director approval.

## Package Manager

- **pnpm only.** Never run `npm install` or `yarn` in any directory.
- All dependency changes must use `pnpm add` / `pnpm remove`.
- Never run `pnpm add` inside a sub-package without checking whether the dep should live at the root.

## Monorepo Layout

- `apps/web` → Vite + React 19 + Tailwind v4 → Cloudflare Pages
- `apps/server` → Fastify + TypeScript → homelab systemd service
- `packages/types` → `RelayEvent` union type — the core protocol contract
- `packages/api`, `packages/ui`, `packages/shared` → internal shared code
- Internal packages referenced as `workspace:*` only.
- Never import a deep path from a package — import from package root only.

## Core Invariant: RelayEvent Stream

- The React PWA never talks to ACP directly — always via the Fastify backend.
- Every provider emits normalised `RelayEvent`s (defined in `packages/types`).
- The frontend only consumes `RelayEvent`s — never raw ACP or provider-specific events.
- Adding provider support = new adapter only; zero frontend changes.

## Infrastructure

- Backend binds to Tailscale IP only — no public inbound ports.
- No Docker. systemd native on Ubuntu homelab.
- TLS from `tailscale cert` — required for PWA service worker registration.

## TypeScript

- TypeScript-first. All new files `.ts` or `.tsx`. No `.js` source files.
- No `any` — use `unknown` and narrow explicitly.
- No silent catches — always `catch (error) { throw error }` or explicit handling.

## Director-Agent Workflow

- Non-trivial changes begin with a GitHub issue, not a task file. Claude writes the spec into the issue body under `## Specification`, then appends `## AI Implementation Plan` (files to create/modify/delete, step-by-step execution, risks) before making changes.
- Wayfinder ticket-type labels apply where relevant: `wayfinder:grilling` for open decisions, `wayfinder:task` for build work with a known shape — see `reference_wayfinder_ticket_types` memory.
- Small, well-scoped edits do not require an issue.
- Chat remains the approval gate — Claude summarises the plan in chat and waits for explicit Director approval before executing. The GitHub issue is the permanent record; close it with a `## Resolution` comment once done.
- `.claude/tasks/task-NNN-*.md` is retired as the source of truth (superseded 2026-07-17 across all other Director-Agent repos; applied here to bring code-relay in line). Any existing task files stay as historical archive only — no new ones are created.

**Migration note (2026-07-24):** code-relay was omitted from the 2026-07-17 batch migration (myargus, argus, budget, ccbot, mcp-memory, atto1, cmdpal, erto-apps) since it wasn't yet part of the Director-Agent repo set at the time. Brought in line here, mirroring the same 9th-repo fix already applied to argus-config (argus-config#75/#76).
