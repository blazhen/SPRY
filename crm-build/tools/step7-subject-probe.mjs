// Probe: can an email template's subject and preview text be set and read back? Dev only.
// Usage: node step7-subject-probe.mjs <api-base-url> <location-id> <.env path>
import fs from 'node:fs';

const DEV = '5M1zrDbimF17cM16mtmR';
const [, , base, locationId, envPath] = process.argv;
if (!base || !locationId || !envPath) { console.error('Usage: node step7-subject-probe.mjs <api-base-url> <location-id> <.env path>'); process.exit(1); }
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

const root = await list();
const folder = root.find((f) => f.name === '01. Enquiry & Chase');
const kids = await list(folder.id);
const t = kids.find((k) => k.name.startsWith('X-ACK-02'));
console.log('Template found: ' + t.name);
console.log('Keys the list returns for a template: ' + Object.keys(t).join(', '));

const html = fs.readFileSync(new URL('../messages/emails/X-ACK-02.html', import.meta.url), 'utf8');
const subject = 'We have your enquiry, {{contact.first_name}}';
const pre = 'We will ring you to talk it through, then send a written quote. Here is what you told us.';
const u = await call('POST', '/emails/builder/data', { locationId, templateId: t.id, updatedBy: 'api', html, editorType: 'html', subject, previewText: pre, isPlainText: false });
console.log('Update with subject + previewText: HTTP ' + u.status + ' ' + JSON.stringify(u.b).slice(0, 300));

// Try the other places a subject could be set
for (const [m, p, b] of [
  ['PUT', '/emails/builder/' + t.id, { locationId, subject, previewText: pre }],
  ['PATCH', '/emails/builder/' + t.id, { locationId, subject, previewText: pre }],
]) {
  const r = await call(m, p, b);
  console.log(m + ' /emails/builder/<id>: HTTP ' + r.status + ' ' + JSON.stringify(r.b).slice(0, 200));
}
const after = (await list(folder.id)).find((k) => k.name.startsWith('X-ACK-02'));
console.log('List keys after: ' + Object.keys(after).join(', '));
if (after.subject !== undefined) console.log('Subject now reads back as: ' + after.subject);
if (after.previewText !== undefined) console.log('Preview text now reads back as: ' + after.previewText);
const page = await (await fetch(after.previewUrl)).text();
console.log('Preview page contains the preheader text: ' + page.includes('We will ring you to talk it through'));
