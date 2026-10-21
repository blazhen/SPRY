// Read-only: what link data do the Dev calendars have, and what do custom values look like (folders)?
// Usage: node step10-links-probe.mjs <api-base-url> <location-id> <.env path> <booking-link-base>
import fs from 'node:fs';

const DEV = '5M1zrDbimF17cM16mtmR';
const [, , base, locationId, envPath, linkBase] = process.argv;
if (!base || !locationId || !envPath || !linkBase) { console.error('Usage: node step10-links-probe.mjs <api-base-url> <location-id> <.env path> <booking-link-base>'); process.exit(1); }
if (locationId !== DEV) { console.error('Refused: Dev only.'); process.exit(1); }
const line = fs.readFileSync(envPath, 'utf8').split(/\r?\n/).find((l) => l.startsWith('SPRY_CRM_TOKEN='));
const token = (line || '').slice('SPRY_CRM_TOKEN='.length).trim().replace(/^["']|["']$/g, '');
const headers = { Authorization: 'Bearer ' + token, Version: '2021-07-28', Accept: 'application/json' };
const get = async (p) => { const r = await fetch(base + p, { headers }); return { status: r.status, b: await r.json().catch(() => ({})) }; };

const cl = await get('/calendars/?locationId=' + locationId);
console.log('Calendars: HTTP ' + cl.status);
for (const c of cl.b.calendars || []) {
  console.log('- ' + c.name + ' | id ' + c.id + ' | slug ' + (c.slug ?? c.widgetSlug ?? '(none)') + ' | widgetSlug ' + (c.widgetSlug ?? '(none)') + ' | active ' + c.isActive);
  const test = await fetch(linkBase.replace(/\/$/, '') + '/' + c.id);
  console.log('    booking page at <base>/<id>: HTTP ' + test.status);
}
const one = (cl.b.calendars || [])[0];
if (one) console.log('Calendar keys: ' + Object.keys(one).join(', '));

const cv = await get('/locations/' + locationId + '/customValues');
console.log('Custom values: HTTP ' + cv.status + ', count ' + (cv.b.customValues?.length ?? '?'));
if (cv.b.customValues?.[0]) console.log('Custom value keys: ' + Object.keys(cv.b.customValues[0]).join(', '));
