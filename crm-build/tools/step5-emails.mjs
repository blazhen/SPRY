// Step 5: build the six email folders and all 39 emails in Dev, with bodies, then read back.
// Usage: node step5-emails.mjs <api-base-url> <location-id> <.env path> [reset]
// "reset" first deletes every email template and folder in Dev (Dev only, all made by these scripts).
// Never prints the token.
import fs from 'node:fs';

const DEV = '5M1zrDbimF17cM16mtmR';
const [, , base, locationId, envPath, mode] = process.argv;
if (!base || !locationId || !envPath) { console.error('Usage: node step5-emails.mjs <api-base-url> <location-id> <.env path> [reset]'); process.exit(1); }
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
const here = (p) => new URL(p, import.meta.url);

const FOLDERS = {
  '01. Enquiry & Chase': ['X-ACK-02', 'DIAL-02', 'DIAL-03', 'DIAL-04'],
  '02. Appointments': ['X-APPT-01', 'X-APPT-06'],
  '03. Quote & Follow-up': ['R-QUOTE-01', 'R-FU-02', 'R-FU-04', 'LOST-01'],
  '04. Won & Delivery': ['X-ACC-01', 'JOB-02', 'JOB-05', 'REM-01', 'REM-03', 'REM-06', 'DEP-02'],
  '05. After Job & Nurture': ['NUR-01', 'NUR-02', 'NUR-03', 'NUR-04', 'REV-02', 'REV-03', 'PAY-01', 'PAY-03', 'RPT-01', 'RET-01'],
  '06. Commercial': ['C-ACK-01', 'C-INSP-01', 'C-PROP-01', 'C-PROP-02', 'C-PROP-03', 'C-FUT-01', 'C-PO-01', 'C-MOB-01', 'C-PROG-01', 'C-PAY-01', 'C-DONE-01', 'C-CLOSE-01'],
};

// Names and preheaders come from the generated index.
const index = {};
for (const l of fs.readFileSync(here('../messages/message-index.md'), 'utf8').split(/\r?\n/)) {
  const c = l.split(' | ').map((s) => s.replace(/^\| /, '').replace(/ \|$/, ''));
  if (c.length >= 6 && c[1] === 'email') index[c[0]] = { name: c[2], pre: c[5] };
}
const wanted = Object.values(FOLDERS).flat();
const noIndex = wanted.filter((id) => !index[id]);
if (noIndex.length) { console.error('Not in the index: ' + noIndex.join(', ')); process.exit(3); }

const list = async (parentId) => {
  const r = await call('GET', '/emails/builder?locationId=' + locationId + '&limit=100&offset=0' + (parentId ? '&parentId=' + parentId : ''));
  return r.b.builders || [];
};

if (mode === 'reset') {
  const rootItems = await list();
  let d = 0, bad = 0;
  for (const f of rootItems) {
    for (const k of f.templateType === 'folder' ? await list(f.id) : []) {
      const r = await call('DELETE', '/emails/builder/' + locationId + '/' + k.id);
      r.ok ? d++ : (bad++, console.log('Could not delete a template HTTP ' + r.status + ' ' + msg(r.b)));
      await sleep(150);
    }
    const r = await call('DELETE', '/emails/builder/' + locationId + '/' + f.id);
    r.ok ? d++ : (bad++, console.log('Could not delete an item HTTP ' + r.status + ' ' + msg(r.b)));
    await sleep(150);
  }
  console.log('Reset: deleted ' + d + ', could not delete ' + bad);
}

// folders
let root = await list();
const folderId = {};
for (const f of root.filter((x) => x.templateType === 'folder')) if (f.name) folderId[f.name] = f.id;
for (const name of Object.keys(FOLDERS)) {
  if (folderId[name]) continue;
  const r = await call('POST', '/emails/builder', { locationId, type: 'folder', title: name, name });
  if (r.ok) folderId[name] = r.b.id || r.b.templateId || r.b.data?.id;
  else console.log('FAILED folder ' + name + ' HTTP ' + r.status + ' ' + msg(r.b));
  await sleep(200);
}
root = await list();
console.log('Folders now: ' + root.filter((x) => x.templateType === 'folder').map((x) => x.name || '(no name)').join(' | '));

// emails
let created = 0, skipped = 0, failed = 0, bodyFailed = 0;
for (const [folder, ids] of Object.entries(FOLDERS)) {
  const pid = folderId[folder];
  if (!pid) { console.log('Skipping folder ' + folder + ': no id'); continue; }
  const have = new Set((await list(pid)).map((x) => x.name));
  for (const id of ids) {
    const { name, pre } = index[id];
    if (have.has(name)) { skipped++; continue; }
    const c = await call('POST', '/emails/builder', { locationId, type: 'html', title: name, name, parentId: pid });
    const tid = c.b.id || c.b.templateId || c.b.data?.id;
    if (!c.ok || !tid) { failed++; console.log('FAILED ' + id + ' shell HTTP ' + c.status + ' ' + msg(c.b)); continue; }
    const html = fs.readFileSync(here('../messages/emails/' + id + '.html'), 'utf8');
    const u = await call('POST', '/emails/builder/data', { locationId, templateId: tid, updatedBy: 'api', html, editorType: 'html', previewText: pre, isPlainText: false });
    if (u.ok) created++;
    else { bodyFailed++; console.log('FAILED ' + id + ' body HTTP ' + u.status + ' ' + msg(u.b)); }
    await sleep(250);
  }
}
console.log('Emails: created ' + created + ', already there ' + skipped + ', shell failed ' + failed + ', body failed ' + bodyFailed);

// read back
let total = 0;
const problems = [];
for (const [folder, ids] of Object.entries(FOLDERS)) {
  const pid = folderId[folder];
  const kids = pid ? await list(pid) : [];
  const names = kids.map((x) => x.name);
  const want = ids.map((i) => index[i].name);
  const missing = want.filter((n) => !names.includes(n));
  const extra = names.filter((n) => !want.includes(n));
  total += kids.length;
  console.log(folder + ': ' + kids.length + ' of ' + ids.length + (missing.length ? ' MISSING ' + missing.join('; ') : '') + (extra.length ? ' EXTRA ' + extra.join('; ') : ''));
  if (missing.length || extra.length) problems.push(folder);
}
console.log('Total emails in folders: ' + total + ' of ' + wanted.length + (problems.length ? '. Problems in: ' + problems.join(', ') : '. No problems.'));
// spot check one body
const k1 = folderId['04. Won & Delivery'] ? await list(folderId['04. Won & Delivery']) : [];
const one = k1.find((x) => x.name && x.name.startsWith('REM-01'));
if (one?.previewUrl) {
  const t = await (await fetch(one.previewUrl)).text();
  console.log('Spot check ' + one.name + ': ' + t.length + ' characters, has confirm link tag: ' + t.includes('trigger_link'));
}
