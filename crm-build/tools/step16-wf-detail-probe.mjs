// Read-only probe: can a workflow's steps be read? Dev only. Never prints the token.
// Usage: node step16-wf-detail-probe.mjs <api-base-url> <location-id> <.env path>
import fs from 'node:fs';

const DEV = '5M1zrDbimF17cM16mtmR';
const [, , base, locationId, envPath] = process.argv;
if (!base || !locationId || !envPath) { console.error('Usage: node step16-wf-detail-probe.mjs <api-base-url> <location-id> <.env path>'); process.exit(1); }
if (locationId !== DEV) { console.error('Refused: Dev only.'); process.exit(1); }
const line = fs.readFileSync(envPath, 'utf8').split(/\r?\n/).find((l) => l.startsWith('SPRY_CRM_TOKEN='));
const token = (line || '').slice('SPRY_CRM_TOKEN='.length).trim().replace(/^["']|["']$/g, '');
const headers = { Authorization: 'Bearer ' + token, Version: '2021-07-28', Accept: 'application/json' };
const lst = await (await fetch(base + '/workflows/?locationId=' + locationId, { headers })).json();
const w = lst.workflows.find((x) => x.name.startsWith('WF-05'));
const paths = [
  '/workflows/' + w.id + '?locationId=' + locationId,
  '/workflows/' + w.id,
  '/workflows/' + w.id + '/actions?locationId=' + locationId,
  '/workflows/' + w.id + '/steps?locationId=' + locationId,
  '/workflows/folders?locationId=' + locationId,
];
for (const p of paths) {
  const r = await fetch(base + p, { headers });
  const t = await r.text();
  console.log(p.replace(w.id, '<id>').replace(locationId, '<loc>') + ' -> ' + r.status + ' ' + t.slice(0, 160));
}
