import { createServer as createNodeHttpServer, type Server } from 'node:http';
import { pathToFileURL } from 'node:url';
import { createMcpExpressApp } from '@modelcontextprotocol/express';
import { toNodeHandler } from '@modelcontextprotocol/node';
import { createMcpHandler } from '@modelcontextprotocol/server';
import { createServer as createMcpServer } from './index.js';
import { log } from './log.js';

const DEFAULT_ALLOWED_HOSTS = [
  'localhost',
  '127.0.0.1',
  '[::1]',
  'mcp-expense-tracker.ishaaniconsulting.ca',
];

const DEFAULT_ALLOWED_ORIGINS = [
  'localhost',
  '127.0.0.1',
  '[::1]',
  'mcp-expense-tracker.ishaaniconsulting.ca',
  'claude.ai',
  'claude.com',
];

function configuredHostnames(value: string | undefined, fallback: readonly string[]): string[] {
  const hostnames = value
    ?.split(',')
    .map((hostname) => hostname.trim())
    .filter(Boolean);

  return hostnames && hostnames.length > 0 ? hostnames : [...fallback];
}

export function createHttpServer(): Server {
  const app = createMcpExpressApp({
    allowedHosts: configuredHostnames(process.env.MCP_HTTP_ALLOWED_HOSTS, DEFAULT_ALLOWED_HOSTS),
    allowedOrigins: configuredHostnames(process.env.MCP_HTTP_ALLOWED_ORIGINS, DEFAULT_ALLOWED_ORIGINS),
  });

  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const url = new URL(req.originalUrl, 'http://localhost');
      log('http_request', {
        method: req.method,
        path: url.pathname,
        status: res.statusCode,
        durationMs: Date.now() - start,
        clientIp: req.headers['cf-connecting-ip'] ?? req.socket.remoteAddress,
        cfRay: req.headers['cf-ray'],
        accessUser: req.headers['cf-access-authenticated-user-email'],
        userAgent: req.headers['user-agent'],
      });
    });
    next();
  });

  app.get('/health', (_req, res) => {
    res.type('text/plain').send('ok');
  });

  const mcpHandler = toNodeHandler(createMcpHandler(createMcpServer), {
    onerror: (error) => console.error('Error handling MCP request:', error),
  });

  app.all('/mcp', async (req, res) => {
    await mcpHandler(req, res, req.body);
  });

  return createNodeHttpServer(app);
}

async function main() {
  const port = Number(process.env.PORT) || 3400;
  const host = process.env.MCP_HTTP_HOST || '127.0.0.1';
  const server = createHttpServer();
  await new Promise<void>((resolve) => server.listen(port, host, resolve));
  console.error(`[expense-tracker-mcp] HTTP server listening on http://${host}:${port}`);
  const shutdown = async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((err) => { console.error('Fatal error starting HTTP server:', err); process.exit(1); });
}
