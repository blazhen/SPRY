// Step 4 probe: try to build pipelines, one calendar, email folders and one email in Dev.
// Usage: node step4-probe.mjs <api-base-url> <location-id> <.env path>
// Dev only, safe to rerun (existing names are skipped). Never prints the token.
import fs from 'node:fs';

const DEV = '5M1zrDbimF17cM16mtmR';
const [, , base, locationId, envPath] = process.argv;
if (!base || !locationId || !envPath) { console.error('Usage: node step4-probe.mjs <api-base-url> <location-id> <.env path>'); process.exit(1); }
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

// ---- A. Pipelines
console.log('== A. Pipelines');
const stages = ['New Lead', 'Dial 1', 'Dial 2', 'Quoting', 'Quote Sent', 'Follow-Up', 'Nurture', 'Quote Accepted', 'Inspection Required', 'Booking Required', 'Job Booked', 'Deposit Requested', 'Job Completed', 'Retention Claim'];
const pl = await call('GET', '/opportunities/pipelines?locationId=' + locationId);
console.log('Read pipelines: HTTP ' + pl.status + ', count ' + (pl.b.pipelines?.length ?? '?'));
for (const name of ['Residential', 'Commercial & Industrial']) {
  if ((pl.b.pipelines || []).some((p) => p.name === name)) { console.log(name + ': already exists'); continue; }
  const r = await call('POST', '/opportunities/pipelines', {
    locationId, name, showInFunnel: true, showInPieChart: true,
    stages: stages.map((s, i) => ({ name: s, position: i, showInFunnel: true, showInPieChart: true })),
  });
  console.log('Create ' + name + ': HTTP ' + r.status + (r.ok ? '' : ' ' + msg(r.b)));
}
const pl2 = await call('GET', '/opportunities/pipelines?locationId=' + locationId);
for (const p of pl2.b.pipelines || []) {
  const names = (p.stages || []).sort((a, b) => a.position - b.position).map((s) => s.name);
  console.log('Read back ' + p.name + ': ' + names.length + ' stages, order ' + (JSON.stringify(names) === JSON.stringify(stages) ? 'matches' : 'DIFFERS: ' + names.join(' > ')));
}

// ---- B. Calendar
console.log('\n== B. Calendar');
const cl = await call('GET', '/calendars/?locationId=' + locationId);
console.log('Read calendars: HTTP ' + cl.status + ', count ' + (cl.b.calendars?.length ?? '?'));
if ((cl.b.calendars || []).some((c) => c.name === 'Phone call')) console.log('Phone call: already exists');
else {
  const r = await call('POST', '/calendars/', { locationId, name: 'Phone call', description: '15 minute call about the quote', slotDuration: 15, slotDurationUnit: 'mins', slotInterval: 15, slotIntervalUnit: 'mins', calendarType: 'event' });
  console.log('Create Phone call: HTTP ' + r.status + (r.ok ? '' : ' ' + msg(r.b)));
}

// ---- C. Email folders and one email
console.log('\n== C. Email templates');
const folders = ['01. Enquiry & Chase', '02. Appointments', '03. Quote & Follow-up', '04. Won & Delivery', '05. After Job & Nurture', '06. Commercial'];
const tl = await call('GET', '/emails/builder?locationId=' + locationId + '&limit=100&offset=0');
console.log('Read templates: HTTP ' + tl.status + ', count ' + (tl.b.builders?.length ?? '?'));
let folderIds = {};
for (const f of (tl.b.builders || []).filter((x) => x.templateType === 'folder')) folderIds[f.name] = f.id;
for (const name of folders) {
  if (folderIds[name]) continue;
  const r = await call('POST', '/emails/builder', { locationId, type: 'folder', name });
  console.log('Create folder ' + name + ': HTTP ' + r.status + (r.ok ? '' : ' ' + msg(r.b)));
  if (r.ok) folderIds[name] = r.b.id || r.b.templateId || r.b.data?.id;
}
const us = await call('GET', '/users/?locationId=' + locationId);
console.log('Read users (needed to save an email body): HTTP ' + us.status + (us.ok ? ', count ' + (us.b.users?.length ?? '?') : ' ' + msg(us.b)));
const userId = us.ok ? us.b.users?.[0]?.id : undefined;
const folderId = folderIds['01. Enquiry & Chase'];
const emailName = 'X-ACK-02 · New lead email';
const existing = (tl.b.builders || []).find((x) => x.name === emailName);
if (existing) console.log('Email X-ACK-02: already exists');
else {
  const c = await call('POST', '/emails/builder', { locationId, type: 'html', name: emailName, title: 'We have your enquiry, {{contact.first_name}}', parentId: folderId });
  console.log('Create email shell: HTTP ' + c.status + (c.ok ? '' : ' ' + msg(c.b)));
  const tid = c.b.id || c.b.templateId || c.b.data?.id;
  if (c.ok && tid) {
    const html = fs.readFileSync(new URL('../messages/emails/X-ACK-02.html', import.meta.url), 'utf8');
    const u = await call('POST', '/emails/builder/data', { locationId, templateId: tid, updatedBy: userId || 'api', html, editorType: 'html', previewText: 'We will ring you to talk it through, then send a written quote. Here is what you told us.', isPlainText: false });
    console.log('Save email body: HTTP ' + u.status + (u.ok ? '' : ' ' + msg(u.b)));
  }
}
const tl2 = await call('GET', '/emails/builder?locationId=' + locationId + '&limit=100&offset=0');
console.log('Read back templates: ' + (tl2.b.builders || []).map((x) => (x.templateType === 'folder' ? '[' + x.name + ']' : x.name)).join(' | '));
