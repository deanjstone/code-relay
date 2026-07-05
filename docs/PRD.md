---
title: Code Relay — Product Requirements Document
status: draft
created: 2026-07-05
sources:
  - Gemini 3 Flash session (2026-06-30)
  - ChatGPT session (2026-07-05)
---

# Code Relay — PRD

## 1. Vision

Code Relay is a secure, self-hosted remote development companion that provides a mobile-first interface for interacting with AI coding agents running on trusted infrastructure. It emphasises privacy, responsiveness, and seamless remote workflows while remaining provider-agnostic through a unified backend abstraction layer.

Initially targets Claude Code via ACP. Designed from the start to support additional providers (Codex, Gemini CLI, OpenCode) without UI changes.

> "GitHub Mobile for AI coding agents."

---

## 2. Goals

- Replicate the Claude iOS app's remote console experience as an installable PWA
- Connect to a private homelab over Tailscale — no public endpoints
- Provider-agnostic: normalised event stream decouples UI from any specific agent
- Zero cloud dependencies except Claude itself and optional brrr.now notifications
- Open-source from day one; engineered to a standard where contributors can onboard without guidance

---

## 3. Technical Stack

| Layer | Technology |
|---|---|
| Frontend | Vite 6, React 19, TypeScript, Tailwind CSS v4 |
| Backend | Node.js LTS, Fastify, TypeScript, native WebSockets |
| Agent protocol | Claude Code ACP (initial), provider abstraction layer |
| Networking | Tailscale MagicDNS + Tailscale HTTPS (Let's Encrypt) |
| Frontend hosting | Cloudflare Pages |
| Backend hosting | Ubuntu homelab, systemd (no Docker) |
| Push notifications | brrr.now (APNs webhook; no Web Push/VAPID) |

---

## 4. Architecture

```
Cloudflare Pages
  (React PWA — static)
        │
        │  HTTPS + WebSocket (Tailscale tunnel)
        ▼
Ubuntu Homelab
  Caddy/Nginx (TLS termination)
        │
        ▼
  Fastify API Server
        │
        ├── Provider Layer
        │     ├── Claude Code (ACP) ← initial
        │     ├── Codex              ← future
        │     └── Gemini CLI         ← future
        │
        └── Notification Service
              │
              ▼
          api.brrr.now → APNs → iOS
```

**Key principle:** The React PWA never talks to ACP directly. All agent communication goes through the Fastify backend, which translates provider-specific events into a normalised event stream.

---

## 5. Normalised Event Stream

Every provider emits events in this common format. The frontend only ever consumes these events — provider adapters handle translation.

```typescript
type RelayEvent =
  | { type: 'SessionStarted';       sessionId: string; provider: string }
  | { type: 'MessageReceived';      role: 'user' | 'assistant'; content: string }
  | { type: 'ToolInvoked';          id: string; name: string; input: unknown }
  | { type: 'ToolFinished';         id: string; output: unknown }
  | { type: 'ApprovalRequested';    id: string; summary: string; detail: string }
  | { type: 'ApprovalResolved';     id: string; approved: boolean }
  | { type: 'DiffGenerated';        path: string; diff: string }
  | { type: 'CommandStarted';       id: string; command: string }
  | { type: 'CommandCompleted';     id: string; exitCode: number }
  | { type: 'TaskCompleted';        sessionId: string }
  | { type: 'TaskFailed';           sessionId: string; error: string }
  | { type: 'ProviderStatusChanged'; provider: string; status: 'online' | 'offline' }
```

---

## 6. Functional Requirements

### 6.1 Secure PWA Infrastructure

- Backend binds exclusively to Tailscale IP (100.x.y.z) — all non-Tailnet connections dropped
- TLS from `tailscale cert` — hard requirement for iOS Safari service worker registration
- PWA manifest with `"display": "standalone"` for home screen installation
- No public inbound ports on homelab at any time

### 6.2 Session Persistence

- Claude Code instances run in detached processes — not coupled to WebSocket lifecycle
- Backend maintains master state; PWA reconnects and receives state delta without interrupting running agent
- Exponential backoff reconnect on WebSocket drop (cellular handoff, screen lock)
- Reconnect and full sync in under 2 seconds on resume

### 6.3 User Interface

- Single-column mobile layout; chat-centric with streaming log view
- `font-mono` log block with auto-scroll-to-bottom
- **Approval drawer**: bottom sheet slides up on `ApprovalRequested` — shows tool detail, Approve / Deny buttons only
- All user input fields: `autocapitalize="none" autocorrect="off" spellcheck="false"`
- Toggle between Chat view (Claude iOS style) and Raw Terminal Log view
- Multiple concurrent session support (session list / switcher)

### 6.4 Push Notifications (brrr.now)

- No Web Push, no VAPID, no service worker push events
- Backend fires HTTP POST to `api.brrr.now` when agent enters `ApprovalRequested` state
- Payload requirements:
  - `title`: context-aware (e.g. "Tool approval required — bash")
  - `interruption_level`: `time-sensitive`
  - `sound`: `brrr` or `warning`
  - `open_url`: full Tailscale MagicDNS PWA URL with `?session_id=<id>` — opens PWA directly to blocked session
- Throttle: maximum 1 notification per 30 seconds; never fire for rapid state churn unless transitioning from idle → blocked
- Deep link: tapping banner maximises PWA standalone window and navigates to active session

### 6.5 Provider Abstraction

- Backend provider layer translates native agent events into `RelayEvent` stream
- Initial provider: Claude Code via ACP
- Adding a new provider requires only a new adapter — no frontend changes
- Provider status visible in UI header

---

## 7. Non-Functional Requirements

- **Reconnection**: exponential backoff; full sync on resume < 2s
- **Idle draw**: client stops polling when backgrounded; relies on brrr.now to re-engage
- **Secret isolation**: brrr.now token, session keys stored in `localStorage`/`IndexedDB` only — never in source code
- **No Docker**: systemd native services on Ubuntu homelab
- **Container-friendly code**: structure supports Docker/Podman in future without refactoring

---

## 8. Repository Structure

```
code-relay/
├── apps/
│   ├── web/            # React PWA → Cloudflare Pages
│   └── server/         # Fastify backend → homelab systemd
├── packages/
│   ├── shared/         # Shared utilities
│   ├── api/            # API types and client
│   ├── ui/             # Shared React components
│   └── types/          # TypeScript domain model (RelayEvent etc.)
├── docs/
│   ├── PRD.md          # This document
│   ├── TODO.md
│   └── decisions/      # ADRs
├── scripts/
├── systemd/            # systemd service units for homelab
└── .github/
    └── workflows/      # CI (CF Pages deploy for web)
```

---

## 9. Roadmap

| Version | Focus |
|---|---|
| v0.1 | Monorepo scaffold, Fastify server, React PWA, Tailscale connectivity, ACP integration, session list, streaming console |
| v0.2 | Mobile MVP — Claude iOS-style UI, brrr.now notifications, approvals, project switching |
| v0.3 | Remote dev — git status, file manager, markdown rendering, session search |
| v0.5 | Multi-agent — provider abstraction, Codex + Gemini CLI adapters |
| v0.8 | Production — auth, observability, offline support, performance |
| v1.0 | Public release — docs, tests, GitHub templates, AGENTS.md contributor guide |

---

## 10. Open Questions

- Authentication strategy (Tailscale machine auth vs. passkey vs. simple token)
- Whether to support multi-homelab (multiple backend targets)
- CF Worker as optional API gateway layer (auth, rate limiting)
