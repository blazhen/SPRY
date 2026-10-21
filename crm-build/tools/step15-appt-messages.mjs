// Step 15: new copy for a cancelled phone call and a no-show phone call (email and SMS each).
// Writes the files, then creates the two emails in Dev (folder "02. Appointments"), sets subject, preview, from, and reads back.
// Usage: node step15-appt-messages.mjs <api-base-url> <location-id> <.env path>
// Dev only, safe to rerun. Never prints the token.
import fs from 'node:fs';

const DEV = '5M1zrDbimF17cM16mtmR';
const [, , base, locationId, envPath] = process.argv;
if (!base || !locationId || !envPath) { console.error('Usage: node step15-appt-messages.mjs <api-base-url> <location-id> <.env path>'); process.exit(1); }
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
const list = async (pid) => (await call('GET', '/emails/builder?locationId=' + locationId + '&limit=100&offset=0' + (pid ? '&parentId=' + pid : ''))).b.builders || [];

const SIG = ['{{custom_values.contact_name}}', '{{custom_values.business_name}}', '{{custom_values.contact_mobile}}'];
const messages = {
  'X-APPT-07': {
    channel: 'email', title: 'Phone call cancelled email',
    subject: 'Your call has been cancelled',
    pre: 'No problem. Pick a new time whenever it suits.',
    trigger: 'Phone call cancelled', timing: 'Immediately',
    body: 'Hi {{contact.first_name}},\n\nYour call with us on {{appointment.start_time}} has been cancelled, so we will not ring you then.\n\nIf you would still like to talk through your {{custom_values.trade_noun}} enquiry, pick a new time that suits and we will call you then:\n\n{{custom_values.booking_url}}\n\nOr reply to this email, or ring {{custom_values.contact_mobile}}, whenever is convenient.',
  },
  'X-APPT-08': {
    channel: 'sms', title: 'Phone call cancelled text',
    trigger: 'Phone call cancelled', timing: 'Immediately',
    body: 'Your call with {{custom_values.business_short_name}} on {{appointment.start_time}} is cancelled. Want a new time? {{custom_values.booking_url}} {{custom_values.sms_signoff}}',
  },
  'X-APPT-09': {
    channel: 'email', title: 'Phone call no-show email',
    subject: 'We tried to call you, {{contact.first_name}}',
    pre: 'We could not reach you at your booked time. Pick another one, it takes two clicks.',
    trigger: 'Phone call marked no-show (we rang at the booked time and could not reach them)', timing: 'Within an hour of the booked time',
    body: 'Hi {{contact.first_name}},\n\nWe rang you at your booked time, {{appointment.start_time}}, but could not reach you. That is fine, these things happen.\n\nWhen would suit instead? Pick a new time here and we will ring you then:\n\n{{custom_values.booking_url}}\n\nOr reply with a day and a time, or ring {{custom_values.contact_mobile}} when you are free.',
  },
  'X-APPT-10': {
    channel: 'sms', title: 'Phone call no-show text',
    trigger: 'Phone call marked no-show (we rang at the booked time and could not reach them)', timing: 'Within an hour of the booked time',
    body: 'We tried to call you at {{appointment.start_time}} but could not get through. Pick a new time: {{custom_values.booking_url}} or reply here. {{custom_values.sms_signoff}}',
  },
};

// ---- write the files
const dir = new URL('../messages/', import.meta.url);
fs.mkdirSync(new URL('emails/', dir), { recursive: true });
fs.mkdirSync(new URL('sms/', dir), { recursive: true });
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const withTags = (s) => s.split(/(\{\{[^}]+\}\})/g).map((p) => (p.startsWith('{{') ? p : esc(p))).join('');
const P = 'margin:0 0 16px 0;font-size:16px;line-height:1.5;color:#1a1a1a;';
const emailHtml = (m) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${withTags(m.subject)}</title></head>
<body style="margin:0;padding:24px 12px;background:#f4f4f2;font-family:Arial,Helvetica,sans-serif;">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${withTags(m.pre)}</span>
<table role="presentation" width="100%" style="max-width:600px;margin:0 auto;background:#ffffff;border-collapse:collapse;"><tr><td style="padding:28px 28px 24px 28px;">
${m.body.split('\n\n').map((b) => `<p style="${P}">${withTags(b).replace(/\n/g, '<br>')}</p>`).join('\n')}
<p style="${P}margin-top:24px;">${SIG.map(withTags).join('<br>')}</p>
</td></tr></table>
</body></html>
`;
for (const [id, m] of Object.entries(messages)) {
  if (m.channel === 'email') fs.writeFileSync(new URL('emails/' + id + '.html', dir), emailHtml(m), 'utf8');
  else fs.writeFileSync(new URL('sms/' + id + '.txt', dir), m.body + '\n', 'utf8');
}
const md = ['# New appointment messages: phone call cancelled and no-show', '',
  ...Object.entries(messages).flatMap(([id, m]) => [
    '## ' + id + ' · ' + m.title, '',
    '- Channel: ' + (m.channel === 'email' ? 'Email' : 'SMS'),
    ...(m.channel === 'email' ? ['- From: Rachael at SprayIT Solutions ({{custom_values.from_name_contact}})', '- Subject: ' + m.subject, '- Preview line: ' + m.pre] : [`- Length: ${m.body.length} characters before merge tags are filled in`]),
    '- Sent when: ' + m.trigger, '- Timing: ' + m.timing, '',
    m.body, '', ...(m.channel === 'email' ? SIG : []), '']),
].join('\n');
fs.writeFileSync(new URL('appointment-messages-new.md', dir), md, 'utf8');
console.log('Files written: 2 email html, 2 sms txt, appointment-messages-new.md');

// ---- create the two emails in Dev
const root = await list();
const folder = root.find((f) => f.name === '02. Appointments');
if (!folder) { console.error('Folder "02. Appointments" not found in Dev.'); process.exit(3); }
const have = new Map((await list(folder.id)).map((t) => [t.name, t]));
for (const [id, m] of Object.entries(messages).filter(([, x]) => x.channel === 'email')) {
  const name = id + ' · ' + m.title;
  let t = have.get(name);
  if (!t) {
    const c = await call('POST', '/emails/builder', { locationId, type: 'html', title: name, name, parentId: folder.id });
    const tid = c.b.id || c.b.templateId || c.b.data?.id;
    if (!c.ok || !tid) { console.log('FAILED ' + id + ' shell HTTP ' + c.status + ' ' + msg(c.b)); continue; }
    const html = fs.readFileSync(new URL('emails/' + id + '.html', dir), 'utf8');
    const u = await call('POST', '/emails/builder/data', { locationId, templateId: tid, updatedBy: 'api', html, editorType: 'html', previewText: m.pre, isPlainText: false });
    console.log(id + ' created, body saved: HTTP ' + u.status);
    t = { id: tid, name };
  } else console.log(id + ' already exists');
  const p = await call('PATCH', '/emails/builder/' + t.id, { locationId, subjectLine: m.subject, previewText: m.pre, fromName: 'Rachael at SprayIT Solutions', fromEmail: 'info@sprayitsolutions.com.au' });
  const g = p.b || {};
  console.log(id + ' details: HTTP ' + p.status + ' subject ' + (g.subjectLine === m.subject ? 'ok' : 'DIFFERS') + ', preview ' + (g.previewText === m.pre ? 'ok' : 'DIFFERS') + ', from ' + (g.fromName ? 'ok' : 'missing') + ', from email ' + (g.fromEmail ? 'ok' : 'missing'));
}
console.log('\n02. Appointments now holds: ' + (await list(folder.id)).map((t) => t.name).join(' | '));
