// Probe: does a workflow create route exist? Dev only. Prints statuses, never the token.
// Usage: node step6b-workflow-probe.mjs <api-base-url> <location-id> <.env path>
import fs from 'node:fs';

const DEV = '5M1zrDbimF17cM16mtmR';
const [, , base, locationId, envPath] = process.argv;
if (!base || !locationId || !envPath) { console.error('Usage: node step6b-workflow-probe.mjs <api-base-url> <location-id> <.env path>'); process.exit(1); }
if (locationId !== DEV) { console.error('Refused: Dev only.'); process.exit(1); }
const line = fs.readFileSync(envPath, 'utf8').split(/\r?\n/).find((l) => l.startsWith('SPRY_CRM_TOKEN='));
const token = (line || '').slice('SPRY_CRM_TOKEN='.length).trim().replace(/^["']|["']$/g, '');
const headers = { Authorization: 'Bearer ' + token, Version: '2021-07-28', Accept: 'application/json', 'Content-Type': 'application/json' };
const msg = (b) => (Array.isArray(b.message) ? b.message.join('; ') : b.message || JSON.stringify(b).slice(0, 200));
const tries = [
  ['POST', '/workflows/?locationId=' + locationId, { name: 'ZZ-PROBE' }],
  ['POST', '/workflows/' + locationId, { name: 'ZZ-PROBE' }],
  ['POST', '/workflows/', { locationId, name: 'ZZ-PROBE', status: 'draft' }],
];
for (const [m, p, b] of tries) {
  const r = await fetch(base + p, { method: m, headers, body: JSON.stringify(b) });
  const j = await r.json().catch(() => ({}));
  console.log(m + ' ' + p.replace(locationId, '<loc>') + ' -> HTTP ' + r.status + ' ' + msg(j));
  if (r.ok) { console.log('A workflow was created in Dev: ' + JSON.stringify(j).slice(0, 200)); break; }
}
const l = await fetch(base + '/workflows/?locationId=' + locationId, { headers });
const lj = await l.json().catch(() => ({}));
console.log('Workflows in Dev now: ' + (lj.workflows || []).map((w) => w.name + ' [' + w.status + ']').join(' | '));
