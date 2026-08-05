import { execSync } from 'node:child_process';
import type { RelayEvent } from '@code-relay/types';

export interface HerdrAgentEntry {
  agent: string;
  agent_status: string;
  cwd: string;
  pane_id: string;
  tab_id: string;
  workspace_id: string;
  terminal_title?: string;
  terminal_title_stripped?: string;
}

interface HerdrAgentListResult {
  result?: { agents?: unknown };
}

/**
 * Polls `herdr agent list` and returns its raw entries, or null if herdr
 * isn't reachable (not installed, server not running, malformed output).
 */
export function pollHerdrAgentList(exec: typeof execSync = execSync): HerdrAgentEntry[] | null {
  let raw: string;
  try {
    raw = exec('herdr agent list', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 8000,
    }) as string;
  } catch {
    return null;
  }

  let parsed: HerdrAgentListResult;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  const agents = parsed.result?.agents;
  if (!Array.isArray(agents)) return null;
  return agents as HerdrAgentEntry[];
}

/**
 * Translates one poll's herdr roster into the RelayEvent stream, diffed
 * against the previous poll's roster (keyed by pane_id).
 *
 * This is deliberately a lossy, best-effort translation of a coarse
 * pane-status poll into the PRD's richer RelayEvent contract — it is *not*
 * a substitute for real ACP-level integration (see argus#135's decisions:
 * "this replaces the PRD's original ACP-direct integration assumption for
 * the initial cut"). Only events this data source can honestly back are
 * emitted:
 *
 *  - SessionStarted: a pane_id appears that wasn't in the previous roster.
 *  - ApprovalRequested: a tracked pane's agent_status transitions to
 *    'blocked'. `detail` is empty -- herdr's list poll carries no pane
 *    content, only status; enriching this requires `herdr agent read`,
 *    left for a follow-up once this foundation is in place.
 *  - TaskCompleted: a tracked pane's agent_status transitions to 'done'.
 *
 * Deliberately NOT emitted:
 *  - ApprovalResolved: once a pane leaves 'blocked', polling alone can't
 *    tell approve from deny from an out-of-band resolution (e.g. the user
 *    answered directly in the terminal) -- asserting `approved: true/false`
 *    here would be fabricating data the source doesn't have.
 *  - Anything for a pane that silently disappears without having reached
 *    'done' first (closed pane, killed process): could be a normal close,
 *    not necessarily TaskCompleted or TaskFailed.
 *  - MessageReceived / ToolInvoked / ToolFinished / DiffGenerated /
 *    CommandStarted / CommandCompleted: none of these are derivable from a
 *    pane-status poll at all; they need real ACP integration.
 */
export function diffHerdrRoster(
  prev: Map<string, HerdrAgentEntry>,
  curr: HerdrAgentEntry[],
): { events: RelayEvent[]; roster: Map<string, HerdrAgentEntry> } {
  const events: RelayEvent[] = [];
  const roster = new Map<string, HerdrAgentEntry>();

  for (const entry of curr) {
    roster.set(entry.pane_id, entry);
    const previous = prev.get(entry.pane_id);

    if (!previous) {
      events.push({ type: 'SessionStarted', sessionId: entry.pane_id, provider: entry.agent });
      continue;
    }

    if (previous.agent_status === entry.agent_status) continue;

    if (entry.agent_status === 'blocked') {
      events.push({
        type: 'ApprovalRequested',
        id: entry.pane_id,
        summary: entry.terminal_title_stripped ?? entry.terminal_title ?? 'Approval needed',
        detail: '',
      });
    } else if (entry.agent_status === 'done') {
      events.push({ type: 'TaskCompleted', sessionId: entry.pane_id });
    }
  }

  return { events, roster };
}
