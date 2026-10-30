// Dev-only write test: create ZZ-TEST job, 3 test contacts, 1 test company, link them with associations,
// read back, then clean everything up. Prints HTTP statuses and short messages only, never the token.
// Usage: node step19-association-test.mjs <api-base-url> <location-id> <.env path>
import fs from 'node:fs';

const DEV = '5M1zrDbimF17cM16mtmR';
const [, , base, L, envPath] = process.argv;
if (!base || !L || !envPath) { console.error('Usage: node step19-association-test.mjs <api-base-url> <location-id> <.env path>'); process.exit(1); }
if (L !== DEV) { console.error('Refused: Dev only.'); process.exit(1); }
const line = fs.readFileSync(envPath, 'utf8').split(/\r?\n/).find((l) => l.startsWith('SPRY_CRM_TOKEN='));
const token = (line || '').slice('SPRY_CRM_TOKEN='.length).trim().replace(/^["']|["']$/g, '');
const H = { Authorization: 'Bearer ' + token, Version: '2021-07-28', Accept: 'application/json', 'Content-Type': 'application/json' };
const call = async (m, p, b) => {
  const r = await fetch(base + p, { method: m, headers: H, body: b ? JSON.stringify(b) : undefined });
  const j = await r.json().catch(() => ({}));
  const msg = Array.isArray(j.message) ? j.message.join('; ') : j.message || '';
  console.log(m.padEnd(6) + p.replace(L, '<loc>').slice(0, 70).padEnd(72) + r.status + (r.ok ? '' : ' ' + msg.slice(0, 160)));
  return { ok: r.ok, status: r.status, j };
};
const created = { contacts: [], business: null, opp: null, rels: [] };
const stamp = Date.now();
try {
  const pl = await call('GET', '/opportunities/pipelines?locationId=' + L);
  const pipe = (pl.j.pipelines || [])[0];
  const stage = pipe.stages[0];
  console.log('Using pipeline "' + pipe.name + '", stage "' + stage.name + '"');
  const assoc = (await call('GET', '/associations/?locationId=' + L)).j.associations || [];
  const A = (k) => assoc.find((a) => a.key === k);
  const addl = A('OPPORTUNITIES_CONTACTS_ADDITIONAL_ASSOCIATION');
  const biz = A('BUSINESSES_OPPORTUNITIES_ASSOCIATION');
  console.log('Additional contacts association: ' + (addl ? addl.firstObjectKey + ' -> ' + addl.secondObjectKey : 'MISSING') + '; business: ' + (biz ? biz.firstObjectKey + ' -> ' + biz.secondObjectKey : 'MISSING'));

  for (const n of ['A', 'B', 'C']) {
    const c = await call('POST', '/contacts/', { locationId: L, firstName: 'ZZ-TEST', lastName: 'Contact ' + n, email: 'zz-test-' + n.toLowerCase() + '-' + stamp + '@example.com' });
    if (c.ok) created.contacts.push(c.j.contact.id);
  }
  const b = await call('POST', '/businesses/', { locationId: L, name: 'ZZ-TEST Company ' + stamp });
  if (b.ok) created.business = b.j.business?.id || b.j.id;
  const o = await call('POST', '/opportunities/', { pipelineId: pipe.id, locationId: L, name: 'ZZ-TEST Job ' + stamp, pipelineStageId: stage.id, status: 'open', contactId: created.contacts[0] });
  if (o.ok) created.opp = o.j.opportunity?.id || o.j.id;
  console.log('Created: contacts=' + created.contacts.length + ', business=' + !!created.business + ', job=' + !!created.opp);

  if (created.opp && addl) {
    for (const cid of created.contacts.slice(1)) {
      const r = await call('POST', '/associations/relations', { locationId: L, associationId: addl.id, firstRecordId: cid, secondRecordId: created.opp, pipelineId: pipe.id });
      if (r.ok) created.rels.push(r.j.id || r.j.relation?.id);
    }
  }
  if (created.opp && created.business && biz) {
    const r = await call('POST', '/associations/relations', { locationId: L, associationId: biz.id, firstRecordId: created.business, secondRecordId: created.opp });
    if (r.ok) created.rels.push(r.j.id || r.j.relation?.id);
  }
  if (created.opp) {
    const rb = await call('GET', '/associations/relations/' + created.opp + '?locationId=' + L);
    const rels = rb.j.relations || [];
    console.log('Read back relations on the job: ' + rels.length + ' -> ' + rels.map((x) => (x.associationId || '').slice(0, 6) + ':' + (x.firstObjectKey || '') + '>' + (x.secondObjectKey || '')).join(', '));
    const opp = await call('GET', '/opportunities/' + created.opp);
    console.log('Job read back: ' + (opp.j.opportunity?.name || opp.j.name || '?'));
  }
} catch (e) {
  console.log('Test error: ' + e.message);
} finally {
  console.log('--- cleanup ---');
  for (const r of created.rels) if (r) await call('DELETE', '/associations/relations/' + r + '?locationId=' + L);
  if (created.opp) await call('DELETE', '/opportunities/' + created.opp);
  if (created.business) await call('DELETE', '/businesses/' + created.business);
  for (const c of created.contacts) await call('DELETE', '/contacts/' + c);
}
