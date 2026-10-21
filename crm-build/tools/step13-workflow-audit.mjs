// Read-only: list the workflows in Dev and compare with the 40 expected names and the folder plan.
// Usage: node step13-workflow-audit.mjs <api-base-url> <location-id> <.env path>
import fs from 'node:fs';

const DEV = '5M1zrDbimF17cM16mtmR';
const [, , base, locationId, envPath] = process.argv;
if (!base || !locationId || !envPath) { console.error('Usage: node step13-workflow-audit.mjs <api-base-url> <location-id> <.env path>'); process.exit(1); }
if (locationId !== DEV) { console.error('Refused: Dev only.'); process.exit(1); }
const line = fs.readFileSync(envPath, 'utf8').split(/\r?\n/).find((l) => l.startsWith('SPRY_CRM_TOKEN='));
const token = (line || '').slice('SPRY_CRM_TOKEN='.length).trim().replace(/^["']|["']$/g, '');
const headers = { Authorization: 'Bearer ' + token, Version: '2021-07-28', Accept: 'application/json' };
const r = await fetch(base + '/workflows/?locationId=' + locationId, { headers });
const b = await r.json().catch(() => ({}));
console.log('Read workflows: HTTP ' + r.status + (r.ok ? '' : ' ' + JSON.stringify(b).slice(0, 200)));
const list = b.workflows || [];
console.log('Workflows in Dev: ' + list.length);
if (list[0]) console.log('Keys per workflow: ' + Object.keys(list[0]).join(', '));
const byId = new Map(list.map((w) => [w.id, w]));
const rows = list.map((w) => ({ name: w.name, status: w.status, parent: w.parentId ? (byId.get(w.parentId)?.name || w.parentId) : '(none)', type: w.type || '' }));
rows.sort((a, c) => String(a.name).localeCompare(String(c.name)));
for (const x of rows) console.log(x.name + ' | ' + x.status + ' | folder: ' + x.parent + (x.type ? ' | ' + x.type : ''));
const wfs = rows.filter((x) => /^WF-\d\d /.test(x.name));
const nums = new Set(wfs.map((x) => x.name.slice(3, 5)));
const missing = [];
for (let i = 1; i <= 40; i++) { const n = String(i).padStart(2, '0'); if (!nums.has(n)) missing.push('WF-' + n); }
console.log('\nNamed WF-NN: ' + wfs.length + ' of 40. Missing names: ' + (missing.join(', ') || 'none'));
console.log('Not draft: ' + (wfs.filter((x) => x.status !== 'draft').map((x) => x.name).join(', ') || 'none'));
console.log('Not in a folder: ' + (wfs.filter((x) => x.parent === '(none)').map((x) => x.name).join(', ') || 'none'));
