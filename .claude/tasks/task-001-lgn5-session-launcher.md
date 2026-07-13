# Task-001: LGN5 Session Launcher

## 1. Specification (Human Authored)

- **Objective:** A mobile PWA (modelled on the `quick-capture` homelab PWA) that launches a new `agent`/Claude Code session on LGN5, from anywhere, over Tailscale.
- **Requirements:**
  1. Form with two optional fields: session name (default `"AGENT"` if blank) and a first prompt (blank = open session with no initial prompt).
  2. Submitting launches a new Windows Terminal tab on LGN5 running `claude` in `~/.argus/workspace`, titled with the session name, optionally pre-seeded with the first prompt.
  3. PWA is hosted on homelab (CF Pages + homelab Fastify backend, per code-relay's existing architecture), not on LGN5 itself — LGN5 may be asleep, locked, or unreachable.
  4. If LGN5 is unreachable, the user gets clear feedback in the PWA (not a silent failure or generic 500).
- **Architectural Boundary:** Stay inside code-relay's existing monorepo conventions (SYSTEM.md) for `apps/web` / `apps/server`. The LGN5-side launcher does NOT belong in code-relay (code-relay's backend only runs on homelab) — it belongs in `argus/packages/agent-cli`, since it directly reuses `openInWT()` in `lib/wt.ts`. This task therefore touches two repos.

## 2. AI Implementation Plan (AI Authored)

### Why this shape

- `agent` (no flags) already does exactly this launch, but only as a **local** spawn (`wt.ts` calls `wt.exe` directly) — there's no HTTP surface today.
- Rather than reimplementing WT-spawn logic inside code-relay, add a small HTTP listener to `agent-cli` itself (`agent listen`) that wraps the existing `openInWT()` helper. This keeps "how to launch a session" living in one place (agent-cli), and gives code-relay's backend one thing to proxy to.
- code-relay's Fastify server becomes a thin relay: health-check the LGN5 listener over Tailscale, forward the launch request, surface reachability failures distinctly from other errors.

### Architecture

```
PWA (apps/web, CF Pages)
   │ POST /sessions/launch { name?, prompt? }
   ▼
code-relay Fastify server (apps/server, homelab, Tailscale-only)
   │ GET  http://<lgn5-tailscale-host>:3748/health   (2s timeout)
   │ POST http://<lgn5-tailscale-host>:3748/launch  { name, prompt }
   ▼
agent-cli `agent listen` HTTP server (LGN5, WSL2, systemd, Tailscale-only)
   │ openInWT(ARGUS_DIR, name, tabColor, prompt ? [prompt] : [])
   ▼
wt.exe new-tab → wsl.exe -e bash -ic "cd ~/.argus/workspace && claude [prompt]"
```

### Scope of changes

**Repo: `~/projects/argus/packages/agent-cli/` (new HTTP surface for launching)**

