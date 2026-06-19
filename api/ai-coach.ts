
const ALLOWED_ORIGINS = new Set([
  'capacitor://localhost',
  'ionic://localhost',
  'http://localhost',
  'http://localhost:5173',
  'https://reign-career-companion.vercel.app',
  // custom domain when live
]);

function isDevOrigin(origin: string): boolean {
  return /^http:\/\/192\.168\.\d+\.\d+(:\d+)?$/.test(origin);
}

function applyCors(req: ApiRequest, res: ApiResponse): void {
  const origin = (req as { headers?: Record<string, string> }).headers?.origin ?? null;
  if (origin && (ALLOWED_ORIGINS.has(origin) || isDevOrigin(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Max-Age', '86400');
}

type CoachPersonality = 'professional' | 'witty' | 'straight-shooter' | 'detailed' | 'playful' | 'laid-back' | 'friendly';
type ResponseType = 'brief' | 'simple' | 'data-driven' | 'in-depth';
type ResponseStyle = 'plan-strategy' | 'conversational';

type AIMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type AIRequest = {
  coachName?: string;
  personalities?: CoachPersonality[];
  responseType?: ResponseType;
  responseStyle?: ResponseStyle;
  categoryName?: string;
  employeeContext?: unknown;
  messages?: AIMessage[];
};

type ApiRequest = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;   // add
};

type ApiResponse = {
  status: (code: number) => ApiResponse;
  json: (payload: unknown) => void;
  setHeader: (name: string, value: string) => void;   // add
  end: () => void;                                      // add — for the 204 preflight
};

type AnthropicTextChunk = {
  type: 'text';
  text: string;
};

type AnthropicPayload = {
  content?: Array<AnthropicTextChunk | { type?: string; text?: string }>;
  error?: { message?: string };
};

const PERSONALITY_INSTRUCTIONS: Record<CoachPersonality, string> = {
  'professional': 'maintain a polished, business-appropriate tone',
  'witty': 'weave in light, intelligent humor without sacrificing clarity',
  'straight-shooter': 'be direct and cut to the core — no padding, no softening',
  'detailed': 'cover nuance and context thoroughly; don\'t skip important background',
  'playful': 'keep the energy upbeat and encourage a growth mindset',
  'laid-back': 'stay relaxed and conversational — ditch the corporate jargon',
  'friendly': 'lead with genuine warmth, empathy, and encouragement',
};

const RESPONSE_TYPE_INSTRUCTIONS: Record<ResponseType, string> = {
  'brief': 'Keep responses tight: 2–4 bullets or short sentences only. No padding.',
  'simple': 'Use plain, everyday language; avoid jargon and keep structure minimal.',
  'data-driven': 'Ground advice in the employee\'s metrics and tie suggestions to measurable outcomes.',
  'in-depth': 'Provide comprehensive coverage — background, nuance, alternatives, and tradeoffs.',
};

const RESPONSE_STYLE_INSTRUCTIONS: Record<ResponseStyle, string> = {
  'plan-strategy': 'Frame responses as actionable plans: numbered steps, priorities, or a clear roadmap.',
  'conversational': 'Write as a natural, warm dialogue — avoid heavy lists and headers; speak like a trusted colleague.',
};

function sanitizeMessages(messages: AIMessage[] = []): AIMessage[] {
  return messages
    .filter(message => message?.content?.trim())
    .slice(-16)
    .map(message => ({
      role: message.role === 'assistant' ? 'assistant' : 'user',
      content: message.content.trim(),
    }));
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  applyCors(req, res);

  // Preflight: browser sends OPTIONS first because Content-Type makes the POST
  // non-simple. Answer it with the headers (already set above) and an empty 204,
  // or the real POST never leaves the WebView.
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }


  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const body = ((req.body as AIRequest | undefined) ?? {}) as AIRequest;
  const messages = sanitizeMessages(body.messages);
  if (!messages.length) {
    res.status(400).json({ error: 'At least one message is required' });
    return;
  }

  const apiKey =
    process.env.ANTHROPIC_API_KEY ||
    process.env.VITE_ANTHROPIC_API_KEY ||
    '';

  if (!apiKey) {
    res.status(503).json({ error: 'ANTHROPIC_API_KEY is not configured on the server.' });
    return;
  }

  const coachName = (body.coachName || 'AI Coach').trim().slice(0, 48);
  const categoryName = (body.categoryName || 'General Coaching').trim().slice(0, 80);
  const employeeContext = body.employeeContext ?? {};

  const personalities = (body.personalities ?? ['professional']).filter(
    (p): p is CoachPersonality => p in PERSONALITY_INSTRUCTIONS
  );
  const personalityLine = personalities.length
    ? `Personality blend: ${personalities.map(p => PERSONALITY_INSTRUCTIONS[p]).join('; ')}.`
    : 'Maintain a clear, professional tone.';

  const responseType: ResponseType =
    body.responseType && body.responseType in RESPONSE_TYPE_INSTRUCTIONS
      ? body.responseType
      : 'brief';

  const responseStyle: ResponseStyle =
    body.responseStyle && body.responseStyle in RESPONSE_STYLE_INSTRUCTIONS
      ? body.responseStyle
      : 'conversational';

  const systemPrompt = [
    `You are ${coachName}, an AI workplace and career coach.`,
    'Your user is an employee in a workforce app.',
    `Current chat category: ${categoryName}.`,
    personalityLine,
    RESPONSE_TYPE_INSTRUCTIONS[responseType],
    RESPONSE_STYLE_INSTRUCTIONS[responseStyle],
    'Use the employee metrics and profile context below as grounding for advice.',
    'Focus on actionable guidance for workplace relationships, conflict navigation, and career development.',
    'When useful, connect recommendations to measurable next steps and likely outcomes.',
    'Never fabricate policy/legal facts; if unsure, advise checking manager/HR policy docs.',
    '',
    'Discourse approach — closing question:',
    'End every response with a single, open-ended question that invites the employee to surface a concern they may not have voiced yet.',
    'The question should gently probe a dimension they haven\'t mentioned — an unstated fear, a relationship dynamic, a resource gap, or an assumption about their own potential.',
    'Frame it with warmth and curiosity, never pressure. The goal is to build trust, psychological safety, and the employee\'s confidence in their own voice.',
    'Examples of the right spirit: "Is there a part of this situation you haven\'t felt safe saying out loud yet?", "What would you attempt if you knew your manager was fully in your corner?", "Is there something about your own strengths here that you\'re underselling?"',
    'Match the question\'s tone to the personality blend — keep it consistent with how the advice was delivered.',
    '',
    `Employee context: ${JSON.stringify(employeeContext)}`,
  ].join('\n');

  try {
    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || 'claude-opus-4-8',
        max_tokens: 1500,
        system: systemPrompt,
        messages: messages.map(message => ({
          role: message.role,
          content: message.content,
        })),
      }),
    });

    const payload = (await anthropicResponse.json()) as AnthropicPayload;

    if (!anthropicResponse.ok) {
      res.status(anthropicResponse.status).json({
        error: payload?.error?.message || 'Anthropic request failed',
      });
      return;
    }

    const reply = Array.isArray(payload?.content)
      ? payload.content
          .filter((chunk): chunk is AnthropicTextChunk => chunk?.type === 'text' && typeof chunk?.text === 'string')
          .map(chunk => chunk.text)
          .join('\n')
          .trim()
      : '';

    if (!reply) {
      res.status(502).json({ error: 'No reply text returned by AI provider' });
      return;
    }

    res.status(200).json({ reply });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'AI coach request failed',
    });
  }
}
