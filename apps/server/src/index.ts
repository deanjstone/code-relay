import Fastify from 'fastify'
import cors from '@fastify/cors'
import websocket from '@fastify/websocket'

const server = Fastify({ logger: true })

await server.register(cors)
await server.register(websocket)

server.get('/health', async () => ({ status: 'ok' }))

await server.listen({ port: 3800, host: '0.0.0.0' })
