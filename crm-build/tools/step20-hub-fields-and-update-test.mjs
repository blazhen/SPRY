// Dev only. Part 1: create the Hub fields and tags if missing (safe to rerun).
// Part 2: write test on a throwaway ZZ-TEST job: update stage, status, value, custom fields, add a tag, read back, clean up.
// Prints statuses and short values only, never the token.
// Usage: node step20-hub-fields-and-update-test.mjs <api-base-url> <location-id> <.env path>
import fs from 'node:fs';

const DEV = '5M1zrDbimF17cM16mtmR';
const [, , base, L, envPath] = process.argv;
if (!base || !L || !envPath) { console.error('Usage: node step20-hub-fields-and-update-test.mjs <api-base-url> <location-id> <.env path>'); process.exit(1); }
if (L !== DEV) { console.error('Refused: Dev only.'); process.exit(1); }
const line = fs.readFileSync(envPath, 'utf8').split(/\r?\n/).find((l) => l.startsWith('SPRY_CRM_TOKEN='));
const token = (line || '').slice('SPRY_CRM_TOKEN='.length).trim().replace(/^["']|["']$/g, '');
const H = { Authorization: 'Bearer ' + token, Version: '2021-07-28', Accept: 'application/json', 'Content-Type': 'application/json' };
const call = async (m, p, b, quiet) => {
  const r = await fetch(base + p, { method: m, headers: H, body: b ? JSON.stringify(b) : undefined });
  const j = await r.json().catch(() => ({}));
  const msg = Array.isArray(j.message) ? j.message.join('; ') : j.message || '';
  if (!quiet || !r.ok) console.log(m.padEnd(6) + p.replace(L, '<loc>').slice(0, 64).padEnd(66) + r.status + (r.ok ? '' : ' ' + msg.slice(0, 160)));
  return { ok: r.ok, status: r.status, j };
};

// Part 1
const wantFields = [
  ['quote_revision', 'Quote revision', 'NUMERICAL'],
  ['quote_valid_until', 'Quote valid until', 'DATE'],
  ['quote_accepted_at', 'Quote accepted at', 'DATE'],
];
const wantTags = ['hub-addon-accepted', 'hub-quote-revised', 'hub-quote-expired', 'in-quote-queue'];
const f0 = (await call('GET', '/locations/' + L + '/customFields?model=all', null, true)).j.customFields || [];
const have = new Map(f0.map((f) => [f.fieldKey, f]));
for (const [key, name, dataType] of wantFields) {
  if (have.has('opportunity.' + key)) { console.log('Field exists: opportunity.' + key); continue; }
  const r = await call('POST', '/locations/' + L + '/customFields', { name, dataType, model: 'opportunity' });
  console.log((r.ok ? 'Created field: ' : 'FAILED field: ') + key);
}
const t0 = (await call('GET', '/locations/' + L + '/tags', null, true)).j.tags || [];
const haveTags = new Set(t0.map((t) => t.name));
for (const name of wantTags) {
  if (haveTags.has(name)) { console.log('Tag exists: ' + name); continue; }
  const r = await call('POST', '/locations/' + L + '/tags', { name });
  console.log((r.ok ? 'Created tag: ' : 'FAILED tag: ') + name);
}
const f1 = (await call('GET', '/locations/' + L + '/customFields?model=all', null, true)).j.customFields || [];
const fid = (k) => (f1.find((f) => f.fieldKey === 'opportunity.' + k) || {}).id;
console.log('Fields present after: ' + wantFields.map(([k]) => k + '=' + (fid(k) ? 'yes' : 'NO')).join(', '));

// Part 2
const made = { contact: null, opp: null };
try {
  const pipe = ((await call('GET', '/opportunities/pipelines?locationId=' + L, null, true)).j.pipelines || [])[0];
  const s0 = pipe.stages[0];
  const sQuoting = pipe.stages.find((s) => /quoting/i.test(s.name)) || pipe.stages[1];
  const sSent = pipe.stages.find((s) => /quote sent/i.test(s.name)) || pipe.stages[2];
  const c = await call('POST', '/contacts/', { locationId: L, firstName: 'ZZ-TEST', lastName: 'Update ' + Date.now(), email: 'zz-test-upd-' + Date.now() + '@example.com' });
  made.contact = c.j.contact?.id;
  const o = await call('POST', '/opportunities/', { pipelineId: pipe.id, locationId: L, name: 'ZZ-TEST Update job', pipelineStageId: s0.id, status: 'open', contactId: made.contact });
  made.opp = o.j.opportunity?.id || o.j.id;
  const upd = await call('PUT', '/opportunities/' + made.opp, {
    pipelineStageId: sSent.id,
    monetaryValue: 18400,
    customFields: [
      { id: fid('quote_revision'), field_value: 2 },
      { id: fid('quote_valid_until'), field_value: '2026-12-29' },
      { id: fid('quote_number'), field_value: 'Q-TEST-001' },
    ].filter((x) => x.id),
  });
  const rb = (await call('GET', '/opportunities/' + made.opp, null, true)).j.opportunity || {};
  console.log('Read back: stage=' + (rb.pipelineStageId === sSent.id ? sSent.name : 'NOT UPDATED') + ', value=' + rb.monetaryValue + ', status=' + rb.status);
  console.log('Custom fields read back: ' + JSON.stringify((rb.customFields || []).map((x) => (x.id || '').slice(0, 5) + '=' + (x.fieldValueString ?? x.fieldValueNumber ?? x.fieldValueDate ?? x.fieldValue ?? '?'))).slice(0, 200));
  const st = await call('PUT', '/opportunities/' + made.opp + '/status', { status: 'won' });
  const rb2 = (await call('GET', '/opportunities/' + made.opp, null, true)).j.opportunity || {};
  console.log('Status after status call: ' + rb2.status);
  const tg = await call('POST', '/contacts/' + made.contact + '/tags', { tags: ['in-quote-queue'] });
  const ct = (await call('GET', '/contacts/' + made.contact, null, true)).j.contact || {};
  console.log('Contact tags read back: ' + JSON.stringify(ct.tags || []));
  const tr = await call('DELETE', '/contacts/' + made.contact + '/tags', { tags: ['in-quote-queue'] });
  console.log('Update stage/value/fields: ' + (upd.ok ? 'OK' : 'FAILED') + ', status call: ' + (st.ok ? 'OK' : 'FAILED') + ', tag add: ' + (tg.ok ? 'OK' : 'FAILED') + ', tag remove: ' + (tr.ok ? 'OK' : 'FAILED'));
} catch (e) {
  console.log('Test error: ' + e.message);
} finally {
  console.log('--- cleanup ---');
  if (made.opp) await call('DELETE', '/opportunities/' + made.opp);
  if (made.contact) await call('DELETE', '/contacts/' + made.contact);
}
