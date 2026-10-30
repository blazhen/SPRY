// Dev only. Invoice and estimate send-side tests for the Quote Hub. ZZ-TEST contact with a made-up example.com email
// and NO phone, email channel only. Creates ZZ-TEST records, voids/deletes them at the end (reverse order) and verifies.
// Prints statuses and short notes only, never the token. Appends to ../api/test-results.json and updates ourStatus in
// ../api/platform-api-endpoints.json.
// Usage: node step22-invoice-send-test.mjs <api-base-url> <location-id> <.env path>
import fs from 'node:fs';

const DEV = '5M1zrDbimF17cM16mtmR';
const [, , base, L, envPath] = process.argv;
if (!base || !L || !envPath) { console.error('Usage: node step22-invoice-send-test.mjs <api-base-url> <location-id> <.env path>'); process.exit(1); }
if (L !== DEV) { console.error('Refused: Dev only.'); process.exit(1); }
const line = fs.readFileSync(envPath, 'utf8').split(/\r?\n/).find((l) => l.startsWith('SPRY_CRM_TOKEN='));
const token = (line || '').slice('SPRY_CRM_TOKEN='.length).trim().replace(/^["']|["']$/g, '');
const H = { Authorization: 'Bearer ' + token, Version: '2021-07-28', Accept: 'application/json', 'Content-Type': 'application/json' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stamp = Date.now();
const EMAIL = `zz-test-s22-${stamp}@example.com`;
const results = [];
const cleanup = [];
const rateHeaders = {};
const alt = `altId=${L}&altType=location`;
const A = { altId: L, altType: 'location' };

const raw = async (m, p, b) => {
  for (let i = 0; i < 4; i++) {
    const t0 = Date.now();
    const r = await fetch(base + p, { method: m, headers: H, body: b ? JSON.stringify(b) : undefined });
    const ms = Date.now() - t0;
    for (const [k, v] of r.headers) if (/ratelimit|retry-after/i.test(k)) rateHeaders[k] = v;
    if (r.status === 429) { await sleep(2000 * (i + 1)); continue; }
    const j = await r.json().catch(() => ({}));
    await sleep(300);
    return { ok: r.ok, status: r.status, j, ms };
  }
  return { ok: false, status: 429, j: {}, ms: 0 };
};
const msgOf = (j) => (Array.isArray(j.message) ? j.message.join('; ') : j.message || j.error || '');
const keys = (o) => (o && typeof o === 'object' ? Object.keys(o).slice(0, 40).join(',') : '');
const tplOf = (p) => p.replace(L, '{locationId}').replace(/[A-Za-z0-9]{18,}/g, '{id}');

// ep = "METHOD /path/template" used to update ourStatus
const T = async (ep, m, p, b, opts = {}) => {
  let r;
  try { r = await raw(m, p, b); } catch (e) { r = { ok: false, status: 0, j: { message: e.message }, ms: 0 }; }
  const good = r.ok && (opts.need ? opts.need(r) : true);
  let note = typeof opts.note === 'function' ? opts.note(r) : opts.note || '';
  if (!r.ok) note = (note ? note + ' | ' : '') + msgOf(r.j).slice(0, 220);
  else if (!note) note = 'keys: ' + keys(r.j);
  results.push({ group: 'S22', method: m, path: opts.tpl || tplOf(p), ep, status: r.status, ok: good, note: note + ' | ' + r.ms + ' ms' });
  console.log(m.padEnd(6) + (opts.tpl || tplOf(p)).slice(0, 60).padEnd(62) + r.status + ' ' + note.slice(0, 200));
  return r;
};
const skip = (ep, note) => { results.push({ group: 'S22', method: ep.split(' ')[0], path: ep.split(' ')[1], ep, status: 0, ok: false, note: 'NOT TESTED: ' + note }); console.log('SKIP ' + ep + ' ' + note); };
const grp = async (name, fn) => { try { await fn(); } catch (e) { console.log(name + ' group error: ' + e.message); results.push({ group: 'S22', method: '-', path: name, status: 0, ok: false, note: 'group error: ' + e.message }); } };
const idOf = (j) => j?._id || j?.id || j?.invoice?._id || j?.estimate?._id;
const dig = (j) => j?.invoice || j?.estimate || j;

let c1, userId, tplId, invA, invB, estA, invFromEst, convId;
const contactBody = { name: 'ZZ-TEST S22', email: EMAIL };
const mkInvoice = (name, amount = 10, qty = 2) => ({
  ...A, name, currency: 'AUD', issueDate: '2026-11-01', dueDate: '2026-11-30',
  businessDetails: { name: 'ZZ-TEST Business' },
  contactDetails: { id: c1, ...contactBody },
  items: [{ name: 'ZZ-TEST item', description: 'x', currency: 'AUD', amount, qty }],
  discount: { value: 0, type: 'percentage' }, termsNotes: '<p>ZZ-TEST terms</p>',
});
const delInvoice = (id) => async () => { let d = await raw('DELETE', `/invoices/${id}?${alt}`); if (!d.ok) { await raw('POST', `/invoices/${id}/void`, A); d = await raw('DELETE', `/invoices/${id}?${alt}`); } return d; };
const chkInvoice = (id) => () => raw('GET', `/invoices/${id}?${alt}`);

await grp('setup', async () => {
  const u = await raw('GET', '/users/?locationId=' + L);
  const us = u.j.users || [];
  userId = (us.find((x) => /test/i.test(x.name || '')) || us[0])?.id;
  const c = await T('POST /contacts/', 'POST', '/contacts/', { locationId: L, firstName: 'ZZ-TEST', lastName: 'S22 ' + stamp, email: EMAIL }, { need: (r) => !!r.j.contact?.id, note: 'ZZ-TEST contact, email only, no phone' });
  c1 = c.j.contact?.id;
  if (c1) cleanup.push(['contact', () => raw('DELETE', '/contacts/' + c1), () => raw('GET', '/contacts/' + c1)]);
  console.log('phone on contact: ' + JSON.stringify(c.j.contact?.phone || null));
});
if (!c1 || !userId) { console.log('setup failed, stopping'); process.exit(1); }

await grp('numbers+settings', async () => {
  await T('GET /invoices/generate-invoice-number', 'GET', `/invoices/generate-invoice-number?${alt}`, null, { note: (r) => 'response: ' + JSON.stringify(r.j).slice(0, 160) });
  await T('GET /invoices/estimate/number/generate', 'GET', `/invoices/estimate/number/generate?${alt}`, null, { note: (r) => 'response: ' + JSON.stringify(r.j).slice(0, 160) });
  await T('GET /invoices/settings', 'GET', `/invoices/settings?${alt}`, null, { note: (r) => 'fields: ' + keys(r.j) + ' | ' + JSON.stringify(r.j).replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+/g, '<email>').slice(0, 700) });
  await T('GET /invoices/estimate/template', 'GET', `/invoices/estimate/template?${alt}&limit=5&offset=0`, null, { note: (r) => 'fields: ' + keys(r.j) + ' count=' + (r.j.data || r.j.templates || []).length });
});

await grp('templates', async () => {
  const ls = await T('GET /invoices/template', 'GET', `/invoices/template?${alt}&limit=5&offset=0`, null, { note: (r) => { const t = (r.j.data || r.j.templates || [])[0]; return 'list keys: ' + keys(r.j) + ' | first template fields: ' + keys(t) + ' | businessDetails: ' + keys(t?.businessDetails); } });
  const bd = { name: 'ZZ-TEST Business', logoUrl: 'https://example.com/logo.png', phoneNo: '', website: 'https://example.com', address: { addressLine1: '1 Test St', city: 'Melbourne', state: 'VIC', countryCode: 'AU', postalCode: '3000' } };
  const tb = { ...A, name: 'ZZ-TEST template ' + stamp, currency: 'AUD', businessDetails: bd, items: [{ name: 'ZZ-TEST item', description: 'x', currency: 'AUD', amount: 10, qty: 1 }], discount: { value: 0, type: 'percentage' }, title: 'ZZ-TEST TITLE', termsNotes: '<p>ZZ-TEST terms</p>', invoiceNumberPrefix: 'ZZT-' };
  const c = await T('POST /invoices/template', 'POST', '/invoices/template', tb, { need: (r) => !!idOf(r.j), note: (r) => 'fields: ' + keys(r.j) });
  tplId = idOf(c.j);
  if (!tplId) {
    // retry plain to learn the minimum
    const c2 = await T('POST /invoices/template', 'POST', '/invoices/template', { ...A, name: 'ZZ-TEST template min ' + stamp, currency: 'AUD', businessDetails: { name: 'ZZ-TEST Business' }, items: tb.items }, { tpl: 'POST /invoices/template (minimal retry)' });
    tplId = idOf(c2.j);
  }
  if (tplId) {
    cleanup.push(['template', () => raw('DELETE', `/invoices/template/${tplId}?${alt}`), () => raw('GET', `/invoices/template/${tplId}?${alt}`)]);
    const g = await T('GET /invoices/template/{templateId}', 'GET', `/invoices/template/${tplId}?${alt}`, null, { note: (r) => { const t = dig(r.j); return 'fields: ' + keys(t) + ' | businessDetails: ' + keys(t.businessDetails) + ' | logoUrl kept: ' + (t.businessDetails?.logoUrl === bd.logoUrl) + ' | prefix: ' + t.invoiceNumberPrefix + ' | terms kept: ' + !!t.termsNotes; } });
    await T('PUT /invoices/template/{templateId}', 'PUT', `/invoices/template/${tplId}`, { ...tb, name: 'ZZ-TEST template edited ' + stamp, title: 'ZZ-TEST EDITED', termsNotes: '<p>edited</p>' }, { note: (r) => 'title back: ' + dig(r.j).title });
    await T('PATCH late fees', 'PATCH', `/invoices/template/${tplId}/late-fees-configuration`, { ...A, lateFeesConfiguration: { enable: false } }, { tpl: 'PATCH /invoices/template/{id}/late-fees-configuration' });
    await T('PATCH payment methods', 'PATCH', `/invoices/template/${tplId}/payment-methods-configuration`, { ...A, paymentMethods: { stripe: { enableBankDebitOnly: false } } }, { tpl: 'PATCH /invoices/template/{id}/payment-methods-configuration' });
  }
  // design-field probe: which extra body fields does create accept? Each accepted probe template is removed in cleanup.
  const probes = {
    logoUrl: 'https://example.com/logo.png', logo: 'https://example.com/logo.png', primaryColor: '#112233', color: '#112233', brandColor: '#112233', accentColor: '#112233',
    headerText: 'ZZ-TEST header', header: 'ZZ-TEST header', footerText: 'ZZ-TEST footer', footer: 'ZZ-TEST footer', message: 'ZZ-TEST msg', notes: 'ZZ-TEST notes',
    paymentMethods: { stripe: { enableBankDebitOnly: false } }, attachments: [], customFields: [], dueDateOffset: 14, paymentTerms: 'net14', theme: 'modern', language: 'en',
    tipsConfiguration: { tipsEnabled: false, tipsPercentage: [5, 10] }, lateFeesConfiguration: { enable: false }, automaticTaxesEnabled: false, internal: true,
    sentFrom: { fromName: 'ZZ-TEST', fromEmail: 'zz-test@example.com' }, miscellaneousCharges: { enable: false }, liveMode: false,
  };
  const accepted = [], rejected = [];
  const base0 = { ...A, currency: 'AUD', businessDetails: { name: 'ZZ-TEST Business' }, items: tb.items, discount: { value: 0, type: 'percentage' } };
  for (const [k, v] of Object.entries(probes)) {
    const r = await raw('POST', '/invoices/template', { ...base0, name: `ZZ-TEST probe ${k} ${stamp}`, [k]: v });
    const id = idOf(r.j);
    if (r.ok && id) {
      accepted.push(k); cleanup.push(['probe template ' + k, () => raw('DELETE', `/invoices/template/${id}?${alt}`), () => raw('GET', `/invoices/template/${id}?${alt}`)]);
      const back = dig((await raw('GET', `/invoices/template/${id}?${alt}`)).j);
      if (back && back[k] !== undefined) accepted[accepted.length - 1] = k + '(kept)';
    } else rejected.push(k + ': ' + msgOf(r.j).slice(0, 70));
  }
  // businessDetails sub-field probe
  const bdAcc = [], bdRej = [];
  const bdProbes = { logoUrl: 'https://example.com/logo.png', phoneNo: '', website: 'https://example.com', address: bd.address, customValues: [], email: 'zz-test@example.com', taxNumber: '123', abn: '123', colour: '#112233' };
  for (const [k, v] of Object.entries(bdProbes)) {
    const r = await raw('POST', '/invoices/template', { ...base0, name: `ZZ-TEST probe bd.${k} ${stamp}`, businessDetails: { name: 'ZZ-TEST Business', [k]: v } });
    const id = idOf(r.j);
    if (r.ok && id) { bdAcc.push(k); cleanup.push(['probe template bd.' + k, () => raw('DELETE', `/invoices/template/${id}?${alt}`), () => raw('GET', `/invoices/template/${id}?${alt}`)]); } else bdRej.push(k + ': ' + msgOf(r.j).slice(0, 70));
  }
  results.push({ group: 'S22', method: 'INFO', path: 'template create body probe', status: 0, ok: true, note: 'top-level accepted: ' + accepted.join(',') + ' | rejected: ' + rejected.join(' ; ') });
  results.push({ group: 'S22', method: 'INFO', path: 'template businessDetails probe', status: 0, ok: true, note: 'accepted: ' + bdAcc.join(',') + ' | rejected: ' + bdRej.join(' ; ') });
  console.log('TEMPLATE accepted top-level: ' + accepted.join(','));
  console.log('TEMPLATE rejected top-level: ' + rejected.join(' ; '));
  console.log('TEMPLATE bd accepted: ' + bdAcc.join(',') + ' | rejected: ' + bdRej.join(' ; '));
  if (tplId) {
    await T('DELETE /invoices/template/{templateId}', 'DELETE', `/invoices/template/${tplId}?${alt}`);
    const chk = await raw('GET', `/invoices/template/${tplId}?${alt}`);
    results.push({ group: 'S22', method: 'GET', path: '/invoices/template/{id} (after delete)', status: chk.status, ok: !chk.ok, note: 'reads back as ' + chk.status });
  }
});

await grp('invoice send', async () => {
  const n = await raw('GET', `/invoices/generate-invoice-number?${alt}`);
  const a = await T('POST /invoices/', 'POST', '/invoices/', { ...mkInvoice('ZZ-TEST invoice A'), invoiceNumber: undefined }, { tpl: 'POST /invoices/ (draft A)', need: (r) => !!idOf(r.j), note: (r) => 'status=' + r.j.status + ' num=' + r.j.invoiceNumber + ' total=' + r.j.total });
  invA = idOf(a.j);
  if (!invA) return;
  cleanup.push(['invoice A', delInvoice(invA), chkInvoice(invA)]);
  const sendBody = { ...A, userId, action: 'email', liveMode: true };
  const s = await T('POST /invoices/{invoiceId}/send', 'POST', `/invoices/${invA}/send`, sendBody, { note: (r) => 'send response: ' + JSON.stringify(r.j).replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+/g, '<email>').slice(0, 500) });
  if (!s.ok) {
    await T('POST /invoices/{invoiceId}/send', 'POST', `/invoices/${invA}/send`, { ...sendBody, liveMode: false }, { tpl: 'POST /invoices/{id}/send (liveMode false retry)', note: (r) => 'response: ' + JSON.stringify(r.j).slice(0, 300) });
  }
  const g = await T('GET invoice after send', 'GET', `/invoices/${invA}?${alt}`, null, { tpl: 'GET /invoices/{id} (after send)', note: (r) => { const i = r.j; return 'status=' + i.status + ' amountDue=' + i.amountDue + ' sentTo=' + JSON.stringify(i.sentTo || {}).replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+/g, '<email>') + ' timestamps: ' + Object.keys(i).filter((k) => /sent|view|visit|paid|At$|Date/i.test(k)).join(',') + ' | all fields: ' + keys(i); } });
  results.push({ group: 'S22', method: 'INFO', path: 'invoice after send: timestamps', status: 0, ok: true, note: JSON.stringify(Object.fromEntries(Object.entries(g.j).filter(([k]) => /sent|view|visit|paid|status|amount|total/i.test(k) && typeof g.j[k] !== 'object'))).slice(0, 500) });

  // record payments (manual cheque, no card)
  const p1 = await T('POST /invoices/{invoiceId}/record-payment', 'POST', `/invoices/${invA}/record-payment`, { ...A, mode: 'cheque', card: {}, cheque: { number: 'ZZTEST-1' }, notes: 'ZZ-TEST partial', amount: 5 }, { tpl: 'POST /invoices/{id}/record-payment (partial 5)', note: (r) => 'response: ' + JSON.stringify(r.j).slice(0, 300) });
  const g1 = await raw('GET', `/invoices/${invA}?${alt}`);
  results.push({ group: 'S22', method: 'INFO', path: 'after partial payment', status: g1.status, ok: p1.ok, note: `status=${g1.j.status} amountDue=${g1.j.amountDue} amountPaid=${g1.j.amountPaid} total=${g1.j.total}` });
  console.log('after partial: status=' + g1.j.status + ' due=' + g1.j.amountDue + ' paid=' + g1.j.amountPaid);
  await sleep(5000); // a second payment straight after the first returned 409 "already in progress"
  const p2 = await T('POST /invoices/{invoiceId}/record-payment', 'POST', `/invoices/${invA}/record-payment`, { ...A, mode: 'cash', card: {}, cheque: {}, notes: 'ZZ-TEST balance', amount: g1.j.amountDue ?? 15 }, { tpl: 'POST /invoices/{id}/record-payment (full balance, cash)', note: (r) => 'response: ' + JSON.stringify(r.j).slice(0, 300) });
  const g2 = await raw('GET', `/invoices/${invA}?${alt}`);
  results.push({ group: 'S22', method: 'INFO', path: 'after full payment', status: g2.status, ok: p2.ok, note: `status=${g2.j.status} amountDue=${g2.j.amountDue} amountPaid=${g2.j.amountPaid}` });
  console.log('after full: status=' + g2.j.status + ' due=' + g2.j.amountDue);
  // void on a paid invoice, to learn the rule
  await T('POST /invoices/{invoiceId}/void', 'POST', `/invoices/${invA}/void`, A, { tpl: 'POST /invoices/{id}/void (on a PAID invoice)', note: (r) => 'response: ' + JSON.stringify(r.j).slice(0, 200) });

  // invoice B: send (email), then void
  const b = await T('POST /invoices/', 'POST', '/invoices/', mkInvoice('ZZ-TEST invoice B void'), { tpl: 'POST /invoices/ (draft B)', need: (r) => !!idOf(r.j) });
  invB = idOf(b.j);
  if (invB) {
    cleanup.push(['invoice B', delInvoice(invB), chkInvoice(invB)]);
    await T('POST /invoices/{invoiceId}/void', 'POST', `/invoices/${invB}/void`, A, { tpl: 'POST /invoices/{id}/void (draft B, expected refusal)', note: (r) => 'response: ' + JSON.stringify(r.j).slice(0, 200) });
    await T('POST /invoices/{invoiceId}/send', 'POST', `/invoices/${invB}/send`, { ...A, userId, action: 'email', liveMode: true }, { tpl: 'POST /invoices/{id}/send (B)' });
    await T('POST /invoices/{invoiceId}/void', 'POST', `/invoices/${invB}/void`, A, { tpl: 'POST /invoices/{id}/void (sent B)', note: (r) => 'response: ' + JSON.stringify(r.j).slice(0, 200) });
    const gb = await raw('GET', `/invoices/${invB}?${alt}`);
    results.push({ group: 'S22', method: 'INFO', path: 'invoice B after void', status: gb.status, ok: gb.j.status === 'void', note: 'status=' + gb.j.status + ' amountDue=' + gb.j.amountDue });
    console.log('B after void: ' + gb.j.status);
  }

  // text2pay: email only, contact has no phone
  const t2p = await T('POST /invoices/text2pay', 'POST', '/invoices/text2pay', {
    ...A, name: 'ZZ-TEST text2pay', currency: 'AUD', issueDate: '2026-11-01', liveMode: true, action: 'send', userId,
    items: [{ name: 'ZZ-TEST item', description: 'x', currency: 'AUD', amount: 10, qty: 1 }],
    contactDetails: { id: c1, ...contactBody }, businessDetails: { name: 'ZZ-TEST Business' }, sentTo: { email: [EMAIL] },
  }, { note: (r) => 'response keys: ' + keys(r.j) + ' ' + JSON.stringify(r.j).replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+/g, '<email>').slice(0, 300) });
  const t2id = idOf(t2p.j?.invoice) || idOf(t2p.j);
  if (t2id) cleanup.push(['text2pay invoice', delInvoice(t2id), chkInvoice(t2id)]);
});

