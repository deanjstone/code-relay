import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import { EventEmitter } from 'node:events';
import { createEventsHandler, registerEventsRoute, type EventsSocket } from '../src/routes/events.js';
import type { RelayEvent } from '@code-relay/types';

async function buildServer() {
  const server = Fastify();
  await server.register(websocket);
  const poller = new EventEmitter();
  registerEventsRoute(server, { poller });
  await server.ready();
  return { server, poller };
}

describe('GET /events (websocket)', () => {
  it('forwards each RelayEvent the poller emits to the connected client, as JSON', async () => {
    const { server, poller } = await buildServer();
    const ws = await server.injectWS('/events');

    const received: unknown[] = [];
    ws.on('message', (data: Buffer) => received.push(JSON.parse(data.toString())));

    const event: RelayEvent = { type: 'SessionStarted', sessionId: 'wC:p2', provider: 'claude' };
    poller.emit('event', event);

    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(received).toEqual([event]);

    ws.terminate();
    await server.close();
  });

  it('stops listening once the socket closes, so a closed client does not leak a listener', () => {
    // Exercises createEventsHandler() directly against a fake socket rather
    // than a real upgraded connection: @fastify/websocket's injectWS() test
    // harness pipes client/server over in-memory streams that never surface
    // a server-side 'close' event on their own (confirmed live -- it only
    // fires when the whole Fastify server is torn down), so it can't
    // exercise this path at all. The cleanup logic itself doesn't care
    // whether the close came over a real socket or a fake one.
    const poller = new EventEmitter();
    let closeListener: (() => void) | undefined;
    const fakeSocket: EventsSocket = {
      readyState: 1,
      OPEN: 1,
      send: () => {},
      on: (_event, listener) => {
        closeListener = listener;
      },
    };

    createEventsHandler(poller)(fakeSocket);
    expect(poller.listenerCount('event')).toBe(1);

    closeListener?.();
    expect(poller.listenerCount('event')).toBe(0);
  });
});
