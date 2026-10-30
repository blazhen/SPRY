// Run after compile: npx tsc -p server/tsconfig.json (from hub/), then node server/store/store-test.mjs
// Uses the file adapter in a temp dir and calls the handler directly. Prints PASS/FAIL only.
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const build = path.join(here, '..', '.build');
const imp = (p) => import(pathToFileURL(path.join(build, p)).href);

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hubstore-'));
process.env.SPRY_STORE = 'file';
process.env.SPRY_STORE_FILE = path.join(dir, 'store.json');
process.env.SPRY_CRM_LOCATION_ID = 'TESTLOC';
const secret = crypto.randomBytes(16).toString('hex');
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const mint = () => { const h = b64({ alg: 'HS256' }), p = b64({ loc: 'TESTLOC', exp: Math.floor(Date.now() / 1000) + 300 }); return h + '.' + p + '.' + crypto.createHmac('sha256', secret).update(h + '.' + p).digest('base64url'); };

const h = await imp('handlers/store.js');
const { createFileStore } = await imp('store/file.js');
const { ConflictError } = await imp('store/types.js');

const U = 'http://localhost:8787/api/store';
const call = async (method, qs, body, opts = {}) => {
  const headers = { Origin: 'http://localhost:8787' };
  if (opts.token !== false) headers['X-Quote-Token'] = mint();
  let payload;
  if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = typeof body === 'string' ? body : JSON.stringify(body); }
  const r = await h[method](new Request(U + qs, { method, headers, body: payload }));
  return { status: r.status, j: await r.json().catch(() => ({})) };
};
const check = (label, got, want) => { const ok = got === want; console.log((ok ? 'PASS ' : 'FAIL ') + label + ' -> ' + got + (ok ? '' : ' (wanted ' + want + ')')); if (!ok) process.exitCode = 1; };

process.env.SPRY_IFRAME_SECRET = secret;
process.env.SPRY_ALLOW_OPEN = '';

const put1 = await call('PUT', '?collection=quotes&id=q1', { data: { total: 10 } });
check('put returns 200', put1.status, 200);
const g = await call('GET', '?collection=quotes&id=q1');
check('get returns data', JSON.stringify(g.j.record?.data), '{"total":10}');
check('get unknown id is 404', (await call('GET', '?collection=quotes&id=nope')).status, 404);
await call('PUT', '?collection=quotes&id=q2', { data: { total: 20 } });
check('list count', (await call('GET', '?collection=quotes')).j.records?.length, 2);
check('list other collection empty', (await call('GET', '?collection=terms')).j.records?.length, 0);

await new Promise((r) => setTimeout(r, 5));
const put2 = await call('PUT', '?collection=quotes&id=q1', { data: { total: 11 }, ifUpdatedAt: put1.j.record.updatedAt });
check('put with current ifUpdatedAt ok', put2.status, 200);
const stale = await call('PUT', '?collection=quotes&id=q1', { data: { total: 99 }, ifUpdatedAt: put1.j.record.updatedAt });
check('put with older ifUpdatedAt conflicts', stale.status, 409);
check('conflicting write did not land', (await call('GET', '?collection=quotes&id=q1')).j.record.data.total, 11);

const ids = Array.from({ length: 20 }, (_, i) => 'p' + i);
await Promise.all(ids.map((id) => call('PUT', '?collection=events&id=' + id, { data: { id } })));
check('20 parallel puts all survive', (await call('GET', '?collection=events')).j.records.length, 20);
const raw = JSON.parse(fs.readFileSync(process.env.SPRY_STORE_FILE, 'utf8'));
check('file on disk is valid json with all rows', Object.keys(raw.events).length, 20);
check('no temp file left behind', fs.readdirSync(dir).filter((f) => f.endsWith('.tmp')).length, 0);

check('delete ok', (await call('DELETE', '?collection=quotes&id=q2')).status, 200);
check('deleted record is 404', (await call('GET', '?collection=quotes&id=q2')).status, 404);

