import { readBlobDocument, resolveBlobConfig, writeBlobDocument } from './blobCore';

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

function applyCors(req: any, res: any): void {
  const origin = req.headers?.origin ?? null;
  if (origin && (ALLOWED_ORIGINS.has(origin) || isDevOrigin(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Max-Age', '86400');
}

function getName(query: unknown): string {
  const raw = (query as { name?: string | string[] })?.name;
  if (Array.isArray(raw)) return raw[0] || '';
  return raw || '';
}

export default async function handler(req: any, res: any) {
  applyCors(req, res);

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const config = resolveBlobConfig(process.env as Record<string, string | undefined>);
  const name = getName(req.query);

  if (!name) {
    res.status(400).json({ error: 'Missing required query param: name' });
    return;
  }

  try {
    if (req.method === 'GET') {
      const data = await readBlobDocument(name, config);
      if (!data) {
        res.status(404).json({ error: 'Blob document not found' });
        return;
      }
      res.status(200).json(data);
      return;
    }

    if (req.method === 'PUT') {
      const ok = await writeBlobDocument(name, req.body, config);
      if (!ok) {
        res.status(503).json({ error: 'Blob token not configured' });
        return;
      }
      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    res.status(500).json({
      error: 'Blob gateway request failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
