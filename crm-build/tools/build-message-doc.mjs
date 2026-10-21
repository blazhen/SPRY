// Builds ONE document with every customer message (39 emails, 24 SMS), from journey-data.js.
// Usage: node build-message-doc.mjs <journey-data.js> <message-index.md> <output.html>
// Open the result in a browser, or in Word (File, Open). Merge tags are shown as written.
import fs from 'node:fs';
import vm from 'node:vm';

const [, , dataPath, indexPath, outPath] = process.argv;
if (!dataPath || !indexPath || !outPath) {
  console.error('Usage: node build-message-doc.mjs <journey-data.js> <message-index.md> <output.html>');
  process.exit(1);
}
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(dataPath, 'utf8'), sandbox);
const J = sandbox.window.JOURNEY;
const M = J.messages;

const names = {};
for (const l of fs.readFileSync(indexPath, 'utf8').split(/\r?\n/)) {
  const c = l.split(' | ').map((s) => s.replace(/^\| /, '').replace(/ \|$/, ''));
  if (c.length >= 6 && (c[1] === 'email' || c[1] === 'sms')) names[c[0]] = c[2];
}

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const nl = (s) => esc(s).replace(/\n/g, '<br>');

function bodyHtml(text) {
  return text.split(/\n\n/).map((blk) => {
    const lines = blk.split('\n');
    if (lines.every((l) => l.startsWith('  '))) {
      const rows = lines.map((l) => l.trim());
      if (rows.every((r) => /^\d+\.\s/.test(r))) return '<ol>' + rows.map((r) => `<li>${esc(r.replace(/^\d+\.\s/, ''))}</li>`).join('') + '</ol>';
      if (rows.every((r) => /\S\s{2,}\S/.test(r))) {
        return '<table class="kv">' + rows.map((r) => { const [k, ...v] = r.split(/\s{2,}/); return `<tr><td>${esc(k)}</td><td>${esc(v.join('  '))}</td></tr>`; }).join('') + '</table>';
      }
      return '<ul>' + rows.map((r) => `<li>${esc(r)}</li>`).join('') + '</ul>';
    }
    return `<p>${nl(blk)}</p>`;
  }).join('\n');
}

const fromName = { contact: 'Rachael at SprayIT Solutions ({{custom_values.from_name_contact}})', brand: 'SprayIT Solutions ({{custom_values.from_name_brand}})' };
const ids = Object.keys(M);
const emails = ids.filter((i) => M[i].channel === 'email').length;
const sms = ids.length - emails;

let toc = '<table class="toc"><tr><th>ID</th><th>Template name</th><th>Channel</th><th>When</th></tr>';
let out = '';
for (const id of ids) {
  const m = M[id];
  const name = names[id] || id;
  const when = [m.trigger, m.delay].filter(Boolean).join(' / ').replace(/\s+/g, ' ');
  toc += `<tr><td><a href="#${id}">${esc(id)}</a></td><td>${esc(name)}</td><td>${m.channel === 'email' ? 'Email' : 'SMS'}</td><td>${esc(when)}</td></tr>`;
  out += `<section id="${id}"><h2>${esc(name)}</h2>`;
  out += '<table class="meta">';
  out += `<tr><td>Channel</td><td>${m.channel === 'email' ? 'Email' : 'SMS'}</td></tr>`;
  if (m.channel === 'email') {
    out += `<tr><td>From</td><td>${esc(fromName[m.from] || m.from)}</td></tr>`;
    out += '<tr><td>Reply-to</td><td>{{custom_values.business_email}}</td></tr>';
    out += `<tr><td>Subject</td><td><b>${esc(m.subject)}</b></td></tr>`;
    out += `<tr><td>Preview line</td><td>${esc(m.preheader)}</td></tr>`;
  }
  out += `<tr><td>Sent when</td><td>${esc(m.trigger)}</td></tr>`;
  out += `<tr><td>Timing</td><td>${esc(m.delay)}${m.window && m.window !== 'immediate' ? ' (waits for the send window: 8am to 8pm, Monday to Saturday)' : ''}</td></tr>`;
  out += `<tr><td>Stops</td><td>${esc(m.stops)}</td></tr>`;
  out += `<tr><td>Type</td><td>${esc(m.type)}${m.type === 'MKTG' ? ' (marketing: needs marketing consent and an unsubscribe link)' : ''}</td></tr>`;
  out += '</table>';
  if (m.channel === 'email') {
    out += '<div class="body">' + bodyHtml(m.body);
    if (m.sig) out += '<p>' + m.sig.map(esc).join('<br>') + '</p>';
    out += '</div>';
  } else {
    out += `<div class="sms">${esc(m.body)}</div><p class="len">${m.body.length} characters before merge tags are filled in.</p>`;
  }
  if (m.note) out += `<p class="note"><b>Why it is written this way:</b> ${esc(m.note)}</p>`;
  if (m.agencyNote) out += `<p class="note"><b>Build note:</b> ${esc(m.agencyNote)}</p>`;
  out += '</section>';
}
toc += '</table>';

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>SprayIT Solutions: all customer messages</title>
<style>
body{font-family:Calibri,Arial,sans-serif;max-width:820px;margin:32px auto;padding:0 16px;color:#1a1a1a;line-height:1.5}
h1{font-size:26px}h2{font-size:18px;margin:0 0 8px 0;padding-top:6px;border-top:2px solid #444}
section{margin:0 0 28px 0;page-break-inside:avoid}
table{border-collapse:collapse}td,th{padding:3px 10px 3px 0;vertical-align:top;font-size:14px}
table.meta td:first-child{color:#555;width:110px}table.toc td,table.toc th{border-bottom:1px solid #ddd;padding:4px 8px;text-align:left}
.body{border:1px solid #ccc;padding:12px 16px;margin:10px 0;background:#fafafa}
.sms{border:1px solid #9ab;padding:10px 14px;margin:10px 0;background:#eef5fb;border-radius:8px}
.len{font-size:12px;color:#666;margin:0}.note{font-size:13px;color:#444}
table.kv td:first-child{color:#555;padding-right:18px}
</style></head><body>
<h1>SprayIT Solutions: all customer messages</h1>
<p>${emails} emails and ${sms} SMS, in journey order. Generated from the journey data file (6 October 2026 version), so it matches the CRM documents exactly. Merge tags such as {{contact.first_name}} are shown as written and are filled in when a message is sent.</p>
<p><b>Senders.</b> Personal emails come from "Rachael at SprayIT Solutions". Confirmations, reminders and invoices come from "SprayIT Solutions". Every email replies to {{custom_values.business_email}}. Every SMS ends with the sign-off {{custom_values.sms_signoff}} ("Rachael, SprayIT Solutions"). Customer messages send between 8am and 8pm, Monday to Saturday, except confirmations, which send at once.</p>
<h2 style="border:none">Contents</h2>
${toc}
${out}
</body></html>
`;
fs.writeFileSync(outPath, html, 'utf8');
console.log('Wrote ' + outPath + ' with ' + ids.length + ' messages (' + emails + ' emails, ' + sms + ' SMS).');
