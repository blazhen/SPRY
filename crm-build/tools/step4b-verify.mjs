// Read-only check of Dev email templates: names, types, folder contents.
// Usage: node step4b-verify.mjs <api-base-url> <location-id> <.env path>
import fs from 'node:fs';

const DEV = '5M1zrDbimF17cM16mtmR';
const [, , base, locationId, envPath] = process.argv;
if (!base || !locationId || !envPath) { console.error('Usage: node step4b-verify.mjs <api-base-url> <location-id> <.env path>'); process.exit(1); }
if (locationId !== DEV) { console.error('Refused: Dev only.'); process.exit(1); }
const line = fs.readFileSync(envPath, 'utf8').split(/\r?\n/).find((l) => l.startsWith('SPRY_CRM_TOKEN='));
const token = (line || '').slice('SPRY_CRM_TOKEN='.length).trim().replace(/^["']|["']$/g, '');
const headers = { Authorization: 'Bearer ' + token, Version: '2021-07-28', Accept: 'application/json' };
const get = async (p) => { const r = await fetch(base + p, { headers }); return { status: r.status, b: await r.json().catch(() => ({})) }; };

const root = await get('/emails/builder?locationId=' + locationId + '&limit=100&offset=0');
console.log('Root: HTTP ' + root.status + ', top-level keys: ' + Object.keys(root.b).join(', '));
const items = root.b.builders || [];
console.log('Items: ' + items.length);
for (const it of items) {
  console.log('- ' + JSON.stringify({ name: it.name, type: it.templateType, id: it.id, childCount: it.childCount, keys: Object.keys(it).join('/') }));
}
for (const it of items.filter((x) => x.templateType === 'folder')) {
  const k = await get('/emails/builder?locationId=' + locationId + '&limit=100&offset=0&parentId=' + it.id);
  console.log('Folder ' + (it.name || it.id) + ': ' + (k.b.builders || []).map((x) => x.name + ' (' + x.templateType + ')').join(', '));
}
// The first email's saved body, via its preview link
const email = items.find((x) => x.templateType !== 'folder') || (await (async () => {
  for (const f of items) {
    const k = await get('/emails/builder?locationId=' + locationId + '&limit=100&offset=0&parentId=' + f.id);
    const e = (k.b.builders || []).find((x) => x.templateType !== 'folder');
    if (e) return e;
  }
})());
if (email?.previewUrl) {
  const r = await fetch(email.previewUrl);
  const t = await r.text();
  console.log('Email "' + email.name + '" preview HTTP ' + r.status + ', ' + t.length + ' characters, has greeting tag: ' + t.includes('{{contact.first_name}}') + ', has business name tag: ' + t.includes('{{custom_values.business_name}}'));
} else {
  console.log('No email with a preview link found yet.');
}
