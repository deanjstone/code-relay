import Fastify from 'fastify'
import cors from '@fastify/cors'
import websocket from '@fastify/websocket'
import fastifyStatic from '@fastify/static'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { registerSessionsRoutes } from './routes/sessions.js'
import { registerProjectsRoutes } from './routes/projects.js'
import { registerEngineRoutes } from './routes/engine.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const PORT = Number(process.env['PORT'] ?? 3800)
const WEB_DIST_DIR = process.env['WEB_DIST_DIR'] ?? join(__dirname, '../../web/dist')

const server = Fastify({ logger: true })

await server.register(cors)
await server.register(websocket)
await server.register(fastifyStatic, { root: WEB_DIST_DIR })

server.get('/health', async () => ({ status: 'ok' }))

const lgn5ListenerUrl = process.env['LGN5_LISTENER_URL']
if (!lgn5ListenerUrl) {
  throw new Error('LGN5_LISTENER_URL env var is required')
}
registerSessionsRoutes(server, { lgn5ListenerUrl })
registerProjectsRoutes(server, { lgn5ListenerUrl })

const agentEngineUrl = process.env['AGENT_ENGINE_URL'] ?? 'http://localhost:3747'
registerEngineRoutes(server, { agentEngineUrl })

await server.listen({ port: PORT, host: '0.0.0.0' })
