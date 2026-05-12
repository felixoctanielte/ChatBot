import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import chatHandler from './api/chat.js'

const readJsonBody = (request) =>
  new Promise((resolve, reject) => {
    let body = ''

    request.on('data', (chunk) => {
      body += chunk
    })

    request.on('end', () => {
      if (!body) {
        resolve({})
        return
      }

      try {
        resolve(JSON.parse(body))
      } catch (error) {
        reject(error)
      }
    })

    request.on('error', reject)
  })

const localChatApiPlugin = () => ({
  name: 'local-chat-api',
  configureServer(server) {
    server.middlewares.use(async (request, response, next) => {
      const requestUrl = new URL(request.url || '/', 'http://localhost')

      if (requestUrl.pathname !== '/api/chat') {
        next()
        return
      }

      try {
        request.body = await readJsonBody(request)
      } catch {
        response.statusCode = 400
        response.setHeader('Content-Type', 'application/json')
        response.end(JSON.stringify({ error: 'Invalid JSON request body.' }))
        return
      }

      response.status = (statusCode) => {
        response.statusCode = statusCode
        return response
      }

      response.json = (payload) => {
        response.setHeader('Content-Type', 'application/json')
        response.end(JSON.stringify(payload))
      }

      await chatHandler(request, response)
    })
  },
})

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  process.env.OPENROUTER_API_KEY ||= env.OPENROUTER_API_KEY
  process.env.OPENROUTER_API_KEY ||= env.OPENROUTER_API_KEY
  process.env.OPENROUTER_MODEL ||= env.OPENROUTER_MODEL

  return {
    plugins: [react(), localChatApiPlugin()],
  }
})
