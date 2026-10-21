// Step 1: create ONE custom field in Dev, read it back, report. Untracked, temporary.
// Usage: node step1-test-field.mjs <api-base-url> <location-id> <.env path>
// Never prints the token. Refuses to run on any location except the Dev one.
import fs from 'node:fs';

const DEV = '5M1zrDbimF17cM16mtmR';
const [, , base, locationId, envPath] = process.argv;
if (!base || !locationId || !envPath) {
  console.error('Usage: node step1-test-field.mjs <api-base-url> <location-id> <.env path>');
  process.exit(1);
}
if (locationId !== DEV) {
  console.error('Refused: this script only runs on the Dev location.');
  process.exit(1);
}
const line = fs.readFileSync(envPath, 'utf8').split(/\r?\n/).find((l) => l.startsWith('SPRY_CRM_TOKEN='));
const token = (line || '').slice('SPRY_CRM_TOKEN='.length).trim().replace(/^["']|["']$/g, '');
if (!token) {
  console.error('Token not found in the file.');
  process.exit(2);
}
const headers = { Authorization: 'Bearer ' + token, Version: '2021-07-28', Accept: 'application/json', 'Content-Type': 'application/json' };
const url = base + '/locations/' + locationId + '/customFields';

const read = async () => {
  const r = await fetch(url, { headers });
  return { status: r.status, body: await r.json().catch(() => ({})) };
};

const before = await read();
console.log('Before: HTTP ' + before.status + ', custom fields: ' + (before.body.customFields?.length ?? '?'));
if ((before.body.customFields || []).some((f) => f.fieldKey === 'contact.property_type')) {
  console.log('The field already exists, not creating it again.');
} else {
  const payload = {
    name: 'Property type',
    dataType: 'SINGLE_OPTIONS',
    model: 'contact',
    options: ['Home', 'New build', 'Shed or garage', 'Factory or warehouse', 'Farm or agricultural', 'Something else'],
  };
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
  const body = await res.json().catch(() => ({}));
  console.log('Create: HTTP ' + res.status);
  if (!res.ok) {
    console.log('Message: ' + (Array.isArray(body.message) ? body.message.join('; ') : body.message));
    process.exit(3);
  }
}

const after = await read();
const f = (after.body.customFields || []).find((x) => x.fieldKey === 'contact.property_type');
console.log('After: HTTP ' + after.status + ', custom fields: ' + (after.body.customFields?.length ?? '?'));
if (f) {
  console.log('Name: ' + f.name);
  console.log('Key: ' + f.fieldKey);
  console.log('Model: ' + f.model);
  console.log('Type: ' + f.dataType);
  console.log('Options: ' + JSON.stringify(f.picklistOptions));
} else {
  console.log('Field not found on read-back.');
}