await grp('estimate', async () => {
  const eb = { ...A, name: 'ZZ-TEST estimate', title: 'ZZ-TEST estimate', currency: 'AUD', issueDate: '2026-10-30', expiryDate: '2026-12-01', liveMode: true, discount: { value: 0, type: 'percentage' }, frequencySettings: { enabled: false }, businessDetails: { name: 'ZZ-TEST Business' }, contactDetails: { id: c1, ...contactBody }, items: [{ name: 'ZZ-TEST item', description: 'x', currency: 'AUD', amount: 100, qty: 1, type: 'one_time' }] };
  const e = await T('POST /invoices/estimate', 'POST', '/invoices/estimate', eb, { tpl: 'POST /invoices/estimate (E1)', need: (r) => !!idOf(r.j), note: (r) => 'estimateStatus=' + r.j.estimateStatus + ' num=' + r.j.estimateNumber });
  estA = idOf(e.j);
  if (!estA) return;
  cleanup.push(['estimate', () => raw('DELETE', `/invoices/estimate/${estA}`, A), () => raw('GET', `/invoices/estimate/${estA}?${alt}`)]);
  await T('PUT /invoices/estimate/{estimateId}', 'PUT', `/invoices/estimate/${estA}`, { ...eb, name: 'ZZ-TEST estimate edited' }, { note: (r) => 'name back: ' + r.j.name });
  await T('POST /invoices/estimate/{estimateId}/send', 'POST', `/invoices/estimate/${estA}/send`, { ...A, action: 'email', liveMode: true, userId, estimateName: 'ZZ-TEST estimate' }, { note: (r) => 'send response: ' + JSON.stringify(r.j).replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+/g, '<email>').slice(0, 400) });
  const gs = await raw('GET', `/invoices/estimate/${estA}?${alt}`);
  const gsd = dig(gs.j);
  results.push({ group: 'S22', method: 'INFO', path: 'estimate after send', status: gs.status, ok: gs.ok, note: 'http=' + gs.status + ' estimateStatus=' + gsd.estimateStatus + ' sentTo=' + JSON.stringify(gsd.sentTo || {}).replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+/g, '<email>') + ' fields: ' + keys(gsd) + (gs.ok ? '' : ' msg=' + msgOf(gs.j)) });
  console.log('estimate after send: http ' + gs.status + ' ' + gsd.estimateStatus);
  const cv = await T('POST /invoices/estimate/{estimateId}/invoice', 'POST', `/invoices/estimate/${estA}/invoice`, { ...A, markAsInvoiced: true, version: 'v2' }, { note: (r) => 'response keys: ' + keys(r.j) + ' ' + JSON.stringify(r.j).slice(0, 250) });
  invFromEst = idOf(cv.j?.invoice) || idOf(cv.j) || cv.j?.invoiceId;
  if (invFromEst && typeof invFromEst === 'string') {
    cleanup.push(['invoice from estimate', delInvoice(invFromEst), chkInvoice(invFromEst)]);
    const gi = await raw('GET', `/invoices/${invFromEst}?${alt}`);
    results.push({ group: 'S22', method: 'INFO', path: 'invoice created from estimate', status: gi.status, ok: gi.ok, note: `status=${gi.j.status} total=${gi.j.total} num=${gi.j.invoiceNumber} items=${(gi.j.invoiceItems || []).length}` });
    console.log('invoice from estimate: ' + gi.j.status + ' total=' + gi.j.total);
  }
  const ge = await raw('GET', `/invoices/estimate/${estA}?${alt}`);
  results.push({ group: 'S22', method: 'INFO', path: 'estimate after convert', status: ge.status, ok: ge.ok, note: 'estimateStatus=' + ge.j.estimateStatus + ' invoice link fields: ' + Object.keys(ge.j).filter((k) => /invoice/i.test(k)).join(',') });
  console.log('estimate after convert: ' + ge.j.estimateStatus);
});

