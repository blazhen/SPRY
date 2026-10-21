// Step 11: one custom value per calendar holding its permanent booking link (Dev only), and a folder probe.
// Usage: node step11-calendar-links.mjs <api-base-url> <location-id> <.env path> <booking-link-base>
// Safe to rerun: existing values are updated in place. Never prints the token.
import fs from 'node:fs';

const DEV = '5M1zrDbimF17cM16mtmR';
const [, , base, locationId, envPath, linkBase] = process.argv;
if (!base || !locationId || !envPath || !linkBase) { console.error('Usage: node step11-calendar-links.mjs <api-base-url> <location-id> <.env path> <booking-link-base>'); process.exit(1); }
if (locationId !== DEV) { console.error('Refused: this script only runs on the Dev location.'); process.exit(1); }
const line = fs.readFileSync(envPath, 'utf8').split(/\r?\n/).find((l) => l.startsWith('SPRY_CRM_TOKEN='));
const token = (line || '').slice('SPRY_CRM_TOKEN='.length).trim().replace(/^["']|["']$/g, '');
if (!token) { console.error('Token not found in the file.'); process.exit(2); }
const headers = { Authorization: 'Bearer ' + token, Version: '2021-07-28', Accept: 'application/json', 'Content-Type': 'application/json' };
const msg = (b) => (Array.isArray(b.message) ? b.message.join('; ') : b.message || JSON.stringify(b).slice(0, 200));
const call = async (method, path, body) => {
  const r = await fetch(base + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const b = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, b };
};
const cvPath = '/locations/' + locationId + '/customValues';

// Folder probe: does a custom value folder exist as an API object?
const probe = await call('POST', cvPath, { name: 'Calendar Links', documentType: 'folder' });
console.log('Folder probe (documentType folder): HTTP ' + probe.status + ' ' + (probe.ok ? JSON.stringify(probe.b).slice(0, 200) : msg(probe.b)));
if (probe.ok) {
  const pid = probe.b.customValue?.id || probe.b.id;
  if (pid) { const d = await call('DELETE', cvPath + '/' + pid); console.log('Removed the probe item: HTTP ' + d.status); }
}

const cals = (await call('GET', '/calendars/?locationId=' + locationId)).b.calendars || [];
const have = new Map(((await call('GET', cvPath)).b.customValues || []).map((v) => [v.fieldKey, v]));
const nameFor = (c) => 'Calendar Link ' + c.name.replace(/^Install: /, 'Install ').replace(/[^A-Za-z0-9 ]/g, '');
const results = [];
for (const c of cals) {
  const name = nameFor(c);
  const key = '{{ custom_values.' + name.toLowerCase().replace(/\s+/g, '_') + ' }}';
  const value = linkBase.replace(/\/$/, '') + '/' + c.id;
  const existing = have.get(key);
  const r = existing ? await call('PUT', cvPath + '/' + existing.id, { name, value }) : await call('POST', cvPath, { name, value });
  results.push([name, key, value, r.ok, r.status, r.ok ? '' : msg(r.b)]);
}
const after = new Map(((await call('GET', cvPath)).b.customValues || []).map((v) => [v.fieldKey, v.value]));
for (const [name, key, value, ok, status, err] of results) {
  const stored = after.get(key);
  console.log(name + ': HTTP ' + status + (ok ? '' : ' ' + err) + ' | key ' + key + ' | stored value ' + (stored === value ? 'matches the calendar link' : 'DIFFERS or missing'));
}
console.log('Custom values in Dev now: ' + after.size);
