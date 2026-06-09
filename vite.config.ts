/// <reference types="vitest" />

import legacy from '@vitejs/plugin-legacy'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import { readBlobDocument, resolveBlobConfig, writeBlobDocument } from './api/blobCore'

function blobGatewayPlugin(mode: string): Plugin {
  const env = loadEnv(mode, process.cwd(), '')
  const config = resolveBlobConfig(env)

  return {
    name: 'local-blob-gateway',
    configureServer(server) {
      server.middlewares.use('/api/blob', async (req, res, next) => {
        if (!req.url) return next()

        const url = new URL(req.url, 'http://localhost')
        const name = url.searchParams.get('name') || ''
        if (!name) {
          res.statusCode = 400
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Missing required query param: name' }))
          return
        }

        try {
          if (req.method === 'GET') {
            const data = await readBlobDocument(name, config)
            if (!data) {
              res.statusCode = 404
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Blob document not found' }))
              return
            }
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(data))
            return
          }

          if (req.method === 'PUT') {
            const chunks: Buffer[] = []
            req.on('data', chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)))
            req.on('end', async () => {
              try {
                const text = Buffer.concat(chunks).toString('utf8') || '{}'
                const payload = JSON.parse(text)
                const ok = await writeBlobDocument(name, payload, config)
                if (!ok) {
                  res.statusCode = 503
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ error: 'Blob token not configured' }))
                  return
                }
                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ ok: true }))
              } catch (error) {
                res.statusCode = 500
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({
                  error: 'Blob write failed',
                  details: error instanceof Error ? error.message : 'Unknown error',
                }))
              }
            })
            return
          }

          res.statusCode = 405
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Method not allowed' }))
        } catch (error) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({
            error: 'Blob gateway request failed',
            details: error instanceof Error ? error.message : 'Unknown error',
          }))
        }
      })
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  return {
    plugins: [
      react(),
      legacy(),
      blobGatewayPlugin(mode),
    ],
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/setupTests.ts',
    },
  }
})
