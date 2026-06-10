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
  personalities?: string[]
  responseType?: string
  responseStyle?: string
  categoryName?: string
  employeeContext?: unknown
  messages?: Array<{ role?: string; content?: string }>
}

const PERSONALITY_INSTRUCTIONS_DEV: Record<string, string> = {
  'professional': 'maintain a polished, business-appropriate tone',
  'witty': 'weave in light, intelligent humor without sacrificing clarity',
  'straight-shooter': 'be direct and cut to the core — no padding, no softening',
  'detailed': 'cover nuance and context thoroughly; don\'t skip important background',
  'playful': 'keep the energy upbeat and encourage a growth mindset',
  'laid-back': 'stay relaxed and conversational — ditch the corporate jargon',
  'friendly': 'lead with genuine warmth, empathy, and encouragement',
}

const RESPONSE_TYPE_INSTRUCTIONS_DEV: Record<string, string> = {
  'brief': 'Keep responses tight: 2–4 bullets or short sentences only. No padding.',
  'simple': 'Use plain, everyday language; avoid jargon and keep structure minimal.',
  'data-driven': 'Ground advice in the employee\'s metrics and tie suggestions to measurable outcomes.',
  'in-depth': 'Provide comprehensive coverage — background, nuance, alternatives, and tradeoffs.',
}

const RESPONSE_STYLE_INSTRUCTIONS_DEV: Record<string, string> = {
  'plan-strategy': 'Frame responses as actionable plans: numbered steps, priorities, or a clear roadmap.',
  'conversational': 'Write as a natural, warm dialogue — speak like a trusted colleague.',
}

function aiCoachGatewayPlugin(mode: string): Plugin {
  const env = loadEnv(mode, process.cwd(), '')
  const apiKey = env.ANTHROPIC_API_KEY || env.VITE_ANTHROPIC_API_KEY || ''
  const model = env.ANTHROPIC_MODEL || env.VITE_ANTHROPIC_MODEL || 'claude-sonnet-4-6'

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

            const coachName = (body.coachName || 'AI Coach').trim().slice(0, 48)
            const category = (body.categoryName || 'General Coaching').trim().slice(0, 80)
            const messages = (body.messages ?? [])
              .filter(message => typeof message.content === 'string' && message.content.trim())
              .slice(-16)
              .map(message => ({
                role: message.role === 'assistant' ? 'assistant' : 'user',
                content: (message.content || '').trim(),
              }))

            const personalities = (body.personalities ?? ['professional']).filter(
              p => p in PERSONALITY_INSTRUCTIONS_DEV
            )
            const personalityLine = personalities.length
              ? `Personality blend: ${personalities.map(p => PERSONALITY_INSTRUCTIONS_DEV[p]).join('; ')}.`
              : 'Maintain a clear, professional tone.'

            const responseType = body.responseType && body.responseType in RESPONSE_TYPE_INSTRUCTIONS_DEV
              ? body.responseType
              : 'brief'

            const responseStyle = body.responseStyle && body.responseStyle in RESPONSE_STYLE_INSTRUCTIONS_DEV
              ? body.responseStyle
              : 'conversational'

            const systemPrompt = [
              `You are ${coachName}, an AI workplace and career coach.`,
              'Your user is an employee in a workforce app.',
              `Current chat category: ${category}.`,
              personalityLine,
              RESPONSE_TYPE_INSTRUCTIONS_DEV[responseType],
              RESPONSE_STYLE_INSTRUCTIONS_DEV[responseStyle],
              'Use employee context and metrics when giving recommendations.',
              'Output plain text only. Do not use markdown syntax (no headings with #, no **bold**, no bullet markers like - or *).',
              'For readability, use short lines, emojis, and standard punctuation/labels (for example: "Goal:", "Next step:", "Tip:").',
              '',
              'Discourse approach — closing question:',
              'End every response with a single, open-ended question that invites the employee to surface a concern they may not have voiced yet.',
              'Frame it with warmth and curiosity, never pressure.',
              '',
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
                max_tokens: 900,
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
