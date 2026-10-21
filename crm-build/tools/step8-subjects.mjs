// Step 8: set subject line, preview text and from name on the emails in Dev, and verify from the reply.
// Usage: node step8-subjects.mjs <api-base-url> <location-id> <.env path> [one]
// "one" tests X-ACK-02 only. Dev only, safe to rerun. Never prints the token.
import fs from 'node:fs';

const DEV = '5M1zrDbimF17cM16mtmR';
const [, , base, locationId, envPath, mode] = process.argv;
if (!base || !locationId || !envPath) { console.error('Usage: node step8-subjects.mjs <api-base-url> <location-id> <.env path> [one]'); process.exit(1); }
if (locationId !== DEV) { console.error('Refused: this script only runs on the Dev location.'); process.exit(1); }
const line = fs.readFileSync(envPath, 'utf8').split(/\r?\n/).find((l) => l.startsWith('SPRY_CRM_TOKEN='));
const token = (line || '').slice('SPRY_CRM_TOKEN='.length).trim().replace(/^["']|["']$/g, '');
if (!token) { console.error('Token not found in the file.'); process.exit(2); }
const headers = { Authorization: 'Bearer ' + token, Version: '2021-07-28', Accept: 'application/json', 'Content-Type': 'application/json' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const call = async (method, path, body) => {
  const r = await fetch(base + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const b = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, b };
};
const list = async (pid) => (await call('GET', '/emails/builder?locationId=' + locationId + '&limit=100&offset=0' + (pid ? '&parentId=' + pid : ''))).b.builders || [];

// ID -> subject, preheader, from kind, taken from the generated index
const index = {};
for (const l of fs.readFileSync(new URL('../messages/message-index.md', import.meta.url), 'utf8').split(/\r?\n/)) {
  const c = l.split(' | ').map((s) => s.replace(/^\| /, '').replace(/ \|$/, ''));
  if (c.length >= 6 && c[1] === 'email') index[c[0]] = { from: c[3], subject: c[4], pre: c[5] };
}
const FROM = { contact: 'Rachael at SprayIT Solutions', brand: 'SprayIT Solutions' };

const templates = [];
for (const f of (await list()).filter((x) => x.templateType === 'folder')) {
  for (const k of await list(f.id)) templates.push(k);
}
console.log('Templates found in Dev: ' + templates.length);

let ok = 0, bad = 0;
const problems = [];
for (const t of templates) {
  const id = t.name.split(' ')[0];
  const m = index[id];
  if (!m) { problems.push('No index entry for ' + t.name); continue; }
  if (mode === 'one' && id !== 'X-ACK-02') continue;
  const r = await call('PATCH', '/emails/builder/' + t.id, { locationId, subjectLine: m.subject, previewText: m.pre, fromName: FROM[m.from], fromEmail: 'info@sprayitsolutions.com.au' });
  const got = r.b || {};
  const good = r.ok && got.subjectLine === m.subject && got.previewText === m.pre && got.fromName === FROM[m.from] && got.fromEmail === 'info@sprayitsolutions.com.au';
  if (good) ok++;
  else { bad++; problems.push(id + ': HTTP ' + r.status + ' subject "' + got.subjectLine + '" preview "' + String(got.previewText).slice(0, 30) + '" from "' + got.fromName + '"'); }
  if (mode === 'one') console.log('Reply: subjectLine=' + JSON.stringify(got.subjectLine) + ' previewText=' + JSON.stringify(got.previewText) + ' fromName=' + JSON.stringify(got.fromName) + ' fromEmail=' + JSON.stringify(got.fromEmail));
  await sleep(250);
}
console.log('Updated and confirmed: ' + ok + ', not confirmed: ' + bad);
if (problems.length) console.log('Problems:\n' + problems.join('\n'));
