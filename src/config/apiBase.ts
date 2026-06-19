import { Capacitor } from '@capacitor/core';

// why this matters: on a native build the WebView origin is capacitor://localhost,
// so a relative "/api/..." resolves to the app bundle, not your server. Browsers
// resolve relative URLs against the dev/prod origin, so only native needs a base.
const CONFIGURED_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');

export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (Capacitor.isNativePlatform()) {
    if (!CONFIGURED_BASE) {
      // Fail loud in dev builds rather than silently hitting capacitor://localhost
      throw new Error('VITE_API_BASE_URL is required for native builds');
    }
    return `${CONFIGURED_BASE}${normalizedPath}`;
  }
  // Web: relative is fine and keeps same-origin (no CORS preflight).
  return CONFIGURED_BASE ? `${CONFIGURED_BASE}${normalizedPath}` : normalizedPath;
}