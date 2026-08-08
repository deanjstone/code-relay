import { afterEach, describe, expect, it, vi } from 'vitest';
import { HerdrSessionPoller } from '../src/lib/herdr-session-poller.js';

function fixture(agents: unknown[]) {
  return JSON.stringify({ id: 'cli:agent:list', result: { agents, type: 'agent_list' } });
}

function entry(overrides: Record<string, unknown> = {}) {
  return {
    agent: 'claude',
    agent_status: 'working',
    cwd: '/home/deanj/repos/argus',
    pane_id: 'wC:p2',
    tab_id: 'wC:t2',
    workspace_id: 'wC',
    terminal_title_stripped: 'Make the change',
    ...overrides,
  };
}

describe('HerdrSessionPoller', () => {
  let poller: HerdrSessionPoller | undefined;

  afterEach(() => {
    poller?.stop();
    poller = undefined;
  });

  it('emits SessionStarted for each session found on the first poll', () => {
    const exec = vi.fn().mockReturnValue(fixture([entry()]));
    poller = new HerdrSessionPoller({ exec });

    const events: unknown[] = [];
    poller.on('event', (e) => events.push(e));
    poller.start();

    expect(events).toEqual([{ type: 'SessionStarted', sessionId: 'wC:p2', provider: 'claude' }]);
  });

  it('emits diffed events across successive polls, carrying roster state between them', () => {
    const exec = vi.fn();
    exec.mockReturnValueOnce(fixture([entry({ agent_status: 'working' })]));
    poller = new HerdrSessionPoller({ exec });

    const events: unknown[] = [];
    poller.on('event', (e) => events.push(e));
    poller.start();
    events.length = 0; // drop the initial SessionStarted, focus on the transition

    exec.mockReturnValueOnce(fixture([entry({ agent_status: 'blocked' })]));
    (poller as unknown as { _poll: () => void })._poll();

    expect(events).toEqual([
      { type: 'ApprovalRequested', id: 'wC:p2', summary: 'Make the change', detail: '' },
    ]);
  });

  it('does not throw and emits nothing when herdr is unreachable', () => {
    const exec = vi.fn(() => {
      throw new Error('command not found: herdr');
    });
    poller = new HerdrSessionPoller({ exec });

    const events: unknown[] = [];
    poller.on('event', (e) => events.push(e));

    expect(() => poller!.start()).not.toThrow();
    expect(events).toEqual([]);
  });

  it('stop() prevents further polling', () => {
    vi.useFakeTimers();
    const exec = vi.fn().mockReturnValue(fixture([]));
    poller = new HerdrSessionPoller({ exec, intervalMs: 1000 });

    poller.start();
    poller.stop();
    const callsAfterStop = exec.mock.calls.length;
    vi.advanceTimersByTime(10_000);

    expect(exec.mock.calls.length).toBe(callsAfterStop);
    vi.useRealTimers();
  });
});
