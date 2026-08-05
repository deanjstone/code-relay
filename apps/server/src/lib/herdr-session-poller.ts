import { execSync } from 'node:child_process';
import { EventEmitter } from 'node:events';
import type { RelayEvent } from '@code-relay/types';
import { diffHerdrRoster, pollHerdrAgentList, type HerdrAgentEntry } from './herdr-session-source.js';

export interface HerdrSessionPollerOptions {
  intervalMs?: number;
  exec?: typeof execSync;
}

export interface HerdrSessionPollerEvents {
  event: (payload: RelayEvent) => void;
}

export declare interface HerdrSessionPoller {
  on<K extends keyof HerdrSessionPollerEvents>(event: K, listener: HerdrSessionPollerEvents[K]): this;
  emit<K extends keyof HerdrSessionPollerEvents>(event: K, ...args: Parameters<HerdrSessionPollerEvents[K]>): boolean;
}

/**
 * Owns the poll/diff/emit loop around herdr-session-source.ts's pure
 * functions -- mirrors ccbot's AgentViewMonitor (argus#135's ccbot part)
 * for a consistent shape across the ecosystem's herdr pollers. Each RelayEvent
 * the diff produces is emitted as it happens; roster state carries between
 * polls so `diffHerdrRoster` always compares against the last successful
 * poll, not the last attempted one.
 */
export class HerdrSessionPoller extends EventEmitter {
  private roster = new Map<string, HerdrAgentEntry>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly intervalMs: number;
  private readonly exec: typeof execSync;

  constructor(options: HerdrSessionPollerOptions = {}) {
    super();
    this.intervalMs = options.intervalMs ?? 15_000;
    this.exec = options.exec ?? execSync;
  }

  start(): void {
    if (this.timer) return;
    this._poll();
    this._scheduleNext();
  }

  stop(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private _scheduleNext(): void {
    this.timer = setTimeout(() => {
      this._poll();
      if (this.timer !== null) this._scheduleNext();
    }, this.intervalMs);
  }

  private _poll(): void {
    const curr = pollHerdrAgentList(this.exec);
    if (curr === null) return;

    const { events, roster } = diffHerdrRoster(this.roster, curr);
    this.roster = roster;
    for (const event of events) this.emit('event', event);
  }
}