for (const c of ['jobmeta', 'companies']) check('collection allowed: ' + c, (await call('PUT', '?collection=' + c + '&id=x1', { data: { a: 1 } })).status, 200);
check('bad collection rejected', (await call('GET', '?collection=secrets')).status, 400);
check('bad id rejected (slash)', (await call('PUT', '?collection=quotes&id=a/b', { data: {} })).status, 400);
check('bad id rejected (too long)', (await call('PUT', '?collection=quotes&id=' + 'x'.repeat(65), { data: {} })).status, 400);
check('bad id rejected (dots)', (await call('GET', '?collection=quotes&id=..%2Fx')).status, 400);
check('1 MB+ body rejected', (await call('PUT', '?collection=quotes&id=big', { data: { s: 'x'.repeat(1024 * 1024 + 10) } })).status, 400);
check('non-JSON body rejected', (await call('PUT', '?collection=quotes&id=bad', 'not json')).status, 400);
check('missing data rejected', (await call('PUT', '?collection=quotes&id=bad', {})).status, 400);
check('PUT without Origin is 403', (await h.PUT(new Request(U + '?collection=quotes&id=z', { method: 'PUT', headers: { 'X-Quote-Token': mint(), 'Content-Type': 'application/json' }, body: '{"data":1}' }))).status, 403);

check('secret set, no token is 401', (await call('GET', '?collection=quotes', undefined, { token: false })).status, 401);
process.env.SPRY_IFRAME_SECRET = '';
check('no secret is 503', (await call('GET', '?collection=quotes', undefined, { token: false })).status, 503);

// Store not configured: handler answers 503 "Storage not configured".
process.env.SPRY_IFRAME_SECRET = secret;
process.env.SPRY_STORE = '';
const nc = await call('GET', '?collection=quotes');
check('no store registered is 503', nc.status, 503);
check('503 message', nc.j.error, 'Storage not configured');

// Adapter level: ConflictError thrown directly.
const s = createFileStore(path.join(dir, 'direct.json'));
const r1 = await s.put('quotes', 'a', { v: 1 });
await new Promise((r) => setTimeout(r, 5));
await s.put('quotes', 'a', { v: 2 });
let threw = false;
try { await s.put('quotes', 'a', { v: 3 }, r1.updatedAt); } catch (e) { threw = e instanceof ConflictError; }
check('adapter throws ConflictError', threw, true);

// Quote rules through the handler: an existing quote needs ifUpdatedAt, and an answered quote keeps its answer.
process.env.SPRY_STORE = 'file';
process.env.SPRY_STORE_FILE = path.join(dir, 'store.json');
process.env.SPRY_IFRAME_SECRET = secret;
const Q = '?collection=quotes&id=';
const qa = await call('PUT', Q + 'qrule', { data: { id: 'qrule', status: 'Sent', total: 1 } });
check('new quote needs no ifUpdatedAt', qa.status, 200);
const noGuard = await call('PUT', Q + 'qrule', { data: { id: 'qrule', status: 'Sent', total: 2 } });
check('existing quote without ifUpdatedAt -> 409', noGuard.status + '|' + noGuard.j.error, '409|Reload and try again');
check('refused write did not land', (await call('GET', Q + 'qrule')).j.record.data.total, 1);
await new Promise((r) => setTimeout(r, 5));
const qb = await call('PUT', Q + 'qrule', { data: { id: 'qrule', status: 'Accepted', total: 1 }, ifUpdatedAt: qa.j.record.updatedAt });
check('Sent to Accepted by staff with ifUpdatedAt -> 200', qb.status, 200);
await new Promise((r) => setTimeout(r, 5));
const qc = await call('PUT', Q + 'qrule', { data: { id: 'qrule', status: 'Accepted', total: 5, poNumber: 'PO1' }, ifUpdatedAt: qb.j.record.updatedAt });
check('Accepted keeping its status, other fields change -> 200', qc.status, 200);
for (const to of ['Sent', 'Draft', 'Declined', 'Superseded', 'Expired']) {
  const x = await call('PUT', Q + 'qrule', { data: { id: 'qrule', status: to }, ifUpdatedAt: qc.j.record.updatedAt });
  check('Accepted to ' + to + ' -> 409 already answered', x.status + '|' + x.j.error, '409|This quote was already answered');
}
check('Accepted status is still stored', (await call('GET', Q + 'qrule')).j.record.data.status, 'Accepted');
const noStatus = await call('PUT', Q + 'qrule', { data: { id: 'qrule' }, ifUpdatedAt: qc.j.record.updatedAt });
check('Accepted, data with no status -> 409', noStatus.status, 409);
await call('PUT', Q + 'qdec', { data: { id: 'qdec', status: 'Declined' } });
const dd = (await call('GET', Q + 'qdec')).j.record;
const dx = await call('PUT', Q + 'qdec', { data: { id: 'qdec', status: 'Sent' }, ifUpdatedAt: dd.updatedAt });
check('Declined to Sent -> 409 already answered', dx.status + '|' + dx.j.error, '409|This quote was already answered');
const dstale = await call('PUT', Q + 'qdec', { data: { id: 'qdec', status: 'Declined', x: 1 }, ifUpdatedAt: '2000-01-01T00:00:00.000Z' });
check('Declined, same status, but a stale ifUpdatedAt -> 409', dstale.status, 409);
// Other collections keep last-write-wins
await call('PUT', '?collection=terms&id=t1', { data: { text: 'a' } });
check('terms existing record without ifUpdatedAt -> still 200', (await call('PUT', '?collection=terms&id=t1', { data: { text: 'b' } })).status, 200);
await call('PUT', '?collection=invoices&id=i1', { data: { a: 1 } });
check('invoices extras existing without ifUpdatedAt -> still 200', (await call('PUT', '?collection=invoices&id=i1', { data: { a: 2 } })).status, 200);

