// Read-only: list custom object schemas and associations in Dev (names and keys only). Never prints the token.
// Usage: node step18-objects-read.mjs <api-base-url> <location-id> <.env path>
import fs from 'node:fs';

const DEV = '5M1zrDbimF17cM16mtmR';
const [, , base, L, envPath] = process.argv;
if (!base || !L || !envPath) { console.error('Usage: node step18-objects-read.mjs <api-base-url> <location-id> <.env path>'); process.exit(1); }
if (L !== DEV) { console.error('Refused: Dev only.'); process.exit(1); }
const line = fs.readFileSync(envPath, 'utf8').split(/\r?\n/).find((l) => l.startsWith('SPRY_CRM_TOKEN='));
const token = (line || '').slice('SPRY_CRM_TOKEN='.length).trim().replace(/^["']|["']$/g, '');
const headers = { Authorization: 'Bearer ' + token, Version: '2021-07-28', Accept: 'application/json' };
for (const [label, p] of [['objects', '/objects/?locationId=' + L], ['associations', '/associations/?locationId=' + L]]) {
  const r = await fetch(base + p, { headers });
  const j = await r.json().catch(() => ({}));
  console.log(label + ': HTTP ' + r.status);
  const list = j.objects || j.associations || [];
  for (const x of list) console.log('  ' + (x.key || '') + ' | ' + (x.labels?.singular || x.name || '') + (x.firstObjectKey ? ' | ' + x.firstObjectKey + ' <-> ' + x.secondObjectKey + ' | ' + (x.associationType || '') : ''));
  if (!list.length) console.log('  (none listed) keys: ' + Object.keys(j).join(', '));
}
