// Step 3: create the 24 custom values and the tags in Dev, then read back and compare.
// Usage: node step3-values-tags.mjs <api-base-url> <location-id> <.env path>
// Safe to rerun: items that already exist are skipped. Never prints the token.
import fs from 'node:fs';

const DEV = '5M1zrDbimF17cM16mtmR';
const [, , base, locationId, envPath] = process.argv;
if (!base || !locationId || !envPath) {
  console.error('Usage: node step3-values-tags.mjs <api-base-url> <location-id> <.env path>');
  process.exit(1);
}
if (locationId !== DEV) {
  console.error('Refused: this script only runs on the Dev location.');
  process.exit(1);
}
const line = fs.readFileSync(envPath, 'utf8').split(/\r?\n/).find((l) => l.startsWith('SPRY_CRM_TOKEN='));
const token = (line || '').slice('SPRY_CRM_TOKEN='.length).trim().replace(/^["']|["']$/g, '');
if (!token) { console.error('Token not found in the file.'); process.exit(2); }
const headers = { Authorization: 'Bearer ' + token, Version: '2021-07-28', Accept: 'application/json', 'Content-Type': 'application/json' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const msg = (b) => (Array.isArray(b.message) ? b.message.join('; ') : b.message);

// Names are the keys written as words, so the platform derives the same key from each name.
const values = [
  ['Business Name', 'SprayIT Solutions'],
  ['Business Short Name', 'SprayIT'],
  ['Business Phone', '1300 177 729'],
  ['Business Phone E164', '+611300177729'],
  ['Contact Name', 'Rachael Angus'],
  ['Contact First Name', 'Rachael'],
  ['Contact Mobile', '0428 26 36 26'],
  ['Contact Mobile E164', '+61428263626'],
  ['Business Email', 'info@sprayitsolutions.com.au'],
  ['From Name Contact', 'Rachael at SprayIT Solutions'],
  ['From Name Brand', 'SprayIT Solutions'],
  ['Website Url', 'sprayitsolutions.com.au'],
  ['Booking Url', 'sprayitsolutions.com.au/book/'],
  ['Quote Form Url', 'sprayitsolutions.com.au/contact-us/'],
  ['Privacy Url', 'sprayitsolutions.com.au/privacy-policy/'],
  ['Review Url', 'PLACEHOLDER: Google review link, to supply'],
  ['Service Area', 'Australia-wide'],
  ['Trade Noun', 'spray foam insulation'],
  ['Trade Verb', 'insulation'],
  ['Inspection Noun', 'site inspection'],
  ['Consult Length', '15 minute'],
  ['Office Hours', 'Mon to Fri, 7am to 5pm'],
  ['Quote Turnaround', '2 business days'],
  ['Sms Signoff', 'Rachael, SprayIT Solutions'],
];
const snake = (s) => s.toLowerCase().replace(/\s+/g, '_');

const stageKeys = ['new-lead', 'dial-1', 'dial-2', 'quoting', 'quote-sent', 'follow-up', 'nurture', 'quote-accepted', 'inspection-required', 'booking-required', 'job-booked', 'deposit-requested', 'job-completed', 'retention-claim'];
const tags = [
  'from-website', 'from-phone', 'from-chat',
  ...stageKeys.map((k) => 'stage-res-' + k), ...stageKeys.map((k) => 'stage-com-' + k),
  'been-enquired', 'been-contacted', 'been-quoted', 'been-accepted', 'been-inspected', 'been-booked', 'been-lost', 'been-customer', 'been-review-asked', 'been-reviewed',
  'is-active-job', 'is-deposit-owing', 'is-retention-held', 'is-stalled', 'is-unresponsive', 'is-nurturing', 'is-no-marketing', 'is-complaint',
  'do-not-sms', 'do-not-email', 'do-not-market',
];

// ---- custom values
const vUrl = base + '/locations/' + locationId + '/customValues';
const readValues = async () => {
  const r = await fetch(vUrl, { headers });
  const b = await r.json().catch(() => ({}));
  return { status: r.status, items: b.customValues || [] };
};
let v = await readValues();
console.log('Custom values at start: HTTP ' + v.status + ', count ' + v.items.length);
const haveV = new Set(v.items.map((x) => x.fieldKey));
let vc = 0, vf = 0;
for (const [name, value] of values) {
  if (haveV.has('{{ custom_values.' + snake(name) + ' }}')) continue;
  const r = await fetch(vUrl, { method: 'POST', headers, body: JSON.stringify({ name, value }) });
  if (r.ok) vc++;
  else { vf++; const b = await r.json().catch(() => ({})); console.log('FAILED value ' + name + ' HTTP ' + r.status + ' ' + msg(b)); }
  await sleep(150);
}
v = await readValues();
const gotV = new Set(v.items.map((x) => x.fieldKey));
const missV = values.filter(([n]) => !gotV.has('{{ custom_values.' + snake(n) + ' }}')).map(([n]) => n);
console.log('Custom values: created ' + vc + ', failed ' + vf + ', now in Dev ' + v.items.length + ' of ' + values.length);
if (v.items.length) console.log('Example key as the platform wrote it: ' + v.items[0].fieldKey);
if (missV.length) console.log('Values not found by expected key: ' + missV.join(', '));

// ---- tags
const tUrl = base + '/locations/' + locationId + '/tags';
const readTags = async () => {
  const r = await fetch(tUrl, { headers });
  const b = await r.json().catch(() => ({}));
  return { status: r.status, items: b.tags || [] };
};
let t = await readTags();
console.log('Tags at start: HTTP ' + t.status + ', count ' + t.items.length);
const haveT = new Set(t.items.map((x) => x.name));
let tc = 0, tf = 0;
for (const name of tags) {
  if (haveT.has(name)) continue;
  const r = await fetch(tUrl, { method: 'POST', headers, body: JSON.stringify({ name }) });
  if (r.ok) tc++;
  else { tf++; const b = await r.json().catch(() => ({})); console.log('FAILED tag ' + name + ' HTTP ' + r.status + ' ' + msg(b)); }
  await sleep(120);
}
t = await readTags();
const gotT = new Set(t.items.map((x) => x.name));
const missT = tags.filter((n) => !gotT.has(n));
console.log('Tags: created ' + tc + ', failed ' + tf + ', now in Dev ' + t.items.length + ', expected ' + tags.length);
console.log(missT.length ? 'Tags missing: ' + missT.join(', ') : 'All tags present.');