Files to create:
- `src/commands/listen.ts` — `agent listen [--port 3748]` subcommand. Starts a minimal HTTP server (reuse the `fastify`-free style already in this package, or add `fastify` as a dep — TBD at implementation time based on what's already a dependency). Binds to `0.0.0.0` (WSL2 loopback to Tailscale is already scoped by the Windows firewall / Tailscale ACLs, consistent with how `agent-engine` currently binds) unless a Tailscale IP is trivially resolvable, in which case prefer binding to that. Routes:
  - `GET /health` → `{ ok: true }`
  - `POST /launch` body `{ name?: string, prompt?: string }` → validates, calls `openInWT(ARGUS_DIR, name?.trim() || 'AGENT', tabColor, prompt ? [prompt] : [])`, returns `{ ok: true, name }`
- `test/listen.test.ts` — TDD per `test-driven-development` skill: route validation (missing body, blank name falls back to `AGENT`), `openInWT` called with correct args (mock `child_process.spawn`), `/health` contract.

Files to modify:
- `src/index.ts` — register `listen` subcommand
- `deploy.sh` — no change expected (same dist/ artifact)

Files NOT touched:
- `lib/wt.ts`, `lib/projects.ts` — reused as-is, not modified

**New: systemd user service on LGN5 (WSL2)**
- `~/projects/argus-config/wsl2/services/agent-listen.service` (or similar path — matches the pattern used for `agent-engine` on homelab) — `systemctl --user enable --now agent-listen`, autostarts via the existing "WSL2 Boot" scheduled task + systemd-as-PID1 setup.

**Repo: `~/projects/code-relay/` (relay backend + PWA)**

Files to create:
- `apps/server/src/routes/sessions.ts` — `POST /sessions/launch`: health-checks the LGN5 listener first (short timeout, e.g. 2s); on failure returns `503 { ok: false, reason: 'lgn5_unreachable' }`; on success proxies to `POST /launch` and relays the result.
- `apps/server/test/sessions.test.ts` — TDD: mocks `fetch` to LGN5 listener for (a) healthy+launch-success, (b) health-check timeout/refused → `lgn5_unreachable`, (c) launch itself fails after healthy.
- `apps/web/src/components/LaunchForm.tsx` — name input (placeholder `AGENT`), prompt textarea (optional), submit button, inline status/error banner. Styled with the `quick-capture` slate-800/sky-400 palette + lettermark icon convention (per existing design preference).
- `apps/web/src/lib/api.ts` — typed client for `POST /sessions/launch`.

Files to modify:
- `apps/server/src/index.ts` — register the new route, read LGN5 Tailscale host/port from env (`.env.example` gets a new `LGN5_LISTENER_URL` entry)
- `apps/web/src/App.tsx` — render `LaunchForm` as the app's main (only) view for this task
- `.env.example` — add `LGN5_LISTENER_URL`

Files NOT touched:
- `packages/types` `RelayEvent` union — out of scope; this task doesn't stream session events, it only launches
- ACP integration, brrr.now, WebSocket plumbing — untouched, unrelated to this task

### Step-by-step execution plan

**Step 1 — agent-cli: `agent listen` (TDD)**
Write failing tests for `/health` and `/launch` (mocking `openInWT`/`spawn`), then implement the route handler and subcommand registration until green. `pnpm run typecheck` + `pnpm run build`.

**Step 2 — LGN5 systemd service**
Write the unit file, install/enable it on LGN5, verify `curl` to `/health` from homelab over Tailscale actually succeeds (not just localhost).

**Step 3 — code-relay server: `/sessions/launch` (TDD)**
Write failing tests for the three cases above, implement the route, confirm `pnpm --filter @code-relay/server typecheck` and tests pass.

**Step 4 — code-relay web: `LaunchForm`**
Build the form + API client. Manual verification: submit with LGN5 up (tab opens on LGN5), submit with LGN5 down/service stopped (PWA shows unreachable banner, not a generic error).

**Step 5 — Deploy**
`agent-cli` deploy (`deploy.sh`) to refresh `~/.argus/agent-cli/`; restart the LGN5 systemd service; code-relay server restart on homelab; code-relay web redeploy via CF Pages (push to `main`).

### Risks / tradeoffs

- **New cross-repo dependency**: code-relay's server now has a runtime dependency on an argus-side HTTP surface reachable over Tailscale. If `agent listen` isn't running, launches fail — the health-check step exists specifically to surface that clearly rather than timing out silently.
- **Binding scope**: `agent listen` running on LGN5's WSL2 needs to be reachable from homelab over Tailscale, not just from `localhost` inside WSL2 — this needs verification during Step 2, since WSL2's default networking (mirrored vs NAT) affects what's reachable from outside. [[reference_wsl2_mirrored_port_conflict]] and [[feedback_wsl2_tailscale_not_mirrored]] in memory both note this class of gotcha (Tailscale often isn't mirrored into WSL2 — may need the listener to bind on the Windows side, or a port-proxy). This is flagged as a verification step, not assumed to just work.
- **Auth**: this task adds an unauthenticated `POST /launch` endpoint that opens an interactive shell on LGN5. Scoped to Tailscale-only binding (per code-relay's existing invariant — no public inbound ports), consistent with the rest of code-relay's current security model, but worth naming explicitly: anyone on the tailnet can launch sessions. No additional auth layer is in scope for this task; PRD's open question #10 ("Authentication strategy") already tracks this for the project generally.

## 3. Human Approval Sign-off

- **Status:** Approved (2026-07-13)
- **Director Review Notes:** Approved as written.

## 4. Verification Checklist (AI Completed)

- [ ] `agent listen --port 3748` starts, `/health` responds
- [ ] `/launch` with no body → session named `AGENT` opens in `~/.argus/workspace`
- [ ] `/launch` with `{ name, prompt }` → tab titled `name`, `claude` receives `prompt`
- [ ] LGN5 listener reachable from homelab over Tailscale (not just localhost)
- [ ] code-relay `/sessions/launch` returns `lgn5_unreachable` distinctly when the listener is down
- [ ] PWA shows a clear "LGN5 unreachable" state, not a generic error
- [ ] All new code TypeScript, no `any`, no silent catches (per SYSTEM.md)
- [ ] `pnpm typecheck` clean in both repos
- [ ] New tests pass in both repos (agent-cli `listen.test.ts`, code-relay `sessions.test.ts`)
