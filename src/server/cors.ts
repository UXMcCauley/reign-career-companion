// src/server/cors.ts (or wherever your API utils live)

// why allow-list over '*': this endpoint will eventually carry employee context,
// and '*' is incompatible with credentials. Locking the origins now means adding
// auth later doesn't trip a confusing CORS-plus-credentials failure.
const ALLOWED_ORIGINS = new Set([
    'capacitor://localhost',
    'ionic://localhost',
    'http://localhost',
    'http://localhost:5173',
    'https://reign-career-companion.vercel.app',
  ]);

function isDevOrigin(origin: string): boolean {
  return /^http:\/\/192\.168\.\d+\.\d+(:\d+)?$/.test(origin);
}

export function corsHeaders(origin: string | null): Record<string, string> {
    const allowed = origin && (ALLOWED_ORIGINS.has(origin) || isDevOrigin(origin));
    return {
      ...(allowed ? { 'Access-Control-Allow-Origin': origin } : {}),
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Vary': 'Origin',
      'Access-Control-Max-Age': '86400',
    };
  }