// Handler rules: collection, id, body, content type, size (with and without Content-Length, chunked)
check('missing collection -> 400', (await call('GET', '')).status, 400);
check('PUT without id -> 400', (await call('PUT', '?collection=quotes', { data: {} })).status, 400);
check('DELETE without id -> 400', (await call('DELETE', '?collection=quotes')).status, 400);
check('array body -> 400', (await call('PUT', Q + 'arr', [1])).status, 400);
check('bad ifUpdatedAt -> 400', (await call('PUT', Q + 'bad2', { data: {}, ifUpdatedAt: 'yesterday' })).status, 400);
check('data null -> 400', (await call('PUT', Q + 'bad3', { data: null })).status, 400);
const rawPut = (extra, body, ct = 'application/json') => h.PUT(new Request(U + '?collection=terms&id=bigx', { method: 'PUT', headers: { Origin: 'http://localhost:8787', 'X-Quote-Token': mint(), ...(ct ? { 'Content-Type': ct } : {}), ...extra }, body, duplex: 'half' })).then((x) => x.status);
check('wrong content type -> 400', await rawPut({}, '{"data":1}', 'text/plain'), 400);
const bigText = JSON.stringify({ data: 'x'.repeat(1024 * 1024 + 100) });
check('oversize body with Content-Length -> 400', await rawPut({ 'content-length': String(bigText.length) }, bigText), 400);
check('oversize body without Content-Length -> 400', await rawPut({}, bigText), 400);
check('oversize body with a lying Content-Length -> 400', await rawPut({ 'content-length': '10' }, bigText), 400);
const chunkedBig = new ReadableStream({ start(c) { for (let i = 0; i < bigText.length; i += 65536) c.enqueue(new TextEncoder().encode(bigText.slice(i, i + 65536))); c.close(); } });
check('oversize chunked body -> 400', await rawPut({}, chunkedBig), 400);
check('oversize body stored nothing', (await call('GET', '?collection=terms&id=bigx')).status, 404);
const chunkedOk = new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode('{"data":')); c.enqueue(new TextEncoder().encode('{"ok":1}}')); c.close(); } });
check('small chunked body -> 200', await rawPut({}, chunkedOk), 200);

