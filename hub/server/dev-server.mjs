// Local runner for the server handlers. Needs `npm run server:build` first (compiles to ./.build).
// Usage: node server/dev-server.mjs [--port 8787] [--env <path to .env>] [--allow-open]
// Loads env from the .env file (values are never printed). Listens on localhost only.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadEnv } from './load-env.mjs';

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
const ALIASES = { 'contact-write': 'contact', 'invoices-send': 'invoices/send', 'invoices-payment': 'invoices/payment', 'invoices-void': 'invoices/void','public-quote': 'public/quote', 'public-quote-respond': 'public/quote/respond' };
const handlers = {};
for (const f of fs.readdirSync(path.join(here, '.build', 'handlers')).filter((x) => x.endsWith('.js'))) {
  const n = f.slice(0, -3);
  const mod = await import(pathToFileURL(path.join(here, '.build', 'handlers', f)).href);
  const route = ALIASES[n] ?? n;
  handlers[route] = { ...(handlers[route] ?? {}), ...mod };
}

const server = http.createServer(async (req, res) => {
  const origin = 'http://' + (req.headers.host ?? 'localhost:' + port);
  const url = new URL(req.url ?? '/', origin);
  const name = url.pathname.replace(/^\/api\//, '');
  const mod = url.pathname.startsWith('/api/') ? handlers[name] : undefined;
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
