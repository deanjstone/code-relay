import { describe, expect, it, vi } from 'vitest';
import {
  diffHerdrRoster,
  pollHerdrAgentList,
  type HerdrAgentEntry,
} from '../src/lib/herdr-session-source.js';

function entry(overrides: Partial<HerdrAgentEntry> = {}): HerdrAgentEntry {
  return {
    agent: 'claude',
    agent_status: 'working',
    cwd: '/home/deanj/projects/argus',
    pane_id: 'wC:p2',
    tab_id: 'wC:t2',
    workspace_id: 'wC',
    terminal_title: '⠐ Make the change',
    terminal_title_stripped: 'Make the change',
    ...overrides,
  };
}

describe('diffHerdrRoster', () => {
  it('emits SessionStarted for a pane not seen before, and tracks it in the returned roster', () => {
    const { events, roster } = diffHerdrRoster(new Map(), [entry()]);

    expect(events).toEqual([{ type: 'SessionStarted', sessionId: 'wC:p2', provider: 'claude' }]);
    expect(roster.get('wC:p2')).toEqual(entry());
  });

  it('emits no events for a pane whose agent_status is unchanged across polls', () => {
    const prev = new Map([['wC:p2', entry()]]);

    const { events } = diffHerdrRoster(prev, [entry()]);

    expect(events).toEqual([]);
  });

  it('emits ApprovalRequested when a tracked pane transitions to blocked', () => {
    const prev = new Map([['wC:p2', entry({ agent_status: 'working' })]]);

    const { events } = diffHerdrRoster(prev, [entry({ agent_status: 'blocked' })]);

    expect(events).toEqual([
      { type: 'ApprovalRequested', id: 'wC:p2', summary: 'Make the change', detail: '' },
    ]);
  });

  it('falls back to the raw terminal_title for the summary when the stripped title is absent', () => {
    const prev = new Map([['wC:p2', entry({ agent_status: 'working', terminal_title_stripped: undefined })]]);

    const { events } = diffHerdrRoster(prev, [
      entry({ agent_status: 'blocked', terminal_title_stripped: undefined, terminal_title: '⠐ raw' }),
    ]);

    expect(events).toEqual([{ type: 'ApprovalRequested', id: 'wC:p2', summary: '⠐ raw', detail: '' }]);
  });

  it('does not emit ApprovalResolved when a pane transitions away from blocked, since polling cannot tell approve from deny from external resolution', () => {
    const prev = new Map([['wC:p2', entry({ agent_status: 'blocked' })]]);

    const { events } = diffHerdrRoster(prev, [entry({ agent_status: 'working' })]);

    expect(events).toEqual([]);
  });

  it('emits TaskCompleted when a tracked pane transitions to done', () => {
    const prev = new Map([['wC:p2', entry({ agent_status: 'working' })]]);

    const { events } = diffHerdrRoster(prev, [entry({ agent_status: 'done' })]);

    expect(events).toEqual([{ type: 'TaskCompleted', sessionId: 'wC:p2' }]);
  });

  it('drops a pane that disappears from the roster without emitting an event, since a closed pane is not necessarily a completed or failed task', () => {
    const prev = new Map([['wC:p2', entry()]]);

    const { events, roster } = diffHerdrRoster(prev, []);

    expect(events).toEqual([]);
    expect(roster.has('wC:p2')).toBe(false);
  });

  it('does not double-emit TaskCompleted for a pane that was already done and disappears next poll', () => {
    const prev = new Map([['wC:p2', entry({ agent_status: 'done' })]]);

    const { events } = diffHerdrRoster(prev, []);

    expect(events).toEqual([]);
  });

  it('handles multiple panes independently in one poll', () => {
    const prev = new Map([['wC:p2', entry({ agent_status: 'working' })]]);

    const { events, roster } = diffHerdrRoster(prev, [
      entry({ agent_status: 'blocked' }),
      entry({ pane_id: 'wA:p2', cwd: '/home/deanj/projects/hearth-fork', agent_status: 'working' }),
    ]);

    expect(events).toEqual([
      { type: 'ApprovalRequested', id: 'wC:p2', summary: 'Make the change', detail: '' },
      { type: 'SessionStarted', sessionId: 'wA:p2', provider: 'claude' },
    ]);
    expect(roster.size).toBe(2);
  });
});

describe('pollHerdrAgentList', () => {
  function fixture(agents: HerdrAgentEntry[]) {
    return JSON.stringify({ id: 'cli:agent:list', result: { agents, type: 'agent_list' } });
  }

  it('returns the raw agent entries on a successful poll', () => {
    const exec = vi.fn().mockReturnValue(fixture([entry()]));

    const result = pollHerdrAgentList(exec as never);

    expect(exec).toHaveBeenCalledWith('herdr agent list', expect.objectContaining({ encoding: 'utf8' }));
    expect(result).toEqual([entry()]);
  });

  it('returns null when herdr is unreachable', () => {
    const exec = vi.fn(() => {
      throw new Error('command not found: herdr');
    });

    expect(pollHerdrAgentList(exec as never)).toBeNull();
  });

  it('returns null on invalid JSON', () => {
    const exec = vi.fn().mockReturnValue('not json');

    expect(pollHerdrAgentList(exec as never)).toBeNull();
  });

  it('returns null when result.agents is missing', () => {
    const exec = vi.fn().mockReturnValue(JSON.stringify({ id: 'cli:agent:list', result: {} }));

    expect(pollHerdrAgentList(exec as never)).toBeNull();
  });
});
