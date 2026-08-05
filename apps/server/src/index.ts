import Fastify from 'fastify'
import cors from '@fastify/cors'
import websocket from '@fastify/websocket'
import fastifyStatic from '@fastify/static'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { registerSessionsRoutes } from './routes/sessions.js'
import { registerProjectsRoutes } from './routes/projects.js'
import { registerEngineRoutes } from './routes/engine.js'
import { registerEventsRoute } from './routes/events.js'
import { registerIdentityGate } from './lib/identity-gate.js'
import { HerdrSessionPoller } from './lib/herdr-session-poller.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const PORT = Number(process.env['PORT'] ?? 3800)
const WEB_DIST_DIR = process.env['WEB_DIST_DIR'] ?? join(__dirname, '../../web/dist')

const server = Fastify({ logger: true })

await server.register(cors)
await server.register(websocket)
await server.register(fastifyStatic, { root: WEB_DIST_DIR })

// Every route below is gated by the Tailscale-User-Login identity check
// (argus#135's #132 hardening amendment) before it does anything else.
registerIdentityGate(server, { trustedUser: process.env['CODE_RELAY_TRUSTED_USER'] })

server.get('/health', async () => ({ status: 'ok' }))

const lgn5ListenerUrl = process.env['LGN5_LISTENER_URL']
if (!lgn5ListenerUrl) {
  throw new Error('LGN5_LISTENER_URL env var is required')
}
registerSessionsRoutes(server, { lgn5ListenerUrl })
registerProjectsRoutes(server, { lgn5ListenerUrl })

const agentEngineUrl = process.env['AGENT_ENGINE_URL'] ?? 'http://localhost:3747'
registerEngineRoutes(server, { agentEngineUrl })

// herdr is the shared session substrate across the ecosystem (argus#135) --
// this poller is the RelayEvent data source /events streams to clients.
// See herdr-session-source.ts for exactly which RelayEvent variants this
// coarse poll can honestly back, and which it deliberately can't.
const herdrPoller = new HerdrSessionPoller()
registerEventsRoute(server, { poller: herdrPoller })
herdrPoller.start()

await server.listen({ port: PORT, host: '0.0.0.0' })
