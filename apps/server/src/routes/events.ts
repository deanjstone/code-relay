import type { FastifyInstance } from 'fastify';
import type { RelayEvent } from '@code-relay/types';

export interface EventsRouteOptions {
  poller: {
    on(event: 'event', listener: (payload: RelayEvent) => void): unknown;
    off(event: 'event', listener: (payload: RelayEvent) => void): unknown;
  };
}

/** The subset of `ws`'s WebSocket shape this handler needs -- narrowed so
 * the cleanup-on-close behavior below can be unit tested against a plain
 * fake object instead of a real network round trip. */
export interface EventsSocket {
  readyState: number;
  OPEN: number;
  send(data: string): void;
  on(event: 'close', listener: () => void): unknown;
}

/**
 * Per-connection handler: forwards each RelayEvent the poller emits to this
 * socket, and stops listening once the socket closes -- multiple concurrent
 * clients (PWA + a future Telegram bot, multiple browser tabs) can watch
 * the same session substrate without leaking a listener per connection.
 */
export function createEventsHandler(poller: EventsRouteOptions['poller']) {
  return (socket: EventsSocket): void => {
    const onEvent = (event: RelayEvent) => {
      if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(event));
    };
    poller.on('event', onEvent);
    socket.on('close', () => poller.off('event', onEvent));
  };
}

/** Streams the RelayEvent feed (see herdr-session-poller.ts) to `/events`. */
export function registerEventsRoute(server: FastifyInstance, options: EventsRouteOptions): void {
  server.get('/events', { websocket: true }, createEventsHandler(options.poller));
}