await grp('conversation', async () => {
  const cs = await T('GET /conversations/search', 'GET', `/conversations/search?locationId=${L}&contactId=${c1}`, null, { tpl: 'GET /conversations/search?contactId (after sends)', note: (r) => 'conversations=' + (r.j.conversations || []).length });
  convId = (cs.j.conversations || [])[0]?.id;
  if (!convId) { results.push({ group: 'S22', method: 'INFO', path: 'sends created a conversation message', status: 0, ok: false, note: 'no conversation exists for the contact after sends' }); console.log('no conversation'); return; }
  cleanup.push(['conversation', () => raw('DELETE', '/conversations/' + convId), () => raw('GET', '/conversations/' + convId)]);
  const ms = await T('GET /conversations/{id}/messages', 'GET', `/conversations/${convId}/messages`, null, { tpl: 'GET /conversations/{id}/messages (after sends)', note: (r) => { const arr = r.j.messages?.messages || []; return 'count=' + arr.length + ' | ' + arr.map((m) => `${m.messageType || m.type}/${m.direction}/${m.status}/${m.contentType || ''}`).join(' ; ').slice(0, 400) + ' | fields: ' + keys(arr[0]); } });
  const arr = ms.j.messages?.messages || [];
  results.push({ group: 'S22', method: 'INFO', path: 'sends created a conversation message', status: 200, ok: arr.length > 0, note: `${arr.length} messages on the contact conversation after 2 invoice sends, 1 estimate send, 1 text2pay` });
});