// Supabase adapter against an in-memory fake that honours the conditional update and the unique key
const { createSupabaseStore } = await imp('store/supabase.js');
function fakeDb() {
  const rows = new Map(); // 'collection|id' -> row
  let clock = Date.parse('2026-01-01T00:00:00.000Z');
  const tick = () => new Date((clock += 1)).toISOString();
  const calls = { update: 0, insert: 0, upsert: 0 };
  let beforeUpdate = null; // hook: run once just before the conditional update (race simulation)
  const client = {
    from() {
      return {
        select() {
          return { eq(c1, v1) { return {
            order: async () => ({ data: [...rows.values()].filter((r) => r.collection === v1), error: null }),
            eq: (c2, v2) => ({ maybeSingle: async () => ({ data: rows.get(v1 + '|' + v2) ?? null, error: null }) }),
          }; } };
        },
        upsert(row) { calls.upsert++; return { select: () => ({ single: async () => { const r = { ...row, updated_at: tick() }; rows.set(row.collection + '|' + row.id, r); return { data: r, error: null }; } }) }; },
        insert(row) { calls.insert++; return { select: () => ({ single: async () => { const k = row.collection + '|' + row.id; if (rows.has(k)) return { data: null, error: { message: 'dup', code: '23505' } }; const r = { ...row, updated_at: tick() }; rows.set(k, r); return { data: r, error: null }; } }) }; },
        update(values) { calls.update++; return { eq: (_a, collection) => ({ eq: (_b, id) => ({ eq: (_c, ifAt) => ({ select: () => ({ maybeSingle: async () => {
          if (beforeUpdate) { const f = beforeUpdate; beforeUpdate = null; f(rows); }
          const k = collection + '|' + id; const r = rows.get(k);
          if (!r || new Date(r.updated_at).toISOString() !== ifAt) return { data: null, error: null };
          const n = { ...r, ...values, updated_at: tick() }; rows.set(k, n); return { data: n, error: null };
        } }) }) }) }) }; },
        delete() { return { eq: () => ({ eq: async () => ({ data: null, error: null }) }) }; },
      };
    },
  };
  return { client, rows, calls, onBeforeUpdate: (f) => { beforeUpdate = f; } };
}
{
  const db = fakeDb();
  const sb = createSupabaseStore(db.client);
  const a = await sb.put('quotes', 'x', { v: 1 });
  check('supabase: unguarded put upserts', db.calls.upsert, 1);
  const b = await sb.put('quotes', 'x', { v: 2 }, a.updatedAt);
  check('supabase: guarded put with the current stamp uses a conditional update', db.calls.update + '|' + b.data.v, '1|2');
  let threw = false;
  try { await sb.put('quotes', 'x', { v: 3 }, a.updatedAt); } catch (e) { threw = e instanceof ConflictError; }
  check('supabase: guarded put with an old stamp -> ConflictError', threw, true);
  check('supabase: conflicting write did not land', (await sb.get('quotes', 'x')).data.v, 2);
  const n = await sb.put('quotes', 'fresh', { v: 1 }, '2026-01-01T00:00:00.000Z');
  check('supabase: guarded put on a new record inserts', db.calls.insert + '|' + n.data.v, '1|1');
  // Race: another writer lands just before our conditional update. It matches nothing, so nothing is overwritten.
  const c = await sb.get('quotes', 'x');
  db.onBeforeUpdate((rows) => { const r = rows.get('quotes|x'); rows.set('quotes|x', { ...r, data: { v: 99 }, updated_at: new Date(Date.parse(r.updated_at) + 5).toISOString() }); });
  threw = false;
  try { await sb.put('quotes', 'x', { v: 4 }, c.updatedAt); } catch (e) { threw = e instanceof ConflictError; }
  check('supabase: a write that slipped in mid-flight is a conflict, not overwritten', threw + '|' + (await sb.get('quotes', 'x')).data.v, 'true|99');
  threw = false;
  try { await sb.put('quotes', 'fresh', { v: 2 }, '2026-01-01T00:00:00.000Z'); } catch (e) { threw = e instanceof ConflictError; }
  check('supabase: guarded write on an id that exists with another stamp -> ConflictError', threw, true);
  // Unique violation on the insert itself (record appeared after the existence check)
  const db2 = fakeDb();
  const base2 = db2.client.from('t');
  const sb2 = createSupabaseStore({ from: () => ({ ...base2, select: () => ({ eq: () => ({ order: async () => ({ data: [], error: null }), eq: () => ({ maybeSingle: async () => { db2.rows.set('quotes|race', { collection: 'quotes', id: 'race', data: {}, updated_at: '2026-01-01T00:00:00.000Z' }); return { data: null, error: null }; } }) }) }) }) });
  threw = false;
  try { await sb2.put('quotes', 'race', { v: 1 }, '2026-02-01T00:00:00.000Z'); } catch (e) { threw = e instanceof ConflictError; }
  check('supabase: unique violation on insert -> ConflictError', threw, true);
}

fs.rmSync(dir, { recursive: true, force: true });
