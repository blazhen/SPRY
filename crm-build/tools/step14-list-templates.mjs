// Read-only: list every email template by folder in Dev, and the SMS templates if readable.
// Usage: node step14-list-templates.mjs <api-base-url> <location-id> <.env path>
import fs from 'node:fs';

const DEV = '5M1zrDbimF17cM16mtmR';
const [, , base, locationId, envPath] = process.argv;
if (!base || !locationId || !envPath) { console.error('Usage: node step14-list-templates.mjs <api-base-url> <location-id> <.env path>'); process.exit(1); }
if (locationId !== DEV) { console.error('Refused: Dev only.'); process.exit(1); }
const line = fs.readFileSync(envPath, 'utf8').split(/\r?\n/).find((l) => l.startsWith('SPRY_CRM_TOKEN='));
const token = (line || '').slice('SPRY_CRM_TOKEN='.length).trim().replace(/^["']|["']$/g, '');
const headers = { Authorization: 'Bearer ' + token, Version: '2021-07-28', Accept: 'application/json' };
const get = async (p) => { const r = await fetch(base + p, { headers }); return { status: r.status, b: await r.json().catch(() => ({})) }; };
const list = async (pid) => (await get('/emails/builder?locationId=' + locationId + '&limit=100&offset=0' + (pid ? '&parentId=' + pid : ''))).b.builders || [];

const root = await list();
console.log('Top level items: ' + root.length);
let total = 0;
for (const f of root) {
  if (f.templateType !== 'folder') { console.log('Loose template: ' + f.name); total++; continue; }
  const kids = await list(f.id);
  total += kids.length;
  console.log('\nFolder (' + kids.length + ' templates)');
  for (const k of kids) console.log('  ' + k.name);
}
console.log('\nTotal email templates: ' + total);

const sl = await get('/locations/' + locationId + '/templates?type=sms&originId=' + locationId + '&limit=100&deleted=false');
console.log('\nSMS templates read: HTTP ' + sl.status + ', count ' + (sl.b.templates?.length ?? '?') + ', total ' + (sl.b.totalCount ?? '?'));
for (const t of sl.b.templates || []) console.log('  ' + (t.name || t.title || t.id));
