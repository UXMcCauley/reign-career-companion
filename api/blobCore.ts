import { list, put } from '@vercel/blob';

export interface BlobGatewayConfig {
  token: string;
  prefix: string;
  access: 'public' | 'private';
}

export function resolveBlobConfig(env: Record<string, string | undefined>): BlobGatewayConfig {
  const token =
    env.BLOB_READ_WRITE_TOKEN ||
    env.VERCEL_BLOB_READ_WRITE_TOKEN ||
    env.VITE_BLOB_READ_WRITE_TOKEN ||
    env.VITE_VERCEL_BLOB_READ_WRITE_TOKEN ||
    '';

  return {
    token,
    prefix: env.BLOB_PREFIX || env.VITE_BLOB_PREFIX || 'leadership-demo',
    access: (env.BLOB_ACCESS === 'public' || env.VITE_BLOB_ACCESS === 'public') ? 'public' : 'private',
  };
}

function assertName(name: string): string {
  if (!/^[a-z0-9][a-z0-9-_]*$/i.test(name)) {
    throw new Error('Invalid blob document name.');
  }
  return name;
}

function pathFor(prefix: string, name: string): string {
  return `${prefix}/${assertName(name)}.json`;
}

export async function readBlobDocument<T>(
  name: string,
  config: BlobGatewayConfig
): Promise<T | null> {
  if (!config.token) return null;
  const pathname = pathFor(config.prefix, name);
  const { blobs } = await list({ token: config.token, prefix: pathname, limit: 1 });
  const blob = blobs.find(item => item.pathname === pathname) ?? blobs[0];
  if (!blob) return null;

  const response = await fetch(blob.url, {
    cache: 'no-store',
    headers: { Authorization: `Bearer ${config.token}` },
  });
  if (!response.ok) return null;
  return (await response.json()) as T;
}

export async function writeBlobDocument(
  name: string,
  data: unknown,
  config: BlobGatewayConfig
): Promise<boolean> {
  if (!config.token) return false;
  const pathname = pathFor(config.prefix, name);
  await put(pathname, JSON.stringify(data), {
    token: config.token,
    access: config.access,
    addRandomSuffix: false,
    contentType: 'application/json',
  });
  return true;
}
