---
title: ADR-001 — pnpm Standard with Global CLI Tool Installs
status: accepted
date: 2026-07-09
context: cross-project package manager policy
---

# ADR-001: pnpm Standard with Global CLI Tool Installs

## Context

code-relay already uses pnpm (`pnpm-lock.yaml`, `pnpm-workspace.yaml`) for its PWA scaffold. No prior ADR recorded the package manager choice. What was undecided: how dev-only CLI tools get installed.

## Decision

- App dependencies stay local via `pnpm install`. No change.
- CLI/dev tools without per-project version sensitivity install globally: `pnpm add -g <tool>`.
- pnpm remains the sole package manager; no npm/yarn.

## Rationale

- code-relay is still scaffold-stage; keeping tooling global now avoids re-establishing per-project installs as the workspace grows.
- pnpm's global store dedupes content, so global installs add negligible disk cost.
- Matches the convention now applied across all active pnpm projects ([[argus ADR-008]]).

## Consequences

- New dev tooling defaults to global install unless a tool needs a pinned per-project version.
- Applies to future tool additions; no lockfile changes required now.
