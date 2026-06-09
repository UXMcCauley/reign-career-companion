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

interface CoachApiRequest {
  coachName?: string
  style?: 'concise' | 'witty' | 'mean'
  categoryName?: string
  employeeContext?: unknown
  messages?: Array<{ role?: string; content?: string }>
}

function aiCoachGatewayPlugin(mode: string): Plugin {
  const env = loadEnv(mode, process.cwd(), '')
  const apiKey = env.ANTHROPIC_API_KEY || env.VITE_ANTHROPIC_API_KEY || ''
  const model = env.ANTHROPIC_MODEL || env.VITE_ANTHROPIC_MODEL || 'claude-sonnet-4-6'

  const styleGuidance: Record<'concise' | 'witty' | 'mean', string> = {
    concise: 'Keep responses practical and concise.',
    witty: 'Use light humor while staying professional and actionable.',
    mean: 'Use direct tough-love coaching without abusive language.',
  }

  return {
    name: 'local-ai-coach-gateway',
    configureServer(server) {
      server.middlewares.use('/api/ai-coach', async (req, res, next) => {
        if (req.method !== 'POST') return next()

        const chunks: Buffer[] = []
        req.on('data', chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)))
        req.on('end', async () => {
          try {
            const bodyText = Buffer.concat(chunks).toString('utf8') || '{}'
            const body = JSON.parse(bodyText) as CoachApiRequest

            if (!apiKey) {
              res.statusCode = 503
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'ANTHROPIC_API_KEY is not configured for local AI gateway.' }))
              return
            }

            const style = (body.style && styleGuidance[body.style]) ? body.style : 'concise'
            const coachName = (body.coachName || 'AI Coach').trim().slice(0, 48)
            const category = (body.categoryName || 'General Coaching').trim().slice(0, 80)
            const messages = (body.messages ?? [])
              .filter(message => typeof message.content === 'string' && message.content.trim())
              .slice(-16)
              .map(message => ({
                role: message.role === 'assistant' ? 'assistant' : 'user',
                content: (message.content || '').trim(),
              }))

            const systemPrompt = [
              `You are ${coachName}, an AI workplace and career coach.`,
              `Current category: ${category}.`,
              styleGuidance[style],
              'Use employee context and metrics when giving recommendations.',
              `Employee context: ${JSON.stringify(body.employeeContext ?? {})}`,
            ].join('\n')

            const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
              method: 'POST',
              headers: {
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json',
              },
              body: JSON.stringify({
                model,
                max_tokens: 700,
                system: systemPrompt,
                messages,
              }),
            })

            const parsed = await anthropicResponse.json() as {
              content?: Array<{ type?: string; text?: string }>
              error?: { message?: string }
            }

            if (!anthropicResponse.ok) {
              const upstreamError = parsed.error?.message || 'Anthropic request failed'
              const normalizedError = upstreamError.includes('model:')
                ? `Unsupported model "${model}". Set a valid model in ANTHROPIC_MODEL.`
                : upstreamError
              res.statusCode = anthropicResponse.status
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: normalizedError }))
              return
            }

            const reply = (parsed.content ?? [])
              .filter(chunk => chunk.type === 'text' && typeof chunk.text === 'string')
              .map(chunk => chunk.text || '')
              .join('\n')
              .trim()

            if (!reply) {
              res.statusCode = 502
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'No text response from Anthropic' }))
              return
            }

            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ reply }))
          } catch (error) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({
              error: 'AI coach local gateway failed',
              details: error instanceof Error ? error.message : 'Unknown error',
            }))
          }
        })
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
      aiCoachGatewayPlugin(mode),
    ],
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/setupTests.ts',
    },
  }
})
