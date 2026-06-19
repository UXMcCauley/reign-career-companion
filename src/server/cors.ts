// src/server/cors.ts (or wherever your API utils live)

// why allow-list over '*': this endpoint will eventually carry employee context,
// and '*' is incompatible with credentials. Locking the origins now means adding
// auth later doesn't trip a confusing CORS-plus-credentials failure.
const ALLOWED_ORIGINS = new Set([
    'capacitor://localhost',                        // iOS native WebView
    'ionic://localhost',                            // older iOS / some configs
    'http://localhost',                             // Android native WebView
    'http://localhost:5173',                        // Vite dev
    'https://reign-career-companion.vercel.app',    // deployed web
    // add your custom domain here when it goes live
  ]);
  
  export function corsHeaders(origin: string | null): Record<string, string> {
    const allowed = origin && ALLOWED_ORIGINS.has(origin);
    return {
      // Only echo the origin if it's on the list — never reflect arbitrary origins.
      ...(allowed ? { 'Access-Control-Allow-Origin': origin } : {}),
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Vary': 'Origin', // why: response varies by origin, so caches mustn't serve one origin's headers to another
      'Access-Control-Max-Age': '86400', // cache the preflight 24h so it's not re-sent every call
    };
  }