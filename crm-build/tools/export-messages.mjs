// Exports every message in journey-data.js as a paste-ready file.
// Usage: node export-messages.mjs <path to journey-data.js> <output folder>
// Emails become HTML files, SMS become text files, and an index lists them all.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const [, , dataPath, outDir] = process.argv;
if (!dataPath || !outDir) {
  console.error('Usage: node export-messages.mjs <journey-data.js> <outdir>');
  process.exit(1);
}

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(dataPath, 'utf8'), sandbox);
const J = sandbox.window.JOURNEY;
const messages = J.messages;

const emailDir = path.join(outDir, 'emails');
const smsDir = path.join(outDir, 'sms');
fs.mkdirSync(emailDir, { recursive: true });
fs.mkdirSync(smsDir, { recursive: true });

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// Merge tags like {{contact.first_name}} must stay untouched, so escape only around them.
const withTags = (s) =>
  s.split(/(\{\{[^}]+\}\})/g).map((p) => (p.startsWith('{{') ? p : esc(p))).join('');

const P = 'margin:0 0 16px 0;font-size:16px;line-height:1.5;color:#1a1a1a;';

function block(text) {
  const lines = text.split('\n');
  if (lines.every((l) => l.startsWith('  '))) {
    const rows = lines.map((l) => l.trim());
    if (rows.every((r) => /^\d+\.\s/.test(r))) {
      return `<ol style="${P}padding-left:22px;">${rows
        .map((r) => `<li style="margin-bottom:6px;">${withTags(r.replace(/^\d+\.\s/, ''))}</li>`)
        .join('')}</ol>`;
    }
    if (rows.every((r) => /\S\s{2,}\S/.test(r))) {
      return `<table role="presentation" style="${P}border-collapse:collapse;">${rows
        .map((r) => {
          const [k, ...v] = r.split(/\s{2,}/);
          return `<tr><td style="padding:2px 18px 2px 0;color:#555;">${withTags(k)}</td><td style="padding:2px 0;">${withTags(v.join('  '))}</td></tr>`;
        })
        .join('')}</table>`;
    }
    return `<ul style="${P}padding-left:22px;">${rows.map((r) => `<li style="margin-bottom:6px;">${withTags(r)}</li>`).join('')}</ul>`;
  }
  return `<p style="${P}">${withTags(text).replace(/\n/g, '<br>')}</p>`;
}

