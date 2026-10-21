// Read-only token check. Prints the HTTP status for each endpoint, never the token.
// Usage: node token-check.mjs <path to .env> <locationId>
import fs from 'node:fs';

const [, , envPath, locationId] = process.argv;
if (!envPath || !locationId) {
  console.error('Usage: node token-check.mjs <.env path> <locationId>');
  process.exit(1);
}
const line = fs.readFileSync(envPath, 'utf8').split(/\r?\n/).find((l) => l.startsWith('SPRY_CRM_TOKEN='));
if (!line || line.length <= 'SPRY_CRM_TOKEN='.length) {
  console.log('SPRY_CRM_TOKEN: not found or empty in the file');
  process.exit(2);
}
const token = line.slice('SPRY_CRM_TOKEN='.length).trim().replace(/^["']|["']$/g, '');
console.log('Token present, length ' + token.length + ' characters');
console.log('Location: ' + locationId);
console.log('');

const base = 'https://services.leadconnectorhq.com';
// Every call here is a GET, so nothing is created, changed or sent.
const checks = [
  ['Location details', '/locations/' + locationId],
  ['Custom fields', '/locations/' + locationId + '/customFields'],
  ['Custom values', '/locations/' + locationId + '/customValues'],
  ['Tags', '/locations/' + locationId + '/tags'],
  ['Pipelines', '/opportunities/pipelines?locationId=' + locationId],
  ['Calendars', '/calendars/?locationId=' + locationId],
  ['Contacts (1)', '/contacts/?locationId=' + locationId + '&limit=1'],
  ['Email templates', '/emails/builder?locationId=' + locationId + '&limit=1&offset=0'],
  ['Users', '/users/?locationId=' + locationId],
  ['Workflows', '/workflows/?locationId=' + locationId],
];

for (const [label, path] of checks) {
  try {
    const res = await fetch(base + path, {
      headers: { Authorization: 'Bearer ' + token, Version: '2021-07-28', Accept: 'application/json' },
    });
    const body = await res.json().catch(() => ({}));
    let note = '';
    if (res.ok) {
      if (label === 'Location details') note = ' name: ' + body.location?.name;
      else if (label === 'Custom fields') note = ' count: ' + (body.customFields?.length ?? '?');
      else if (label === 'Custom values') note = ' count: ' + (body.customValues?.length ?? '?');
      else if (label === 'Tags') note = ' count: ' + (body.tags?.length ?? '?');
      else if (label === 'Pipelines') note = ' count: ' + (body.pipelines?.length ?? '?');
      else if (label === 'Calendars') note = ' count: ' + (body.calendars?.length ?? '?');
      else if (label === 'Users') note = ' count: ' + (body.users?.length ?? '?');
      else if (label === 'Workflows') note = ' count: ' + (body.workflows?.length ?? '?');
    } else {
      note = ' ' + (Array.isArray(body.message) ? body.message.join('; ') : body.message || '');
    }
    console.log(label.padEnd(18) + 'HTTP ' + res.status + note);
  } catch (e) {
    console.log(label.padEnd(18) + 'request failed: ' + e.message);
  }
}