// sweep: any ZZ-TEST invoice still present (e.g. a paid one that refuses delete): try delete, then void, report state
console.log('--- sweep ---');
const sweepNote = [];
try {
  const l = await raw('GET', `/invoices/?${alt}&limit=50&offset=0&search=ZZ-TEST`);
  for (const i of (l.j.invoices || []).filter((x) => /^ZZ-TEST/.test(x.name || ''))) {
    const d = await raw('DELETE', `/invoices/${i._id}?${alt}`);
    let v = null; if (!d.ok) v = await raw('POST', `/invoices/${i._id}/void`, A);
    const c = await raw('GET', `/invoices/${i._id}?${alt}`);
    const line = `sweep invoice ${i._id} (${i.status}): delete ${d.status} ${d.ok ? '' : msgOf(d.j).slice(0, 100)}${v ? ' | void ' + v.status + ' ' + (v.ok ? '' : msgOf(v.j).slice(0, 100)) : ''} | after: ${c.ok ? c.j.status : 'gone'}`;
    console.log(line); sweepNote.push(line);
  }
} catch (e) { console.log('sweep error: ' + e.message); }
results.push({ group: 'S22', method: 'INFO', path: 'sweep of leftover ZZ-TEST invoices', status: 0, ok: true, note: sweepNote.join(' || ').slice(0, 900) || 'none left' });

