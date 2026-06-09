import { readBlobDocument, resolveBlobConfig, writeBlobDocument } from './blobCore';

function getName(query: unknown): string {
  const raw = (query as { name?: string | string[] })?.name;
  if (Array.isArray(raw)) return raw[0] || '';
  return raw || '';
}

export default async function handler(req: any, res: any) {
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
