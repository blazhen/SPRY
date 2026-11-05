// Local runner for the server handlers. Needs `npm run server:build` first (compiles to ./.build).
// Usage: node server/dev-server.mjs [--port 8787] [--env <path to .env>] [--allow-open]
// Loads env from the .env file (values are never printed). Listens on localhost only.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadEnv } from './load-env.mjs';
import { ROOT_ALIASES, routeKey } from './routes.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = (n) => args.indexOf(n);
const val = (n, d) => (flag(n) >= 0 ? args[flag(n) + 1] : d);
const port = Number(val('--port', '8787'));
const envPath = val('--env', path.resolve(here, '..', '..', '.env'));

// Existing process env wins over the file, so tests can override values.
loadEnv(envPath);
if (flag('--allow-open') >= 0) process.env.SPRY_ALLOW_OPEN = '1';

// Auto-discover handlers: every .build/handlers/<name>.js is served at /api/<name>. Methods of files sharing a path merge.
// Aliases for files whose name is not their path: contact-write is the PUT/POST half of /api/contact, invoices-send is /api/invoices/send, invoices-payment is /api/invoices/payment, invoices-void is /api/invoices/void,public-quote is /api/public/quote, public-quote-respond is /api/public/quote/respond (quote-link maps by name).
// The alias tables live in routes.mjs (shared with the Vercel function entry). Install flow routes are keyed by their full path
// (oauth-callback is GET /oauth/callback, webhooks-platform is POST /webhooks/platform, auth-user-context is POST /auth/user-context).
const handlers = {};
for (const f of fs.readdirSync(path.join(here, '.build', 'handlers')).filter((x) => x.endsWith('.js'))) {
  const n = f.slice(0, -3);
  const mod = await import(pathToFileURL(path.join(here, '.build', 'handlers', f)).href);
  const route = routeKey(n);
  handlers[route] = { ...(handlers[route] ?? {}), ...mod };
}

// File storage for job documents: with the JSON-file store (or SPRY_FAKE_FILES=1) an in-memory fake is installed and its
// signed links are served here under /fake-storage/. Otherwise the host registers the real storage.
let fakeFiles = null;
if (process.env.SPRY_STORE === 'file' || process.env.SPRY_FAKE_FILES === '1') {
  const { createFakeFileStorage } = await import(pathToFileURL(path.join(here, '.build', 'store', 'files-fake.js')).href);
  const { setFileStorage } = await import(pathToFileURL(path.join(here, '.build', 'lib', 'files.js')).href);
  fakeFiles = createFakeFileStorage('http://127.0.0.1:' + port);
  setFileStorage(fakeFiles);
}

const server = http.createServer(async (req, res) => {
  const origin = 'http://' + (req.headers.host ?? 'localhost:' + port);
  const url = new URL(req.url ?? '/', origin);
  if (fakeFiles && url.pathname.startsWith('/fake-storage/')) {
    const parts = [];
    for await (const c of req) parts.push(c);
    const r = await fakeFiles.handle(req.method ?? '', url.pathname, parts.length ? Buffer.concat(parts) : undefined);
    res.writeHead(r.status, Object.fromEntries(r.headers));
    res.end(Buffer.from(await r.arrayBuffer()));
    return;
  }
  const name = url.pathname.replace(/^\/api\//, '');
  const mod = url.pathname.startsWith('/api/') ? handlers[name] : Object.values(ROOT_ALIASES).includes(url.pathname) ? handlers[url.pathname] : undefined;
  const fn = mod?.[req.method ?? ''];
  if (!fn) { res.writeHead(404, { 'Content-Type': 'application/json' }); res.end('{"error":"Not found"}'); return; }
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = chunks.length ? Buffer.concat(chunks) : undefined;
  const request = new Request(url, { method: req.method, headers: req.headers, body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body });
  const response = await fn(request);
  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(Buffer.from(await response.arrayBuffer()));
});
server.listen(port, '127.0.0.1', () => console.log('Hub server on http://127.0.0.1:' + port + (process.env.SPRY_ALLOW_OPEN === '1' ? ' (OPEN mode, dev only)' : '')));
