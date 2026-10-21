// Test: can the From email on a template be set? One Dev template only. Nothing is sent.
// Usage: node step9-fromemail-test.mjs <api-base-url> <location-id> <.env path> <from-email>
import fs from 'node:fs';

const DEV = '5M1zrDbimF17cM16mtmR';
const [, , base, locationId, envPath, fromEmail] = process.argv;
if (!base || !locationId || !envPath || !fromEmail) { console.error('Usage: node step9-fromemail-test.mjs <api-base-url> <location-id> <.env path> <from-email>'); process.exit(1); }
if (locationId !== DEV) { console.error('Refused: Dev only.'); process.exit(1); }
const line = fs.readFileSync(envPath, 'utf8').split(/\r?\n/).find((l) => l.startsWith('SPRY_CRM_TOKEN='));
const token = (line || '').slice('SPRY_CRM_TOKEN='.length).trim().replace(/^["']|["']$/g, '');
const headers = { Authorization: 'Bearer ' + token, Version: '2021-07-28', Accept: 'application/json', 'Content-Type': 'application/json' };
const call = async (method, path, body) => {
  const r = await fetch(base + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const b = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, b };
};
const list = async (pid) => (await call('GET', '/emails/builder?locationId=' + locationId + '&limit=100&offset=0' + (pid ? '&parentId=' + pid : ''))).b.builders || [];
const folder = (await list()).find((f) => f.name === '01. Enquiry & Chase');
const t = (await list(folder.id)).find((k) => k.name.startsWith('X-ACK-02'));
const r = await call('PATCH', '/emails/builder/' + t.id, { locationId, fromEmail });
console.log('PATCH fromEmail: HTTP ' + r.status);
console.log('Reply: fromEmail=' + JSON.stringify(r.b.fromEmail) + ' fromName=' + JSON.stringify(r.b.fromName) + (r.ok ? '' : ' message=' + JSON.stringify(r.b.message)));