console.log('--- cleanup ---');
const notCleaned = [];
for (const [name, del, chk] of [...cleanup].reverse()) {
  try {
    await del(); const c = await chk();
    const gone = !c.ok || c.j.deleted === true;
    console.log('cleanup ' + name + ': ' + (gone ? 'verified gone' : 'STILL THERE (' + c.status + ') status=' + (c.j.status || c.j.estimateStatus)));
    if (!gone) notCleaned.push(name);
  } catch (e) { console.log('cleanup ' + name + ' error: ' + e.message); notCleaned.push(name); }
}
results.push({ group: 'S22', method: '-', path: 'cleanup', status: 0, ok: notCleaned.length === 0, note: notCleaned.length ? 'not cleaned: ' + notCleaned.join(', ') : 'all created records removed and verified' });
results.push({ group: 'S22', method: 'INFO', path: 'rate limit headers', status: 0, ok: true, note: JSON.stringify(rateHeaders) });

// append to test-results.json
const trPath = new URL('../api/test-results.json', import.meta.url);
const prev = JSON.parse(fs.readFileSync(trPath, 'utf8')).filter((r) => r.group !== 'S22'); // a rerun replaces earlier S22 rows
fs.writeFileSync(trPath, JSON.stringify([...prev, ...results.map(({ ep, ...r }) => r)], null, 1));
// update ourStatus
const epPath = new URL('../api/platform-api-endpoints.json', import.meta.url);
const eps = JSON.parse(fs.readFileSync(epPath, 'utf8'));
const flat = (eps.groups || eps).flatMap ? (eps.groups || eps).flatMap((g) => g.endpoints || []) : [];
let updated = 0;
for (const r of results) {
  if (!r.ep || !/^(GET|POST|PUT|PATCH|DELETE) \//.test(r.ep)) continue;
  const [m, p] = r.ep.split(' ');
  const e = flat.find((x) => x.method === m && x.path === p);
  if (!e) continue;
  if (e.notes && e.notes.startsWith('Dev test 22:') && e.ourStatus === 'tested-ok') continue;
  e.ourStatus = r.ok ? 'tested-ok' : (r.status === 0 ? 'untested' : 'tested-blocked');
  e.notes = (r.ok ? 'Dev test 22: HTTP ' : 'Dev test 22: FAILED HTTP ') + r.status + '. ' + r.note.slice(0, 300);
  updated++;
}
fs.writeFileSync(epPath, JSON.stringify(eps, null, 1));
console.log('Endpoint statuses updated: ' + updated);
console.log('Results appended: ' + results.length + '. ok=' + results.filter((r) => r.ok).length + ' notOk=' + results.filter((r) => !r.ok).length);
console.log('Rate headers: ' + JSON.stringify(rateHeaders));
