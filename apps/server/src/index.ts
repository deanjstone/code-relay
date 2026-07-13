import Fastify from 'fastify'
import cors from '@fastify/cors'
import websocket from '@fastify/websocket'
import { registerSessionsRoutes } from './routes/sessions.js'

const server = Fastify({ logger: true })

await server.register(cors)
await server.register(websocket)

server.get('/health', async () => ({ status: 'ok' }))

const lgn5ListenerUrl = process.env['LGN5_LISTENER_URL']
if (!lgn5ListenerUrl) {
  throw new Error('LGN5_LISTENER_URL env var is required')
}
registerSessionsRoutes(server, { lgn5ListenerUrl })

await server.listen({ port: 3800, host: '0.0.0.0' })
