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

- All non-trivial work begins with a task file in `.claude/tasks/task-NNN-<name>.md`.
- Claude must append its implementation plan to the task file before writing any code.
- Code execution is blocked until the Director provides explicit approval in chat.
- Chat is the UI; the task file is the source of truth.
