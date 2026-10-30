// Test runner. Usage: node server/test-run.mjs lock | unit | public | live
// lock: auth rules, no CRM credentials needed (env file ignored). live: real Dev credentials via the .env loader.
// Prints status codes and counts only. Never prints tokens or contact data.
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadEnv } from './load-env.mjs';

const mode = process.argv[2];
const here = path.dirname(fileURLToPath(import.meta.url));
const DEV = '5M1zrDbimF17cM16mtmR';
const secret = crypto.randomBytes(24).toString('hex'); // throwaway
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const mint = (p, sec = secret) => { const h = b64({ alg: 'HS256', typ: 'JWT' }), pl = b64(p); return h + '.' + pl + '.' + crypto.createHmac('sha256', sec).update(h + '.' + pl).digest('base64url'); };
const now = Math.floor(Date.now() / 1000);

// Every route the dev server must lock (method, path). Extended routes included; add new routes here.
const ROUTES = [
  ['GET', '/api/contacts'], ['GET', '/api/contact?id=x'], ['POST', '/api/contact'], ['PUT', '/api/contact?id=x'],
  ['GET', '/api/jobs'], ['POST', '/api/jobs'], ['PUT', '/api/job?id=x'], ['GET', '/api/pipelines'], ['GET', '/api/opportunity-fields'],
  ['GET', '/api/participants?jobId=x'], ['POST', '/api/participants'], ['DELETE', '/api/participants?jobId=x'],
  ['GET', '/api/notes?contactId=x'], ['POST', '/api/notes'], ['DELETE', '/api/notes?contactId=x'],
  ['GET', '/api/tasks?contactId=x'], ['POST', '/api/tasks'], ['PUT', '/api/tasks?contactId=x'],
  ['POST', '/api/tags'], ['DELETE', '/api/tags?contactId=x'],
  ['GET', '/api/invoices?all=1'], ['POST', '/api/invoices'], ['POST', '/api/invoices/send?id=x'], ['GET', '/api/users'],
  ['PUT', '/api/invoices?id=x'], ['DELETE', '/api/invoices?id=x'], ['POST', '/api/invoices/payment?id=x'], ['POST', '/api/invoices/void?id=x'],
  ['GET', '/api/quote-link?id=x'],
  ['GET', '/api/store?collection=quotes'], ['PUT', '/api/store?collection=quotes&id=x'], ['DELETE', '/api/store?collection=quotes&id=x'],
];

let child;
const start = async (port, env, extra = []) => {
  child = spawn(process.execPath, [path.join(here, 'dev-server.mjs'), '--port', String(port), ...extra], { env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'inherit'] });
  await new Promise((res, rej) => { child.stdout.on('data', (d) => /Hub server on/.test(String(d)) && res()); child.on('exit', () => rej(new Error('server exited'))); setTimeout(() => rej(new Error('start timeout')), 10000); });
};
const stop = () => child && child.kill();
const check = (label, got, want) => { console.log((got === want ? 'PASS ' : 'FAIL ') + label + ' -> ' + got + (got === want ? '' : ' (wanted ' + want + ')')); if (got !== want) process.exitCode = 1; };

