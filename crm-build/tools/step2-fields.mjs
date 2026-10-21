// Step 2: create all contact and opportunity custom fields in Dev, then read back and compare.
// Usage: node step2-fields.mjs <api-base-url> <location-id> <.env path>
// Safe to rerun: fields that already exist (by key) are skipped. Never prints the token.
import fs from 'node:fs';

const DEV = '5M1zrDbimF17cM16mtmR';
const [, , base, locationId, envPath] = process.argv;
if (!base || !locationId || !envPath) {
  console.error('Usage: node step2-fields.mjs <api-base-url> <location-id> <.env path>');
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
const url = base + '/locations/' + locationId + '/customFields';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const T = 'TEXT', LT = 'LARGE_TEXT', N = 'NUMERICAL', D = 'DATE', M = 'MONETORY', CB = 'CHECKBOX', S = 'SINGLE_OPTIONS', MS = 'MULTIPLE_OPTIONS';
const title = (k) => k.split('_').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');

// [key, label, type, options]
const contact = [
  ['property_type', 'Property type', S, ['Home', 'New build', 'Shed or garage', 'Factory or warehouse', 'Farm or agricultural', 'Something else']],
  ['building_stage', 'Building stage', S, ['Existing building (retrofit)', 'Under construction', 'Still planning']],
  ['areas', 'Areas', T],
  ['timeframe', 'Timeframe', S, ['As soon as possible', 'Next 1 to 3 months', '3 months or more', 'Just researching']],
  ['heard_from', 'Heard from', S, ['Google search', 'Google ad', 'Referral from a friend, builder or tradie', 'Facebook, Instagram or LinkedIn', 'Somewhere else']],
  ['postcode', 'Postcode', T], ['street', 'Street', T], ['suburb', 'Suburb', T],
  ['enquiry_message', 'Enquiry message', LT], ['phone_raw', 'Phone raw', T], ['company', 'Company', T],
  ['consent_marketing', 'Consent marketing', S, ['yes', 'no']],
  ['consent_text', 'Consent text', LT], ['consent_at', 'Consent at', D], ['consent_page', 'Consent page', T],
  ...['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id', 'gclid', 'gbraid', 'wbraid', 'fbclid', 'msclkid', 'ttclid'].map((k) => [k, null, T]),
  ['first_touch_at', 'First touch at', D],
  ...['first_touch_referrer', 'first_touch_landing', 'last_touch_referrer', 'last_touch_landing', 'source', 'form_name', 'submitted_at', 'page_title'].map((k) => [k, null, T]),
  ['contact_attempts', 'Contact attempts', N], ['last_attempt_at', 'Last attempt at', D],
  ['preferred_contact', 'Preferred contact', S, ['call', 'sms', 'email']],
  ['do_not_sms', 'Do not sms', CB, ['Yes']],
  ['ask_for_google_review', 'Ask for google review', S, ['Yes', 'No']],
];
const opportunity = [
  ['site_address', 'Site address', T], ['access_notes', 'Access notes', LT], ['sqm_estimate', 'Sqm estimate', N],
  ['product_type', 'Product type', S, ['Open cell', 'Closed cell', 'Both']],
  ['callback_at', 'Callback at', D], ['quote_number', 'Quote number', T], ['quote_link', 'Quote link', T],
  ['quote_sent_at', 'Quote sent at', D], ['accepted_quote_option', 'Accepted quote option', T], ['po_number', 'Po number', T],
  ['foam_order_type', 'Foam order type', S, ['Stock open cell', 'Special order']],
  ['deposit_amount', 'Deposit amount', M], ['inspection_date', 'Inspection date', D], ['job_date', 'Job date', D],
  ['job_end_date', 'Job end date', D],
  ['vehicles_booked', 'Vehicles booked', MS, ['InjectaCore rig', 'Van', 'Fuso truck', 'Mercedes rig']],
  ['job_booked_at', 'Job booked at', D], ['crew_assigned', 'Crew assigned', T],
  ['job_confirmed', 'Job confirmed', S, ['Yes', 'No']],
  ['deposit_due_date', 'Deposit due date', D], ['deposit_invoice_sent_at', 'Deposit invoice sent at', D],
  ['deposit_received_at', 'Deposit received at', D], ['variation_amount', 'Variation amount', M],
  ['photos_captured', 'Photos captured', CB, ['Yes']],
  ['invoice_number', 'Invoice number', T], ['invoice_sent_at', 'Invoice sent at', D],
  ['final_invoice_paid_at', 'Final invoice paid at', D], ['job_report_sent_at', 'Job report sent at', D],
  ['retention_amount', 'Retention amount', M], ['retention_release_date', 'Retention release date', D],
  ['lost_reason', 'Lost reason', S, ['Price', 'Went with another contractor', 'Chose batts or another product', 'Timing, project deferred', 'Outside service area', 'Not suitable for spray foam', 'Unreachable', 'Not the decision maker', 'Budget withdrawn', 'Cancelled after acceptance', 'Duplicate', 'Spam']],
];

const read = async () => {
  const r = await fetch(url + '?model=all', { headers });
  const b = await r.json().catch(() => ({}));
  return { status: r.status, fields: b.customFields || [] };
};

let existing = await read();
console.log('Start: HTTP ' + existing.status + ', fields in Dev: ' + existing.fields.length);

// Clean up: an earlier run sent its own keys and the platform garbled them (for example
// contact.contactareas). Delete only those, never anything else.
const garbled = existing.fields.filter((f) => /^(contact\.contact|opportunity\.opportunity)/.test(f.fieldKey));
let deleted = 0;
for (const f of garbled) {
  const r = await fetch(url + '/' + f.id, { method: 'DELETE', headers });
  if (r.ok) deleted++;
  else console.log('Could not delete ' + f.fieldKey + ' HTTP ' + r.status);
  await sleep(120);
}
console.log('Deleted ' + deleted + ' garbled fields (of ' + garbled.length + ')');
existing = await read();
const have = new Set(existing.fields.map((f) => f.fieldKey));
let created = 0, skipped = 0, failed = 0;

for (const [model, list] of [['contact', contact], ['opportunity', opportunity]]) {
  for (const [key, label, type, options] of list) {
    const fieldKey = model + '.' + key;
    if (have.has(fieldKey)) { skipped++; continue; }
    // No fieldKey sent: the platform builds the key from the name, and every name here maps to its key.
    const payload = { name: label || title(key), dataType: type, model };
    if (options) payload.options = options;
    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
    if (res.ok) { created++; }
    else {
      failed++;
      const b = await res.json().catch(() => ({}));
      console.log('FAILED ' + fieldKey + ' HTTP ' + res.status + ' ' + (Array.isArray(b.message) ? b.message.join('; ') : b.message));
    }
    await sleep(150);
  }
}
console.log('Created ' + created + ', already there ' + skipped + ', failed ' + failed);

existing = await read();
const byKey = new Map(existing.fields.map((f) => [f.fieldKey, f]));
let ok = 0;
const problems = [];
for (const [model, list] of [['contact', contact], ['opportunity', opportunity]]) {
  for (const [key, , type, options] of list) {
    const f = byKey.get(model + '.' + key);
    if (!f) { problems.push('MISSING ' + model + '.' + key); continue; }
    if (f.dataType !== type) { problems.push('TYPE ' + model + '.' + key + ' is ' + f.dataType + ', wanted ' + type); continue; }
    if (options && JSON.stringify(f.picklistOptions || []) !== JSON.stringify(options)) { problems.push('OPTIONS differ ' + model + '.' + key); continue; }
    ok++;
  }
}
console.log('Read back: ' + existing.fields.length + ' fields in Dev. Checked OK: ' + ok + ' of ' + (contact.length + opportunity.length));
const extra = existing.fields.map((f) => f.fieldKey).filter((k) => ![...contact.map((c) => 'contact.' + c[0]), ...opportunity.map((o) => 'opportunity.' + o[0])].includes(k));
if (extra.length) console.log('Extra keys not in the plan: ' + extra.join(', '));
console.log(problems.length ? 'Problems:\n' + problems.join('\n') : 'No problems.');
