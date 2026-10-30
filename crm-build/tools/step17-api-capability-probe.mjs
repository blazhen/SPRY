// Read-only capability probe: GET only, Dev only. Prints HTTP status per route, never the token or any data.
// Usage: node step17-api-capability-probe.mjs <api-base-url> <location-id> <.env path>
import fs from 'node:fs';

const DEV = '5M1zrDbimF17cM16mtmR';
const [, , base, L, envPath] = process.argv;
if (!base || !L || !envPath) { console.error('Usage: node step17-api-capability-probe.mjs <api-base-url> <location-id> <.env path>'); process.exit(1); }
if (L !== DEV) { console.error('Refused: Dev only.'); process.exit(1); }
const line = fs.readFileSync(envPath, 'utf8').split(/\r?\n/).find((l) => l.startsWith('SPRY_CRM_TOKEN='));
const token = (line || '').slice('SPRY_CRM_TOKEN='.length).trim().replace(/^["']|["']$/g, '');
const headers = { Authorization: 'Bearer ' + token, Version: '2021-07-28', Accept: 'application/json' };

const routes = [
  ['Location', '/locations/' + L],
  ['Contacts', '/contacts/?locationId=' + L + '&limit=1'],
  ['Opportunities search', '/opportunities/search?location_id=' + L + '&limit=1'],
  ['Pipelines', '/opportunities/pipelines?locationId=' + L],
  ['Custom fields (location)', '/locations/' + L + '/customFields'],
  ['Custom values', '/locations/' + L + '/customValues'],
  ['Tags', '/locations/' + L + '/tags'],
  ['Custom objects (schemas)', '/objects/?locationId=' + L],
  ['Associations', '/associations/?locationId=' + L],
  ['Workflows', '/workflows/?locationId=' + L],
  ['Calendars', '/calendars/?locationId=' + L],
  ['Calendar groups', '/calendars/groups?locationId=' + L],
  ['Users', '/users/?locationId=' + L],
  ['Conversations search', '/conversations/search?locationId=' + L + '&limit=1'],
  ['Email templates / builder', '/emails/builder?locationId=' + L + '&limit=1'],
  ['Templates (SMS etc)', '/locations/' + L + '/templates?originId=' + L + '&limit=1'],
  ['Invoices', '/invoices/?altId=' + L + '&altType=location&limit=1&offset=0'],
  ['Invoice templates', '/invoices/template?altId=' + L + '&altType=location&limit=1&offset=0'],
  ['Payments orders', '/payments/orders?altId=' + L + '&altType=location&limit=1'],
  ['Products', '/products/?locationId=' + L + '&limit=1'],
  ['Estimates', '/invoices/estimate/list?altId=' + L + '&altType=location&limit=1&offset=0'],
  ['Forms', '/forms/?locationId=' + L + '&limit=1'],
  ['Funnels', '/funnels/funnel/list?locationId=' + L + '&limit=1'],
  ['Trigger links', '/links/?locationId=' + L],
  ['Campaigns', '/campaigns/?locationId=' + L],
  ['Businesses', '/businesses/?locationId=' + L],
  ['Social planner', '/social-media-posting/' + L + '/accounts'],
  ['Phone numbers', '/phone-system/numbers/location/' + L],
  ['Media files', '/medias/files?altId=' + L + '&altType=location&limit=1'],
  ['Snapshots / webhooks', '/hooks/?locationId=' + L],
];
const out = [];
for (const [name, path] of routes) {
  let s;
  try { const r = await fetch(base + path, { headers }); s = r.status; } catch { s = 'network error'; }
  out.push(name.padEnd(28) + ' ' + s);
}
console.log(out.join('\n'));