if (mode === 'lock') {
  const noEnv = ['--env', path.join(here, 'no-such.env')];
  const base = { SPRY_CRM_LOCATION_ID: DEV, SPRY_IFRAME_SECRET: '', SPRY_ALLOW_OPEN: '' };
  let U = 'http://127.0.0.1:8791';
  await start(8791, base, noEnv);
  for (const [m, p] of ROUTES) {
    const r = await fetch(U + p, { method: m, headers: { Origin: U, 'Content-Type': 'application/json' }, body: m === 'GET' ? undefined : '{}' });
    check('no secret, ' + m + ' ' + p, r.status, 503);
  }
  stop();
  await new Promise((r) => setTimeout(r, 500));
  U = 'http://127.0.0.1:8792';
  await start(8792, { ...base, SPRY_IFRAME_SECRET: secret }, noEnv);
  const get = async (t, p = '/api/auth', hdr = true) => (await fetch(U + p + (t && !hdr ? '?t=' + t : ''), { headers: t && hdr ? { 'X-Quote-Token': t } : {} })).status;
  check('secret set, no token', await get(''), 401);
  check('valid token (header)', await get(mint({ loc: DEV, exp: now + 300 })), 200);
  check('token in query ?t= is NOT accepted', await get(mint({ loc: DEV, exp: now + 300 }), '/api/auth', false), 401);
  check('expired token', await get(mint({ loc: DEV, exp: now - 10 })), 401);
  check('wrong-location token', await get(mint({ loc: 'OTHERLOC', exp: now + 300 })), 401);
  check('bad signature (other secret)', await get(mint({ loc: DEV, exp: now + 300 }, 'not-the-secret')), 401);
  // Every route in every method: no token gives 401 (secret set), no secret gives 503 (checked on the first server below).
  for (const [m, p] of ROUTES) {
    const r = await fetch(U + p, { method: m, headers: { Origin: U, 'Content-Type': 'application/json' }, body: m === 'GET' ? undefined : '{}' });
    check('no token, ' + m + ' ' + p, r.status, 401);
  }
  const post = await fetch(U + '/api/jobs', { method: 'POST', headers: { 'X-Quote-Token': mint({ loc: DEV, exp: now + 300 }), 'Content-Type': 'application/json' }, body: '{}' });
  check('POST without Origin header', post.status, 403);
  stop();
  await new Promise((r) => setTimeout(r, 500));
  // Open mode never beats a configured secret: SPRY_ALLOW_OPEN=1 with a secret still needs a token.
  U = 'http://127.0.0.1:8795';
  await start(8795, { ...base, SPRY_IFRAME_SECRET: secret, SPRY_ALLOW_OPEN: '1' }, noEnv);
  check('ALLOW_OPEN=1 with a secret, no token', await get(''), 401);
  check('ALLOW_OPEN=1 with a secret, valid token', await get(mint({ loc: DEV, exp: now + 300 })), 200);
  for (const [m, p] of ROUTES.slice(0, 6)) {
    const r = await fetch(U + p, { method: m, headers: { Origin: U, 'Content-Type': 'application/json' }, body: m === 'GET' ? undefined : '{}' });
    check('ALLOW_OPEN=1 with a secret, no token, ' + m + ' ' + p, r.status, 401);
  }
  stop();
  await new Promise((r) => setTimeout(r, 500));
  // Production ignores SPRY_ALLOW_OPEN: no secret answers 503 as if it were unset.
  U = 'http://127.0.0.1:8796';
  await start(8796, { ...base, SPRY_ALLOW_OPEN: '1', NODE_ENV: 'production' }, noEnv);
  check('NODE_ENV=production + ALLOW_OPEN=1, no secret -> 503', (await fetch(U + '/api/auth', { headers: { Origin: U } })).status, 503);
  stop();
} else if (mode === 'unit') {
  // In-process tests with a fake fetch: no network, no credentials. Needs `npm run server:build` first.
  Object.assign(process.env, { SPRY_CRM_TOKEN: 'fake', SPRY_CRM_API_BASE: 'http://crm.invalid/v', SPRY_CRM_LOCATION_ID: DEV, SPRY_ALLOW_OPEN: '1', SPRY_IFRAME_SECRET: '' });
  const imp = (p) => import(pathToFileURL(path.join(here, '.build', p)).href);
  const X = await imp('lib/crm-extended.js');
  const H = {
    contact: await imp('handlers/contact-write.js'), job: await imp('handlers/job.js'), participants: await imp('handlers/participants.js'),
    notes: await imp('handlers/notes.js'), tasks: await imp('handlers/tasks.js'), tags: await imp('handlers/tags.js'),
    invoices: await imp('handlers/invoices.js'), send: await imp('handlers/invoices-send.js'),
    pay: await imp('handlers/invoices-payment.js'), void: await imp('handlers/invoices-void.js'),
  };
  const calls = [];
  let routes = {};
  globalThis.fetch = async (url, init = {}) => {
    const u = new URL(url);
    const key = (init.method ?? 'GET') + ' ' + u.pathname.replace('/v', '');
    calls.push({ key, body: init.body ? JSON.parse(init.body) : undefined, search: u.search });
    const hit = routes[key];
    if (!hit) return new Response('{"message":"unrouted"}', { status: 404 });
    return new Response(JSON.stringify(hit), { status: 200 });
  };
  const ORIGIN = 'http://x.test';
  const req = (m, p, body) => new Request(ORIGIN + p, { method: m, headers: { Origin: ORIGIN, 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  const run = async (fn, m, p, body) => { calls.length = 0; const r = await fn(req(m, p, body)); return { status: r.status, j: await r.json() }; };
  const ID1 = 'abcDEF123456', ID2 = 'ghiJKL654321';

  // Stage name to stage id
  const pipes = [{ id: 'p1', name: 'Res', stages: [{ id: 's1', name: 'New lead' }, { id: 's2', name: 'Quote Sent' }] }];
  check('stage: exact', X.stageIdForName(pipes, 'p1', 'Quote Sent'), 's2');
  check('stage: case and spaces', X.stageIdForName(pipes, 'p1', '  quote sent '), 's2');
  check('stage: unknown', X.stageIdForName(pipes, 'p1', 'Nope'), undefined);
  check('stage: wrong pipeline', X.stageIdForName(pipes, 'zz', 'New lead'), undefined);
  check('splitName', JSON.stringify(X.splitName('Jo Ann Smith')), '{"firstName":"Jo Ann","lastName":"Smith"}');

  // Invoice mapper: Hub draft to platform and back
  const draft = { contactId: ID1, jobId: ID2, kind: 'deposit', quoteId: 'Q1', discount: 100, notes: 'Pay <soon> & thanks', dueDate: '2026-12-01', items: [
    { description: 'Spray foam', qty: 2, unit: 'm2', unitPrice: 100, gst: true }, { description: 'Travel', qty: 1, unit: 'each', unitPrice: 50, gst: false }] };
  check('validate ok', X.validateInvoiceDraft(draft), null);
  const body = X.invoiceToPlatform(draft, { id: ID1, name: 'ZZ-TEST A', email: 'a@example.invalid' }, 'Biz', '2026-10-30');
  check('mapper: item amount has GST baked in', body.items[0].amount, 110);
  check('mapper: untaxed line', body.items[1].amount, 50);
  check('mapper: discount scaled by blended factor', body.discount.value, 108);
  check('mapper: contact details', body.contactDetails.id, ID1);
  const back = X.mapInvoice({ _id: 'inv1', invoiceNumber: '000013', status: 'partially_paid', total: 270, issueDate: '2026-10-30T00:00:00Z', dueDate: '2026-12-01', name: body.name, termsNotes: body.termsNotes, invoiceItems: body.items, discount: body.discount, contactDetails: { id: ID1 }, sentTo: { email: ['a@example.invalid'] } });
  check('mapper back: jobId from marker', back.jobId, ID2);
  check('mapper back: kind and quoteId', back.kind + back.quoteId, 'depositQ1');
  check('mapper back: status part', back.status, 'part');
  check('mapper back: unit and gst restored', back.items[0].unit + back.items[0].gst + back.items[0].unitPrice, 'm2true100');
  check('mapper back: hub discount restored', back.discount, 100);
  check('mapper back: notes unescaped', back.notes, 'Pay <soon> & thanks');
  check('mapper back: amount', back.amount, 270);
  const plain = X.mapInvoice({ _id: 'inv2', status: 'void', invoiceItems: [{ name: 'X', qty: 1, amount: 5 }], discount: { value: 2 } });
  check('mapper back without marker: lossy defaults', plain.jobId + plain.kind + plain.items[0].gst + plain.discount + plain.status, 'otherfalse2void');

  // GST baking: platform lines (qty x amount) minus the platform discount must equal the Hub total inc GST to the cent.
  const hubTotal = (items, discount = 0) => { // replica of invoiceTotals in src/lib/invoices.ts
    const rh = (n) => Number(Math.round(Number(String(Math.abs(n)) + 'e2')) / 100) * (n < 0 ? -1 : 1);
    const lines = items.map((l) => rh(l.qty * l.unitPrice)); const sum = lines.reduce((a, b) => a + b, 0);
    const disc = Math.min(Math.max(discount, 0), sum); const base = items.reduce((a, l, i) => a + (l.gst ? lines[i] : 0), 0);
    const gstAfter = sum > 0 ? base * (1 - disc / sum) : 0;
    return rh(rh(sum - disc) + rh(gstAfter * 0.1));
  };
  const cents = (n) => Math.round(n * 100);
  const platLines = (b) => b.items.reduce((a, it) => a + Math.round(it.qty * cents(it.amount)), 0);
  const gstCase = (label, items, discount = 0, wantTotal) => {
    const b = X.invoiceToPlatform({ contactId: ID1, jobId: ID2, items, discount }, { id: ID1, name: 'N', email: 'a@example.invalid' }, 'Biz', '2026-10-30');
    const hub = hubTotal(items, discount);
    if (wantTotal !== undefined) check('GST ' + label + ': Hub total', hub, wantTotal);
    check('GST ' + label + ': lines minus discount equal the Hub total', (platLines(b) - cents(b.discount.value)) + '', cents(hub) + '');
    if (!discount) check('GST ' + label + ': lines alone sum to the Hub total', platLines(b) + '', cents(hub) + '');
    return b;
  };
  const GL = (qty, unitPrice, gst = true) => ({ description: 'x', qty, unit: 'each', unitPrice, gst });
  gstCase('reviewer case 3 x 12.34', [GL(1, 12.34), GL(1, 12.34), GL(1, 12.34)], 0, 40.72);
  gstCase('negative difference 3 x 12.35', [GL(1, 12.35), GL(1, 12.35), GL(1, 12.35)], 0, 40.76);
  gstCase('qty 7 at 9.99', [GL(7, 9.99)]);
  gstCase('qty 7 at 9.99 with others', [GL(7, 9.99), GL(3, 4.55), GL(1, 0.05)]);
  gstCase('mix of gst and non-gst', [GL(1, 12.34), GL(1, 33.33, false), GL(2, 7.77), GL(1, 0.01, false)]);
  gstCase('discount', [GL(1, 12.34), GL(2, 7.77), GL(1, 50, false)], 10.5);
  gstCase('discount over the total is capped', [GL(1, 10)], 999);
  gstCase('fractional qty', [GL(2.5, 3.33), GL(0.5, 19.99)]);
  gstCase('zero value lines', [GL(1, 0), GL(4, 2.5)]);
  let worst = 0; // 300 pseudo random invoices: never off by a cent
  let seed = 12345; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  for (let n = 0; n < 300; n++) {
    const its = Array.from({ length: 1 + Math.floor(rnd() * 5) }, () => GL(1 + Math.floor(rnd() * 9), Math.round(rnd() * 20000) / 100, rnd() > 0.3));
    const dc = rnd() > 0.5 ? Math.round(rnd() * 3000) / 100 : 0;
    const b = X.invoiceToPlatform({ contactId: ID1, jobId: ID2, items: its, discount: dc }, { id: ID1, name: 'N', email: 'a@example.invalid' }, 'Biz', '2026-10-30');
    worst = Math.max(worst, Math.abs(platLines(b) - cents(b.discount.value) - cents(hubTotal(its, dc))));
  }
  check('GST random invoices: biggest gap in cents', worst, 0);
  const adj = gstCase('two qty 7 lines', [GL(7, 9.99), GL(7, 9.99)]);
  const adjBack = X.mapInvoice({ _id: 'iv', invoiceNumber: '1', status: 'draft', total: 0, name: adj.name, termsNotes: adj.termsNotes, invoiceItems: adj.items, discount: adj.discount, contactDetails: { id: ID1 } });
  check('reverse mapping: item count and unitPrice come back', adjBack.items.length + '|' + adjBack.items[0].unitPrice, '2|9.99');
  const t3 = X.invoiceToPlatform({ contactId: ID1, jobId: ID2, items: [GL(1, 12.34), GL(1, 12.34), GL(1, 12.34)] }, { id: ID1, name: 'N', email: 'a@example.invalid' }, 'Biz', '2026-10-30');
  const t3b = X.mapInvoice({ _id: 'iv', status: 'draft', total: 40.72, name: t3.name, termsNotes: t3.termsNotes, invoiceItems: t3.items, discount: t3.discount, contactDetails: { id: ID1 } });
  check('reverse mapping: Hub unitPrice and gst flag come back from the marker', t3b.items.map((i) => i.unitPrice + ':' + i.gst).join(','), '12.34:true,12.34:true,12.34:true');
  const ra = X.invoiceToPlatform({ contactId: ID1, jobId: ID2, items: [GL(7, 9.99), GL(1, 0.01)] }, { id: ID1, name: 'N', email: 'a@example.invalid' }, 'Biz', '2026-10-30');
  const raBack = X.mapInvoice({ _id: 'iv', status: 'draft', total: 0, name: ra.name, termsNotes: ra.termsNotes, invoiceItems: ra.items, discount: ra.discount, contactDetails: { id: ID1 } });
  check('reverse mapping drops a rounding line when one was added', raBack.items.length, 2);

  // Input validation: 400 and no CRM call
  const bad = async (label, fn, m, p, b) => { const r = await run(fn, m, p, b); check(label + ' -> 400', r.status, 400); check(label + ' made no CRM call', calls.length, 0); };
  await bad('POST notes missing contactId', H.notes.POST, 'POST', '/api/notes', { body: 'hi' });
  await bad('POST notes missing body', H.notes.POST, 'POST', '/api/notes', { contactId: ID1 });
  await bad('GET notes missing contactId', H.notes.GET, 'GET', '/api/notes');
  await bad('POST tasks missing contactId', H.tasks.POST, 'POST', '/api/tasks', { title: 't' });
  await bad('POST tasks bad dueDate', H.tasks.POST, 'POST', '/api/tasks', { contactId: ID1, title: 't', dueDate: 'soon' });
  await bad('POST tags missing contactId', H.tags.POST, 'POST', '/api/tags', { tags: ['a'] });
  await bad('POST tags empty list', H.tags.POST, 'POST', '/api/tags', { contactId: ID1, tags: [] });
  await bad('DELETE tags missing tag', H.tags.DELETE, 'DELETE', '/api/tags?contactId=' + ID1);
  await bad('POST contact missing name', H.contact.POST, 'POST', '/api/contact', { email: 'a@example.invalid' });
  await bad('POST contact bad email', H.contact.POST, 'POST', '/api/contact', { name: 'A', email: 'nope' });
  await bad('PUT contact missing id', H.contact.PUT, 'PUT', '/api/contact', { name: 'A' });
  await bad('PUT job bad status', H.job.PUT, 'PUT', '/api/job?id=' + ID1, { status: 'maybe' });
  await bad('PUT job bad id', H.job.PUT, 'PUT', '/api/job?id=!', { status: 'won' });
  await bad('POST participants missing jobId', H.participants.POST, 'POST', '/api/participants', { kind: 'contact', id: ID1 });
  await bad('POST participants bad kind', H.participants.POST, 'POST', '/api/participants', { jobId: ID1, kind: 'dog', id: ID2 });
  await bad('POST invoices missing contactId', H.invoices.POST, 'POST', '/api/invoices', { jobId: ID2, items: draft.items });
  await bad('POST invoices no items', H.invoices.POST, 'POST', '/api/invoices', { contactId: ID1, jobId: ID2, items: [] });
  await bad('GET invoices no filter', H.invoices.GET, 'GET', '/api/invoices');
  await bad('POST invoices/send bad id', H.send.POST, 'POST', '/api/invoices/send?id=!');

  // Stage mapping through the handler: PUT job sends the mapped pipelineStageId, then the status call
  routes = {
    'GET /opportunities/pipelines': { pipelines: [{ id: 'p1', name: 'Res', stages: [{ id: 's1', name: 'New lead' }, { id: 's2', name: 'Quote Sent' }] }] },
    ['GET /locations/' + DEV + '/customFields']: { customFields: [{ id: 'f1', fieldKey: 'opportunity.quote_revision', name: 'Quote revision', dataType: 'NUMERICAL' }] },
    ['GET /opportunities/' + ID1]: { opportunity: { id: ID1, pipelineId: 'p1', pipelineStageId: 's2', name: 'J', status: 'won', monetaryValue: 5, contactId: ID2 } },
    ['PUT /opportunities/' + ID1]: { opportunity: {} }, ['PUT /opportunities/' + ID1 + '/status']: {},
  };
  let r = await run(H.job.PUT, 'PUT', '/api/job?id=' + ID1, { stage: 'quote sent', monetaryValue: 99, status: 'won', customFields: [{ key: 'quote_revision', value: 2 }] });
  check('PUT job -> 200', r.status, 200);
  const put = calls.find((c) => c.key === 'PUT /opportunities/' + ID1);
  check('PUT job: stage name mapped to id', put?.body?.pipelineStageId, 's2');
  check('PUT job: custom field key mapped to id', JSON.stringify(put?.body?.customFields), '[{\"id\":\"f1\",\"field_value\":2}]');
  check('PUT job: status call made', calls.some((c) => c.key === 'PUT /opportunities/' + ID1 + '/status' && c.body.status === 'won'), true);
  check('PUT job: returns stage name', r.j.job?.stage, 'Quote Sent');
  r = await run(H.job.PUT, 'PUT', '/api/job?id=' + ID1, { stage: 'Nope' });
  check('PUT job unknown stage -> 400', r.status, 400);
  check('PUT job unknown stage wrote nothing', calls.some((c) => c.key.startsWith('PUT ')), false);

  // Notes list mapping and no raw CRM keys
  routes = { ['GET /contacts/' + ID1 + '/notes']: { notes: [{ id: 'n1', body: 'hello', bodyText: 'hello', dateAdded: '2026-10-30T00:00:00Z', userId: 'u1', relations: [] }] } };
  r = await run(H.notes.GET, 'GET', '/api/notes?contactId=' + ID1);
  check('GET notes shape', Object.keys(r.j.notes[0]).join(','), 'id,body,createdAt,createdBy');

  // GET /api/jobs: status filter, pageSize, total and hasMore
  const JOBS = await imp('handlers/jobs.js');
  routes = {
    'GET /opportunities/pipelines': { pipelines: [{ id: 'p1', name: 'Res', stages: [{ id: 's1', name: 'New lead' }] }] },
    ['GET /locations/' + DEV + '/customFields']: { customFields: [] },
    'GET /opportunities/search': { opportunities: [{ id: ID1, contactId: ID2, name: 'J', status: 'won', pipelineId: 'p1', pipelineStageId: 's1' }], meta: { total: 250 } },
  };
  r = await run(JOBS.GET, 'GET', '/api/jobs?all=1&status=won&page=2&pageSize=100');
  const sc = calls.find((c) => c.key === 'GET /opportunities/search');
  check('GET jobs: status filter sent to the CRM', new URLSearchParams(sc?.search).get('status'), 'won');
  check('GET jobs: pageSize becomes the limit', new URLSearchParams(sc?.search).get('limit'), '100');
  check('GET jobs: total and hasMore', r.j.total + ':' + r.j.hasMore + ':' + r.j.pageSize, '250:true:100');
  r = await run(JOBS.GET, 'GET', '/api/jobs?all=1&page=3&pageSize=100');
  check('GET jobs: default status is open', new URLSearchParams(calls.find((c) => c.key === 'GET /opportunities/search')?.search).get('status'), 'open');
  check('GET jobs: last page has no more', r.j.hasMore, false);
  r = await run(JOBS.GET, 'GET', '/api/jobs?all=1&status=bogus');
  check('GET jobs: bad status is 400', r.status, 400);
  r = await run(JOBS.GET, 'GET', '/api/jobs?all=1&pageSize=5000');
  check('GET jobs: pageSize is capped at 100', new URLSearchParams(calls.find((c) => c.key === 'GET /opportunities/search')?.search).get('limit'), '100');

  // Job shape: new fields from the opportunity
  const CRMLIB = await imp('lib/crm.js');
  const pl1 = [{ id: 'p1', name: 'Res', stages: [{ id: 's1', name: 'New lead' }] }];
  const jb = await CRMLIB.mapJob({ id: ID1, contactId: ID2, name: 'J', status: 'open', pipelineId: 'p1', pipelineStageId: 's1', assignedTo: 'u1', source: 'web', createdAt: '2026-10-01T00:00:00.000Z', lastStageChangeAt: '2026-10-05T01:02:03.000Z', contact: { companyName: 'Acme' } }, pl1, []);
  check('job: ownerId', jb.ownerId, 'u1');
  check('job: source', jb.source, 'web');
  check('job: createdAt ISO', jb.createdAt, '2026-10-01T00:00:00.000Z');
  check('job: stageSince from lastStageChangeAt', jb.stageSince, '2026-10-05T01:02:03.000Z');
  check('job: companyName from contact', jb.companyName, 'Acme');
  const jb2 = await CRMLIB.mapJob({ id: ID1, pipelineId: 'p1', pipelineStageId: 's1', dateAdded: '2026-10-01T00:00:00.000Z', lastStatusChangeAt: '2026-10-02T00:00:00.000Z' }, pl1, []);
  check('job: tolerant variants (dateAdded, lastStatusChangeAt)', jb2.createdAt + '|' + jb2.stageSince, '2026-10-01T00:00:00.000Z|2026-10-02T00:00:00.000Z');
  check('job: absent fields are empty, no companyName', jb2.ownerId + jb2.source + String('companyName' in jb2), 'false');
  const jb3 = await CRMLIB.mapJob({ id: ID1 }, pl1, []);
  check('job: no dates gives empty strings', jb3.createdAt + jb3.stageSince, '');

  // Token issuer: minted token passes verifyToken, other secret fails
  const AUTH = await imp('lib/auth.js');
  const { execFileSync } = await import('node:child_process');
  const issue = (sec, extra = []) => execFileSync(process.execPath, [path.join(here, 'issue-token.mjs'), '--env', path.join(here, 'no-such.env'), ...extra], { env: { ...process.env, SPRY_IFRAME_SECRET: sec, SPRY_CRM_LOCATION_ID: DEV } }).toString();
  const t1 = issue('issuer-test-secret', ['--hours', '2']);
  check('issuer: prints only the token', /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\n?$/.test(t1), true);
  check('issuer: token verifies', await AUTH.verifyToken(t1.trim(), 'issuer-test-secret', DEV), true);
  check('issuer: wrong secret fails', await AUTH.verifyToken(t1.trim(), 'other-secret', DEV), false);
  check('issuer: wrong location fails', await AUTH.verifyToken(t1.trim(), 'issuer-test-secret', 'OTHERLOC'), false);
  check('issuer: output never holds the secret', t1.includes('issuer-test-secret'), false);
  const expSec = JSON.parse(Buffer.from(t1.split('.')[1], 'base64url').toString()).exp - Math.floor(Date.now() / 1000);
  check('issuer: --hours 2 sets expiry near 2h', expSec > 7190 && expSec <= 7200, true);
  let refused = false; try { issue('issuer-test-secret', ['--hours', '9999']); } catch { refused = true; }
  check('issuer: --hours above 720 refused', refused, true);
  refused = false; try { issue('', []); } catch { refused = true; }
  check('issuer: no secret refused', refused, true);

  // Invoice edit, payment, void, delete (fake platform)
  const IV = 'invAAA111', IV2 = 'invBBB222';
  const mkPlat = (over = {}) => ({ _id: IV, name: 'Invoice', status: 'draft', invoiceNumber: '000020', currency: 'AUD', issueDate: '2026-10-30T00:00:00Z', dueDate: '2026-11-30T00:00:00Z', total: 110, amountPaid: 0, amountDue: 110, businessDetails: { name: 'Keep Biz' }, contactDetails: { id: ID1, name: 'ZZ-TEST A', email: 'a@example.invalid' }, termsNotes: '', invoiceItems: [{ _id: 'l1', name: 'Old', qty: 1, amount: 110 }], discount: { value: 0, type: 'fixed' }, ...over });
  const oneLine = X.invoiceToPlatform({ contactId: ID1, jobId: ID2, kind: 'other', items: [{ description: 'Old', qty: 1, unit: 'each', unitPrice: 100, gst: true }] }, { id: ID1, name: 'ZZ-TEST A', email: 'a@example.invalid' }, 'Biz', '2026-10-30');
  const plat = (over = {}) => mkPlat({ termsNotes: oneLine.termsNotes, ...over });
  routes = { ['GET /invoices/' + IV]: plat(), ['PUT /invoices/' + IV]: {} };
  r = await run(H.invoices.PUT, 'PUT', '/api/invoices?id=' + IV, { items: [{ id: 'x', description: 'New line', qty: 2, unit: 'm2', unitPrice: 50, gst: true }], notes: 'Edited' });
  const ip = calls.find((c) => c.key === 'PUT /invoices/' + IV);
  check('PUT invoice -> 200', r.status, 200);
  check('PUT invoice: full body sent with GST baked into the line', ip?.body?.invoiceItems?.[0]?.name + '|' + ip?.body?.invoiceItems?.[0]?.amount + '|' + ip?.body?.invoiceItems?.[0]?.qty, 'New line|55|2');
  check('PUT invoice: merged fields kept (number, business, dueDate, name, currency, contact)', [ip?.body?.invoiceNumber, ip?.body?.businessDetails?.name, ip?.body?.dueDate, ip?.body?.name, ip?.body?.currency, ip?.body?.contactDetails?.id].join('|'), '000020|Keep Biz|2026-11-30|Invoice|AUD|' + ID1);
  check('PUT invoice: marker keeps job and new unit', ip?.body?.termsNotes.includes('Edited') && X.mapInvoice({ ...plat(), termsNotes: ip.body.termsNotes, invoiceItems: ip.body.invoiceItems }).jobId + X.mapInvoice({ ...plat(), termsNotes: ip.body.termsNotes, invoiceItems: ip.body.invoiceItems }).items[0].unit, 'ghiJKL654321m2');
  check('PUT invoice: sends invoiceItems not items', 'items' in (ip?.body ?? {}), false);
  routes = { ['GET /invoices/' + IV]: plat({ status: 'sent' }) };
  r = await run(H.invoices.PUT, 'PUT', '/api/invoices?id=' + IV, { notes: 'x' });
  check('PUT non-draft -> 409', r.status + '|' + r.j.error, '409|Only drafts can be edited');
  check('PUT non-draft wrote nothing', calls.some((c) => c.key.startsWith('PUT ')), false);
  await bad('PUT invoice bad id', H.invoices.PUT, 'PUT', '/api/invoices?id=!', { notes: 'x' });
  await bad('PUT invoice bad item', H.invoices.PUT, 'PUT', '/api/invoices?id=' + IV, { items: [{ description: '', qty: 1, unitPrice: 1 }] });
  r = await run(H.invoices.DELETE, 'DELETE', '/api/invoices?id=' + IV);
  check('DELETE non-draft -> 409, no delete call', r.status + '|' + calls.some((c) => c.key.startsWith('DELETE ')), '409|false');
  routes = { ['GET /invoices/' + IV]: plat(), ['DELETE /invoices/' + IV]: {} };
  r = await run(H.invoices.DELETE, 'DELETE', '/api/invoices?id=' + IV);
  check('DELETE draft -> 200 ok, delete call made', r.status + '|' + JSON.stringify(r.j) + '|' + calls.some((c) => c.key === 'DELETE /invoices/' + IV), '200|{"ok":true}|true');
  await bad('DELETE invoice bad id', H.invoices.DELETE, 'DELETE', '/api/invoices?id=!');
  // payments
  routes = { ['GET /invoices/' + IV]: plat({ status: 'sent' }), ['POST /invoices/' + IV + '/record-payment']: {} };
  r = await run(H.pay.POST, 'POST', '/api/invoices/payment?id=' + IV, { amount: 200, method: 'cash' });
  check('payment over the amount due -> 400, no payment call', r.status + '|' + calls.some((c) => c.key.endsWith('record-payment')), '400|false');
  await bad('payment amount 0', H.pay.POST, 'POST', '/api/invoices/payment?id=' + IV, { amount: 0, method: 'cash' });
  await bad('payment bad method', H.pay.POST, 'POST', '/api/invoices/payment?id=' + IV, { amount: 5, method: 'bitcoin' });
  await bad('payment bad id', H.pay.POST, 'POST', '/api/invoices/payment?id=!', { amount: 5, method: 'cash' });
  routes = { ['GET /invoices/' + IV]: plat({ status: 'partially_paid', amountPaid: 40, amountDue: 70 }), ['POST /invoices/' + IV + '/record-payment']: {} };
  r = await run(H.pay.POST, 'POST', '/api/invoices/payment?id=' + IV, { amount: 40, method: 'bank', note: 'Ref 1' });
  const pc = calls.find((c) => c.key.endsWith('record-payment'));
  check('payment: bank maps to bank_transfer, amount and notes sent', [pc?.body?.mode, pc?.body?.amount, pc?.body?.notes].join('|'), 'bank_transfer|40|Ref 1');
  check('payment: part status and one synthetic row', r.status + '|' + r.j.invoice.status + '|' + r.j.invoice.payments.length + '|' + r.j.invoice.payments[0].amount + '|' + r.j.invoice.payments[0].method, '200|part|1|40|bank');
  routes = { ['GET /invoices/' + IV]: plat({ status: 'sent' }), ['POST /invoices/' + IV + '/record-payment']: {} };
  await run(H.pay.POST, 'POST', '/api/invoices/payment?id=' + IV, { amount: 10, method: 'cheque' });
  check('payment: cheque maps to cheque with a number', calls.find((c) => c.key.endsWith('record-payment'))?.body?.mode + '|' + !!calls.find((c) => c.key.endsWith('record-payment'))?.body?.cheque?.number, 'cheque|true');
  routes = { ['GET /invoices/' + IV]: plat({ status: 'paid', amountPaid: 110, amountDue: 0 }) };
  r = await run(H.pay.POST, 'POST', '/api/invoices/payment?id=' + IV, { amount: 5, method: 'cash' });
  check('payment on a paid invoice -> 409', r.status, 409);
  routes = { 'GET /invoices/': { invoices: [plat({ status: 'partially_paid', amountPaid: 40, amountDue: 70 })], total: 1 } };
  r = await run(H.invoices.GET, 'GET', '/api/invoices?contactId=' + ID1);
  check('GET invoices maps payments from amountPaid', r.j.invoices[0].payments.length + '|' + r.j.invoices[0].payments[0].amount, '1|40');
  // void
  routes = { ['GET /invoices/' + IV]: plat({ status: 'paid', amountPaid: 110, amountDue: 0 }), ['POST /invoices/' + IV + '/void']: {} };
  r = await run(H.void.POST, 'POST', '/api/invoices/void?id=' + IV, {});
  check('void on paid -> 409, no void call', r.status + '|' + calls.some((c) => c.key.endsWith('/void')), '409|false');
  routes = { ['GET /invoices/' + IV]: plat({ status: 'partially_paid', amountPaid: 5, amountDue: 105 }), ['POST /invoices/' + IV + '/void']: {} };
  r = await run(H.void.POST, 'POST', '/api/invoices/void?id=' + IV, {});
  check('void on part paid -> 409', r.status, 409);
  routes = { ['GET /invoices/' + IV]: plat(), ['POST /invoices/' + IV + '/void']: {} };
  r = await run(H.void.POST, 'POST', '/api/invoices/void?id=' + IV, {});
  check('void on a draft -> 409 (delete instead), no void call', r.status + '|' + calls.some((c) => c.key.endsWith('/void')), '409|false');
  routes = { ['GET /invoices/' + IV]: plat({ status: 'sent' }), ['POST /invoices/' + IV + '/void']: {} };
  r = await run(H.void.POST, 'POST', '/api/invoices/void?id=' + IV, { reason: 'Wrong job' });
  check('void on sent -> 200, status void, reason kept, void call made', r.status + '|' + r.j.invoice.status + '|' + r.j.invoice.voidReason + '|' + calls.some((c) => c.key === 'POST /invoices/' + IV + '/void'), '200|void|Wrong job|true');
  await bad('void bad id', H.void.POST, 'POST', '/api/invoices/void?id=!', {});

  // Send: drafts only
  const sendRoutes = (status, email = 'a@example.invalid') => ({ ['GET /invoices/' + IV]: plat({ status, contactDetails: { id: ID1, name: 'ZZ-TEST A', email } }), 'GET /users/': { users: [{ id: 'u1', name: 'Staff' }] }, ['POST /invoices/' + IV + '/send']: {} });
  routes = sendRoutes('draft');
  r = await run(H.send.POST, 'POST', '/api/invoices/send?id=' + IV);
  const sc1 = calls.find((c) => c.key === 'POST /invoices/' + IV + '/send');
  check('send on a draft -> 200, one send call, email only', r.status + '|' + calls.filter((c) => c.key.endsWith('/send')).length + '|' + sc1?.body?.action, '200|1|email');
  for (const st of ['sent', 'partially_paid', 'paid', 'void', 'viewed', 'overdue']) {
    routes = sendRoutes(st);
    r = await run(H.send.POST, 'POST', '/api/invoices/send?id=' + IV);
    check('send on ' + st + ' -> 409 "Only drafts can be sent", zero send calls', r.status + '|' + r.j.error + '|' + calls.filter((c) => c.key.endsWith('/send')).length, '409|Only drafts can be sent|0');
  }
  routes = sendRoutes('draft', '');
  r = await run(H.send.POST, 'POST', '/api/invoices/send?id=' + IV);
  check('send on a contact with no email -> 400, zero send calls', r.status + '|' + calls.filter((c) => c.key.endsWith('/send')).length, '400|0');

  // Open mode is ignored in production (answers 503 as if unset); the staff token is the header only
  const oldEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  const prodRes = await AUTH.authorize(new Request(ORIGIN + '/api/auth', { headers: { Origin: ORIGIN } }));
  check('production + ALLOW_OPEN=1 and no secret -> 503', prodRes?.status, 503);
  check('production 503 body holds no secret and no variable name', JSON.stringify(await prodRes.json()), '{"error":"Access not configured"}');
  if (oldEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = oldEnv;
  check('non-production + ALLOW_OPEN=1 and no secret -> open', await AUTH.authorize(new Request(ORIGIN + '/api/auth', { headers: { Origin: ORIGIN } })), null);
  process.env.SPRY_IFRAME_SECRET = secret;
  const qTok = mint({ loc: DEV, exp: now + 300 });
  check('?t= query token refused by authorize', (await AUTH.authorize(new Request(ORIGIN + '/api/auth?t=' + qTok, { headers: { Origin: ORIGIN } })))?.status, 401);
  check('header token accepted by authorize', await AUTH.authorize(new Request(ORIGIN + '/api/auth', { headers: { Origin: ORIGIN, 'X-Quote-Token': qTok } })), null);
  check('ALLOW_OPEN=1 with a secret still needs a token', (await AUTH.authorize(new Request(ORIGIN + '/api/auth', { headers: { Origin: ORIGIN } })))?.status, 401);
  process.env.SPRY_IFRAME_SECRET = '';

  // Body cap with a streaming count
  const HTTP = await imp('lib/http.js');
  const streamReq = (chunks, hdr = {}) => new Request(ORIGIN + '/x', { method: 'POST', headers: { 'Content-Type': 'application/json', ...hdr }, body: new ReadableStream({ start(c) { for (const ch of chunks) c.enqueue(new TextEncoder().encode(ch)); c.close(); } }), duplex: 'half' });
  const big = JSON.stringify({ s: 'x'.repeat(2000) });
  let cr = await HTTP.readJsonCapped(streamReq(['{"a":', '1}']), 100);
  check('capped read: small chunked body ok', cr.ok + '|' + cr.value?.a, 'true|1');
  cr = await HTTP.readJsonCapped(new Request(ORIGIN + '/x', { method: 'POST', body: big, headers: { 'content-length': String(big.length) } }), 1000);
  check('capped read: oversize with Content-Length refused', cr.ok + '|' + cr.error, 'false|Body too large');
  cr = await HTTP.readJsonCapped(new Request(ORIGIN + '/x', { method: 'POST', body: big, headers: { 'content-length': '5' } }), 1000);
  check('capped read: lying Content-Length does not bypass the cap', cr.ok + '|' + cr.error, 'false|Body too large');
  cr = await HTTP.readJsonCapped(streamReq([big.slice(0, 700), big.slice(700, 1400), big.slice(1400)]), 1000);
  check('capped read: oversize chunked body (no Content-Length) refused', cr.ok + '|' + cr.error, 'false|Body too large');
  cr = await HTTP.readJsonCapped(streamReq(['not json']), 1000);
  check('capped read: bad json refused', cr.ok + '|' + cr.error, 'false|Bad request');
  cr = await HTTP.readJsonCapped(streamReq(['[1]']), 1000);
  check('capped read: array body refused', cr.ok, false);
  cr = await HTTP.readJsonCapped(new Request(ORIGIN + '/x', { method: 'POST' }), 1000);
  check('capped read: no body refused', cr.ok, false);

  // CRM failure becomes a clean 502 with no CRM body
  routes = {};
  r = await run(H.notes.GET, 'GET', '/api/notes?contactId=' + ID1);
  check('CRM 404 -> 404 Not found, no raw body', r.status + ':' + JSON.stringify(r.j), '404:{\"error\":\"Not found\"}');
} else if (mode === 'public') {
  // Customer quote routes, in process: fake CRM fetch, JSON file store in a temp folder, no network. Needs `npm run server:build` first.
  const os = await import('node:os');
  const fs = await import('node:fs');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hub-public-'));
  const PUB = 'public-test-secret';
  Object.assign(process.env, { SPRY_CRM_TOKEN: 'fake', SPRY_CRM_API_BASE: 'http://crm.invalid/v', SPRY_CRM_LOCATION_ID: DEV, SPRY_ALLOW_OPEN: '', SPRY_IFRAME_SECRET: secret, SPRY_PUBLIC_LINK_SECRET: PUB, SPRY_STORE: 'file', SPRY_STORE_FILE: path.join(tmp, 'store.json'), SPRY_BUSINESS_NAME: 'Test Biz', SPRY_TIMEZONE: 'Australia/Melbourne' });
  const imp = (p) => import(pathToFileURL(path.join(here, '.build', p)).href);
  const L = await imp('lib/public-link.js');
  const GETQ = (await imp('handlers/public-quote.js')).GET;
  const RESP = (await imp('handlers/public-quote-respond.js')).POST;
  const LINK = (await imp('handlers/quote-link.js')).GET;
  const { getStore } = await imp('store/index.js');
  const store = await getStore();
  const calls = [];
  const JOB = 'jobAAA111', CON = 'conBBB222';
  let opp = { pipelineId: 'p1', pipelineStageId: 's2', status: 'open' };
  let oppDown = false;
  globalThis.fetch = async (url, init = {}) => {
    const u = new URL(url);
    const key = (init.method ?? 'GET') + ' ' + u.pathname.replace('/v', '');
    calls.push({ key, body: init.body ? JSON.parse(init.body) : undefined });
    if (oppDown && key.includes('/opportunities/' + JOB)) return new Response('{"message":"down"}', { status: 500 });
    const routes = {
      'GET /opportunities/pipelines': { pipelines: [{ id: 'p1', name: 'Res', stages: ['s1', 's2', 's3', 's4'].map((id, i) => ({ id, name: ['New Lead', 'Quote Sent', 'Quote Accepted', 'Job Booked'][i] })) }] },
      ['GET /opportunities/' + JOB]: { opportunity: { id: JOB, name: 'Roof job', ...opp, contact: { address1: '1 Test St', city: 'Testville', email: 'secret@example.invalid', phone: '0400000000' } } },
      ['GET /contacts/' + CON]: { contact: { id: CON, firstName: 'Travis', lastName: 'Gillespie', email: 'travis@example.invalid', phone: '0411111111' } },
      ['PUT /opportunities/' + JOB]: { opportunity: {} }, ['PUT /opportunities/' + JOB + '/status']: {},
    };
    const hit = routes[key];
    return hit ? new Response(JSON.stringify(hit), { status: 200 }) : new Response('{"message":"unrouted"}', { status: 404 });
  };
  const ORIGIN = 'http://x.test';
  let ipn = 0;
  const call = async (fn, m, p, body, hdr = {}) => {
    const r = await fn(new Request(ORIGIN + p, { method: m, headers: { Origin: ORIGIN, 'Content-Type': 'application/json', 'x-forwarded-for': '10.0.0.' + (++ipn), ...hdr }, body: body === undefined ? undefined : JSON.stringify(body) }));
    const text = await r.text();
    return { status: r.status, text, j: JSON.parse(text) };
  };
  const key = (id) => L.quoteKey(id);
  const get = async (id, k) => call(GETQ, 'GET', '/api/public/quote?id=' + id + (k === undefined ? '' : '&k=' + encodeURIComponent(k)));
  const act = async (id, body, k) => call(RESP, 'POST', '/api/public/quote/respond?id=' + id + '&k=' + encodeURIComponent(k ?? (await key(id))), body);
  const soon = new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10);
  const mk = (id, over = {}) => ({
    id, jobId: JOB, recipient: { kind: 'contact', id: CON }, number: 'Q-1', title: 'Roof', revision: 1, status: 'Sent', kind: 'primary', productType: 'Spray foam',
    validDays: 60, sentAt: '2026-10-01T00:00:00.000Z', validUntil: soon, notes: 'Public note', internalNote: 'INTERNAL ONLY', declineReason: 'old secret reason', poNumber: 'PO-SECRET',
    lines: [{ id: 'l1', section: 'Roof', name: 'Foam', description: '', qty: 100, unit: 'm2', unitPrice: 10, priceItemId: 'pi-secret' }],
    upgrades: [{ id: 'u1', lineId: 'l1', name: 'R4', description: '', unitPrice: 2, ticked: false }],
    payments: [{ id: 'p1', label: 'All', kind: 'percent', value: 100, dueRule: 'onCompletion' }],
    paymentPreset: 'full', termsId: 'custom', termsCustom: 'Plain terms text', createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-01T00:00:00.000Z', placeholder: true, ...over,
  });
  const put = (q) => store.put('quotes', q.id, q);
  for (const id of ['qSent', 'qOther', 'qTick', 'qAcc', 'qAcc2', 'qDec2', 'qLim', 'qFail', 'qLost', 'qLost2', 'qXff', 'qBig']) await put(mk(id));
  await put(mk('qExpS', { status: 'Expired', validUntil: '2020-01-01' }));
  await put(mk('qDraft', { status: 'Draft' }));
  await put(mk('qSup', { status: 'Superseded' }));
  await put(mk('qExp', { validUntil: '2020-01-01' }));
  await put(mk('qDec', { termsId: 'terms1', termsCustom: undefined }));
  await store.put('terms', 'terms1', { id: 'terms1', text: 'Terms from the library' });

  // Key rules
  const k1 = await key('qSent');
  check('key is 32 url-safe chars', /^[A-Za-z0-9_-]{32}$/.test(k1), true);
  check('key differs per quote', k1 !== (await key('qOther')), true);
  const ok = await get('qSent', k1);
  check('right key -> 200', ok.status, 200);
  const bad = [await get('qSent', 'x'.repeat(32)), await get('qSent', await key('qOther')), await get('qSent'), await get('qSent', ''), await get('nope', await key('nope')), await get('qDraft', await key('qDraft')), await get('qSup', await key('qSup'))];
  check('wrong key, other quote key, missing, empty, unknown id, draft, superseded all 404', bad.map((b) => b.status).join(','), '404,404,404,404,404,404,404');
  check('all those 404 bodies are identical', new Set(bad.map((b) => b.text)).size, 1);

  // GET shows only what the page needs
  check('GET: no email, phone or internal fields', /secret@|travis@|0400000000|0411111111|INTERNAL|PO-SECRET|old secret|pi-secret|priceItemId|poNumber|declineReason/.test(ok.text), false);
  check('GET: no other quote or the CRM job and contact ids', ok.text.includes('qOther') || ok.text.includes(JOB) || ok.text.includes(CON), false);
  check('GET: names and business', ok.j.recipientName + '|' + ok.j.jobName + '|' + ok.j.businessName + '|' + ok.j.jobAddress, 'Travis|Roof job|Test Biz|1 Test St, Testville');
  check('GET: quote fields', ok.j.quote.number + '|' + ok.j.quote.status + '|' + ok.j.quote.termsCustom + '|' + ok.j.quote.lines.length + '|' + ok.j.quote.notes, 'Q-1|Sent|Plain terms text|1|Public note');
  const lib = await get('qDec', await key('qDec'));
  check('GET: library terms resolved to text', lib.j.quote.termsCustom, 'Terms from the library');

  // Tick
  let r = await act('qTick', { action: 'tick', upgradeId: 'u1', ticked: true });
  check('tick on sent -> 200 and ticked', r.status + '|' + r.j.quote.upgrades[0].ticked, '200|true');
  check('tick persisted in the store', (await store.get('quotes', 'qTick')).data.upgrades[0].ticked, true);
  r = await act('qTick', { action: 'tick', upgradeId: 'zzz', ticked: true });
  check('tick unknown upgrade -> 400', r.status, 400);
  r = await act('qDraft', { action: 'tick', upgradeId: 'u1', ticked: true });
  check('tick on draft -> 404 (not viewable)', r.status, 404);
  await act('qDec', { action: 'decline', reason: 'Too dear' });
  r = await act('qDec', { action: 'tick', upgradeId: 'u1', ticked: true });
  check('tick on declined (not sent) -> 409', r.status, 409);
  r = await act('qExp', { action: 'tick', upgradeId: 'u1', ticked: true });
  check('tick on expired -> 410', r.status, 410);
  r = await act('qSent', { action: 'bogus' });
  check('unknown action -> 400', r.status, 400);

  // Accept: total recomputed on the server, client total ignored
  await act('qAcc', { action: 'tick', upgradeId: 'u1', ticked: true });
  calls.length = 0;
  r = await act('qAcc', { action: 'accept', acceptedTotal: 1, total: 1 });
  const stored = (await store.get('quotes', 'qAcc')).data;
  check('accept -> 200 accepted', r.status + '|' + r.j.quote.status, '200|Accepted');
  check('accept: total recomputed (100x10 + 100x2 = 1200, GST 120, total 1320), client total ignored', stored.acceptedTotal, 1320);
  check('accept: via online, acceptedAt set, acceptedPending true', stored.acceptedVia + '|' + !!stored.acceptedAt + '|' + stored.acceptedPending, 'online|true|true');
  check('accept: stage moved forward to Quote Accepted (s3)', JSON.stringify(calls.find((c) => c.key === 'PUT /opportunities/' + JOB)?.body), '{"pipelineStageId":"s3"}');
  check('accept: job set to won', JSON.stringify(calls.find((c) => c.key === 'PUT /opportunities/' + JOB + '/status')?.body), '{"status":"won"}');
  check('accept: crmMoved flag stored after the move', stored.crmMoved, true);
  // Idempotent second accept: no repeat CRM call while crmMoved is set
  calls.length = 0;
  const r2 = await act('qAcc', { action: 'accept' });
  check('repeat accept makes no CRM call', calls.filter((c) => c.key.startsWith('PUT ') || c.key.includes('pipelines')).length, 0);
  check('second accept -> same result', r2.status + '|' + r2.j.quote.acceptedAt + '|' + r2.j.quote.acceptedTotal, '200|' + r.j.quote.acceptedAt + '|1320');
  check('second accept does not rewrite the stored quote', (await store.get('quotes', 'qAcc')).data.updatedAt, stored.updatedAt);
  // Forward only: a job already past the accepted stage keeps its stage, an already won job gets no status call
  opp = { pipelineId: 'p1', pipelineStageId: 's4', status: 'won' };
  calls.length = 0;
  await act('qAcc2', { action: 'accept' });
  check('accept: later stage is not moved back, won is not rewritten', calls.some((c) => c.key.startsWith('PUT ')) ? 'wrote' : 'no writes', 'no writes');
  // A failed move is retried: no flag, then the next accept moves the job and sets the flag
  opp = { pipelineId: 'p1', pipelineStageId: 's2', status: 'open' };
  oppDown = true;
  r = await act('qFail', { action: 'accept' });
  check('failed CRM move: customer still gets 200 Accepted', r.status + '|' + r.j.quote.status, '200|Accepted');
  check('failed CRM move: crmMoved not set', (await store.get('quotes', 'qFail')).data.crmMoved, undefined);
  oppDown = false;
  calls.length = 0;
  await act('qFail', { action: 'accept' });
  check('retry after a failed move: job moved (stage and won)', calls.filter((c) => c.key.startsWith('PUT ')).length, 2);
  check('retry after a failed move: crmMoved now set', (await store.get('quotes', 'qFail')).data.crmMoved, true);
  // Staff set the job lost: never move it back to won (stage may still move forward)
  opp = { pipelineId: 'p1', pipelineStageId: 's2', status: 'lost' };
  calls.length = 0;
  await act('qLost', { action: 'accept' });
  check('lost job: stage moved forward, status NOT touched', JSON.stringify(calls.filter((c) => c.key.startsWith('PUT ')).map((c) => c.key.replace('/opportunities/' + JOB, 'job'))), '["PUT job"]');
  opp = { pipelineId: 'p1', pipelineStageId: 's2', status: 'abandoned' };
  calls.length = 0;
  await act('qLost2', { action: 'accept' });
  check('abandoned job: status NOT touched', calls.some((c) => c.key.endsWith('/status')), false);
  opp = { pipelineId: 'p1', pipelineStageId: 's2', status: 'open' };
  // Stored status Expired: tick and accept are refused with 410
  r = await act('qExpS', { action: 'tick', upgradeId: 'u1', ticked: true });
  check('tick on a stored Expired quote -> 410', r.status, 410);
  r = await act('qExpS', { action: 'accept' });
  check('accept on a stored Expired quote -> 410', r.status, 410);
  check('GET on a stored Expired quote shows Expired', (await get('qExpS', await key('qExpS'))).j.quote.status, 'Expired');
  r = await act('qExp', { action: 'accept' });
  check('accept after expiry -> 410', r.status, 410);
  r = await act('qDraft', { action: 'accept' });
  check('accept a draft -> 404', r.status, 404);

  // Decline leaves the job
  calls.length = 0;
  r = await act('qDec2', { action: 'decline', reason: '  Found cheaper  ' });
  const d = (await store.get('quotes', 'qDec2')).data;
  check('decline -> 200, declined, reason kept', r.status + '|' + d.status + '|' + d.declineReason + '|' + !!d.declinedAt, '200|Declined|Found cheaper|true');
  check('decline: no CRM write', calls.some((c) => c.key.startsWith('PUT ')), false);
  r = await act('qDec2', { action: 'accept' });
  check('accept after decline -> 409', r.status, 409);
  r = await act('qAcc', { action: 'decline' });
  check('decline after accept -> 409', r.status, 409);

  // Wrong key and other origin on POST
  check('POST wrong key -> 404', (await call(RESP, 'POST', '/api/public/quote/respond?id=qSent&k=' + 'y'.repeat(32), { action: 'accept' })).status, 404);
  check('POST from another origin -> 403', (await call(RESP, 'POST', '/api/public/quote/respond?id=qSent&k=' + k1, { action: 'tick', upgradeId: 'u1', ticked: true }, { Origin: 'http://evil.test' })).status, 403);

  // Rate limit: 30 a minute per quote id and IP
  L.resetRateLimit();
  const st = [];
  for (let i = 0; i < 32; i++) st.push((await call(GETQ, 'GET', '/api/public/quote?id=qLim&k=' + (await key('qLim')), undefined, { 'x-forwarded-for': '9.9.9.9' })).status);
  check('rate limit: first 30 ok, then 429', st.filter((x) => x === 200).length + '|' + st.slice(30).join(','), '30|429,429');
  check('rate limit: another IP is unaffected', (await call(GETQ, 'GET', '/api/public/quote?id=qLim&k=' + (await key('qLim')), undefined, { 'x-forwarded-for': '8.8.8.8' })).status, 200);

  // X-Forwarded-For: the rightmost entry (added by the proxy) counts, a rotating first entry does not bypass the limit
  L.resetRateLimit();
  const xs = [];
  for (let i = 0; i < 32; i++) xs.push((await call(GETQ, 'GET', '/api/public/quote?id=qXff&k=' + (await key('qXff')), undefined, { 'x-forwarded-for': 'spoof' + i + ', 7.7.7.7' })).status);
  check('XFF rotation of the first entry does not bypass the limit', xs.filter((x) => x === 200).length + '|' + xs.slice(30).join(','), '30|429,429');
  const ipOf = (h) => L.clientIp(new Request(ORIGIN + '/x', { headers: h }));
  check('clientIp: rightmost XFF entry', ipOf({ 'x-forwarded-for': '1.1.1.1, 2.2.2.2 , 3.3.3.3' }), '3.3.3.3');
  check('clientIp: falls back to x-real-ip', ipOf({ 'x-real-ip': '4.4.4.4' }), '4.4.4.4');
  check('clientIp: nothing -> unknown', ipOf({}), 'unknown');
  check('clientIp: empty XFF falls back to x-real-ip', ipOf({ 'x-forwarded-for': ' , ', 'x-real-ip': '5.5.5.5' }), '5.5.5.5');
  // In-memory map is capped at 10000 entries, oldest dropped
  L.resetRateLimit();
  for (let i = 0; i < 30; i++) L.rateLimited('cap', 'first');
  check('cap: before the flood the oldest key is at its limit', L.rateLimited('cap', 'first'), true);
  L.resetRateLimit();
  for (let i = 0; i < 30; i++) L.rateLimited('cap', 'first');
  for (let i = 0; i < 10005; i++) L.rateLimited('cap', 'ip' + i);
  check('cap: after 10005 other keys the oldest entry was dropped (counter restarted)', L.rateLimited('cap', 'first'), false);
  L.resetRateLimit();
  // Missing Origin: GET is allowed (plain navigations send none), a POST is refused by the gate (403)
  const noOrigin = async (fn, m, p, body) => { const r0 = await fn(new Request(ORIGIN + p, { method: m, headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '10.1.1.' + (++ipn) }, body: body === undefined ? undefined : JSON.stringify(body) })); return r0.status; };
  check('GET without Origin is allowed', await noOrigin(GETQ, 'GET', '/api/public/quote?id=qSent&k=' + k1), 200);
  check('POST respond without Origin -> 403', await noOrigin(RESP, 'POST', '/api/public/quote/respond?id=qSent&k=' + k1, { action: 'accept' }), 403);
  check('POST respond without Origin changed nothing', (await store.get('quotes', 'qSent')).data.status, 'Sent');
  // Respond body cap: 64 KB, with and without Content-Length, chunked
  const bigBody = JSON.stringify({ action: 'tick', upgradeId: 'u1', ticked: true, pad: 'x'.repeat(70 * 1024) });
  const k1big = await key('qBig');
  const rq = (extra, body) => RESP(new Request(ORIGIN + '/api/public/quote/respond?id=qBig&k=' + k1big, { method: 'POST', headers: { Origin: ORIGIN, 'Content-Type': 'application/json', 'x-forwarded-for': '10.2.2.' + (++ipn), ...extra }, body, duplex: 'half' })).then((x) => x.status);
  check('respond: oversize body with Content-Length -> 400', await rq({ 'content-length': String(bigBody.length) }, bigBody), 400);
  check('respond: oversize body without Content-Length -> 400', await rq({}, bigBody), 400);
  const chunked = new ReadableStream({ start(c) { for (let i = 0; i < bigBody.length; i += 8192) c.enqueue(new TextEncoder().encode(bigBody.slice(i, i + 8192))); c.close(); } });
  check('respond: oversize chunked body -> 400', await rq({}, chunked), 400);
  check('respond: a normal body still works', (await act('qBig', { action: 'tick', upgradeId: 'u1', ticked: true })).status, 200);

  // 503 when the secret is unset
  process.env.SPRY_PUBLIC_LINK_SECRET = '';
  r = await get('qSent', k1);
  check('secret unset: GET -> 503 Not configured', r.status + '|' + r.text, '503|{"error":"Not configured"}');
  check('secret unset: POST -> 503', (await act('qSent', { action: 'accept' }, k1)).status, 503);
  process.env.SPRY_PUBLIC_LINK_SECRET = PUB;

  // quote-link is staff only
  const tok = mint({ loc: DEV, exp: now + 300 });
  const lk = (hdr) => call(LINK, 'GET', '/api/quote-link?id=qSent', undefined, hdr);
  check('quote-link without a staff token -> 401', (await lk({})).status, 401);
  check('quote-link with the public key as token -> 401', (await lk({ 'X-Quote-Token': k1 })).status, 401);
  const lr = await lk({ 'X-Quote-Token': tok });
  check('quote-link with a staff token -> 200 and the key', lr.status + '|' + (lr.j.key === k1), '200|true');
  check('quote-link bad id -> 400', (await call(LINK, 'GET', '/api/quote-link?id=a%20b', undefined, { 'X-Quote-Token': tok })).status, 400);
  check('the returned key opens the quote', (await get('qSent', lr.j.key)).status, 200);
  fs.rmSync(tmp, { recursive: true, force: true });
} else if (mode === 'live') {
  // Real Dev credentials from the .env loader; only the throwaway iframe secret is set here.
  loadEnv(path.resolve(here, '..', '..', '.env'));
  if (process.env.SPRY_CRM_LOCATION_ID !== DEV) { console.log('Refused: Dev only (SPRY_CRM_LOCATION_ID must be the Dev location).'); process.exit(1); }
  await start(8793, { SPRY_IFRAME_SECRET: secret });
  const U = 'http://127.0.0.1:8793';
  const tok = mint({ loc: DEV, exp: now + 600 });
  const H = { 'X-Quote-Token': tok, Origin: U, 'Content-Type': 'application/json' };
  const api = async (m, p, b) => { const r = await fetch(U + p, { method: m, headers: H, body: b ? JSON.stringify(b) : undefined }); return { status: r.status, h: r.headers, j: await r.json().catch(() => ({})) }; };
  const created = {};
  try {
    const cfg = await api('GET', '/api/pipelines');
    check('GET pipelines', cfg.status, 200);
    if (cfg.status !== 200) throw new Error('pipelines failed: ' + JSON.stringify(cfg.j).slice(0, 120));
    console.log('  pipelines=' + cfg.j.pipelines.length + ' stagesInFirst=' + cfg.j.pipelines[0].stages.length + ' hasNewLead=' + cfg.j.pipelines.map((p) => p.stages.some((s) => s.name.toLowerCase() === 'new lead')).join(','));
    const f = await api('GET', '/api/opportunity-fields');
    check('GET opportunity-fields', f.status, 200);
    console.log('  fields=' + f.j.fields.length + ' shape=' + Object.keys(f.j.fields[0] || {}).join(','));
    const s = await api('GET', '/api/contacts?q=ZZ-TEST');
    check('GET contacts search', s.status, 200);
    console.log('  contacts=' + s.j.contacts.length + ' total=' + s.j.total + ' shape=' + Object.keys(s.j.contacts[0] || {}).join(','));
    const all = await api('GET', '/api/jobs?page=1');
    check('GET jobs (all open)', all.status, 200);
    console.log('  jobs=' + all.j.jobs.length + ' shape=' + Object.keys(all.j.jobs[0] || {}).join(','));

    // Make a ZZ-TEST contact with the server's own CRM client (token stays inside it), then POST a job for it.
    const { crmFetch } = await import(pathToFileURL(path.join(here, '.build', 'lib', 'env.js')).href);
    const stamp = Date.now();
    const cr = await crmFetch('/contacts/', { method: 'POST', body: JSON.stringify({ locationId: DEV, firstName: 'ZZ-TEST', lastName: 'Proxy ' + stamp, email: `zz-test-proxy-${stamp}@example.com` }) });
    created.contact = (await cr.json()).contact?.id;
    check('create ZZ-TEST contact (CRM)', cr.status, 201);
    const gc = await api('GET', '/api/contact?id=' + created.contact);
    check('GET contact', gc.status, 200);
    console.log('  contact shape=' + Object.keys(gc.j.contact || {}).join(','));
    const pj = await api('POST', '/api/jobs', { contactId: created.contact, title: 'ZZ-TEST proxy job', monetaryValue: 100 });
    check('POST job', pj.status, 201);
    created.job = pj.j.job?.id;
    console.log('  job shape=' + Object.keys(pj.j.job || {}).join(',') + ' stage="' + pj.j.job?.stage + '" stageFallback=' + (pj.h.get('x-stage-fallback') === '1'));
    const cj = await api('GET', '/api/jobs?contactId=' + created.contact);
    check('GET jobs by contactId', cj.status, 200);
    console.log('  jobs for contact=' + (cj.j.jobs || []).length);

    // Extended routes (counts and statuses only). NOT YET RUN against Dev when written: the first run may show shape differences.
    const up = await api('POST', '/api/contact', { name: 'ZZ-TEST Upsert ' + stamp, email: `zz-test-up-${stamp}@example.com` });
    check('POST contact (upsert)', up.status, 201);
    created.contact2 = up.j.contact?.id;
    const up2 = await api('POST', '/api/contact', { name: 'ZZ-TEST Upsert ' + stamp, email: `zz-test-up-${stamp}@example.com` });
    check('POST contact twice gives same id (no duplicate)', up2.j.contact?.id === created.contact2, true);
    check('PUT contact', (await api('PUT', '/api/contact?id=' + created.contact2, { phone: '' })).status, 200);
    const st = (cfg.j.pipelines[0].stages[1] || cfg.j.pipelines[0].stages[0]).name;
    const pu = await api('PUT', '/api/job?id=' + created.job, { stage: st, monetaryValue: 250, status: 'open' });
    check('PUT job', pu.status, 200);
    console.log('  job stage after=' + pu.j.job?.stage + ' value=' + pu.j.job?.monetaryValue);
    check('POST participants (extra contact)', (await api('POST', '/api/participants', { jobId: created.job, kind: 'contact', id: created.contact2 })).status, 200);
    const pl = await api('GET', '/api/participants?jobId=' + created.job);
    console.log('  participants=' + (pl.j.participants || []).length + ' roles=' + (pl.j.participants || []).map((p) => p.role).join(','));
    check('DELETE participants', (await api('DELETE', '/api/participants?jobId=' + created.job + '&kind=contact&id=' + created.contact2)).status, 200);
    const nt = await api('POST', '/api/notes', { contactId: created.contact, body: 'ZZ-TEST note' });
    check('POST notes', nt.status, 201);
    const nl = await api('GET', '/api/notes?contactId=' + created.contact);
    console.log('  notes=' + (nl.j.notes || []).length);
    check('DELETE notes', (await api('DELETE', '/api/notes?contactId=' + created.contact + '&id=' + nt.j.note?.id)).status, 200);
    const tk = await api('POST', '/api/tasks', { contactId: created.contact, title: 'ZZ-TEST task' });
    check('POST tasks', tk.status, 201);
    check('PUT tasks completed', (await api('PUT', '/api/tasks?contactId=' + created.contact + '&id=' + tk.j.task?.id, { completed: true })).j.task?.completed, true);
    console.log('  tasks=' + ((await api('GET', '/api/tasks?contactId=' + created.contact)).j.tasks || []).length);
    created.task = tk.j.task?.id;
    const tg = await api('POST', '/api/tags', { contactId: created.contact, tags: ['in-quote-queue'] });
    console.log('  tags after add=' + (tg.j.tags || []).length);
    check('POST tags', tg.status, 200);
    check('DELETE tags', (await api('DELETE', '/api/tags?contactId=' + created.contact + '&tag=in-quote-queue')).status, 200);
    check('GET users', (await api('GET', '/api/users')).status, 200);
    const iv = await api('POST', '/api/invoices', { contactId: created.contact, jobId: created.job, kind: 'deposit', discount: 0, items: [{ description: 'ZZ-TEST item', qty: 1, unit: 'each', unitPrice: 10, gst: true }] });
    check('POST invoices (draft)', iv.status, 201);
    created.invoice = iv.j.invoice?.id;
    console.log('  invoice status=' + iv.j.invoice?.status + ' jobIdKept=' + (iv.j.invoice?.jobId === created.job) + ' amount=' + iv.j.invoice?.amount);
    console.log('  invoices for contact=' + ((await api('GET', '/api/invoices?contactId=' + created.contact)).j.invoices || []).length);
    // Send test: only to this ZZ-TEST contact, which has an example.com email and no phone. Email channel only.
    check('POST invoices/send (ZZ-TEST contact, email only)', (await api('POST', '/api/invoices/send?id=' + created.invoice)).status, 200);
  } catch (e) {
    console.log('ERROR ' + e.message);
    process.exitCode = 1;
  } finally {
    // cleanup and confirm gone (job first, then contact)
    const { crmFetch } = await import(pathToFileURL(path.join(here, '.build', 'lib', 'env.js')).href);
    const alt = 'altId=' + DEV + '&altType=location';
    if (created.invoice) {
      let d = await crmFetch('/invoices/' + created.invoice + '?' + alt, { method: 'DELETE' });
      if (!d.ok) { await crmFetch('/invoices/' + created.invoice + '/void', { method: 'POST', body: JSON.stringify({ altId: DEV, altType: 'location' }) }); d = await crmFetch('/invoices/' + created.invoice + '?' + alt, { method: 'DELETE' }); }
      check('invoice gone after void/delete', (await crmFetch('/invoices/' + created.invoice + '?' + alt)).ok, false);
    }
    if (created.contact2) { await crmFetch('/contacts/' + created.contact2, { method: 'DELETE' }); check('contact2 gone after delete', (await crmFetch('/contacts/' + created.contact2)).ok, false); }
    if (created.job) { await crmFetch('/opportunities/' + created.job, { method: 'DELETE' }); check('job gone after delete', (await crmFetch('/opportunities/' + created.job)).ok, false); }
    if (created.contact) { await crmFetch('/contacts/' + created.contact, { method: 'DELETE' }); check('contact gone after delete', (await crmFetch('/contacts/' + created.contact)).ok, false); }
  }
  stop();
} else if (mode === 'invoices2') {
  // Live Dev group for edit, payment, void and delete. NEVER sends an invoice or a message. Made-up ZZ-TEST records only.
  // Leaves behind the invoice that got payments (the platform will not void or delete it).
  loadEnv(path.resolve(here, '..', '..', '.env'));
  if (process.env.SPRY_CRM_LOCATION_ID !== DEV) { console.log('Refused: Dev only (SPRY_CRM_LOCATION_ID must be the Dev location).'); process.exit(1); }
  await start(8794, { SPRY_IFRAME_SECRET: secret });
  const U = 'http://127.0.0.1:8794';
  const H = { 'X-Quote-Token': mint({ loc: DEV, exp: now + 600 }), Origin: U, 'Content-Type': 'application/json' };
  const api = async (m, p, b) => { const r = await fetch(U + p, { method: m, headers: H, body: b ? JSON.stringify(b) : undefined }); return { status: r.status, j: await r.json().catch(() => ({})) }; };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const { crmFetch } = await import(pathToFileURL(path.join(here, '.build', 'lib', 'env.js')).href);
  const alt = 'altId=' + DEV + '&altType=location';
  const stamp = Date.now();
  const made = { drafts: [] };
  const mk = async (label) => { const r = await api('POST', '/api/invoices', { contactId: made.contact, jobId: 'zzTestJob01', kind: 'other', discount: 0, items: [{ description: 'ZZ-TEST ' + label, qty: 1, unit: 'each', unitPrice: 100, gst: true }] }); check('create draft ' + label, r.status, 201); return r.j.invoice?.id; };
  try {
    const cr = await crmFetch('/contacts/', { method: 'POST', body: JSON.stringify({ locationId: DEV, firstName: 'ZZ-TEST', lastName: 'Inv2 ' + stamp, email: `zz-test-inv2-${stamp}@example.com` }) });
    made.contact = (await cr.json()).contact?.id;
    check('create ZZ-TEST contact', cr.status, 201);
    // 1. edit a draft
    const a = await mk('edit'); made.drafts.push(a);
    const before = (await api('GET', '/api/invoices?contactId=' + made.contact)).j.invoices.find((i) => i.id === a);
    const ed = await api('PUT', '/api/invoices?id=' + a, { items: [{ id: 'x', description: 'ZZ-TEST edited line', qty: 2, unit: 'm2', unitPrice: 100, gst: true }], notes: 'ZZ-TEST edited' });
    check('PUT invoice (edit draft)', ed.status, 200);
    const rb = await api('GET', '/api/invoices?contactId=' + made.contact);
    const after = (rb.j.invoices || []).find((i) => i.id === a);
    console.log('  edit: amount ' + before?.amount + ' -> ' + after?.amount + ' line="' + after?.items?.[0]?.description + '" qty=' + after?.items?.[0]?.qty + ' unit=' + after?.items?.[0]?.unit + ' notes="' + after?.notes + '" jobIdKept=' + (after?.jobId === 'zzTestJob01'));
    check('edit landed (amount changed 110 -> 220)', before?.amount + '->' + after?.amount, '110->220');
    // 2. payments on a second invoice (cannot be deleted afterwards)
    const p = await mk('payments'); made.paid = p;
    const sp = await api('POST', '/api/invoices/payment?id=' + p, { amount: 50, method: 'cash', note: 'ZZ-TEST part' });
    check('POST payment part (50 cash)', sp.status, 200);
    console.log('  part: status=' + sp.j.invoice?.status + ' payments=' + (sp.j.invoice?.payments || []).length + ' amount=' + sp.j.invoice?.payments?.[0]?.amount);
    const over = await api('POST', '/api/invoices/payment?id=' + p, { amount: 999, method: 'cash' });
    check('payment over the amount due -> 400', over.status, 400);
    await sleep(6000);
    const fp = await api('POST', '/api/invoices/payment?id=' + p, { amount: 60, method: 'bank', note: 'ZZ-TEST rest' });
    check('POST payment full (rest 60, bank)', fp.status, 200);
    console.log('  full: status=' + fp.j.invoice?.status + ' payments=' + (fp.j.invoice?.payments || []).length);
    check('second invoice is paid', fp.j.invoice?.status, 'paid');
    check('void on paid -> 409', (await api('POST', '/api/invoices/void?id=' + p, {})).status, 409);
    check('delete on paid -> 409', (await api('DELETE', '/api/invoices?id=' + p)).status, 409);
    // 3. void a draft: the platform and this route refuse drafts (draft: delete it); a void needs a SENT invoice and sending is not allowed here
    const v = await mk('void'); made.drafts.push(v);
    const vr = await api('POST', '/api/invoices/void?id=' + v, { reason: 'ZZ-TEST' });
    check('void on a draft -> 409 (drafts are deleted, not voided)', vr.status, 409);
    // 4. delete a draft
    const d = await mk('delete');
    check('DELETE draft', (await api('DELETE', '/api/invoices?id=' + d)).status, 200);
    check('deleted draft is gone', (await crmFetch('/invoices/' + d + '?' + alt)).ok, false);
  } catch (e) {
    console.log('ERROR ' + e.message);
    process.exitCode = 1;
  } finally {
    for (const id of made.drafts) { await crmFetch('/invoices/' + id + '?' + alt, { method: 'DELETE' }); check('cleanup draft ' + id + ' gone', (await crmFetch('/invoices/' + id + '?' + alt)).ok, false); }
    if (made.paid) console.log('LEFT BEHIND (platform refuses delete or void after payment): ZZ-TEST invoice ' + made.paid + ' (paid) for contact ' + made.contact);
    if (made.contact) { const dc = await crmFetch('/contacts/' + made.contact, { method: 'DELETE' }); console.log('  contact delete status ' + dc.status + (made.paid ? ' (kept if it still has the paid invoice)' : '')); }
  }
  stop();
} else console.log('usage: node server/test-run.mjs lock|unit|public|live|invoices2');
