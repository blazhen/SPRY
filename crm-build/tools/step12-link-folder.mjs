// Step 12: create the "Calendar Links" custom value folder in Dev and move the six calendar link values into it.
// Usage: node step12-link-folder.mjs <api-base-url> <location-id> <.env path>
// Dev only, safe to rerun. Never prints the token.
import fs from 'node:fs';

const DEV = '5M1zrDbimF17cM16mtmR';
const [, , base, locationId, envPath] = process.argv;
if (!base || !locationId || !envPath) { console.error('Usage: node step12-link-folder.mjs <api-base-url> <location-id> <.env path>'); process.exit(1); }
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
const readAll = async () => (await call('GET', cvPath)).b.customValues || [];

let all = await readAll();
let folder = all.find((v) => v.documentType === 'folder' && v.name === 'Calendar Links');
if (!folder) {
  const r = await call('POST', cvPath, { name: 'Calendar Links', documentType: 'folder' });
  console.log('Create folder: HTTP ' + r.status + (r.ok ? '' : ' ' + msg(r.b)));
  folder = r.b.customValue;
  // The list does not show folders, so if one already exists its id is passed as the 4th argument.
  if (!folder && process.argv[5]) folder = { id: process.argv[5] };
}
if (!folder) { console.error('No folder id. Pass the existing folder id as the 4th argument.'); process.exit(4); }
console.log('Folder id present: ' + Boolean(folder?.id));

all = await readAll();
const links = all.filter((v) => v.documentType !== 'folder' && v.name.startsWith('Calendar Link '));
for (const v of links) {
  if (v.parentId === folder.id) continue;
  let r = await call('PUT', cvPath + '/' + v.id, { name: v.name, value: v.value, parentId: folder.id });
  console.log('Move ' + v.name + ' (PUT with parentId): HTTP ' + r.status + (r.ok ? '' : ' ' + msg(r.b)));
}
all = await readAll();
let inside = all.filter((v) => v.name.startsWith('Calendar Link ') && v.documentType !== 'folder' && v.parentId === folder.id);
console.log('Values inside the folder after PUT: ' + inside.length + ' of ' + links.length);

if (inside.length < links.length) {
  // Fallback: delete each loose value and create it again inside the folder.
  for (const v of all.filter((x) => x.name.startsWith('Calendar Link ') && x.documentType !== 'folder' && x.parentId !== folder.id)) {
    const d = await call('DELETE', cvPath + '/' + v.id);
    const c = await call('POST', cvPath, { name: v.name, value: v.value, parentId: folder.id });
    console.log('Recreate ' + v.name + ' inside the folder: delete HTTP ' + d.status + ', create HTTP ' + c.status + (c.ok ? '' : ' ' + msg(c.b)));
  }
  all = await readAll();
  inside = all.filter((v) => v.name.startsWith('Calendar Link ') && v.documentType !== 'folder' && v.parentId === folder.id);
  console.log('Values inside the folder after recreate: ' + inside.length);
}
for (const v of inside) console.log('- ' + v.fieldKey + ' = ' + v.value);
const stray = all.filter((v) => v.name.startsWith('Calendar Link ') && v.documentType !== 'folder' && v.parentId !== folder.id);
console.log(stray.length ? 'Still outside the folder: ' + stray.map((v) => v.name).join(', ') : 'All six are inside the folder.');
console.log('Custom values in Dev now: ' + all.filter((v) => v.documentType !== 'folder').length + ', folders: ' + all.filter((v) => v.documentType === 'folder').length);