function emailHtml(m) {
  const paras = m.body.split(/\n\n/).map(block).join('\n');
  const sig = (m.sig || []).map((s) => withTags(s)).join('<br>');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${withTags(m.subject)}</title></head>
<body style="margin:0;padding:24px 12px;background:#f4f4f2;font-family:Arial,Helvetica,sans-serif;">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${withTags(m.preheader || '')}</span>
<table role="presentation" width="100%" style="max-width:600px;margin:0 auto;background:#ffffff;border-collapse:collapse;"><tr><td style="padding:28px 28px 24px 28px;">
${paras}
${sig ? `<p style="${P}margin-top:24px;">${sig}</p>` : ''}
</td></tr></table>
</body></html>
`;
}

// Short titles in the house style "ID · Title". Hand-written so names stay readable.
const TITLES = {
  'X-ACK-01': 'New lead text', 'X-ACK-02': 'New lead email',
  'DIAL-01': 'Missed call text after two calls', 'DIAL-02': 'Dial 2 day 2 follow-up',
  'DIAL-03': 'Dial 2 day 4 pick a time', 'DIAL-04': 'Dial 2 day 7 closing off',
  'X-APPT-01': 'Phone call booked email', 'X-APPT-02': 'Phone call booked text',
  'X-APPT-03': 'Phone call 24 hours before', 'X-APPT-04': 'Phone call 2 hours before',
  'X-APPT-06': 'Booking moved', 'X-INSP-01': 'Site inspection booked text',
  'X-INSP-02': 'Site inspection day text', 'R-QUOTE-01': 'Quote sent email',
  'R-QUOTE-02': 'Quote sent text', 'R-FU-01': 'Quote day 2 text',
  'R-FU-02': 'Quote day 5 why quotes differ', 'R-FU-03': 'Quote day 10 text',
  'R-FU-04': 'Quote day 21 final close', 'LOST-01': 'Thanks for considering us',
  'NUR-01': 'Nurture start R-value education', 'NUR-02': 'Nurture +30 days heat loss',
  'NUR-03': 'Nurture +90 days still on the list', 'NUR-04': 'Nurture 12 months quote refresh',
  'X-ACC-01': 'Quote accepted email', 'X-ACC-02': 'Quote accepted text',
  'JOB-01': 'Install booked text', 'JOB-02': 'Install booked prep instructions',
  'REM-01': 'Job 7 days email', 'REM-02': 'Job 7 days text',
  'REM-03': 'Job 48 hours email', 'REM-04': 'Job 48 hours text',
  'REM-05': 'Cannot make the date text', 'REM-06': 'Job 30 days check email',
  'JOB-04': 'Job day morning text', 'JOB-06': 'Crew running late text',
  'DEP-02': 'Deposit invoice email', 'DEP-03': 'Deposit overdue text',
  'DEP-01': 'Deposit received text', 'JOB-05': 'Job complete email',
  'PAY-01': 'Final invoice email', 'PAY-02': 'Invoice day 7 text',
  'PAY-03': 'Invoice day 14 overdue', 'RPT-01': 'Job report email',
  'REV-01': 'Google review text', 'REV-02': 'After job referral ask',
  'REV-03': 'After job 12 month check-in', 'RET-01': 'Retention claim email',
  'SYS-01': 'Missed call text back', 'SYS-02': 'Out of hours reply',
  'C-ACK-01': 'Commercial new enquiry', 'C-INSP-01': 'Commercial inspection booked',
  'C-PROP-01': 'Commercial proposal sent', 'C-PROP-02': 'Commercial proposal day 7',
  'C-PROP-03': 'Commercial proposal day 21', 'C-FUT-01': 'Commercial future project',
  'C-PO-01': 'Commercial awaiting PO', 'C-MOB-01': 'Commercial works booked',
  'C-SITE-01': 'Commercial site day text', 'C-PROG-01': 'Commercial weekly progress',
  'C-PAY-01': 'Commercial progress claim', 'C-DONE-01': 'Commercial works complete',
  'C-CLOSE-01': 'Commercial paid and closed',
};
const shortTrigger = (m, id) => TITLES[id] || (m.trigger || '').replace(/\s+/g, ' ').trim().slice(0, 50);

const rows = [];
for (const [id, m] of Object.entries(messages)) {
  const name = `${id} · ${shortTrigger(m, id)}`;
  if (m.channel === 'email') {
    fs.writeFileSync(path.join(emailDir, `${id}.html`), emailHtml(m), 'utf8');
    rows.push({ id, ch: 'email', name, subject: m.subject, pre: m.preheader, from: m.from, len: '' });
  } else {
    fs.writeFileSync(path.join(smsDir, `${id}.txt`), m.body + '\n', 'utf8');
    rows.push({ id, ch: 'sms', name, subject: '', pre: '', from: '', len: m.body.length });
  }
}

const md = [
  '# Message export index',
  '',
  `Generated from journey-data.js. ${rows.filter((r) => r.ch === 'email').length} emails, ${rows.filter((r) => r.ch === 'sms').length} SMS.`,
  'Email from-name: contact = {{custom_values.from_name_contact}}, brand = {{custom_values.from_name_brand}}. Reply-to is {{custom_values.business_email}}.',
  'SMS length is characters before merge tags are filled in.',
  '',
  '| ID | Channel | Template name | From | Subject | Preheader | SMS length |',
  '| --- | --- | --- | --- | --- | --- | --- |',
  ...rows.map((r) => `| ${r.id} | ${r.ch} | ${r.name} | ${r.from || ''} | ${r.subject || ''} | ${r.pre || ''} | ${r.len} |`),
  '',
].join('\n');
fs.writeFileSync(path.join(outDir, 'message-index.md'), md, 'utf8');
console.log(`Wrote ${rows.length} messages to ${outDir}`);
