import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Connect } from 'vite';

function vercelApiPlugin(): Plugin {
  return {
    name: 'local-vercel-api',
    configureServer(server) {
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
        const url = req.url ?? '';
        if (!url.startsWith('/api/')) return next();

        const route = url.split('?')[0];

        const body = await new Promise<unknown>((resolve) => {
          const chunks: Buffer[] = [];
          req.on('data', (chunk: Buffer) => chunks.push(chunk));
          req.on('end', () => {
            try {
              resolve(JSON.parse(Buffer.concat(chunks).toString() || '{}'));
            } catch {
              resolve({});
            }
          });
        });

        try {
          const mod = await server.ssrLoadModule(route + '.ts');
          const handler = mod.default as ((req: unknown, res: unknown) => Promise<void>) | undefined;
          if (typeof handler !== 'function') return next();

          let statusCode = 200;
          const apiReq = { method: req.method, body };
          const apiRes = {
            status(code: number) { statusCode = code; return apiRes; },
            json(payload: unknown) {
              res.writeHead(statusCode, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(payload));
            },
          };

          await handler(apiReq, apiRes);
        } catch {
          next();
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Make .env vars available to SSR-loaded api/ handlers (process.env is not auto-populated by Vite)
  for (const key of ['ANTHROPIC_API_KEY', 'VITE_ANTHROPIC_API_KEY', 'ANTHROPIC_MODEL']) {
    if (env[key]) process.env[key] = env[key];
  }

  return {
    plugins: [react(), vercelApiPlugin()],
    server: {
      host: '0.0.0.0',
      port: 8100,
    },
  };
});
