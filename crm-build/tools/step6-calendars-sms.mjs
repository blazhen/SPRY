// Step 6: the other five calendars, and a probe for SMS templates and workflows in Dev.
// Usage: node step6-calendars-sms.mjs <api-base-url> <location-id> <.env path>
// Dev only, safe to rerun. Never prints the token.
import fs from 'node:fs';

const DEV = '5M1zrDbimF17cM16mtmR';
const [, , base, locationId, envPath] = process.argv;
if (!base || !locationId || !envPath) { console.error('Usage: node step6-calendars-sms.mjs <api-base-url> <location-id> <.env path>'); process.exit(1); }
if (locationId !== DEV) { console.error('Refused: this script only runs on the Dev location.'); process.exit(1); }
const line = fs.readFileSync(envPath, 'utf8').split(/\r?\n/).find((l) => l.startsWith('SPRY_CRM_TOKEN='));
const token = (line || '').slice('SPRY_CRM_TOKEN='.length).trim().replace(/^["']|["']$/g, '');
if (!token) { console.error('Token not found in the file.'); process.exit(2); }
const headers = { Authorization: 'Bearer ' + token, Version: '2021-07-28', Accept: 'application/json', 'Content-Type': 'application/json' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const msg = (b) => (Array.isArray(b.message) ? b.message.join('; ') : b.message || JSON.stringify(b).slice(0, 200));
const call = async (method, path, body) => {
  const r = await fetch(base + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const b = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, b };
};

console.log('== Calendars');
const cl = await call('GET', '/calendars/?locationId=' + locationId);
const have = new Set((cl.b.calendars || []).map((c) => c.name));
const wanted = [
  ['Site inspection', 'Site visit after a quote is accepted', 60],
  ['Install: InjectaCore rig', 'Install booking for the InjectaCore rig', 60],
  ['Install: Van', 'Install booking for the van', 60],
  ['Install: Fuso truck', 'Install booking for the Fuso truck', 60],
  ['Install: Mercedes rig', 'Install booking for the Mercedes rig', 60],
];
for (const [name, description, mins] of wanted) {
  if (have.has(name)) { console.log(name + ': already exists'); continue; }
  const r = await call('POST', '/calendars/', { locationId, name, description, slotDuration: mins, slotDurationUnit: 'mins', slotInterval: mins, slotIntervalUnit: 'mins', calendarType: 'event' });
  console.log('Create ' + name + ': HTTP ' + r.status + (r.ok ? '' : ' ' + msg(r.b)));
  await sleep(200);
}
const cl2 = await call('GET', '/calendars/?locationId=' + locationId);
console.log('Calendars in Dev: ' + (cl2.b.calendars || []).map((c) => c.name).join(' | '));

console.log('\n== SMS templates (probe)');
const sl = await call('GET', '/locations/' + locationId + '/templates?type=sms&originId=' + locationId + '&limit=10&deleted=false');
console.log('Read SMS templates: HTTP ' + sl.status + (sl.ok ? ', keys: ' + Object.keys(sl.b).join(', ') : ' ' + msg(sl.b)));
const probe = 'ZZ-PROBE · delete me';
const tries = [
  ['POST', '/locations/' + locationId + '/templates', { type: 'sms', name: probe, body: 'probe {{contact.first_name}}', template: { body: 'probe' } }],
  ['POST', '/locations/' + locationId + '/templates', { type: 'sms', title: probe, body: 'probe' }],
  ['POST', '/conversations/templates', { locationId, type: 'sms', name: probe, body: 'probe' }],
];
let made = false;
for (const [m, p, b] of tries) {
  const r = await call(m, p, b);
  console.log(m + ' ' + p.replace(locationId, '<loc>') + ': HTTP ' + r.status + (r.ok ? ' OK' : ' ' + msg(r.b)));
  if (r.ok) { made = true; console.log('Created probe: ' + JSON.stringify(r.b).slice(0, 200)); break; }
}
if (!made) console.log('No SMS template create route found among the tries.');

console.log('\n== Workflows (read only)');
const wl = await call('GET', '/workflows/?locationId=' + locationId);
console.log('Read workflows: HTTP ' + wl.status + (wl.ok ? ', count ' + (wl.b.workflows?.length ?? '?') : ' ' + msg(wl.b)));
const wc = await call('POST', '/workflows/', { locationId, name: 'ZZ-PROBE' });
console.log('Create workflow (expected to fail): HTTP ' + wc.status + ' ' + (wc.ok ? 'CREATED' : msg(wc.b)));
