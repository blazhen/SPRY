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
  ['GET', '/api/files?jobId=x'], ['POST', '/api/files'], ['DELETE', '/api/files?id=x'],
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
    ['GET /locations/' + DEV + '/customFields']: { customFields: [{ id: 'f1', fieldKey: 'opportunity.quote_revision', name: 'Quote revision', dataType: 'NUMERICAL' }, { id: 'fsite1', fieldKey: 'opportunity.site_address', name: 'Site address', dataType: 'TEXT' }, { id: 'fnote1', fieldKey: 'opportunity.access_notes', name: 'Access notes', dataType: 'LARGE_TEXT' }] },
    ['GET /opportunities/' + ID1]: { opportunity: { id: ID1, pipelineId: 'p1', pipelineStageId: 's2', name: 'J', status: 'won', monetaryValue: 5, contactId: ID2, contact: { address1: '9 Contact Home Rd', city: 'Elsewhere' }, customFields: [{ id: 'fsite1', fieldValueString: '12 Site St, Dandenong' }, { id: 'fnote1', fieldValueString: 'Gate code 1234' }] } },
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

  // Job site address and access notes: the existing opportunity custom fields site_address and access_notes, sent by id
  r = await run(H.job.PUT, 'PUT', '/api/job?id=' + ID1, { siteAddress: '5 New Site Rd, Berwick', accessNotes: 'Dog in yard. Ring the bell.' });
  check('PUT job siteAddress/accessNotes -> 200', r.status, 200);
  const putSite = calls.filter((c) => c.key === 'PUT /opportunities/' + ID1).pop();
  check('PUT job: site address and access notes sent to the right field ids', JSON.stringify(putSite?.body?.customFields), '[{"id":"fsite1","field_value":"5 New Site Rd, Berwick"},{"id":"fnote1","field_value":"Dog in yard. Ring the bell."}]');
  check('PUT job: nothing else in that write', Object.keys(putSite?.body ?? {}).join(','), 'customFields');
  r = await run(H.job.PUT, 'PUT', '/api/job?id=' + ID1, { siteAddress: '' });
  check('PUT job: an empty site address clears the field (sent as an empty text)', JSON.stringify(calls.filter((c) => c.key === 'PUT /opportunities/' + ID1).pop()?.body?.customFields), '[{"id":"fsite1","field_value":""}]');
  r = await run(H.job.PUT, 'PUT', '/api/job?id=' + ID1, { siteAddress: 5 });
  check('PUT job: siteAddress must be text -> 400', r.status, 400);
  check('PUT job: a refused write sent nothing to the CRM', calls.some((c) => c.key.startsWith('PUT ')), false);
  r = await run(H.job.PUT, 'PUT', '/api/job?id=' + ID1, { name: 'J' });
  check('PUT job read-back: address is the SITE address field', r.j.job?.address + '|' + r.j.job?.siteAddress + '|' + r.j.job?.accessNotes, '12 Site St, Dandenong|12 Site St, Dandenong|Gate code 1234');
  check('PUT job read-back: the contact address is not used as the job address', JSON.stringify(r.j.job).includes('9 Contact Home Rd'), false);

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

  // Create a job with a site address and access notes: written as the two existing custom fields, by id
  routes = {
    'GET /opportunities/pipelines': { pipelines: [{ id: 'p1', name: 'Res', stages: [{ id: 's1', name: 'New lead' }] }] },
    ['GET /locations/' + DEV + '/customFields']: { customFields: [] },
    'POST /opportunities/': { opportunity: { id: ID1, contactId: ID2, name: 'Made', status: 'open', pipelineId: 'p1', pipelineStageId: 's1' } },
  };
  r = await run(JOBS.POST, 'POST', '/api/jobs', { contactId: ID2, title: 'Made', siteAddress: '  7 Site Ln, Pakenham  ', accessNotes: 'Key under the mat' });
  check('POST jobs with site address -> 201', r.status, 201);
  const mkPost = calls.find((c) => c.key === 'POST /opportunities/');
  check('POST jobs: site address and access notes sent to the right field ids', JSON.stringify(mkPost?.body?.customFields), '[{"id":"fsite1","field_value":"7 Site Ln, Pakenham"},{"id":"fnote1","field_value":"Key under the mat"}]');
  r = await run(JOBS.POST, 'POST', '/api/jobs', { contactId: ID2, title: 'Plain' });
  check('POST jobs without them sends no custom fields', calls.filter((c) => c.key === 'POST /opportunities/').pop()?.body?.customFields, undefined);
  r = await run(JOBS.POST, 'POST', '/api/jobs', { contactId: ID2, title: 'Bad', siteAddress: 7 });
  check('POST jobs: siteAddress must be text -> 400', r.status, 400);

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
      ['GET /locations/' + DEV + '/customFields']: { customFields: [{ id: 'fsite1', fieldKey: 'opportunity.site_address', name: 'Site address', dataType: 'TEXT' }] },
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

  // Round 5: opens of the customer page are counted (count and times only), the 404s are not
  const opened = (await store.get('quoteOpens', 'qSent'))?.data;
  check('open recorded: one open after the first good GET', opened && opened.count, 1);
  check('open record holds only count, first and last', Object.keys(opened).sort().join(','), 'count,first,last');
  await get('qSent', k1);
  check('a second GET inside a minute counts once', (await store.get('quoteOpens', 'qSent')).data.count, 1);
  const prev = (await store.get('quoteOpens', 'qSent')).data;
  await store.put('quoteOpens', 'qSent', { ...prev, last: new Date(Date.now() - 120000).toISOString() });
  await get('qSent', k1);
  const again = (await store.get('quoteOpens', 'qSent')).data;
  check('an open two minutes later counts again, first time kept', again.count + '|' + (again.first === prev.first), '2|true');
  check('no open recorded for wrong key, draft or unknown id', [await store.get('quoteOpens', 'qDraft'), await store.get('quoteOpens', 'qOther'), await store.get('quoteOpens', 'nope')].filter(Boolean).length, 0);
  check('the open record has no ip, device or name', /ip|agent|name|email|phone|10\.0\.0/i.test(JSON.stringify(again)), false);

  // GET shows only what the page needs
  check('GET: no email, phone or internal fields', /secret@|travis@|0400000000|0411111111|INTERNAL|PO-SECRET|old secret|pi-secret|priceItemId|poNumber|declineReason/.test(ok.text), false);
  check('GET: no other quote or the CRM job and contact ids', ok.text.includes('qOther') || ok.text.includes(JOB) || ok.text.includes(CON), false);
  check('GET: names and business', ok.j.recipientName + '|' + ok.j.jobName + '|' + ok.j.businessName + '|' + ok.j.jobAddress, 'Travis|Roof job|Test Biz|1 Test St, Testville');
  check('GET: quote fields', ok.j.quote.number + '|' + ok.j.quote.status + '|' + ok.j.quote.termsCustom + '|' + ok.j.quote.lines.length + '|' + ok.j.quote.notes, 'Q-1|Sent|Plain terms text|1|Public note');
  // The job SITE address (custom field site_address) wins over the person's address once it is filled in
  opp = { ...opp, customFields: [{ id: 'fsite1', fieldValueString: '55 Site Rd, Dandenong VIC' }] };
  const withSite = await get('qSent', k1);
  check('GET: job address is the site_address field when set', withSite.j.jobAddress, '55 Site Rd, Dandenong VIC');
  opp = { pipelineId: 'p1', pipelineStageId: 's2', status: 'open' };
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
} else if (mode === 'contacts') {
  // Round 3: mobile, home address and private note are contact custom fields in the CRM, created when missing. Fake CRM, no network.
  Object.assign(process.env, { SPRY_CRM_TOKEN: 'fake', SPRY_CRM_API_BASE: 'http://crm.invalid/v', SPRY_CRM_LOCATION_ID: DEV, SPRY_ALLOW_OPEN: '', SPRY_IFRAME_SECRET: secret, SPRY_STORE: 'file' });
  const imp = (p) => import(pathToFileURL(path.join(here, '.build', p)).href);
  const H = await imp('handlers/contact-write.js');
  const HG = await imp('handlers/contact.js');
  const HF = await imp('handlers/contact-fields.js');
  const CON = 'conAAA111';
  const defs = [{ id: 'fOther1', fieldKey: 'contact.roof_type', name: 'Roof type', dataType: 'TEXT' }];
  let values = {};
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    const u = new URL(url);
    const key = (init.method ?? 'GET') + ' ' + u.pathname.replace('/v', '');
    const body = init.body ? JSON.parse(init.body) : undefined;
    calls.push({ key, body });
    const json = (o) => new Response(JSON.stringify(o), { status: 200 });
    if (key === 'GET /locations/' + DEV + '/customFields') return json({ customFields: defs });
    if (key === 'POST /locations/' + DEV + '/customFields') {
      const id = 'fNew' + defs.length;
      defs.push({ id, fieldKey: 'contact.' + body.name.toLowerCase().replace(/\s+/g, '_'), name: body.name, dataType: body.dataType });
      return json({ customField: { id } });
    }
    if (key === 'PUT /contacts/' + CON) {
      for (const f of body.customFields ?? []) values[f.id] = f.field_value;
      return json({ contact: { id: CON } });
    }
    if (key === 'GET /contacts/' + CON) {
      return json({ contact: { id: CON, firstName: 'Zed', lastName: 'Test', email: 'z@example.invalid', phone: '0400000000', customFields: Object.entries(values).map(([id, value]) => ({ id, value })) } });
    }
    return new Response('{"message":"unrouted"}', { status: 404 });
  };
  const ORIGIN = 'http://x.test';
  let ipn = 0;
  const tok = mint({ loc: DEV, exp: now + 300 });
  const call = async (fn, m, p, body) => {
    const r = await fn(new Request(ORIGIN + p, { method: m, headers: { Origin: ORIGIN, 'Content-Type': 'application/json', 'x-forwarded-for': '10.1.0.' + (++ipn), 'X-Quote-Token': tok }, body: body === undefined ? undefined : JSON.stringify(body) }));
    const text = await r.text();
    return { status: r.status, text, j: JSON.parse(text) };
  };
  let r = await call(H.PUT, 'PUT', '/api/contact?id=' + CON, { mobile: '0411 222 333', homeAddress: '5 Test St, Testville', privateNote: 'Prefers texts' });
  check('PUT mobile, address and note -> 200', r.status, 200);
  check('the three fields were created in the CRM (3 POSTs)', calls.filter((c) => c.key.startsWith('POST /locations/')).length, 3);
  check('the answer carries the three values', [r.j.contact.mobile, r.j.contact.homeAddress, r.j.contact.privateNote].join('|'), '0411 222 333|5 Test St, Testville|Prefers texts');
  const put = calls.find((c) => c.key === 'PUT /contacts/' + CON);
  check('values are sent as customFields with field_value, by field id', put.body.customFields.map((f) => f.id + '=' + f.field_value).join(','), 'fNew1=0411 222 333,fNew2=5 Test St, Testville,fNew3=Prefers texts');
  const before = calls.length;
  r = await call(H.PUT, 'PUT', '/api/contact?id=' + CON, { privateNote: '' });
  check('clearing the note -> 200 and no new field is created', r.status + '|' + calls.slice(before).filter((c) => c.key.startsWith('POST /locations/')).length, '200|0');
  check('the cleared note comes back empty, the others stay', [r.j.contact.mobile, r.j.contact.privateNote].join('|'), '0411 222 333|');
  r = await call(HG.GET, 'GET', '/api/contact?id=' + CON);
  check('GET reads the values back', r.j.contact.homeAddress, '5 Test St, Testville');
  r = await call(H.PUT, 'PUT', '/api/contact?id=' + CON, { mobile: 5 });
  check('a non-text mobile -> 400', r.status, 400);
  r = await call(H.PUT, 'PUT', '/api/contact?id=' + CON, {});
  check('nothing to update -> 400', r.status, 400);
  r = await call(HF.GET, 'GET', '/api/contact-fields');
  check('the contact fields editor does not list the three Hub fields', r.j.fields.map((f) => f.name).join('|'), 'Roof type');
  check('every write stayed on the configured location', calls.filter((c) => c.key.includes('/locations/') && !c.key.includes('/locations/' + DEV + '/')).length, 0);
} else if (mode === 'tasks') {
  // Round 8: tasks with title, description and time. Fake CRM (assumes the CRM task takes `body` and a full ISO `dueDate`), no network.
  Object.assign(process.env, { SPRY_CRM_TOKEN: 'fake', SPRY_CRM_API_BASE: 'http://crm.invalid/v', SPRY_CRM_LOCATION_ID: DEV, SPRY_ALLOW_OPEN: '', SPRY_IFRAME_SECRET: secret, SPRY_STORE: 'file', SPRY_TIMEZONE: 'Australia/Melbourne' });
  const imp = (p) => import(pathToFileURL(path.join(here, '.build', p)).href);
  const T = await imp('handlers/tasks.js');
  const CON = 'conAAA111';
  const tasks = new Map();
  const calls = [];
  let seq = 0;
  globalThis.fetch = async (url, init = {}) => {
    const u = new URL(url);
    const key = (init.method ?? 'GET') + ' ' + u.pathname.replace('/v', '');
    const body = init.body ? JSON.parse(init.body) : undefined;
    calls.push({ key, body });
    const json = (o) => new Response(JSON.stringify(o), { status: 200 });
    const base = '/contacts/' + CON + '/tasks';
    if (key === 'GET ' + base) return json({ tasks: [...tasks.values()] });
    if (key === 'POST ' + base) { const id = 'tsk' + String(++seq).padStart(5, '0'); tasks.set(id, { id, ...body }); return json({ task: tasks.get(id) }); }
    const m = /^(GET|PUT) \/contacts\/conAAA111\/tasks\/(\w+)(\/completed)?$/.exec(key);
    if (m && tasks.has(m[2])) {
      if (m[1] === 'PUT') Object.assign(tasks.get(m[2]), body);
      return json({ task: tasks.get(m[2]) });
    }
    return new Response('{"message":"unrouted"}', { status: 404 });
  };
  const ORIGIN = 'http://x.test';
  let ipn = 0;
  const tok = mint({ loc: DEV, exp: now + 300 });
  const call = async (fn, m, p, body) => {
    const r = await fn(new Request(ORIGIN + p, { method: m, headers: { Origin: ORIGIN, 'Content-Type': 'application/json', 'x-forwarded-for': '10.2.0.' + (++ipn), 'X-Quote-Token': tok }, body: body === undefined ? undefined : JSON.stringify(body) }));
    const text = await r.text();
    return { status: r.status, text, j: JSON.parse(text) };
  };
  // Create with title + description + time (5 Nov 2026 is daylight saving, +11:00): 14:30 local = 03:30 UTC.
  let r = await call(T.POST, 'POST', '/api/tasks', { contactId: CON, title: 'Call Travis', description: 'Ask about the gate.\nCheck the dock.', dueDate: '2026-11-05', dueTime: '14:30' });
  check('POST title+description+time -> 201', r.status, 201);
  let sent = calls.find((c) => c.key === 'POST /contacts/' + CON + '/tasks').body;
  check('CRM gets title', sent.title, 'Call Travis');
  check('CRM gets body = description (lines kept)', sent.body, 'Ask about the gate.\nCheck the dock.');
  check('CRM gets dueDate as the ISO moment (14:30 Melbourne)', sent.dueDate, '2026-11-05T03:30:00.000Z');
  check('the answer reads back title, description, date and time', [r.j.task.title, r.j.task.description, r.j.task.dueDate, r.j.task.dueTime].join('|'), 'Call Travis|Ask about the gate.\nCheck the dock.|2026-11-05|14:30');
  const id1 = r.j.task.id;
  // Late evening: UTC day differs from the local day; the day must not shift.
  r = await call(T.POST, 'POST', '/api/tasks', { contactId: CON, title: 'Late', dueDate: '2026-11-05', dueTime: '08:00' });
  check('08:00 Melbourne is the previous UTC day but reads back as 2026-11-05 08:00', r.j.task.dueDate + ' ' + r.j.task.dueTime + ' ' + calls[calls.length - 1].body.dueDate, '2026-11-05 08:00 2026-11-04T21:00:00.000Z');
  // Winter (+10) and the DST change dates.
  r = await call(T.POST, 'POST', '/api/tasks', { contactId: CON, title: 'Winter', dueDate: '2026-07-01', dueTime: '09:00' });
  check('winter 09:00 -> 2026-06-30T23:00Z and back', calls[calls.length - 1].body.dueDate + ' ' + r.j.task.dueDate + ' ' + r.j.task.dueTime, '2026-06-30T23:00:00.000Z 2026-07-01 09:00');
  for (const d of ['2026-04-05', '2026-10-04']) {
    r = await call(T.POST, 'POST', '/api/tasks', { contactId: CON, title: 'DST', dueDate: d, dueTime: '09:30' });
    check('DST day ' + d + ' 09:30 reads back on the same day', r.j.task.dueDate + ' ' + r.j.task.dueTime, d + ' 09:30');
    r = await call(T.POST, 'POST', '/api/tasks', { contactId: CON, title: 'DST all day', dueDate: d });
    check('DST day ' + d + ' all day reads back on the same day with no time', r.j.task.dueDate + '|' + r.j.task.dueTime, d + '|undefined');
  }
  // A timed task whose moment is exactly midnight UTC (10:00 AEST) must not read back as all day.
  r = await call(T.POST, 'POST', '/api/tasks', { contactId: CON, title: 'Ten', dueDate: '2026-07-01', dueTime: '10:00' });
  check('10:00 in winter (= midnight UTC) still has its time', r.j.task.dueDate + ' ' + r.j.task.dueTime, '2026-07-01 10:00');
  // Title only still works (old Hub calls).
  r = await call(T.POST, 'POST', '/api/tasks', { contactId: CON, title: 'Only a title' });
  check('title only -> 201', r.status, 201);
  sent = calls[calls.length - 1].body;
  check("title only: no body sent, a due date is still sent (the CRM needs one)", ("body" in sent) + '|' + typeof sent.dueDate, 'false|string');
  check('title only: reads back without description or time', r.j.task.description + '|' + r.j.task.dueTime, 'undefined|undefined');
  r = await call(T.POST, 'POST', '/api/tasks', { contactId: CON, title: 'Old date only', dueDate: '2026-11-05' });
  check('date only (old call) is sent as before: midnight UTC of the date', calls[calls.length - 1].body.dueDate + ' ' + r.j.task.dueDate + '|' + r.j.task.dueTime, '2026-11-05T00:00:00.000Z 2026-11-05|undefined');
  // Bad input.
  r = await call(T.POST, 'POST', '/api/tasks', { contactId: CON, title: 'x', dueDate: '2026-11-05', dueTime: '25:00' });
  check('bad dueTime -> 400', r.status, 400);
  r = await call(T.POST, 'POST', '/api/tasks', { contactId: CON, title: 'x', description: 5 });
  check('non-text description -> 400', r.status, 400);
  // Update: title, description, date and time; done.
  r = await call(T.PUT, 'PUT', '/api/tasks?contactId=' + CON + '&id=' + id1, { title: 'Call Travis today', description: 'Short.', dueDate: '2026-11-06', dueTime: '09:15' });
  check('PUT title+description+date+time -> 200 and reads back', r.status + ' ' + [r.j.task.title, r.j.task.description, r.j.task.dueDate, r.j.task.dueTime].join('|'), '200 Call Travis today|Short.|2026-11-06|09:15');
  check('PUT sent body and the ISO moment', JSON.stringify(calls.find((c) => c.key === 'PUT /contacts/' + CON + '/tasks/' + id1).body), JSON.stringify({ title: 'Call Travis today', body: 'Short.', dueDate: '2026-11-05T22:15:00.000Z' }));
  r = await call(T.PUT, 'PUT', '/api/tasks?contactId=' + CON + '&id=' + id1, { description: '' });
  check('PUT empty description clears it', r.status + '|' + r.j.task.description, '200|undefined');
  r = await call(T.PUT, 'PUT', '/api/tasks?contactId=' + CON + '&id=' + id1, { dueDate: '2026-11-07' });
  check('PUT a date with no time makes it all day', r.j.task.dueDate + '|' + r.j.task.dueTime, '2026-11-07|undefined');
  r = await call(T.PUT, 'PUT', '/api/tasks?contactId=' + CON + '&id=' + id1, { dueTime: '10:00' });
  check('PUT a time with no date -> 400', r.status, 400);
  r = await call(T.PUT, 'PUT', '/api/tasks?contactId=' + CON + '&id=' + id1, { completed: true });
  check('PUT completed -> 200 via /completed', r.status + '|' + calls.some((c) => c.key === 'PUT /contacts/' + CON + '/tasks/' + id1 + '/completed' && c.body.completed === true), '200|true');
  r = await call(T.GET, 'GET', '/api/tasks?contactId=' + CON);
  const back = r.j.tasks.find((t) => t.id === id1);
  check('GET lists the task with the new date', back.dueDate + '|' + back.title, '2026-11-07|Call Travis today');
  check('every call stayed on the contact', calls.filter((c) => !c.key.includes('/contacts/' + CON)).length, 0);
} else if (mode === 'install') {
  // App install flow, in process: fake token endpoint, fake CRM, fake encrypted payloads, JSON file store in a temp folder.
  // No network, no real keys. Needs `npm run server:build` first.
  const os = await import('node:os');
  const fs = await import('node:fs');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hub-install-'));
  const CS = 'client-secret-TEST', SH = 'shared-secret-TEST', TOKURL = 'http://tok.invalid/oauth/token';
  const baseEnv = { SPRY_CRM_TOKEN: 'fake', SPRY_CRM_API_BASE: 'http://crm.invalid/v', SPRY_CRM_LOCATION_ID: DEV, SPRY_ALLOW_OPEN: '', SPRY_IFRAME_SECRET: secret, SPRY_STORE: 'file', SPRY_STORE_FILE: path.join(tmp, 'store.json'),
    HUB_APP_CLIENT_ID: 'app1234abcd-xyz', HUB_APP_CLIENT_SECRET: CS, HUB_APP_SHARED_SECRET: SH, HUB_APP_TOKEN_URL: TOKURL, HUB_APP_REDIRECT_URI: '', HUB_APP_ID: '', HUB_APP_WEBHOOK_PUBLIC_KEY: '', HUB_APP_WEBHOOK_SIG_HEADER: '' };
  Object.assign(process.env, baseEnv);
  const imp = (p) => import(pathToFileURL(path.join(here, '.build', p)).href);
  const A = await imp('lib/accounts.js');
  const CJ = await imp('lib/cryptojs.js');
  const PL = await imp('lib/public-link.js');
  const AU = await imp('lib/auth.js');
  const CB = (await imp('handlers/oauth-callback.js')).GET;
  const WH = (await imp('handlers/webhooks-platform.js')).POST;
  const UC = (await imp('handlers/auth-user-context.js')).POST;
  const STORE_H = await imp('handlers/store.js');
  const AUTH_H = await imp('handlers/auth.js');
  const { getStore } = await imp('store/index.js');
  const store = await getStore();

  // Everything that is logged is captured, so we can prove no secret, token, code or user value ever reaches a log.
  const logged = [];
  for (const k of ['info', 'warn', 'error', 'debug']) { const orig = console[k]; console[k] = (...a) => { logged.push(a.map(String).join(' ')); }; console['_' + k] = orig; }

  const LOC1 = 'locAAA11111', LOC2 = 'locBBB22222', LOC3 = 'locCCC33333';
  const T0 = Date.now();
  const tokenCalls = [];
  const crmCalls = [];
  let hook = null;
  globalThis.fetch = async (url, init = {}) => {
    const u = new URL(url);
    if (u.host === 'tok.invalid') {
      const f = Object.fromEntries(new URLSearchParams(String(init.body)));
      tokenCalls.push({ f, ct: init.headers?.['Content-Type'], method: init.method });
      const ok = (o) => new Response(JSON.stringify(o), { status: 200 });
      if (f.grant_type === 'authorization_code') {
        if (f.code === 'GOODCODE1234') return ok({ access_token: 'AT-1', token_type: 'Bearer', expires_in: 86399, refresh_token: 'RT-1', scope: 'a b', userType: 'Location', companyId: 'compXXX1111', locationId: LOC1, userId: 'userXXX1111' });
        if (f.code === 'GOODCODE2222') return ok({ access_token: 'AT-B1', expires_in: 86399, refresh_token: 'RT-B1', userType: 'Location', companyId: 'compXXX1111', locationId: LOC2, userId: 'userYYY2222' });
        if (f.code === 'COMPANYCODE12') return ok({ access_token: 'AT-C', expires_in: 86399, refresh_token: 'RT-C', userType: 'Company', companyId: 'compXXX1111' });
        if (f.code === 'BOOMCODE1234') return new Response('upstream said secrets', { status: 500 });
        if (f.code === 'JUNKCODE1234') return new Response('not json', { status: 200 });
        return new Response('{"error":"invalid_grant","error_description":"code CODE-ECHO"}', { status: 400 });
      }
      if (f.grant_type === 'refresh_token') {
        if (hook) await hook(f);
        if (f.refresh_token === 'RT-1') return ok({ access_token: 'AT-2', expires_in: 86399, refresh_token: 'RT-2', scope: 'a b', userType: 'Location', locationId: LOC1 });
        if (f.refresh_token === 'RT-NONEW') return ok({ access_token: 'AT-NN', expires_in: 3600, userType: 'Location', locationId: LOC1 });
        if (f.refresh_token === 'RT-5XX') return new Response('down', { status: 503 });
        return new Response('{"error":"invalid_grant"}', { status: 400 });
      }
      return new Response('{}', { status: 400 });
    }
    if (u.host === 'crm.invalid') {
      crmCalls.push({ url: String(url), auth: init.headers?.Authorization, version: init.headers?.Version });
      return new Response('{"ok":true}', { status: 200 });
    }
    throw new Error('unexpected network call to ' + u.host);
  };
  const ORIGIN = 'http://x.test';
  const get = (p, h = {}) => new Request(ORIGIN + p, { headers: h });
  const post = (p, body, h = {}) => new Request(ORIGIN + p, { method: 'POST', headers: { Origin: ORIGIN, 'Content-Type': 'application/json', ...h }, body: typeof body === 'string' ? body : JSON.stringify(body) });
  const rec = async (loc) => (await store.get('accounts', loc))?.data;
  const body = async (r) => ({ status: r.status, text: await r.text(), h: r.headers });
  const VENDOR = new RegExp(['lead' + 'connector', 'high' + 'level', '\\bg' + 'hl\\b'].join('|'), 'i'); // the vendor's name, built from pieces so it is not written in the repo

  // ---- MD5 and the CryptoJS-style decrypt, checked against Node's own implementations ----
  const hex = (u8) => Buffer.from(u8).toString('hex');
  check('md5 empty', hex(CJ.md5(new Uint8Array())), 'd41d8cd98f00b204e9800998ecf8427e');
  check('md5 abc', hex(CJ.md5(new TextEncoder().encode('abc'))), '900150983cd24fb0d6963f7d28e17f72');
  let md5Same = true;
  for (let n = 0; n <= 300; n += 1) { const d = crypto.randomBytes(n); if (hex(CJ.md5(d)) !== crypto.createHash('md5').update(d).digest('hex')) md5Same = false; }
  check('md5 equals node md5 for lengths 0 to 300', md5Same, true);
  const cjsEncrypt = (text, pass) => {
    const salt = crypto.randomBytes(8); let d = Buffer.alloc(0), prev = Buffer.alloc(0);
    while (d.length < 48) { prev = crypto.createHash('md5').update(Buffer.concat([prev, Buffer.from(pass), salt])).digest(); d = Buffer.concat([d, prev]); }
    const c = crypto.createCipheriv('aes-256-cbc', d.subarray(0, 32), d.subarray(32, 48));
    return Buffer.concat([Buffer.from('Salted__'), salt, c.update(text, 'utf8'), c.final()]).toString('base64');
  };
  check('decrypt round trip', await CJ.decryptCryptoJs(cjsEncrypt('{"a":1}', SH), SH), '{"a":1}');
  check('decrypt round trip, unicode and long', await CJ.decryptCryptoJs(cjsEncrypt('héllo Ωmega '.repeat(50), SH), SH), 'héllo Ωmega '.repeat(50));
  check('decrypt wrong secret -> null', await CJ.decryptCryptoJs(cjsEncrypt('{"a":1}', SH), 'other'), null);
  check('decrypt not base64 -> null', await CJ.decryptCryptoJs('!!!not base64!!!', SH), null);
  check('decrypt missing Salted__ marker -> null', await CJ.decryptCryptoJs(Buffer.from('x'.repeat(48)).toString('base64'), SH), null);
  check('decrypt truncated -> null', await CJ.decryptCryptoJs(cjsEncrypt('{"a":1}', SH).slice(0, 30), SH), null);
  check('decrypt empty secret -> null', await CJ.decryptCryptoJs(cjsEncrypt('{"a":1}', SH), ''), null);
  check('decrypt oversize -> null', await CJ.decryptCryptoJs('A'.repeat(70000), SH), null);

  // ---- 1. GET /oauth/callback ----
  const cb = async (q) => body(await CB(get('/oauth/callback' + q, { 'x-forwarded-for': '9.9.9.' + Math.floor(Math.random() * 200) })));
  let r = await cb('');
  check('callback: no code -> 400', r.status, 400);
  r = await cb('?code=bad%20code!');
  check('callback: malformed code -> 400, no token call', r.status + ':' + tokenCalls.length, '400:0');
  r = await cb('?error=access_denied');
  check('callback: user cancelled -> 400, no token call', r.status + ':' + tokenCalls.length, '400:0');
  r = await cb('?code=GOODCODE1234');
  check('callback: good code -> 200', r.status, 200);
  check('callback: page says Installed', /<h1>Installed<\/h1>/.test(r.text), true);
  check('callback: page has no vendor name, token, code or secret', !VENDOR.test(r.text) && !/AT-1|RT-1|GOODCODE|client-secret/.test(r.text), true);
  check('callback: page is not cached, strict CSP', r.h.get('cache-control') + '|' + /default-src 'none'/.test(r.h.get('content-security-policy') ?? ''), 'no-store|true');
  const tc = tokenCalls[0];
  check('exchange: authorization_code, Location, form encoded POST', [tc.f.grant_type, tc.f.user_type, tc.ct, tc.method].join('|'), 'authorization_code|Location|application/x-www-form-urlencoded|POST');
  check('exchange: client id, secret, code, redirect uri sent', [tc.f.client_id, tc.f.client_secret === CS, tc.f.code, tc.f.redirect_uri].join('|'), 'app1234abcd-xyz|true|GOODCODE1234|https://hub.systemations.ai/oauth/callback');
  let a1 = await rec(LOC1);
  check('stored: location, company, user, status', [a1.locationId, a1.companyId, a1.userId, a1.status].join('|'), LOC1 + '|compXXX1111|userXXX1111|active');
  check('stored: access and refresh token, scope', [a1.accessToken, a1.refreshToken, a1.scope].join('|'), 'AT-1|RT-1|a b');
  const expMs = Date.parse(a1.expiresAt);
  check('stored: expiry is about now + expires_in', Math.abs(expMs - (T0 + 86399 * 1000)) < 60000, true);
  r = await cb('?code=GOODCODE2222');
  check('callback: second account stored under its own location id', (await rec(LOC2))?.accessToken + '|' + (await rec(LOC1)).accessToken, 'AT-B1|AT-1');
  r = await cb('?code=USEDCODE9999');
  check('callback: refused or used code -> 400, nothing stored', r.status + ':' + (await rec('undefined')), '400:undefined');
  check('callback: refused code page does not echo the code or the platform text', !/USEDCODE|CODE-ECHO|invalid_grant/.test(r.text), true);
  r = await cb('?code=BOOMCODE1234');
  check('callback: platform 500 -> 502', r.status, 502);
  check('callback: platform error body not shown', !/upstream|secrets/.test(r.text), true);
  r = await cb('?code=JUNKCODE1234');
  check('callback: unreadable answer -> 502', r.status, 502);
  const before = (await store.list('accounts')).length;
  r = await cb('?code=COMPANYCODE12');
  check('callback: company level install -> 400, nothing stored', r.status + ':' + ((await store.list('accounts')).length === before), '400:true');
  Object.assign(process.env, { HUB_APP_CLIENT_SECRET: '' });
  r = await cb('?code=GOODCODE1234');
  check('callback: no client secret set -> 503', r.status, 503);
  Object.assign(process.env, { HUB_APP_CLIENT_SECRET: CS, HUB_APP_TOKEN_URL: '' });
  r = await cb('?code=GOODCODE1234');
  check('callback: no token address set -> 503', r.status, 503);
  Object.assign(process.env, { HUB_APP_TOKEN_URL: TOKURL, SPRY_STORE: '' });
  r = await cb('?code=GOODCODE1234');
  check('callback: no storage -> 503', r.status, 503);
  Object.assign(process.env, { SPRY_STORE: 'file' });
  PL.resetRateLimit();
  let last = 0;
  for (let i = 0; i < 32; i++) last = (await body(await CB(get('/oauth/callback?error=x', { 'x-forwarded-for': '7.7.7.7' })))).status;
  check('callback: rate limited after 30 a minute', last, 429);
  PL.resetRateLimit();
  const rr = await cb('?code=GOODCODE1234');
  const a1b = await rec(LOC1);
  check('callback: re-install of the same account replaces tokens and stays active', rr.status + a1b.status, '200active');

  // ---- 2. refresh helper and per-account token lookup ----
  tokenCalls.length = 0;
  check('token: fresh token returned without a refresh call', (await A.getAccessToken(LOC1)) + ':' + tokenCalls.length, 'AT-1:0');
  const near = T0 + 86399 * 1000 - 5 * 60 * 1000; // 5 minutes left: under the 10 minute margin
  check('token: refreshes before expiry', (await A.getAccessToken(LOC1, near)) + ':' + tokenCalls.length + ':' + tokenCalls[0]?.f.grant_type, 'AT-2:1:refresh_token');
  check('refresh: sends the stored refresh token and client id', tokenCalls[0].f.refresh_token + '|' + tokenCalls[0].f.client_id + '|' + tokenCalls[0].f.user_type, 'RT-1|app1234abcd-xyz|Location');
  a1 = await rec(LOC1);
  check('refresh: new tokens stored (access, refresh, scope, still active)', [a1.accessToken, a1.refreshToken, a1.scope, a1.status].join('|'), 'AT-2|RT-2|a b|active');
  check('refresh: expiry moved forward', Date.parse(a1.expiresAt) > expMs + 60 * 1000 || Date.parse(a1.expiresAt) >= near, true);
  check('token: after refresh no more calls', (await A.getAccessToken(LOC1, near)) + ':' + tokenCalls.length, 'AT-2:1');
  // five at once share one refresh
  await store.put('accounts', LOC2, { ...(await rec(LOC2)), expiresAt: new Date(T0 + 60 * 1000).toISOString(), refreshToken: 'RT-1' });
  tokenCalls.length = 0;
  const five = await Promise.all([1, 2, 3, 4, 5].map(() => A.getAccessToken(LOC2, T0)));
  check('token: five concurrent callers share one refresh call', tokenCalls.length + ':' + new Set(five).size, '1:1');
  // no new refresh token in the answer keeps the old one
  await store.put('accounts', LOC2, { ...(await rec(LOC2)), expiresAt: new Date(T0 + 60 * 1000).toISOString(), refreshToken: 'RT-NONEW' });
  await A.getAccessToken(LOC2, T0);
  check('refresh: answer without refresh token keeps the old one', (await rec(LOC2)).refreshToken + '|' + (await rec(LOC2)).accessToken, 'RT-NONEW|AT-NN');
  // refused refresh token
  await store.put('accounts', LOC2, { ...(await rec(LOC2)), expiresAt: new Date(T0 + 60 * 1000).toISOString(), refreshToken: 'RT-DEAD', accessToken: 'AT-OLD' });
  let err = null;
  await A.getAccessToken(LOC2, T0).catch((e) => { err = e; });
  check('refresh: refused refresh token -> AccountError refresh-failed', err?.kind, 'refresh-failed');
  check('refresh: refused refresh token marks needsReauth, keeps tokens', (await rec(LOC2)).needsReauth + '|' + (await rec(LOC2)).refreshToken, 'true|RT-DEAD');
  check('refresh: error text holds no token or secret', !/RT-|AT-|client-secret/.test(String(err?.message)), true);
  // platform down: no needsReauth
  await store.put('accounts', LOC2, { ...(await rec(LOC2)), needsReauth: undefined, refreshToken: 'RT-5XX' });
  err = null;
  await A.getAccessToken(LOC2, T0).catch((e) => { err = e; });
  check('refresh: platform 503 -> refresh-failed, needsReauth NOT set', err?.kind + '|' + ((await rec(LOC2)).needsReauth ?? 'unset'), 'refresh-failed|unset');
  // another instance refreshed first: the refused call adopts its stored result
  await store.put('accounts', LOC2, { ...(await rec(LOC2)), refreshToken: 'RT-RACE', accessToken: 'AT-OLD', expiresAt: new Date(T0 + 60 * 1000).toISOString() });
  hook = async (f) => { if (f.refresh_token === 'RT-RACE') await store.put('accounts', LOC2, { ...(await rec(LOC2)), accessToken: 'AT-WINNER', refreshToken: 'RT-WON', expiresAt: new Date(T0 + 86000 * 1000).toISOString() }); };
  check('refresh: lost a race with another instance -> uses its tokens', await A.getAccessToken(LOC2, T0), 'AT-WINNER');
  hook = null;
  // account states
  const kindOf = async (loc) => { try { await A.getAccessToken(loc, T0); return 'ok'; } catch (e) { return e.kind; } };
  check('token: unknown account -> unknown', await kindOf(LOC3), 'unknown');
  check('token: bad id -> unknown', await kindOf('x'), 'unknown');
  await A.setStatus(LOC3, 'active', {}, T0, true);
  check('token: install event without tokens yet -> no-token', await kindOf(LOC3), 'no-token');
  await A.setStatus(LOC3, 'uninstalled', {}, T0);
  check('token: uninstalled account -> uninstalled', await kindOf(LOC3), 'uninstalled');
  // right token for the right account
  await store.put('accounts', LOC1, { ...(await rec(LOC1)), accessToken: 'AT-ONE', expiresAt: new Date(Date.now() + 3600e3).toISOString() });
  await store.put('accounts', LOC2, { ...(await rec(LOC2)), accessToken: 'AT-TWO', expiresAt: new Date(Date.now() + 3600e3).toISOString(), status: 'active' });
  crmCalls.length = 0;
  await A.crmFetchForAccount(LOC1, '/contacts/x');
  await A.crmFetchForAccount(LOC2, '/contacts/y', { method: 'POST', body: '{}' });
  check('lookup: each call carries its own account token', crmCalls.map((c) => c.auth).join('|'), 'Bearer AT-ONE|Bearer AT-TWO');
  check('lookup: address and version header', crmCalls[0].url + '|' + crmCalls[0].version, 'http://crm.invalid/v/contacts/x|2021-07-28');
  let err2 = null;
  await A.crmFetchForAccount(LOC3, '/contacts/z').catch((e) => { err2 = e; });
  check('lookup: uninstalled account makes no CRM call', err2?.kind + ':' + crmCalls.length, 'uninstalled:2');

  // ---- 3. POST /webhooks/platform ----
  PL.resetRateLimit();
  const wh = async (b, h) => body(await WH(post('/webhooks/platform', b, h)));
  const ev = (o) => ({ type: 'INSTALL', appId: 'app1234abcd', locationId: 'locWWW99999', companyId: 'compXXX1111', userId: 'userXXX1111', installType: 'Location', ...o });
  r = await wh(ev({ appId: 'otherapp' }));
  check('webhook: wrong appId -> 400', r.status, 400);
  r = await wh('not json');
  check('webhook: not JSON -> 400', r.status, 400);
  r = await wh('[1,2]');
  check('webhook: JSON array -> 400', r.status, 400);
  r = await wh('x'.repeat(70000));
  check('webhook: oversize -> 400', r.status, 400);
  r = await wh(ev({ type: 'UNINSTALL', locationId: 'locNOBODY111' }));
  check('webhook: uninstall of an unknown account -> 200 ignored, nothing created', r.status + ':' + (await rec('locNOBODY111')), '200:undefined');
  r = await wh(ev({ type: 'SOMETHING_ELSE' }));
  check('webhook: other event type -> 200 ignored', r.status + ':' + /ignored/.test(r.text), '200:true');
  r = await wh(ev({ locationId: undefined }));
  check('webhook: no location (company event) -> 200 ignored', r.status + ':' + /ignored/.test(r.text), '200:true');
  r = await wh(ev({ locationId: 'bad id!' }));
  check('webhook: malformed location -> 200 ignored, nothing stored', r.status + ':' + (await rec('bad id!')), '200:undefined');
  r = await wh(ev({}));
  const w1 = await rec('locWWW99999');
  check('webhook: INSTALL makes an active record, no tokens', r.status + '|' + w1.status + '|' + w1.accessToken + '|' + w1.companyId, '200|active||compXXX1111');
  // data survives an uninstall: tokens kept, other collections untouched
  await store.put('quotes', 'zzquote1', { id: 'zzquote1', status: 'Sent' });
  const nAcc = (await store.list('accounts')).length;
  const keep = await rec(LOC1);
  r = await wh(ev({ type: 'UNINSTALL', locationId: LOC1 }));
  const u1 = await rec(LOC1);
  check('webhook: UNINSTALL marks uninstalled', r.status + '|' + u1.status + '|' + !!u1.uninstalledAt, '200|uninstalled|true');
  check('webhook: UNINSTALL keeps the tokens and ids (nothing deleted)', [u1.accessToken, u1.refreshToken, u1.companyId, u1.installedAt].join('|'), [keep.accessToken, keep.refreshToken, keep.companyId, keep.installedAt].join('|'));
  check('webhook: UNINSTALL leaves other data alone', (await store.get('quotes', 'zzquote1'))?.data.status + '|' + (await store.list('accounts')).length, 'Sent|' + nAcc);
  check('webhook: lowercase type accepted', (await wh(ev({ type: 'uninstall', locationId: LOC2 }))).status + (await rec(LOC2)).status, '200uninstalled');
  r = await wh(ev({ locationId: LOC1 }));
  const u2 = await rec(LOC1);
  check('webhook: INSTALL again reactivates and clears the uninstall time', r.status + '|' + u2.status + '|' + (u2.uninstalledAt ?? 'none'), '200|active|none');
  Object.assign(process.env, { HUB_APP_CLIENT_ID: '' });
  check('webhook: app not configured -> 503', (await wh(ev({}))).status, 503);
  Object.assign(process.env, { HUB_APP_CLIENT_ID: baseEnv.HUB_APP_CLIENT_ID, SPRY_STORE: '' });
  check('webhook: no storage -> 503 (the platform retries)', (await wh(ev({}))).status, 503);
  Object.assign(process.env, { SPRY_STORE: 'file' });
  // signature (Ed25519, base64 in a named header): only when both settings exist
  const kp = crypto.generateKeyPairSync('ed25519');
  const pem = kp.publicKey.export({ type: 'spki', format: 'pem' });
  Object.assign(process.env, { HUB_APP_WEBHOOK_PUBLIC_KEY: pem, HUB_APP_WEBHOOK_SIG_HEADER: 'X-Test-Sig' });
  const raw = JSON.stringify(ev({ type: 'UNINSTALL', locationId: LOC1 }));
  const sig = crypto.sign(null, Buffer.from(raw), kp.privateKey).toString('base64');
  check('webhook signature: missing -> 401', (await wh(raw)).status, 401);
  check('webhook signature: wrong -> 401', (await wh(raw, { 'x-test-sig': Buffer.alloc(64).toString('base64') })).status, 401);
  check('webhook signature: body changed after signing -> 401', (await wh(raw.replace('UNINSTALL', 'INSTALL'), { 'x-test-sig': sig })).status, 401);
  check('webhook signature: junk -> 401', (await wh(raw, { 'x-test-sig': '%%%' })).status, 401);
  check('webhook signature: valid -> 200 and applied', (await wh(raw, { 'x-test-sig': sig })).status + (await rec(LOC1)).status, '200uninstalled');
  Object.assign(process.env, { HUB_APP_WEBHOOK_PUBLIC_KEY: '', HUB_APP_WEBHOOK_SIG_HEADER: '' });
  await wh(ev({ locationId: LOC1 })); // reactivate for the next group

  // ---- 4. POST /auth/user-context ----
  PL.resetRateLimit();
  const uc = async (b, h) => body(await UC(post('/auth/user-context', b, h)));
  const user = (o) => ({ userId: 'userXXX1111', companyId: 'compXXX1111', role: 'admin', type: 'agency', activeLocation: LOC1, userName: 'Zed Tester', email: 'zed.tester@example.test', phone: '0400 000 000', brandNewField: { nested: 'SECRET-VALUE-77' }, ...o });
  logged.length = 0;
  r = await uc({ payload: cjsEncrypt(JSON.stringify(user({})), SH) });
  check('user-context: valid payload -> 200', r.status, 200);
  const s = JSON.parse(r.text);
  check('user-context: answer has token, exp, location, user', [!!s.token, typeof s.exp, s.locationId, s.userId].join('|'), 'true|number|' + LOC1 + '|userXXX1111');
  check('session: signed for this location (same check the menu link uses)', await AU.verifyToken(s.token, secret, LOC1), true);
  check('session: NOT accepted for the fixed account (existing routes not rewired)', await AU.verifyToken(s.token, secret, DEV), false);
  check('session: wrong secret rejected', await AU.verifyToken(s.token, 'nope', LOC1), false);
  const claims = JSON.parse(Buffer.from(s.token.split('.')[1], 'base64url').toString());
  check('session: carries user id, expires in about 4 hours', claims.uid + '|' + (Math.abs(claims.exp - (Math.floor(Date.now() / 1000) + 4 * 3600)) < 30), 'userXXX1111|true');
  const authRes = await AUTH_H.GET(new Request(ORIGIN + '/api/auth', { headers: { 'x-quote-token': s.token } }));
  check('session: the existing /api/auth refuses it (loc is not the fixed account)', authRes.status, 401);
  const names = logged.find((l) => l.includes('[user-context]')) ?? '';
  check('log: field names are logged', /\[user-context\] fields: userId,companyId,role,type,activeLocation,userName,email,phone,brandNewField/.test(names), true);
  check('log: no value is logged (name, email, phone, ids, nested value, secrets)', !/Zed|zed\.tester|0400|SECRET-VALUE|userXXX1111|compXXX1111|locAAA|shared-secret|client-secret|AT-|RT-/.test(logged.join('\n')), true);
  r = await uc({ data: cjsEncrypt(JSON.stringify({ locationId: LOC1, extra: 1 }), SH) });
  check('user-context: alternative body field name and locationId key, no user id', r.status + '|' + JSON.parse(r.text).userId, '200|');
  r = await uc({ payload: cjsEncrypt(JSON.stringify({ activeLocation: { id: LOC1, name: 'X' }, userId: 'userXXX1111' }), SH) });
  check('user-context: activeLocation as an object with an id', r.status + '|' + JSON.parse(r.text).locationId, '200|' + LOC1);
  r = await uc({ payload: cjsEncrypt(JSON.stringify({ weird: true }), SH) });
  check('user-context: no account in the data -> 400', r.status, 400);
  const docFields = { userId: 'userXXX1111', companyId: 'compXXX1111', role: 'admin', userName: 'Zed', email: 'z@example.test', isAgencyOwner: false, region: 'au', versionId: 'v1', appStatus: 'live', whitelabelDetails: { logoUrl: 'x' } };
  r = await uc({ payload: cjsEncrypt(JSON.stringify({ ...docFields, type: 'agency' }), SH) });
  check('user-context: agency user with no account chosen -> 403 Choose an account first', r.status + ':' + /Choose an account first/.test(r.text), '403:true');
  r = await uc({ payload: cjsEncrypt(JSON.stringify({ ...docFields, type: 'agency', locationId: LOC1 }), SH) });
  check('user-context: agency user, only a locationId key (no activeLocation) -> 403', r.status, 403);
  r = await uc({ payload: cjsEncrypt(JSON.stringify({ ...docFields, type: 'Agency', activeLocation: LOC1 }), SH) });
  check('user-context: agency user who chose an account (activeLocation) -> 200', r.status, 200);
  r = await uc({ payload: cjsEncrypt(JSON.stringify({ ...docFields, type: 'location', activeLocation: LOC1 }), SH) });
  check('user-context: location user with all documented fields -> 200', r.status + '|' + JSON.parse(r.text).locationId, '200|' + LOC1);
  check('log: documented field names logged, no value (whitelabel, region, email) in logs', logged.some((l) => /fields: .*isAgencyOwner,region,versionId,appStatus,whitelabelDetails/.test(l)) && !/z@example\.test|logoUrl/.test(logged.join('\n')), true);
  r = await uc({ payload: cjsEncrypt(JSON.stringify({ activeLocation: 'locNEVER9999' }), SH) });
  check('user-context: account not installed -> 403', r.status, 403);
  r = await uc({ payload: cjsEncrypt(JSON.stringify({ activeLocation: LOC3 }), SH) });
  check('user-context: uninstalled account -> 403', r.status, 403);
  r = await uc({ payload: cjsEncrypt(JSON.stringify({ activeLocation: 'bad id!' }), SH) });
  check('user-context: malformed account id -> 400', r.status, 400);
  r = await uc({ payload: cjsEncrypt(JSON.stringify(user({})), 'someone-elses-secret') });
  check('user-context: encrypted with another secret -> 400, no detail', r.status + ':' + /Could not read the user data/.test(r.text), '400:true');
  r = await uc({ payload: cjsEncrypt('plain words', SH) });
  check('user-context: decrypts to non JSON -> 400', r.status, 400);
  r = await uc({ payload: cjsEncrypt('[1,2]', SH) });
  check('user-context: decrypts to an array -> 400', r.status, 400);
  r = await uc({ payload: 'garbage' });
  check('user-context: garbage -> 400', r.status, 400);
  r = await uc({ nothing: 1 });
  check('user-context: no payload field -> 400', r.status, 400);
  r = await uc('x'.repeat(40000));
  check('user-context: oversize body -> 400', r.status, 400);
  r = await body(await UC(new Request(ORIGIN + '/auth/user-context', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })));
  check('user-context: no Origin header -> 403', r.status, 403);
  r = await body(await UC(post('/auth/user-context', {}, { Origin: 'http://evil.test' })));
  check('user-context: foreign Origin -> 403', r.status, 403);
  Object.assign(process.env, { HUB_APP_SHARED_SECRET: '' });
  check('user-context: no shared secret set -> 503', (await uc({ payload: 'x' })).status, 503);
  Object.assign(process.env, { HUB_APP_SHARED_SECRET: SH, SPRY_IFRAME_SECRET: '' });
  check('user-context: no session secret set -> 503', (await uc({ payload: cjsEncrypt(JSON.stringify(user({})), SH) })).status, 503);
  Object.assign(process.env, { SPRY_IFRAME_SECRET: secret, SPRY_STORE: '' });
  check('user-context: no storage -> 503', (await uc({ payload: cjsEncrypt(JSON.stringify(user({})), SH) })).status, 503);
  Object.assign(process.env, { SPRY_STORE: 'file' });
  PL.resetRateLimit();
  let lastUc = 0;
  for (let i = 0; i < 32; i++) lastUc = (await uc({ payload: 'x' }, { 'x-forwarded-for': '8.8.8.8' })).status;
  check('user-context: rate limited after 30 a minute', lastUc, 429);

  // ---- the tokens stay server side; the rest still works as before ----
  Object.assign(process.env, { SPRY_IFRAME_SECRET: '', SPRY_ALLOW_OPEN: '1' });
  r = await body(await STORE_H.GET(get('/api/store?collection=accounts')));
  check('/api/store does not serve the accounts collection (tokens never reach a browser)', r.status, 400);
  r = await body(await STORE_H.GET(get('/api/store?collection=quotes')));
  check('/api/store still serves quotes', r.status, 200);
  Object.assign(process.env, { SPRY_IFRAME_SECRET: secret, SPRY_ALLOW_OPEN: '' });
  const all = logged.join('\n');
  check('logs: no token, code, secret or refresh token anywhere in this run', !/AT-|RT-|GOODCODE|client-secret-TEST|shared-secret-TEST/.test(all), true);
  console.info = console._info; console.warn = console._warn; console.error = console._error;
} else if (mode === 'vercel') {
  // Vercel preparation, in process: the function entry files in api/ are imported and called like Vercel would (Web Request in,
  // Response out), with fake env values, a fake database (PostgREST) and no network. Needs `npm run server:build` first.
  const os = await import('node:os');
  const fs = await import('node:fs');
  const root = path.resolve(here, '..');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hub-vercel-'));
  const baseEnv = { SPRY_CRM_TOKEN: 'fake', SPRY_CRM_API_BASE: 'http://crm.invalid/v', SPRY_CRM_LOCATION_ID: DEV, SPRY_ALLOW_OPEN: '', SPRY_IFRAME_SECRET: secret, SPRY_STORE: '', SPRY_PUBLIC_LINK_SECRET: '',
    SUPABASE_URL: '', SUPABASE_SERVICE_ROLE_KEY: '', HUB_FRAME_ANCESTORS: '', HUB_APP_CLIENT_ID: 'app1234abcd-xyz', HUB_APP_CLIENT_SECRET: 'cs', HUB_APP_SHARED_SECRET: 'sh', HUB_APP_TOKEN_URL: 'http://tok.invalid/t', HUB_APP_ID: '' };
  Object.assign(process.env, baseEnv);
  const impBuild = (p) => import(pathToFileURL(path.join(here, '.build', p)).href);
  const impApi = (p) => import(pathToFileURL(path.join(root, 'api', p)).href);
  const ST = await impBuild('store/supabase-rest.js');
  const FR = await impBuild('lib/frame.js');
  const { ConflictError } = await impBuild('store/types.js');
  const ROUTES_MJS = await import(pathToFileURL(path.join(here, 'routes.mjs')).href);
  const VENDOR = new RegExp(['lead' + 'connector', 'high' + 'level', '\\bg' + 'hl\\b'].join('|'), 'i'); // built from pieces so the name is not written in the repo

  // ---- frame ancestors setting ----
  const P = FR.parseFrameAncestors;
  check('frame: spaces and commas, order kept, duplicates dropped', JSON.stringify(P('https://a.example.test, https://b.example.test  https://a.example.test')), '["https://a.example.test","https://b.example.test"]');
  check('frame: wildcard subdomain and port allowed', JSON.stringify(P('https://*.example.org http://localhost:5173')), '["https://*.example.org","http://localhost:5173"]');
  check('frame: bare * dropped', JSON.stringify(P('* https://ok.example.test')), '["https://ok.example.test"]');
  check("frame: 'none' and 'self' quoted keywords dropped", JSON.stringify(P("'none' 'self' https://ok.example.test")), '["https://ok.example.test"]');
  check('frame: injection attempts dropped (semicolon, newline header, path, scheme)', JSON.stringify(P('https://a.example.test;script-src X-Evil:1 script-src javascript:alert(1) https://p.example.test/path data: 1')), '[]');
  check('frame: a newline in the setting only separates sources, never adds a header line', FR.frameAncestorsPolicy('https://a.example.test\nhttps://b.example.test'), "frame-ancestors 'self' https://a.example.test https://b.example.test");
  check('frame: empty and undefined give no sources', JSON.stringify(P('')) + JSON.stringify(P(undefined)), '[][]');
  check('frame: policy value', FR.frameAncestorsPolicy('https://app.example.test https://*.example.org'), "frame-ancestors 'self' https://app.example.test https://*.example.org");
  check('frame: empty setting means only ourselves', FR.frameAncestorsPolicy(''), "frame-ancestors 'self'");
  let many = ''; for (let i = 0; i < 60; i++) many += 'h' + i + '.example.test ';
  check('frame: capped at 30 sources', P(many).length, 30);

  // ---- route table: every handler file is reachable, same keys as the dev server ----
  const hub = await impApi('_hub.js');
  const files = fs.readdirSync(path.join(here, '.build', 'handlers')).filter((f) => f.endsWith('.js')).map((f) => f.slice(0, -3));
  check('routes: every compiled handler file is in api/_hub.js', files.filter((f) => !(f in hub.modules)).join(',') || 'none', 'none');
  check('routes: nothing in api/_hub.js without a handler file', Object.keys(hub.modules).filter((f) => !files.includes(f)).join(',') || 'none', 'none');
  const wantKeys = [...new Set(files.map((f) => ROUTES_MJS.routeKey(f)))].sort().join('|');
  check('routes: same keys as the dev server derives', Object.keys(hub.handlers).sort().join('|'), wantKeys);
  check('routes: root keys', Object.keys(hub.handlers).filter((k) => k.startsWith('/')).sort().join(','), '/auth/user-context,/oauth/callback,/webhooks/platform');
  check('routes: /api/contact has GET, POST and PUT merged', ['GET', 'POST', 'PUT'].every((m) => typeof hub.handlers.contact[m] === 'function'), true);
  check('routes: nested keys', ['invoices/send', 'invoices/payment', 'invoices/void', 'public/quote', 'public/quote/respond'].every((k) => k in hub.handlers), true);

  // ---- function entries, called like Vercel does ----
  const ORIGIN = 'https://hub.example.test';
  const catchAll = await impApi('[...path].js');
  const tokenOk = mint({ loc: DEV, exp: now + 600 });
  const call = async (fn, m, p, opts = {}) => { const r = await fn(new Request(ORIGIN + p, { method: m, headers: { Origin: ORIGIN, 'Content-Type': 'application/json', ...(opts.headers ?? {}) }, body: opts.body })); return { status: r.status, text: await r.text(), h: r.headers }; };
  const api = (m, p, opts) => call(catchAll[m], m, p, opts);
  check('catch-all exports GET POST PUT DELETE', ['GET', 'POST', 'PUT', 'DELETE'].every((m) => typeof catchAll[m] === 'function'), true);
  let r = await api('GET', '/api/auth');
  check('GET /api/auth without token -> 401 (staff lock intact)', r.status, 401);
  r = await api('GET', '/api/auth', { headers: { 'x-quote-token': tokenOk } });
  check('GET /api/auth with a valid token -> 200', r.status, 200);
  r = await api('GET', '/api/auth', { headers: { 'x-quote-token': mint({ loc: 'someOtherLoc', exp: now + 600 }) } });
  check('GET /api/auth, token for another location -> 401', r.status, 401);
  r = await api('GET', '/api/nope');
  check('unknown /api path -> 404 JSON', r.status + ':' + r.text, '404:{"error":"Not found"}');
  r = await api('POST', '/api/auth');
  check('method the handler does not have -> 404', r.status, 404);
  r = await api('GET', '/api/');
  check('/api/ itself -> 404', r.status, 404);
  r = await api('GET', '/api//oauth/callback?error=x');
  check('root routes are not reachable through /api// -> 404', r.status, 404);
  r = await api('GET', '/api/auth/');
  check('trailing slash is tolerated', r.status, 401);
  for (const [m, p] of [['GET', '/api/contact'], ['POST', '/api/contact'], ['PUT', '/api/contact?id=x'], ['POST', '/api/invoices/send?id=x'], ['POST', '/api/invoices/payment?id=x'], ['POST', '/api/invoices/void?id=x'], ['GET', '/api/quote-link?id=x'], ['GET', '/api/jobs'], ['PUT', '/api/job?id=x'], ['GET', '/api/conversations?contactId=x'], ['GET', '/api/contact-fields?id=x']]) {
    r = await api(m, p, { body: m === 'GET' ? undefined : '{}' });
    check('route is wired: ' + m + ' ' + p.split('?')[0] + ' -> 401 without a token', r.status, 401);
  }
  r = await api('GET', '/api/public/quote?id=x&k=y');
  check('public quote route is wired (503 while its secret is unset)', r.status, 503);
  r = await api('POST', '/api/public/quote/respond?id=x&k=y', { body: '{}' });
  check('public quote respond route is wired (503 while its secret is unset)', r.status, 503);
  r = await api('GET', '/api/store?collection=quotes', { headers: { 'x-quote-token': tokenOk } });
  check('no database settings -> store route 503 Storage not configured', r.status + ':' + /Storage not configured/.test(r.text), '503:true');

  // install routes: the rewrite target files, called with the original path and with the rewritten path
  const cbFn = (await impApi('hub-install/oauth-callback.js'));
  const whFn = (await impApi('hub-install/webhooks-platform.js'));
  const ucFn = (await impApi('hub-install/auth-user-context.js'));
  check('install entries export only their method', [typeof cbFn.GET, typeof cbFn.POST, typeof whFn.POST, typeof whFn.GET, typeof ucFn.POST, typeof ucFn.GET].join(','), 'function,undefined,function,undefined,function,undefined');
  r = await call(cbFn.GET, 'GET', '/oauth/callback?error=access_denied');
  check('GET /oauth/callback (original path) -> 400 page', r.status + ':' + /text\/html/.test(r.h.get('content-type')), '400:true');
  r = await call(cbFn.GET, 'GET', '/api/hub-install/oauth-callback?error=access_denied');
  check('GET /oauth/callback (rewritten path) -> same page', r.status + ':' + /Not installed/.test(r.text), '400:true');
  r = await call(whFn.POST, 'POST', '/webhooks/platform', { body: JSON.stringify({ type: 'INSTALL', appId: 'wrongapp', locationId: 'locAAA11111' }) });
  check('POST /webhooks/platform wrong appId -> 400', r.status, 400);
  r = await call(ucFn.POST, 'POST', '/auth/user-context', { headers: { Origin: 'https://evil.test' }, body: '{}' });
  check('POST /auth/user-context from another origin -> 403', r.status, 403);
  r = await call(ucFn.POST, 'POST', '/auth/user-context', { body: '{"payload":"zz"}' });
  check('POST /auth/user-context bad payload -> 400', r.status, 400);
  r = await call(cbFn.GET, 'GET', '/oauth/callback?code=GOODCODE1234');
  check('install callback with no database settings and no token endpoint answer does not leak (502 or 503 page)', [502, 503].includes(r.status) && !/GOODCODE|cs|tok\.invalid/.test(r.text.replace(/<style>.*<\/style>/s, '')), true);

  // ---- database over HTTP: fake PostgREST in memory ----
  const SBURL = 'https://db.example.test', SBKEY = 'service-role-key-TEST';
  const table = new Map();
  const sbCalls = [];
  let sbMode = 'ok';
  const fakeSupabase = async (url, init = {}) => {
    const u = new URL(url);
    sbCalls.push({ method: init.method, url: String(url), apikey: init.headers?.apikey, auth: init.headers?.Authorization });
    if (sbMode === 'down') throw new Error('network down: db.example.test table hub_records');
    if (sbMode === '500') return new Response('{"message":"relation hub_records column data secret"}', { status: 500 });
    const q = u.searchParams;
    const eq = (k) => { const v = q.get(k); return v && v.startsWith('eq.') ? v.slice(3) : undefined; };
    const key = (c, i) => c + '|' + i;
    const body = init.body ? JSON.parse(init.body) : undefined;
    const prefer = init.headers?.Prefer ?? '';
    const json = (s, o) => new Response(JSON.stringify(o), { status: s });
    const m = init.method;
    if (m === 'GET') {
      let rows = [...table.values()].filter((r) => (!eq('collection') || r.collection === eq('collection')) && (!eq('id') || r.id === eq('id')));
      rows.sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
      if (q.get('limit')) rows = rows.slice(0, Number(q.get('limit')));
      return json(200, rows.map(({ id, data, updated_at }) => ({ id, data, updated_at })));
    }
    if (m === 'POST') {
      const k = key(body.collection, body.id);
      if (prefer.includes('merge-duplicates')) { table.set(k, { ...body }); return json(201, [body]); }
      if (table.has(k)) return json(409, { code: '23505', message: 'duplicate key value' });
      table.set(k, { ...body });
      return json(201, [body]);
    }
    if (m === 'PATCH') {
      const hit = [...table.values()].filter((r) => r.collection === eq('collection') && r.id === eq('id') && r.updated_at === eq('updated_at'));
      for (const r of hit) { r.data = body.data; r.updated_at = body.updated_at; }
      return json(200, hit.map(({ id, data, updated_at }) => ({ id, data, updated_at })));
    }
    if (m === 'DELETE') { table.delete(key(eq('collection'), eq('id'))); return new Response(null, { status: 204 }); }
    return json(400, {});
  };
  globalThis.fetch = fakeSupabase;
  const S = ST.createSupabaseRestStore(SBURL + '/', SBKEY);
  let a = await S.put('quotes', 'q1', { n: 1 });
  check('db: unguarded put creates, returns id, data and ISO time', a.id + '|' + JSON.stringify(a.data) + '|' + /^\d{4}-\d\d-\d\dT.*Z$/.test(a.updatedAt), 'q1|{"n":1}|true');
  check('db: get returns the record', JSON.stringify((await S.get('quotes', 'q1')).data), '{"n":1}');
  check('db: get of a missing id is null', await S.get('quotes', 'nope'), null);
  await S.put('terms', 't1', { x: 1 });
  check('db: list is by collection, newest first', (await S.list('quotes')).map((r) => r.id).join(','), 'q1');
  await new Promise((rs) => setTimeout(rs, 5));
  let b = await S.put('quotes', 'q1', { n: 2 }, a.updatedAt);
  check('db: guarded put with the stamp you saw updates', JSON.stringify(b.data) + '|' + (b.updatedAt !== a.updatedAt), '{"n":2}|true');
  let conflict = null;
  await S.put('quotes', 'q1', { n: 3 }, a.updatedAt).catch((e) => { conflict = e; });
  check('db: guarded put with an old stamp -> ConflictError, nothing overwritten', (conflict instanceof ConflictError) + '|' + JSON.stringify((await S.get('quotes', 'q1')).data), 'true|{"n":2}');
  const fresh = await S.put('quotes', 'q2', { n: 1 }, new Date().toISOString());
  check('db: guarded put on an id that does not exist inserts', fresh.id + '|' + JSON.stringify((await S.get('quotes', 'q2')).data), 'q2|{"n":1}');
  // a writer slips in between the PATCH and the insert: insert gets 409 -> conflict
  const origFetch = globalThis.fetch;
  let first = true;
  globalThis.fetch = async (url, init = {}) => { if (init.method === 'POST' && first && !String(init.headers?.Prefer).includes('merge')) { first = false; table.set('quotes|q3', { collection: 'quotes', id: 'q3', data: { other: 1 }, updated_at: new Date().toISOString() }); } return origFetch(url, init); };
  let c3 = null;
  await S.put('quotes', 'q3', { mine: 1 }, new Date().toISOString()).catch((e) => { c3 = e; });
  check('db: insert that loses a race (unique violation) -> ConflictError', c3 instanceof ConflictError, true);
  globalThis.fetch = origFetch;
  await S.delete('quotes', 'q1');
  check('db: delete removes it, other records stay', (await S.get('quotes', 'q1')) + '|' + (await S.get('terms', 't1')).id, 'null|t1');
  check('db: every call carries the key in headers, never in the address', sbCalls.every((x) => x.apikey === SBKEY && x.auth === 'Bearer ' + SBKEY && !x.url.includes(SBKEY)), true);
  check('db: calls go to the REST address of the table', sbCalls.every((x) => x.url.startsWith(SBURL + '/rest/v1/hub_records?')), true);
  sbMode = '500';
  let e500 = null; await S.get('quotes', 'q2').catch((e) => { e500 = e; });
  check('db: server error -> plain "Store error", nothing from the database text', e500?.message, 'Store error');
  sbMode = 'down';
  let eDown = null; await S.list('quotes').catch((e) => { eDown = e; });
  check('db: network failure -> plain "Store error", no host or table in the message', eDown?.message, 'Store error');
  sbMode = 'ok';

  // ---- store registered from the settings on first use (through the real function entry) ----
  Object.assign(process.env, { SUPABASE_URL: SBURL, SUPABASE_SERVICE_ROLE_KEY: SBKEY });
  table.clear();
  const sub = await api('PUT', '/api/store?collection=terms&id=tt1', { headers: { 'x-quote-token': tokenOk }, body: JSON.stringify({ data: { hello: 'x' } }) });
  check('function entry: store route writes through the database settings', sub.status, 200);
  check('function entry: the record is in the fake database', JSON.stringify(table.get('terms|tt1')?.data), '{"hello":"x"}');
  const rd = await api('GET', '/api/store?collection=terms', { headers: { 'x-quote-token': tokenOk } });
  check('function entry: list reads it back', JSON.parse(rd.text).records?.map((x) => x.id).join(','), 'tt1');
  const acc = await api('GET', '/api/store?collection=accounts', { headers: { 'x-quote-token': tokenOk } });
  check('function entry: accounts (tokens) collection is still refused', acc.status, 400);
  Object.assign(process.env, { SUPABASE_URL: '', SUPABASE_SERVICE_ROLE_KEY: '' });

  // ---- the page function and its framing header ----
  const PG = await impApi('_page.js');
  const html = path.join(tmp, 'app.html');
  fs.writeFileSync(html, '<!doctype html><title>t</title>');
  const page = PG.makePage(html);
  Object.assign(process.env, { HUB_FRAME_ANCESTORS: 'https://app.example.test, https://*.example.org' });
  let pr = page();
  check('page: 200 html', pr.status + ':' + /text\/html/.test(pr.headers.get('content-type')), '200:true');
  check('page: frame-ancestors is self plus the setting', pr.headers.get('content-security-policy'), "frame-ancestors 'self' https://app.example.test https://*.example.org");
  check('page: no X-Frame-Options header', pr.headers.get('x-frame-options'), null);
  check('page: noindex, nosniff', pr.headers.get('x-robots-tag') + '|' + pr.headers.get('x-content-type-options'), 'noindex, nofollow|nosniff');
  check('page: body is the built page', await pr.text(), '<!doctype html><title>t</title>');
  Object.assign(process.env, { HUB_FRAME_ANCESTORS: '' });
  check('page: setting empty -> only ourselves may frame it', page().headers.get('content-security-policy'), "frame-ancestors 'self'");
  Object.assign(process.env, { HUB_FRAME_ANCESTORS: 'https://ok.example.test;script-src *' });
  check('page: a bad value in the setting cannot add policy', page().headers.get('content-security-policy'), "frame-ancestors 'self'");
  check('page: missing build file -> 500 plain text', PG.makePage(path.join(tmp, 'missing.html'))().status, 500);
  const pageEntry = await impApi('page.js');
  check('page entry exports GET and HEAD', typeof pageEntry.GET + typeof pageEntry.HEAD, 'functionfunction');

  // ---- vercel.json ----
  const vj = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
  const vtext = JSON.stringify(vj);
  check('vercel.json: no X-Frame-Options anywhere', /x-frame-options/i.test(vtext), false);
  check('vercel.json: no vendor name', VENDOR.test(vtext), false);
  check('vercel.json: install step builds the server, build step is the vercel build', /server:build/.test(vj.installCommand) + '|' + vj.buildCommand + '|' + vj.outputDirectory, 'true|npm run build:vercel|dist');
  const rw = vj.rewrites;
  check('vercel.json: three install rewrites come first, page fallback last', rw.slice(0, 3).map((x) => x.source).join(',') + '|' + rw[3].destination, '/oauth/callback,/webhooks/platform,/auth/user-context|/api/page');
  check('vercel.json: every rewrite target is a real function file', rw.every((x) => fs.existsSync(path.join(root, x.destination.replace(/^\//, '') + '.js'))), true);
  const fallback = new RegExp('^' + rw[3].source + '$');
  check('vercel.json: fallback matches / and client side paths', ['/', '/jobs', '/jobs/abc', '/index.html'].every((p) => fallback.test(p)), true);
  check('vercel.json: fallback skips /api and /assets', ['/api/auth', '/api/', '/assets/x.js'].some((p) => fallback.test(p)), false);
  check('vercel.json: function settings match real files', Object.keys(vj.functions).every((g) => g === 'api/**/*.js' || fs.existsSync(path.join(root, g))), true);
  check('vercel.json: no secret-looking values', /secret|token|key/i.test(Object.values(vj.headers.flatMap((h) => h.headers.map((x) => x.value))).join(' ')), false);
  const pj = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  check('package.json: existing scripts kept, build:vercel added', ['dev', 'build', 'preview', 'typecheck', 'server:build', 'server:dev', 'build:vercel'].every((k) => pj.scripts[k]), true);
  check('package.json: build:vercel runs the postbuild step', /vercel-postbuild/.test(pj.scripts['build:vercel']), true);

  // ---- postbuild step ----
  const { spawnSync } = await import('node:child_process');
  const fake = path.join(tmp, 'out'); fs.mkdirSync(fake); fs.writeFileSync(path.join(fake, 'index.html'), 'x'); fs.mkdirSync(path.join(fake, 'assets'));
  const pb = spawnSync(process.execPath, [path.join(root, 'scripts', 'vercel-postbuild.mjs'), fake], { encoding: 'utf8' });
  check('postbuild: index.html becomes app.html, assets untouched', pb.status + '|' + fs.existsSync(path.join(fake, 'app.html')) + '|' + fs.existsSync(path.join(fake, 'index.html')) + '|' + fs.existsSync(path.join(fake, 'assets')), '0|true|false|true');
  const pb2 = spawnSync(process.execPath, [path.join(root, 'scripts', 'vercel-postbuild.mjs'), path.join(tmp, 'empty')], { encoding: 'utf8' });
  check('postbuild: no build output -> fails loudly', pb2.status, 1);

  // ---- no vendor name in anything new ----
  const newFiles = ['api/_hub.js', 'api/_page.js', 'api/page.js', 'api/[...path].js', 'api/hub-install/oauth-callback.js', 'api/hub-install/webhooks-platform.js', 'api/hub-install/auth-user-context.js', 'vercel.json', '.vercelignore', 'scripts/vercel-postbuild.mjs', 'server/routes.mjs', 'server/lib/frame.ts', 'server/store/supabase-rest.ts', 'server/store/ensure.ts', 'DEPLOY-VERCEL.md'];
  check('no vendor name in the new files', newFiles.filter((f) => fs.existsSync(path.join(root, f)) && VENDOR.test(fs.readFileSync(path.join(root, f), 'utf8'))).join(',') || 'none', 'none');
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
} else if (mode === 'files') {
  // Job document files: real dev server on a port, JSON-file store in a temp folder, in-memory fake file storage. No network, no CRM.
  const os = await import('node:os');
  const fs = await import('node:fs');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hub-files-'));
  const imp = (p) => import(pathToFileURL(path.join(here, '.build', p)).href);
  const F = await imp('lib/files.js');
  const PORT = 8811, U = 'http://127.0.0.1:' + PORT;
  const storeFile = path.join(tmp, 'store.json');

  // Pure rules
  check('rules: 25 MB and 50 files', F.MAX_BYTES + '|' + F.MAX_FILES_PER_JOB, '26214400|50');
  check('rules: pdf with pdf mime allowed', F.isAllowedType('a.pdf', 'application/pdf'), true);
  check('rules: pdf declared image/png refused', F.isAllowedType('a.pdf', 'image/png'), false);
  check('rules: exe refused', F.isAllowedType('a.exe', 'application/octet-stream'), false);
  check('rules: no extension refused', F.isAllowedType('readme', 'text/plain'), false);
  check('rules: jpg with image/jpeg allowed', F.isAllowedType('P.JPG', 'image/jpeg'), true);
  check('rules: jpg with text/plain refused', F.isAllowedType('p.jpg', 'text/plain'), false);
  check('rules: docx and xlsx mimes', F.isAllowedType('a.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') + '|' + F.isAllowedType('a.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'), 'true|true');
  check('safeName: traversal stripped', F.safeName('../../etc/passwd.pdf'), 'passwd.pdf');
  check('safeName: backslash path stripped', F.safeName('C:\\x\\y\\plan.PDF'), 'plan.pdf');
  check('safeName: odd characters replaced, spaces kept', F.safeName('My plan (v2) #1.pdf'), 'My plan _v2_ _1.pdf');
  check('safeName: control characters removed', F.safeName('a\u0000b\nc.txt'), 'abc.txt');
  check('safeName: long name keeps its extension', /^a{100}\.pdf$/.test(F.safeName('a'.repeat(300) + '.pdf')), true);
  check('buildPath', F.buildPath('LOC', 'job1', 'ff00', '../x y.pdf'), 'LOC/job1/ff00-x y.pdf');
  check('isUnderLocation: inside', F.isUnderLocation('LOC/job1/f-a.pdf', 'LOC'), true);
  check('isUnderLocation: other location', F.isUnderLocation('OTHER/job1/f-a.pdf', 'LOC'), false);
  check('isUnderLocation: prefix trick', F.isUnderLocation('LOCATION2/a.pdf', 'LOC'), false);
  check('isUnderLocation: dot segments', F.isUnderLocation('LOC/../OTHER/a.pdf', 'LOC'), false);
  check('isUnderLocation: empty location', F.isUnderLocation('/a.pdf', ''), false);
  check('newFileId: 24 hex', /^[a-f0-9]{24}$/.test(F.newFileId()), true);

  const env = { ...process.env, SPRY_CRM_LOCATION_ID: DEV, SPRY_IFRAME_SECRET: secret, SPRY_ALLOW_OPEN: '', SPRY_STORE: 'file', SPRY_STORE_FILE: storeFile };
  let out = '';
  child = spawn(process.execPath, [path.join(here, 'dev-server.mjs'), '--port', String(PORT), '--env', path.join(here, 'no-such.env')], { env, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stderr.on('data', (d) => { out += String(d); });
  await new Promise((res, rej) => { child.stdout.on('data', (d) => { out += String(d); /Hub server on/.test(String(d)) && res(); }); child.on('exit', () => rej(new Error('server exited'))); setTimeout(() => rej(new Error('start timeout')), 10000); });
  const tok = mint({ loc: DEV, exp: now + 3600 });
  const api = async (m, p, body, token = tok) => {
    const r = await fetch(U + p, { method: m, headers: { Origin: U, 'Content-Type': 'application/json', ...(token ? { 'X-Quote-Token': token } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    const text = await r.text();
    let j = {}; try { j = JSON.parse(text); } catch { /* not json */ }
    return { status: r.status, j, text };
  };
  const PDF = 'application/pdf';
  const up = (jobId, name, size, type, extra = {}) => api('POST', '/api/files', { op: 'upload', jobId, name, size, type, kind: 'Plan', uploadedBy: 'Staff A', ...extra });
  const UNIQUE = 'zzSecretNameQ7';

  let r = await api('GET', '/api/files?jobId=x', undefined, '');
  check('no token -> 401', r.status, 401);
  r = await api('GET', '/api/files?jobId=x');
  check('GET empty list', r.status + '|' + JSON.stringify(r.j), '200|{"files":[]}');
  r = await api('GET', '/api/files?jobId=' + encodeURIComponent('a b'));
  check('GET bad jobId -> 400', r.status, 400);
  r = await up('jobA', 'virus.exe', 100, 'application/octet-stream');
  check('upload .exe -> 400', r.status + '|' + r.j.error, '400|File type not allowed');
  r = await up('jobA', 'plan.pdf', 100, 'image/png');
  check('upload pdf declared image/png -> 400', r.status, 400);
  r = await up('jobA', 'plan.pdf', 26 * 1024 * 1024, PDF);
  check('upload 26 MB -> 413', r.status + '|' + r.j.error, '413|File too big (25 MB limit)');
  r = await up('jobA', 'plan.pdf', 0, PDF);
  check('upload size 0 -> 413', r.status, 413);
  r = await up('bad id', 'plan.pdf', 5, PDF);
  check('upload bad jobId -> 400', r.status, 400);
  r = await up('jobA', 'x'.repeat(300) + '.pdf', 5, PDF);
  check('upload 300 char name refused (400)', r.status, 400);
  r = await up('jobA', 'plan.pdf', 5, PDF, { uploadedBy: 'x'.repeat(81) });
  check('upload uploadedBy over 80 -> 400', r.status, 400);
  r = await api('POST', '/api/files', { op: 'upload', jobId: 'jobA', name: 'a.pdf', size: 5, type: PDF, pad: 'x'.repeat(20000) });
  check('upload body over 16 KB -> 400', r.status, 400);

  const bytes = Buffer.from(crypto.randomBytes(5000));
  r = await up('jobA', '../../etc/' + UNIQUE + ' plan.pdf', bytes.length, PDF, { kind: 'Nonsense' });
  const f = r.j.file;
  check('upload ok -> 200 pending row', r.status + '|' + f?.status + '|' + f?.source + '|' + f?.kind, '200|pending|file|Other');
  check('upload: display name cleaned', f?.name, UNIQUE + ' plan.pdf');
  check('upload: path is exactly <location>/<jobId>/<fileId>-<safe name>', f?.path, DEV + '/jobA/' + f?.id + '-' + UNIQUE + ' plan.pdf');
  check('upload: id is 24 hex, expiresIn 600', /^[a-f0-9]{24}$/.test(f?.id) + '|' + r.j.expiresIn, 'true|600');
  r.j.uploadUrl && check('upload url points at the fake storage', r.j.uploadUrl.startsWith(U + '/fake-storage/up/'), true);
  let c = await api('GET', '/api/files?jobId=jobA');
  check('pending row is not listed', c.j.files?.length, 0);
  c = await api('POST', '/api/files', { op: 'confirm', id: f.id });
  check('confirm before upload -> 409', c.status + '|' + c.j.error, '409|Upload not found');
  const put = await fetch(r.j.uploadUrl, { method: 'PUT', headers: r.j.uploadHeaders, body: bytes });
  check('real PUT of bytes -> 200', put.status, 200);
  const put2 = await fetch(r.j.uploadUrl.replace(/[a-f0-9]{48}$/, 'f'.repeat(48)), { method: 'PUT', body: bytes });
  check('PUT with an unknown token -> 404', put2.status, 404);
  c = await api('POST', '/api/files', { op: 'confirm', id: f.id });
  check('confirm -> ready with size from the object', c.status + '|' + c.j.file?.status + '|' + c.j.file?.size, '200|ready|' + bytes.length);
  c = await api('GET', '/api/files?jobId=jobA');
  check('listing shows it', c.j.files?.length + '|' + c.j.files?.[0]?.id, '1|' + f.id);
  c = await api('GET', '/api/files?id=' + f.id + '&download=1');
  check('download link answers', c.status + '|' + c.j.name + '|' + c.j.expiresIn, '200|' + UNIQUE + ' plan.pdf|300');
  const dl = await fetch(c.j.url);
  check('download returns identical bytes', Buffer.compare(Buffer.from(await dl.arrayBuffer()), bytes), 0);
  check('download link forces a download (attachment)', (dl.headers.get('content-disposition') ?? '').startsWith('attachment'), true);
  c = await api('GET', '/api/files?id=' + f.id + '&download=1&inline=1');
  const dl2 = await fetch(c.j.url);
  check('inline=1: same bytes, no attachment header', c.status + '|' + dl2.headers.get('content-disposition') + '|' + (Buffer.compare(Buffer.from(await dl2.arrayBuffer()), bytes)), '200|null|0');
  c = await api('GET', '/api/files?id=nope&download=1');
  check('download of unknown id -> 404', c.status, 404);

  // Links
  r = await api('POST', '/api/files', { op: 'link', jobId: 'jobA', name: 'Drive folder', url: 'https://example.invalid/a?b=1', kind: 'Photo', uploadedBy: 'Staff A' });
  const link = r.j.file;
  check('link https -> ready, no path, size 0', r.status + '|' + link?.status + '|' + link?.source + '|' + link?.path + '|' + link?.size + '|' + link?.type, '200|ready|link||0|link');
  r = await api('POST', '/api/files', { op: 'link', jobId: 'jobA', name: 'Bad', url: 'javascript:alert(1)' });
  check('link javascript: -> 400', r.status, 400);
  r = await api('POST', '/api/files', { op: 'link', jobId: 'jobA', name: 'Bad', url: 'not a url' });
  check('link unparseable -> 400', r.status, 400);
  r = await api('GET', '/api/files?id=' + link.id + '&download=1');
  check('download of a link -> 400', r.status, 400);
  c = await api('GET', '/api/files?jobId=jobA');
  check('listing newest first, both shown', c.j.files?.map((x) => x.id).join(','), link.id + ',' + f.id);

  // Rename
  r = await api('POST', '/api/files', { op: 'rename', id: f.id, name: '  ../New name.pdf ' });
  check('rename: cleaned name, path unchanged', r.status + '|' + r.j.file?.name + '|' + (r.j.file?.path === f.path), '200|New name.pdf|true');
  r = await api('POST', '/api/files', { op: 'rename', id: f.id, name: '' });
  check('rename empty -> 400', r.status, 400);
  r = await api('POST', '/api/files', { op: 'nope' });
  check('unknown op -> 400', r.status, 400);

  // A row seeded with another location prefix is refused and nothing is removed
  const { createFileStore } = await imp('store/file.js');
  const seed = createFileStore(storeFile);
  await seed.put('attachments', 'seedother', { id: 'seedother', jobId: 'jobA', source: 'file', name: 'o.pdf', kind: 'Other', size: 3, type: PDF, uploadedBy: '', uploadedAt: new Date().toISOString(), path: 'OTHERLOC/jobA/seedother-o.pdf', status: 'ready' });
  r = await api('GET', '/api/files?id=seedother&download=1');
  check('foreign-location row: download -> 404', r.status, 404);
  r = await api('DELETE', '/api/files?id=seedother');
  check('foreign-location row: delete -> 404', r.status, 404);
  check('foreign-location row: still in the store', !!(await seed.get('attachments', 'seedother')), true);

  // Store route must refuse the collection
  r = await api('GET', '/api/store?collection=attachments');
  check('/api/store?collection=attachments -> 400', r.status, 400);

  // Delete
  r = await api('DELETE', '/api/files?id=' + f.id);
  check('delete file -> ok', r.status + '|' + JSON.stringify(r.j), '200|{"ok":true}');
  check('delete: row gone', await seed.get('attachments', f.id), null);
  c = await fetch(await (async () => { return U + '/fake-storage/dl/' + 'a'.repeat(48); })());
  check('fake storage: unknown download token -> 404', c.status, 404);
  r = await api('DELETE', '/api/files?id=' + link.id);
  check('delete link -> ok', r.status, 200);
  r = await api('DELETE', '/api/files?id=' + f.id);
  check('delete again -> 404', r.status, 404);

  // Cap: 50 per job (pending rows younger than an hour count; old pending rows do not)
  const iso = new Date().toISOString();
  const row = (id, over = {}) => ({ id, jobId: 'jobCap', source: 'link', name: 'n', kind: 'Other', size: 0, type: 'link', uploadedBy: '', uploadedAt: iso, path: '', url: 'https://example.invalid/', status: 'ready', ...over });
  for (let i = 0; i < 48; i++) await seed.put('attachments', 'cap' + i, row('cap' + i));
  await seed.put('attachments', 'capold', row('capold', { status: 'pending', uploadedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString() }));
  r = await up('jobCap', 'a.pdf', 5, PDF);
  check('49th file allowed (old pending not counted)', r.status, 200);
  r = await up('jobCap', 'b.pdf', 5, PDF);
  check('50th file allowed (fresh pending counts)', r.status, 200);
  r = await up('jobCap', 'c.pdf', 5, PDF);
  check('51st file -> 409', r.status + '|' + r.j.error, '409|Too many files on this job (50 limit)');
  r = await api('POST', '/api/files', { op: 'link', jobId: 'jobCap', name: 'L', url: 'https://example.invalid/' });
  check('link over the cap -> 409', r.status, 409);

  // Output hygiene
  stop();
  await new Promise((r2) => setTimeout(r2, 300));
  check('server output holds no token, secret or file name', out.includes(tok) || out.includes(secret) || out.includes(UNIQUE) || out.includes('example.invalid'), false);
  fs.rmSync(tmp, { recursive: true, force: true });
} else if (mode === 'send') {
  // Guarded send route against a stand-in CRM (no real CRM, no real messages) and a JSON-file store in a temp folder.
  const http = await import('node:http');
  const os = await import('node:os');
  const fs = await import('node:fs');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hub-send-'));
  const calls = []; // every request the stand-in saw: { method, url, body }
  let crmMode = 'ok';
  const people = {
    goodAAA1: { id: 'goodAAA1', firstName: 'Test', lastName: 'Person', phone: '+61400000001', email: 'test.person@example.invalid' },
    nophone1: { id: 'nophone1', firstName: 'No', lastName: 'Phone', email: 'no.phone@example.invalid' },
    noemail1: { id: 'noemail1', firstName: 'No', lastName: 'Email', phone: '+61400000002' },
    dndAll01: { id: 'dndAll01', firstName: 'Dee', lastName: 'Nd', phone: '+61400000003', email: 'dee@example.invalid', dnd: true },
    dndSms01: { id: 'dndSms01', firstName: 'Sam', lastName: 'Sms', phone: '+61400000004', email: 'sam@example.invalid', dndSettings: { SMS: { status: 'active' }, Email: { status: 'inactive' } } },
  };
  const fake = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (d) => { raw += d; });
    req.on('end', () => {
      calls.push({ method: req.method, url: req.url, body: raw ? JSON.parse(raw) : undefined });
      res.setHeader('Content-Type', 'application/json');
      const m = /^\/contacts\/([A-Za-z0-9]+)/.exec(req.url);
      if (req.method === 'GET' && m) {
        const p = people[m[1]] ?? (/^(good|rate)/.test(m[1]) ? { ...people.goodAAA1, id: m[1] } : null);
        if (!p) { res.statusCode = 404; return res.end(JSON.stringify({ message: 'Contact not found' })); }
        return res.end(JSON.stringify({ contact: p }));
      }
      if (req.method === 'POST' && req.url === '/conversations/messages') {
        if (crmMode === 'refuse') { res.statusCode = 422; return res.end(JSON.stringify({ message: 'Number is on the carrier block list' })); }
        if (crmMode === 'down') return req.socket.destroy();
        return res.end(JSON.stringify({ conversationId: 'convZZZ001', messageId: 'msgZZZ001' }));
      }
      res.statusCode = 404; res.end('{}');
    });
  });
  await new Promise((r) => fake.listen(0, '127.0.0.1', r));
  const fakeBase = 'http://127.0.0.1:' + fake.address().port;
  const tok = mint({ loc: DEV, exp: now + 3600 });
  const outs = [];
  const runSend = async (port, env, fn) => {
    const storeFile = path.join(tmp, 'store-' + port + '.json');
    let out = '';
    child = spawn(process.execPath, [path.join(here, 'dev-server.mjs'), '--port', String(port), '--env', path.join(here, 'no-such.env')], {
      env: { ...process.env, SPRY_CRM_TOKEN: 'zzFakeToken' + 'x'.repeat(16), SPRY_CRM_API_BASE: fakeBase, SPRY_CRM_LOCATION_ID: DEV, SPRY_IFRAME_SECRET: secret, SPRY_ALLOW_OPEN: '', SPRY_STORE: 'file', SPRY_STORE_FILE: storeFile, HUB_SEND_ALLOWED: '', HUB_EMAIL_FROM: '', ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    child.stderr.on('data', (d) => { out += String(d); });
    await new Promise((res, rej) => { child.stdout.on('data', (d) => { out += String(d); /Hub server on/.test(String(d)) && res(); }); child.on('exit', () => rej(new Error('server exited'))); setTimeout(() => rej(new Error('start timeout')), 10000); });
    const U = 'http://127.0.0.1:' + port;
    const api = async (m, p, body) => {
      const r = await fetch(U + p, { method: m, headers: { Origin: U, 'Content-Type': 'application/json', 'X-Quote-Token': tok }, body: body === undefined ? undefined : JSON.stringify(body) });
      const text = await r.text();
      let j = {}; try { j = JSON.parse(text); } catch { /* not json */ }
      outs.push(text);
      return { status: r.status, j, text };
    };
    try { await fn(api, storeFile); } finally { stop(); await new Promise((r2) => setTimeout(r2, 300)); outs.push(out); }
  };
  const posts = () => calls.filter((c) => c.method === 'POST' && c.url === '/conversations/messages');
  const sms = (extra = {}) => ({ contactId: 'goodAAA1', channel: 'sms', body: 'Hi Test, see you at 9.', sentBy: 'Staff A', jobId: 'jobAAA1', ...extra });
  try {
    // 1. Off by default: server does not allow
    await runSend(8821, {}, async (api) => {
      let r = await api('GET', '/api/send');
      check('GET default: nothing allowed or enabled', r.status + '|' + JSON.stringify(r.j), '200|' + JSON.stringify({ allowed: false, enabled: false, canSend: false, emailFrom: '', limits: { perMinute: 5, perHour: 30 } }));
      r = await api('POST', '/api/send', sms());
      check('off by default: POST -> 403 with the switched-off words', r.status + '|' + /^Sending is switched off\./.test(r.j.error), '403|true');
      check('off by default: the stand-in CRM got zero calls', calls.length, 0);
      r = await api('PUT', '/api/send', { enabled: true, by: 'Staff A' });
      check('PUT refused when the server does not allow it', r.status + '|' + r.j.error, '403|Sending is locked on the server. Only the server owner can unlock it.');
      r = await api('GET', '/api/send');
      check('GET after refused PUT: still not enabled', r.j.enabled, false);
    });
    // 2. Allowed by the server but not switched on
    await runSend(8822, { HUB_SEND_ALLOWED: '1' }, async (api) => {
      let r = await api('GET', '/api/send');
      check('allowed, not enabled: canSend false', r.j.allowed + '|' + r.j.enabled + '|' + r.j.canSend, 'true|false|false');
      r = await api('POST', '/api/send', sms());
      check('allowed but not enabled: POST -> 403', r.status, 403);
      check('allowed but not enabled: CRM got zero calls', calls.length, 0);
    });
    // 3. Enabled: the normal sends, refusals and errors
    await runSend(8823, { HUB_SEND_ALLOWED: '1', HUB_EMAIL_FROM: 'Spray It <hello@example.invalid>' }, async (api, storeFile) => {
      let r = await api('PUT', '/api/send', { enabled: 'yes' });
      check('PUT with a non-boolean -> 400', r.status, 400);
      r = await api('PUT', '/api/send', { enabled: true, by: 'Staff A' });
      check('PUT enable -> 200 canSend true, emailFrom shown', r.status + '|' + r.j.canSend + '|' + r.j.emailFrom, '200|true|Spray It <hello@example.invalid>');
      const { createFileStore } = await import(pathToFileURL(path.join(here, '.build', 'store', 'file.js')).href);
      const store = createFileStore(storeFile);
      const setting = await store.get('hubsettings', 'send');
      check('switch stored with by and at', setting?.data.enabled + '|' + setting?.data.by + '|' + !Number.isNaN(Date.parse(setting?.data.at)), 'true|Staff A|true');
      r = await api('GET', '/api/send');
      check('GET after enable: canSend true', r.j.canSend, true);

      // Refusals before the CRM is asked to send (400s do not even read the contact)
      calls.length = 0;
      check('empty body -> 400', (await api('POST', '/api/send', sms({ body: '   ' }))).status, 400);
      check('sms over 1000 chars -> 400', (await api('POST', '/api/send', sms({ body: 'a'.repeat(1001) }))).status, 400);
      check('email over 20000 chars -> 400', (await api('POST', '/api/send', sms({ channel: 'email', subject: 'S', body: 'a'.repeat(20001) }))).status, 400);
      check('bad channel -> 400', (await api('POST', '/api/send', sms({ channel: 'fax' }))).status, 400);
      check('bad contact id -> 400', (await api('POST', '/api/send', sms({ contactId: 'x y' }))).status, 400);
      check('array of contacts (bulk) -> 400', (await api('POST', '/api/send', sms({ contactId: ['goodAAA1', 'goodAAA2'] }))).status, 400);
      check('email without a subject -> 400', (await api('POST', '/api/send', sms({ channel: 'email' }))).status, 400);
      check('the 400s made zero CRM calls', calls.length, 0);

      r = await api('POST', '/api/send', sms({ contactId: 'missing1' }));
      check('unknown contact -> 404', r.status, 404);
      r = await api('POST', '/api/send', sms({ contactId: 'nophone1' }));
      check('no phone -> 409 with the exact words', r.status + '|' + r.j.error, '409|No Phone has no phone number on file');
      r = await api('POST', '/api/send', sms({ contactId: 'noemail1', channel: 'email', subject: 'Hello' }));
      check('no email -> 409 with the exact words', r.status + '|' + r.j.error, '409|No Email has no email on file');
      r = await api('POST', '/api/send', sms({ contactId: 'dndAll01' }));
      check('do-not-disturb (dnd true), sms -> 409', r.status + '|' + r.j.error, '409|Dee Nd has asked not to receive texts');
      r = await api('POST', '/api/send', sms({ contactId: 'dndSms01' }));
      check('do-not-disturb (SMS active), sms -> 409', r.status + '|' + r.j.error, '409|Sam Sms has asked not to receive texts');
      r = await api('POST', '/api/send', sms({ contactId: 'dndAll01', channel: 'email', subject: 'Hi' }));
      check('do-not-disturb (dnd true), email -> 409 emails', r.status + '|' + r.j.error, '409|Dee Nd has asked not to receive emails');
      check('the refusals sent nothing', posts().length, 0);

      // A good text
      r = await api('POST', '/api/send', sms());
      check('sms ok -> 201 mapped', r.status + '|' + r.j.ok + '|' + r.j.messageId + '|' + r.j.conversationId + '|' + r.j.channel + '|' + r.j.to?.name + '|' + r.j.to?.address, '201|true|msgZZZ001|convZZZ001|sms|Test Person|+61400000001');
      check('sms ok: response has an at time', !Number.isNaN(Date.parse(r.j.at)), true);
      check('stand-in saw exactly one send', posts().length, 1);
      check('sms body exactly { type, contactId, message }', JSON.stringify(posts()[0]?.body), JSON.stringify({ type: 'SMS', contactId: 'goodAAA1', message: 'Hi Test, see you at 9.' }));

      // A good email: escaped, newlines as <br>, emailFrom included
      r = await api('POST', '/api/send', sms({ channel: 'email', subject: 'Your quote', body: 'Line one <b>&\nLine two' }));
      check('email ok -> 201', r.status + '|' + r.j.channel + '|' + r.j.to?.address, '201|email|test.person@example.invalid');
      check('stand-in saw the second send', posts().length, 2);
      check('email body: type, subject, escaped html with <br>, message, emailFrom', JSON.stringify(posts()[1]?.body), JSON.stringify({ type: 'Email', contactId: 'goodAAA1', subject: 'Your quote', html: 'Line one &lt;b&gt;&amp;<br>Line two', message: 'Line one <b>&\nLine two', emailFrom: 'Spray It <hello@example.invalid>' }));

      // Log: written, no message text
      const log = await store.list('sendlog');
      check('two log records written', log.length, 2);
      const l0 = log.find((x) => x.data.channel === 'sms')?.data;
      check('log record fields', JSON.stringify([l0?.by, l0?.contactId, l0?.to, l0?.length, l0?.jobId, l0?.messageId, !Number.isNaN(Date.parse(l0?.at))]), JSON.stringify(['Staff A', 'goodAAA1', '+61400000001', 22, 'jobAAA1', 'msgZZZ001', true]));
      check('log holds no message text', JSON.stringify(log).includes('see you at 9') || JSON.stringify(log).includes('Line one'), false);

      // CRM refuses (422): its reason shown, once, never retried
      crmMode = 'refuse';
      const before = posts().length;
      r = await api('POST', '/api/send', sms({ contactId: 'goodBBB1' }));
      check('CRM 422 -> 502 with the CRM reason', r.status + '|' + r.j.error, '502|The CRM did not send it: Number is on the carrier block list');
      check('the refused send was tried exactly once (no retry)', posts().length - before, 1);
      check('a refused send is not logged', (await store.list('sendlog')).length, 2);
      // CRM drops the connection
      crmMode = 'down';
      r = await api('POST', '/api/send', sms({ contactId: 'goodCCC1' }));
      check('CRM down -> 502 could not reach', r.status + '|' + r.j.error, '502|The Hub server could not reach the CRM');
      crmMode = 'ok';
    });
    // 4. Rate limit on a fresh server: 5 per minute in total
    await runSend(8824, { HUB_SEND_ALLOWED: '1' }, async (api) => {
      await api('PUT', '/api/send', { enabled: true });
      calls.length = 0;
      for (let i = 1; i <= 5; i++) {
        const r = await api('POST', '/api/send', sms({ contactId: 'rate000' + i }));
        check('rate: send ' + i + ' ok', r.status, 201);
      }
      const r6 = await api('POST', '/api/send', sms({ contactId: 'rate0006' }));
      check('rate: 6th send in a minute -> 429 with the words', r6.status + '|' + r6.j.error, '429|Too many messages just now. Wait a minute and try again.');
      check('rate: the 6th did not reach the CRM', posts().length, 5);
    });
    // 5. Same contact at most 3 per hour
    await runSend(8825, { HUB_SEND_ALLOWED: '1' }, async (api) => {
      await api('PUT', '/api/send', { enabled: true });
      for (let i = 1; i <= 3; i++) check('same contact: send ' + i + ' ok', (await api('POST', '/api/send', sms())).status, 201);
      const r4 = await api('POST', '/api/send', sms());
      check('same contact: 4th in an hour -> 429', r4.status, 429);
      check('another contact is still fine', (await api('POST', '/api/send', sms({ contactId: 'goodDDD1' }))).status, 201);
    });
    // Hygiene
    const all = outs.join('\n');
    check('no token, secret or fake CRM address in any response or server output', all.includes(tok) || all.includes(secret) || all.includes('zzFakeToken') || all.includes(fakeBase), false);
  } catch (e) {
    console.log('ERROR ' + e.message);
    process.exitCode = 1;
  } finally {
    stop();
    fake.close();
    fs.rmSync(tmp, { recursive: true, force: true });
    console.log(process.exitCode ? 'SOME FAILED' : 'ALL PASS');
  }
} else console.log('usage: node server/test-run.mjs lock|unit|public|contacts|tasks|install|live|invoices2|files|send');
