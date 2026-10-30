// Dev only. API capability matrix for the Quote Hub. Creates ZZ-TEST records only, never sends anything,
// deletes everything it made at the end (reverse order) and reads each back to verify.
// Prints statuses and short notes only, never the token. Writes ../api/test-results.json.
// Usage: node step21-api-matrix-test.mjs <api-base-url> <location-id> <.env path>
import fs from 'node:fs';

const DEV = '5M1zrDbimF17cM16mtmR';
const [, , base, L, envPath] = process.argv;
if (!base || !L || !envPath) { console.error('Usage: node step21-api-matrix-test.mjs <api-base-url> <location-id> <.env path>'); process.exit(1); }
if (L !== DEV) { console.error('Refused: Dev only.'); process.exit(1); }
const line = fs.readFileSync(envPath, 'utf8').split(/\r?\n/).find((l) => l.startsWith('SPRY_CRM_TOKEN='));
const token = (line || '').slice('SPRY_CRM_TOKEN='.length).trim().replace(/^["']|["']$/g, '');
const H = { Authorization: 'Bearer ' + token, Version: '2021-07-28', Accept: 'application/json', 'Content-Type': 'application/json' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stamp = Date.now();
const results = [];
const cleanup = [];
let hdrShown = false;
const rateHeaders = {};

const raw = async (m, p, b) => {
  for (let i = 0; i < 4; i++) {
    const t0 = Date.now();
    const r = await fetch(base + p, { method: m, headers: H, body: b ? JSON.stringify(b) : undefined });
    const ms = Date.now() - t0;
    for (const [k, v] of r.headers) if (/ratelimit|retry-after/i.test(k)) rateHeaders[k] = v;
    if (r.status === 429) { await sleep(2000 * (i + 1)); continue; }
    const j = await r.json().catch(() => ({}));
    await sleep(200);
    return { ok: r.ok, status: r.status, j, ms };
  }
  return { ok: false, status: 429, j: {}, ms: 0 };
};
const msgOf = (j) => (Array.isArray(j.message) ? j.message.join('; ') : j.message || j.error || '');
const tplOf = (p) => p.replace(L, '{locationId}').replace(/[A-Za-z0-9]{18,}/g, '{id}');
const keys = (o) => (o && typeof o === 'object' ? Object.keys(o).slice(0, 14).join(',') : '');

// group, method, path, body, opts {note, need(r) -> bool for "what we need", tpl}
const T = async (group, m, p, b, opts = {}) => {
  let r;
  try { r = await raw(m, p, b); } catch (e) { r = { ok: false, status: 0, j: { message: e.message }, ms: 0 }; }
  const good = r.ok && (opts.need ? opts.need(r) : true);
  let note = typeof opts.note === 'function' ? opts.note(r) : opts.note || '';
  if (!r.ok) note = (note ? note + ' | ' : '') + msgOf(r.j).slice(0, 180);
  else if (!note) note = 'keys: ' + keys(r.j);
  results.push({ group, method: m, path: opts.tpl || tplOf(p), status: r.status, ok: good, note: note + (opts.time ? ' | ' + r.ms + ' ms' : '') });
  console.log(group + ' ' + m.padEnd(6) + (opts.tpl || tplOf(p)).slice(0, 62).padEnd(64) + r.status + (good ? '' : ' ' + note.slice(0, 120)));
  return r;
};
const skip = (group, m, path, note) => { results.push({ group, method: m, path, status: 0, ok: false, note: 'NOT TESTED: ' + note }); console.log(group + ' SKIP ' + m + ' ' + path); };
const grp = async (name, fn) => { try { await fn(); } catch (e) { console.log(name + ' group error: ' + e.message); results.push({ group: name, method: '-', path: '-', status: 0, ok: false, note: 'group error: ' + e.message }); } };
const idOf = (j, ...ks) => { for (const k of ks) { const v = j?.[k]; if (v && typeof v === 'object' && v.id) return v.id; if (typeof v === 'string') return v; } return j?.id || j?._id; };

const q = '?locationId=' + L;
const made = {};
let c1, userId, pipes = [], oppId, bizId, convId, calId, apptId;

await grp('Setup', async () => {
  const u = await T('H', 'GET', '/users/' + q, null, { note: (r) => 'users: ' + (r.j.users || []).map((x) => x.name || x.firstName).join(', ') });
  userId = (u.j.users || [])[0]?.id;
  const c = await T('A', 'POST', '/contacts/', { locationId: L, firstName: 'ZZ-TEST', lastName: 'Matrix ' + stamp, email: `zz-test-m1-${stamp}@example.com` }, { need: (r) => !!r.j.contact?.id });
  c1 = c.j.contact?.id;
  if (c1) cleanup.push(['contact', () => raw('DELETE', '/contacts/' + c1), () => raw('GET', '/contacts/' + c1)]);
});

await grp('A', async () => {
  if (!c1) return;
  await T('A', 'GET', '/contacts/' + c1);
  await T('A', 'PUT', '/contacts/' + c1, { firstName: 'ZZ-TEST', lastName: 'Matrix Edited ' + stamp, tags: ['zz-test-tag'] }, { note: (r) => 'tags back: ' + JSON.stringify(r.j.contact?.tags || []) });
  await T('A', 'POST', '/contacts/upsert', { locationId: L, email: `zz-test-m1-${stamp}@example.com`, firstName: 'ZZ-TEST', lastName: 'Matrix Upsert' }, { note: (r) => 'new=' + r.j.new + ' sameId=' + (r.j.contact?.id === c1) });
  await sleep(1500);
  await T('A', 'POST', '/contacts/search', { locationId: L, pageLimit: 5, query: 'ZZ-TEST Matrix' }, { time: true, note: (r) => 'by name: total=' + r.j.total + ' hits=' + (r.j.contacts || []).length });
  await T('A', 'POST', '/contacts/search', { locationId: L, pageLimit: 5, filters: [{ field: 'email', operator: 'eq', value: `zz-test-m1-${stamp}@example.com` }] }, { tpl: 'POST /contacts/search (filter by email)', time: true, note: (r) => 'by email: total=' + r.j.total + ' hits=' + (r.j.contacts || []).length });
  await T('A', 'GET', '/contacts/' + q + '&query=ZZ-TEST&limit=5', null, { tpl: '/contacts/?query=', time: true, note: (r) => 'legacy list search: hits=' + (r.j.contacts || []).length });
  if (userId) {
    await T('A', 'POST', `/contacts/${c1}/followers`, { followers: [userId] });
    await T('A', 'DELETE', `/contacts/${c1}/followers`, { followers: [userId] });
  }
  await T('A', 'POST', `/contacts/${c1}/tags`, { tags: ['zz-test-tag2'] });
  await T('A', 'DELETE', `/contacts/${c1}/tags`, { tags: ['zz-test-tag2'] });
  const n = await T('A', 'POST', `/contacts/${c1}/notes`, { body: 'ZZ-TEST note', userId }, { note: (r) => 'keys: ' + keys(r.j.note) });
  const nid = n.j.note?.id;
  await T('A', 'GET', `/contacts/${c1}/notes`, null, { note: (r) => 'count=' + (r.j.notes || []).length + ' fields: ' + keys((r.j.notes || [])[0]) });
  if (nid) {
    await T('A', 'GET', `/contacts/${c1}/notes/${nid}`);
    await T('A', 'PUT', `/contacts/${c1}/notes/${nid}`, { body: 'ZZ-TEST note edited', userId });
    await T('A', 'DELETE', `/contacts/${c1}/notes/${nid}`);
  }
  const t = await T('A', 'POST', `/contacts/${c1}/tasks`, { title: 'ZZ-TEST task', body: 'x', dueDate: '2026-12-30T00:00:00Z', completed: false, assignedTo: userId }, { note: (r) => 'keys: ' + keys(r.j.task) });
  const tid = t.j.task?.id;
  await T('A', 'GET', `/contacts/${c1}/tasks`, null, { note: (r) => 'count=' + (r.j.tasks || []).length + ' fields: ' + keys((r.j.tasks || [])[0]) });
  if (tid) {
    await T('A', 'GET', `/contacts/${c1}/tasks/${tid}`);
    await T('A', 'PUT', `/contacts/${c1}/tasks/${tid}`, { title: 'ZZ-TEST task edited', dueDate: '2026-12-31T00:00:00Z' });
    await T('A', 'PUT', `/contacts/${c1}/tasks/${tid}/completed`, { completed: true });
    await T('A', 'DELETE', `/contacts/${c1}/tasks/${tid}`);
  }
  await T('A', 'GET', `/contacts/${c1}/appointments`);
  const c2 = await raw('POST', '/contacts/', { locationId: L, firstName: 'ZZ-TEST', lastName: 'Delete Me ' + stamp, email: `zz-test-m2-${stamp}@example.com` });
  const id2 = c2.j.contact?.id;
  if (id2) {
    cleanup.push(['contact2', () => raw('DELETE', '/contacts/' + id2), () => raw('GET', '/contacts/' + id2)]);
    await T('A', 'DELETE', '/contacts/' + id2);
    const chk = await raw('GET', '/contacts/' + id2);
    results.push({ group: 'A', method: 'GET', path: '/contacts/{id} (after delete)', status: chk.status, ok: !chk.ok, note: 'deleted contact reads back as ' + chk.status });
  }
});

await grp('B', async () => {
  const b = await T('B', 'POST', '/businesses/', { locationId: L, name: 'ZZ-TEST Company ' + stamp }, { need: (r) => !!(r.j.business?.id || r.j.id) });
  bizId = b.j.business?.id || b.j.id;
  if (!bizId) return;
  cleanup.push(['business', () => raw('DELETE', '/businesses/' + bizId), () => raw('GET', '/businesses/' + bizId)]);
  await T('B', 'GET', '/businesses/' + bizId);
  await T('B', 'PUT', '/businesses/' + bizId, { name: 'ZZ-TEST Company Edited ' + stamp, phone: '' });
  if (c1) {
    await T('B', 'PUT', '/contacts/' + c1, { companyId: bizId }, { tpl: 'PUT /contacts/{id} (companyId link)', note: (r) => 'companyId back: ' + (r.j.contact?.companyId === bizId) });
    const g = await raw('GET', '/contacts/' + c1);
    results.push({ group: 'B', method: 'GET', path: '/contacts/{id} (companyId read back)', status: g.status, ok: g.j.contact?.companyId === bizId, note: 'companyId=' + g.j.contact?.companyId });
    await T('B', 'GET', '/businesses/location/' + L, null, { tpl: '/businesses/location/{locationId}', note: (r) => 'count=' + (r.j.businesses || []).length });
  }
});

await grp('C', async () => {
  const pl = await T('C', 'GET', '/opportunities/pipelines' + q, null, { note: (r) => (r.j.pipelines || []).map((p) => p.name + ' [' + p.id + ']: ' + p.stages.map((s) => s.name + '=' + s.id).join(' | ')).join(' ## ') });
  pipes = pl.j.pipelines || [];
  const pipe = pipes[0]; if (!pipe) return;
  const s0 = pipe.stages[0]; const s1 = pipe.stages[1] || s0;
  await T('C', 'POST', '/opportunities/search', { locationId: L, limit: 5, page: 1 }, { tpl: 'POST /opportunities/search', time: true, note: (r) => 'keys: ' + keys(r.j) });
  await T('C', 'GET', '/opportunities/search?location_id=' + L + '&q=ZZ-TEST&limit=5', null, { tpl: 'GET /opportunities/search?q=', time: true, note: (r) => 'hits=' + (r.j.opportunities || []).length + ' meta: ' + keys(r.j.meta) });
  if (!c1) return;
  const o = await T('C', 'POST', '/opportunities/', { pipelineId: pipe.id, locationId: L, name: 'ZZ-TEST Matrix job', pipelineStageId: s0.id, status: 'open', contactId: c1, monetaryValue: 100 }, { need: (r) => !!(r.j.opportunity?.id || r.j.id) });
  oppId = o.j.opportunity?.id || o.j.id;
  if (!oppId) return;
  cleanup.push(['opportunity', () => raw('DELETE', '/opportunities/' + oppId), () => raw('GET', '/opportunities/' + oppId)]);
  const g = await T('C', 'GET', '/opportunities/' + oppId, null, { note: (r) => 'keys: ' + keys(r.j.opportunity) });
  results.push({ group: 'C', method: 'INFO', path: 'opportunity stage history fields', status: 200, ok: true, note: 'timestamps present: ' + Object.keys(g.j.opportunity || {}).filter((k) => /stage|status|change|date|created|updated/i.test(k)).join(',') });
  const fields = (await raw('GET', '/locations/' + L + '/customFields?model=opportunity')).j.customFields || [];
  const qf = fields.find((f) => /quote_revision/.test(f.fieldKey || ''));
  await T('C', 'PUT', '/opportunities/' + oppId, { pipelineStageId: s1.id, monetaryValue: 250, customFields: qf ? [{ id: qf.id, field_value: 3 }] : [] }, { note: (r) => 'stage/value/custom field update' });
  const rb = (await raw('GET', '/opportunities/' + oppId)).j.opportunity || {};
  results.push({ group: 'C', method: 'GET', path: '/opportunities/{id} (read back)', status: 200, ok: rb.pipelineStageId === s1.id && rb.monetaryValue === 250, note: 'stage=' + (rb.pipelineStageId === s1.id) + ' value=' + rb.monetaryValue + ' stageChangedField=' + (rb.lastStageChangeAt || 'none') });
  await T('C', 'POST', '/opportunities/upsert', { pipelineId: pipe.id, locationId: L, contactId: c1, name: 'ZZ-TEST Matrix job', status: 'open' }, { note: (r) => 'new=' + r.j.new + ' sameId=' + ((r.j.opportunity?.id) === oppId) });
  await T('C', 'PUT', '/opportunities/' + oppId + '/status', { status: 'lost' });
  await T('C', 'PUT', '/opportunities/' + oppId + '/status', { status: 'open' }, { tpl: 'PUT /opportunities/{id}/status (reopen)' });
  if (userId) {
    await T('C', 'POST', `/opportunities/${oppId}/followers`, { followers: [userId] });
    await T('C', 'DELETE', `/opportunities/${oppId}/followers`, { followers: [userId] });
  }
  await T('C', 'GET', `/opportunities/${oppId}/notes`, null, { note: 'probe: opportunity notes endpoint' });
  await T('C', 'GET', `/opportunities/${oppId}/tasks`, null, { note: 'probe: opportunity tasks endpoint' });
  const n = await raw('POST', `/contacts/${c1}/notes`, { body: 'ZZ-TEST job note probe', userId });
  const lst = (await raw('GET', `/contacts/${c1}/notes`)).j.notes || [];
  results.push({ group: 'C', method: 'INFO', path: 'job notes via contact notes', status: 200, ok: false, note: 'contact note fields: ' + keys(lst[0]) + '; any job link field: ' + Object.keys(lst[0] || {}).some((k) => /opportun|job/i.test(k)) });
  if (n.j.note?.id) await raw('DELETE', `/contacts/${c1}/notes/${n.j.note.id}`);
});

await grp('D', async () => {
  const a = await T('D', 'GET', '/associations/' + q, null, { note: (r) => 'defs: ' + (r.j.associations || []).map((x) => x.key).join(', ').slice(0, 300) });
  const assoc = a.j.associations || [];
  const addl = assoc.find((x) => x.key === 'OPPORTUNITIES_CONTACTS_ADDITIONAL_ASSOCIATION');
  const biz = assoc.find((x) => x.key === 'BUSINESSES_OPPORTUNITIES_ASSOCIATION');
  const rels = [];
  if (oppId && c1 && addl) {
    const r = await T('D', 'POST', '/associations/relations', { locationId: L, associationId: addl.id, firstRecordId: c1, secondRecordId: oppId, pipelineId: pipes[0]?.id }, { tpl: 'POST /associations/relations (contact-job)' });
    if (r.ok) rels.push(r.j.id || r.j.relation?.id);
  }
  if (oppId && bizId && biz) {
    const r = await T('D', 'POST', '/associations/relations', { locationId: L, associationId: biz.id, firstRecordId: bizId, secondRecordId: oppId }, { tpl: 'POST /associations/relations (company-job)' });
    if (r.ok) rels.push(r.j.id || r.j.relation?.id);
  }
  if (oppId) await T('D', 'GET', `/associations/relations/${oppId}${q}`, null, { note: (r) => 'relations=' + (r.j.relations || []).length });
  for (const id of rels) if (id) await T('D', 'DELETE', `/associations/relations/${id}${q}`, null, { tpl: 'DELETE /associations/relations/{id}' });
  const d = await T('D', 'POST', '/associations/', { locationId: L, key: 'zz_test_assoc_' + stamp, firstObjectLabel: 'ZZTESTA', secondObjectLabel: 'ZZTESTB', firstObjectKey: 'contact', secondObjectKey: 'business' }, { tpl: 'POST /associations/ (custom definition)' });
  const did = d.j.id || d.j.association?.id;
  if (did) {
    cleanup.push(['assoc def', () => raw('DELETE', '/associations/' + did + q), () => raw('GET', '/associations/' + did + q)]);
    await T('D', 'DELETE', '/associations/' + did + q, null, { tpl: 'DELETE /associations/{id}' });
  }
  await T('D', 'GET', '/objects/' + q, null, { note: (r) => 'objects: ' + (r.j.objects || []).map((x) => x.key).join(', ').slice(0, 300) });
});

await grp('E', async () => {
  const s = await T('E', 'GET', '/conversations/search' + q + '&limit=3', null, { note: (r) => 'existing conversations: ' + (r.j.conversations || []).length + ' fields: ' + keys((r.j.conversations || [])[0]) });
  if (!c1) return;
  const c = await T('E', 'POST', '/conversations/', { locationId: L, contactId: c1 }, { need: (r) => !!(r.j.conversation?.id || r.j.id) });
  convId = c.j.conversation?.id || c.j.id;
  if (!convId) { const f = await raw('GET', '/conversations/search' + q + '&contactId=' + c1); convId = (f.j.conversations || [])[0]?.id; results.push({ group: 'E', method: 'INFO', path: 'conversation auto-created with contact', status: f.status, ok: !!convId, note: 'create said already exists; found by contactId search' }); }
  if (convId) {
    cleanup.push(['conversation', () => raw('DELETE', '/conversations/' + convId), () => raw('GET', '/conversations/' + convId)]);
    await T('E', 'GET', '/conversations/' + convId);
    await T('E', 'PUT', '/conversations/' + convId, { locationId: L, unreadCount: 0, starred: true });
    await T('E', 'GET', '/conversations/search' + q + '&contactId=' + c1, null, { tpl: '/conversations/search?contactId=', note: (r) => 'for contact: ' + (r.j.conversations || []).length });
    const m = await T('E', 'POST', '/conversations/messages/inbound', { type: 'SMS', conversationId: convId, message: 'ZZ-TEST inbound record', date: new Date().toISOString() }, { note: 'inbound record, does not send' });
    const mid = m.j.messageId || m.j.id;
    const ms = await T('E', 'GET', `/conversations/${convId}/messages`, null, { note: (r) => { const arr = r.j.messages?.messages || r.j.messages || []; return 'count=' + arr.length + ' message fields: ' + keys(arr[0]); } });
    const one = mid || (ms.j.messages?.messages || [])[0]?.id;
    if (one) await T('E', 'GET', '/conversations/messages/' + one, null, { note: (r) => 'fields: ' + keys(r.j.message || r.j) });
  }
  skip('E', 'POST', '/conversations/messages', 'would send a real SMS or email');
  // read-only look at an existing conversation to learn real message fields (types, direction, status)
  const ex = (s.j.conversations || [])[0];
  if (ex) {
    const em = await T('E', 'GET', `/conversations/${ex.id}/messages?limit=20`, null, { tpl: '/conversations/{id}/messages (existing, read only)', note: (r) => { const arr = r.j.messages?.messages || []; return 'fields: ' + keys(arr[0]) + ' | types: ' + [...new Set(arr.map((x) => x.messageType || x.type))].join(',') + ' | direction: ' + [...new Set(arr.map((x) => x.direction))].join(',') + ' | status: ' + [...new Set(arr.map((x) => x.status))].join(','); } });
    const call = (em.j.messages?.messages || []).find((x) => /CALL/i.test(x.messageType || ''));
    if (call) {
      await T('E', 'GET', `/conversations/messages/${call.id}/locations/${L}/recording`, null, { tpl: '/conversations/messages/{id}/locations/{locationId}/recording', note: 'recording read' });
      await T('E', 'GET', `/conversations/locations/${L}/messages/${call.id}/transcription`, null, { tpl: '/conversations/locations/{locationId}/messages/{id}/transcription', note: 'transcript read' });
    } else results.push({ group: 'E', method: 'INFO', path: 'call recording/transcript', status: 0, ok: false, note: 'NOT TESTED: no call message in Dev to read' });
  }
});

await grp('F', async () => {
  const cl = await T('F', 'GET', '/calendars/' + q, null, { note: (r) => 'calendars: ' + (r.j.calendars || []).map((x) => x.name).join(', ') });
  const cals = cl.j.calendars || [];
  calId = cals[0]?.id;
  await T('F', 'GET', '/calendars/groups' + q);
  if (!calId) { results.push({ group: 'F', method: 'INFO', path: 'appointments', status: 0, ok: false, note: 'NOT TESTED: no calendar in Dev' }); return; }
  await T('F', 'GET', '/calendars/' + calId, null, { note: (r) => 'fields: ' + keys(r.j.calendar) });
  const start = Date.now() + 7 * 864e5, end = start + 3 * 864e5;
  const fs_ = await T('F', 'GET', `/calendars/${calId}/free-slots?startDate=${start}&endDate=${end}`, null, { note: (r) => 'keys: ' + keys(r.j).slice(0, 120) });
  await T('F', 'GET', `/calendars/events?locationId=${L}&calendarId=${calId}&startTime=${Date.now()}&endTime=${end}`, null, { tpl: '/calendars/events?calendarId&startTime&endTime', note: (r) => 'events=' + (r.j.events || []).length });
  if (!c1) return;
  const st = new Date(Date.now() + 14 * 864e5); st.setUTCHours(1, 0, 0, 0);
  const en = new Date(st.getTime() + 36e5);
  const a = await T('F', 'POST', '/calendars/events/appointments', { calendarId: calId, locationId: L, contactId: c1, startTime: st.toISOString(), endTime: en.toISOString(), title: 'ZZ-TEST appointment', appointmentStatus: 'confirmed', toNotify: false, ignoreDateRange: true, ignoreFreeSlotValidation: true }, { note: (r) => 'toNotify=false; fields: ' + keys(r.j) });
  apptId = a.j.id || a.j.appointment?.id;
  if (apptId) {
    cleanup.push(['appointment', () => raw('DELETE', '/calendars/events/' + apptId, {}), async () => { const ev = (await raw('GET', `/calendars/events?locationId=${L}&calendarId=${calId}&startTime=${Date.now()}&endTime=${Date.now() + 90 * 864e5}`)).j.events || []; return { ok: ev.some((e) => e.id === apptId), status: 200, j: {} }; }]);
    await T('F', 'GET', '/calendars/events/appointments/' + apptId);
    await T('F', 'PUT', '/calendars/events/appointments/' + apptId, { title: 'ZZ-TEST appointment edited', toNotify: false, ignoreFreeSlotValidation: true });
    await T('F', 'GET', `/contacts/${c1}/appointments`, null, { tpl: 'GET /contacts/{id}/appointments (after create)', note: (r) => 'count=' + (r.j.events || []).length });
    await T('F', 'DELETE', '/calendars/events/' + apptId, {});
  }
});

await grp('G', async () => {
  const alt = `altId=${L}&altType=location`;
  await T('G', 'GET', `/invoices/?${alt}&limit=5&offset=0`, null, { note: (r) => 'total=' + r.j.total + ' fields: ' + keys((r.j.invoices || [])[0]) });
  await T('G', 'GET', `/invoices/estimate/list?${alt}&limit=5&offset=0`, null, { note: (r) => 'fields: ' + keys(r.j) });
  if (!c1) return;
  const body = {
    altId: L, altType: 'location', name: 'ZZ-TEST draft', currency: 'AUD', issueDate: '2026-11-01', dueDate: '2026-11-30',
    businessDetails: { name: 'ZZ-TEST Business' },
    contactDetails: { id: c1, name: 'ZZ-TEST Matrix', email: `zz-test-m1-${stamp}@example.com` },
    items: [{ name: 'ZZ-TEST item', description: 'x', currency: 'AUD', amount: 100, qty: 2 }],
    discount: { value: 0, type: 'percentage' }, termsNotes: '<p>test</p>',
  };
  const i = await T('G', 'POST', '/invoices/', body, { tpl: 'POST /invoices/ (draft, not sent)', note: (r) => 'status=' + r.j.status + ' fields: ' + keys(r.j) });
  const iid = i.j._id || i.j.id;
  if (iid) {
    cleanup.push(['invoice', () => raw('DELETE', `/invoices/${iid}?${alt}`), () => raw('GET', `/invoices/${iid}?${alt}`)]);
    await T('G', 'GET', `/invoices/${iid}?${alt}`, null, { note: (r) => 'status=' + r.j.status + ' amountDue=' + r.j.amountDue + ' total=' + r.j.total + ' dueDate=' + r.j.dueDate + ' items=' + (r.j.invoiceItems || []).length + ' fields: ' + keys(r.j) });
    await T('G', 'PUT', '/invoices/' + iid, { ...body, name: 'ZZ-TEST draft edited', invoiceItems: body.items });
    await T('G', 'DELETE', `/invoices/${iid}?${alt}`);
  }
  skip('G', 'POST', '/invoices/{id}/record-payment', 'could mark paid and trigger receipt; left untested');
  skip('G', 'POST', '/invoices/{id}/send', 'would send a real email or SMS');
  skip('G', 'POST', '/invoices/text2pay', 'would send a real SMS');
  const eb = { altId: L, altType: 'location', name: 'ZZ-TEST estimate', title: 'ZZ-TEST estimate', currency: 'AUD', issueDate: '2026-10-30', expiryDate: '2026-12-01', liveMode: false, discount: { value: 0, type: 'percentage' }, frequencySettings: { enabled: false }, businessDetails: { name: 'ZZ-TEST Business' }, contactDetails: { id: c1, name: 'ZZ-TEST Matrix', email: `zz-test-m1-${stamp}@example.com` }, items: [{ name: 'ZZ-TEST item', description: 'x', currency: 'AUD', amount: 100, qty: 1, type: 'one_time' }] };
  const e = await T('G', 'POST', '/invoices/estimate', eb, { tpl: 'POST /invoices/estimate (draft, not sent)', note: (r) => 'status=' + r.j.status + ' fields: ' + keys(r.j) });
  const eid = e.j._id || e.j.id;
  if (eid) {
    cleanup.push(['estimate', () => raw('DELETE', `/invoices/estimate/${eid}`, { altId: L, altType: 'location' }), () => raw('GET', `/invoices/estimate/${eid}?${alt}`)]);
    await T('G', 'GET', `/invoices/estimate/${eid}?${alt}`);
    await T('G', 'DELETE', `/invoices/estimate/${eid}`, { altId: L, altType: 'location' });
  }
  skip('G', 'POST', '/invoices/estimate/{id}/send', 'would send a real email or SMS');
});

await grp('H', async () => {
  if (userId) await T('H', 'GET', '/users/' + userId);
  const tg = await T('H', 'POST', `/locations/${L}/tags`, { name: 'zz-test-tag-' + stamp });
  const tid = tg.j.tag?.id;
  await T('H', 'GET', `/locations/${L}/tags`, null, { note: (r) => 'count=' + (r.j.tags || []).length });
  if (tid) { cleanup.push(['tag', () => raw('DELETE', `/locations/${L}/tags/${tid}`), () => raw('GET', `/locations/${L}/tags/${tid}`)]); await T('H', 'DELETE', `/locations/${L}/tags/${tid}`); }
  await T('H', 'GET', `/locations/${L}/customFields?model=contact`, null, { note: (r) => 'contact fields: ' + (r.j.customFields || []).length });
  await T('H', 'GET', `/locations/${L}/customFields?model=opportunity`, null, { note: (r) => 'opportunity fields: ' + (r.j.customFields || []).length });
  const cf = await T('H', 'POST', `/locations/${L}/customFields`, { name: 'ZZ-TEST field ' + stamp, dataType: 'TEXT', model: 'contact' });
  const cfid = cf.j.customField?.id;
  if (cfid) { cleanup.push(['customField', () => raw('DELETE', `/locations/${L}/customFields/${cfid}`), () => raw('GET', `/locations/${L}/customFields/${cfid}`)]); await T('H', 'DELETE', `/locations/${L}/customFields/${cfid}`); }
  await T('H', 'GET', `/locations/${L}/customValues`, null, { note: (r) => 'count=' + (r.j.customValues || []).length });
  const cv = await T('H', 'POST', `/locations/${L}/customValues`, { name: 'ZZ-TEST value ' + stamp, value: 'x' });
  const cvid = cv.j.customValue?.id;
  if (cvid) { cleanup.push(['customValue', () => raw('DELETE', `/locations/${L}/customValues/${cvid}`), () => raw('GET', `/locations/${L}/customValues/${cvid}`)]); await T('H', 'DELETE', `/locations/${L}/customValues/${cvid}`); }
  await T('H', 'GET', '/products/?locationId=' + L + '&limit=5', null, { note: (r) => 'products=' + (r.j.products || []).length });
  await T('H', 'GET', '/forms/' + q);
  await T('H', 'GET', '/forms/submissions' + q + '&limit=5');
  await T('H', 'GET', '/surveys/' + q);
  await T('H', 'GET', '/surveys/submissions' + q + '&limit=5');
  await T('H', 'GET', '/workflows/' + q, null, { note: (r) => 'workflows=' + (r.j.workflows || []).length });
  await T('H', 'GET', `/medias/files?altId=${L}&altType=location&type=file&limit=5`, null, { tpl: '/medias/files' });
  await T('H', 'GET', '/links/' + q, null, { note: (r) => 'links=' + (r.j.links || []).length });
  await T('H', 'GET', '/locations/' + L, null, { note: (r) => 'business name present: ' + !!(r.j.location?.name || r.j.location?.business?.name) });
});

await grp('I', async () => {
  for (const p of ['/webhooks/', `/locations/${L}/webhooks`, '/hooks/' + q, '/marketplace/app/webhooks' + q]) await T('I', 'GET', p, null, { note: 'probe: webhook subscription endpoint' });
});

// cleanup in reverse, verify by reading back
console.log('--- cleanup ---');
const notCleaned = [];
for (const [name, del, chk] of [...cleanup].reverse()) {
  try { await del(); const c = await chk(); const gone = !c.ok || c.j.deleted === true; if (c.ok) console.log('   still readable: ' + JSON.stringify(c.j).slice(0, 200)); console.log('cleanup ' + name + ': ' + (gone ? 'verified gone' : 'STILL THERE (' + c.status + ')')); if (!gone) notCleaned.push(name); } catch (e) { console.log('cleanup ' + name + ' error: ' + e.message); notCleaned.push(name); }
}
// sweep: any ZZ-TEST appointment still listed in Dev calendars (title starts with ZZ-TEST only)
for (const cal of (await raw('GET', '/calendars/' + q)).j.calendars || []) {
  const ev = (await raw('GET', `/calendars/events?locationId=${L}&calendarId=${cal.id}&startTime=${Date.now() - 864e5}&endTime=${Date.now() + 90 * 864e5}`)).j.events || [];
  for (const e of ev) if (/^ZZ-TEST/.test(e.title || '')) { const d = await raw('DELETE', '/calendars/events/' + e.id, {}); console.log('sweep appointment ' + e.id + ' delete ' + d.status + ' status=' + e.appointmentStatus); }
}
results.push({ group: 'cleanup', method: '-', path: '-', status: 0, ok: notCleaned.length === 0, note: notCleaned.length ? 'not cleaned: ' + notCleaned.join(', ') : 'all created records deleted and verified' });
results.push({ group: 'I', method: 'INFO', path: 'rate limit headers', status: 0, ok: true, note: JSON.stringify(rateHeaders) });
fs.writeFileSync(new URL('../api/test-results.json', import.meta.url), JSON.stringify(results, null, 1));
console.log('Results written: ' + results.length + '. ok=' + results.filter((r) => r.ok).length + ' notOk=' + results.filter((r) => !r.ok).length);
console.log('Rate headers: ' + JSON.stringify(rateHeaders));
