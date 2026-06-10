type CoachStyle = 'concise' | 'witty' | 'mean' | 'flirty';

type AIMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type AIRequest = {
  coachName?: string;
  style?: CoachStyle;
  categoryName?: string;
  employeeContext?: unknown;
  messages?: AIMessage[];
};

type ApiRequest = {
  method?: string;
  body?: unknown;
};

type ApiResponse = {
  status: (code: number) => ApiResponse;
  json: (payload: unknown) => void;
};

type AnthropicTextChunk = {
  type: 'text';
  text: string;
};

type AnthropicPayload = {
  content?: Array<AnthropicTextChunk | { type?: string; text?: string }>;
  error?: { message?: string };
};

const STYLE_INSTRUCTIONS: Record<CoachStyle, string> = {
  concise: 'Keep responses clear, practical, and brief (3-6 short bullets or short paragraphs).',
  witty: 'Use light humor while staying professional and useful. Do not be silly at the expense of clarity.',
  mean: 'Use tough-love coaching: direct, blunt, high-accountability language without insults, abuse, or harassment.',
  flirty: 'Use warm, playful encouragement while remaining workplace-safe, non-explicit, and respectful.',
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

  const style = body.style && STYLE_INSTRUCTIONS[body.style] ? body.style : 'concise';
  const coachName = (body.coachName || 'AI Coach').trim().slice(0, 48);
  const categoryName = (body.categoryName || 'General Coaching').trim().slice(0, 80);
  const employeeContext = body.employeeContext ?? {};

  const systemPrompt = [
    `You are ${coachName}, an AI workplace and career coach.`,
    'Your user is an employee in a workforce app.',
    `Current chat category: ${categoryName}.`,
    STYLE_INSTRUCTIONS[style],
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
    'Match the tone to the chosen style — concise questions stay short, witty ones have lightness, tough-love ones are direct.',
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
        model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest',
        max_tokens: 900,
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
