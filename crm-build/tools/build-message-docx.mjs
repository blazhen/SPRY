// Builds ONE Word document (.docx) with every customer message, from journey-data.js.
// No libraries: a .docx is a zip of XML files, written here by hand.
// Usage: node build-message-docx.mjs <journey-data.js> <message-index.md> <output.docx>
import fs from 'node:fs';
import vm from 'node:vm';
import zlib from 'node:zlib';

const [, , dataPath, indexPath, outPath] = process.argv;
if (!dataPath || !indexPath || !outPath) {
  console.error('Usage: node build-message-docx.mjs <journey-data.js> <message-index.md> <output.docx>');
  process.exit(1);
}
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(dataPath, 'utf8'), sandbox);
const M = sandbox.window.JOURNEY.messages;
const names = {};
for (const l of fs.readFileSync(indexPath, 'utf8').split(/\r?\n/)) {
  const c = l.split(' | ').map((s) => s.replace(/^\| /, '').replace(/ \|$/, ''));
  if (c.length >= 6 && (c[1] === 'email' || c[1] === 'sms')) names[c[0]] = c[2];
}

const x = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const run = (text, o = {}) => {
  const pr = (o.bold ? '<w:b/>' : '') + (o.italic ? '<w:i/>' : '') + (o.color ? `<w:color w:val="${o.color}"/>` : '') + (o.size ? `<w:sz w:val="${o.size}"/>` : '');
  return String(text).split('\t').map((t, i) => (i ? '<w:r><w:tab/></w:r>' : '') + (t === '' ? '' : `<w:r>${pr ? `<w:rPr>${pr}</w:rPr>` : ''}<w:t xml:space="preserve">${x(t)}</w:t></w:r>`)).join('');
};
const p = (text, o = {}) => {
  const ppr = (o.style ? `<w:pStyle w:val="${o.style}"/>` : '') + (o.keepNext ? '<w:keepNext/>' : '') + (o.indent ? `<w:ind w:left="${o.indent}" w:hanging="${o.hanging || 0}"/>` : '') + (o.after !== undefined ? `<w:spacing w:after="${o.after}"/>` : '');
  return `<w:p>${ppr ? `<w:pPr>${ppr}</w:pPr>` : ''}${run(text, o)}</w:p>`;
};
const cell = (inner, w, shade) => `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${shade ? `<w:shd w:val="clear" w:color="auto" w:fill="${shade}"/>` : ''}</w:tcPr>${inner}</w:tc>`;
const table = (rows, widths, opts = {}) => {
  const borders = opts.borders ? '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((b) => `<w:${b} w:val="single" w:sz="4" w:space="0" w:color="BBBBBB"/>`).join('') + '</w:tblBorders>' : '';
  return `<w:tbl><w:tblPr><w:tblW w:w="${widths.reduce((a, b) => a + b, 0)}" w:type="dxa"/>${borders}<w:tblCellMar><w:left w:w="100" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${widths.map((w) => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>${rows.map((r) => `<w:tr><w:trPr><w:cantSplit/></w:trPr>${r.map((c, i) => cell(c, widths[i], opts.shade && i === 0 ? opts.shade : '')).join('')}</w:tr>`).join('')}</w:tbl>`;
};
const gap = () => '<w:p><w:pPr><w:spacing w:after="60"/></w:pPr></w:p>';

function bodyParas(text) {
  const out = [];
  for (const blk of text.split(/\n\n/)) {
    const lines = blk.split('\n');
    if (lines.every((l) => l.startsWith('  '))) {
      const rows = lines.map((l) => l.trim());
      rows.forEach((r, i) => {
        if (/^\d+\.\s/.test(r)) out.push(p(r, { indent: 360, hanging: 360, after: 40 }));
        else if (/\S\s{2,}\S/.test(r)) { const [k, ...v] = r.split(/\s{2,}/); out.push(p(k + '\t' + v.join('  '), { indent: 2200, hanging: 2000, after: 40 })); }
        else out.push(p('•\t' + r, { indent: 360, hanging: 360, after: 40 }));
      });
    } else out.push(withBreaks(blk, { after: 120 }));
  }
  return out.join('');
}
// a single newline inside a paragraph becomes a line break
const withBreaks = (text, o = {}) => {
  const parts = text.split('\n');
  const ppr = o.after !== undefined ? `<w:pPr><w:spacing w:after="${o.after}"/></w:pPr>` : '';
  return `<w:p>${ppr}${parts.map((t, i) => (i ? '<w:r><w:br/></w:r>' : '') + run(t, o)).join('')}</w:p>`;
};

const fromName = { contact: 'Rachael at SprayIT Solutions ({{custom_values.from_name_contact}})', brand: 'SprayIT Solutions ({{custom_values.from_name_brand}})' };
const ids = Object.keys(M);
const emails = ids.filter((i) => M[i].channel === 'email').length;
const sms = ids.length - emails;

let body = '';
body += p('SprayIT Solutions: all customer messages', { style: 'Title' });
body += p(`${emails} emails and ${sms} SMS, in journey order. Generated from the journey data file (6 October 2026 version), so it matches the CRM documents exactly. Merge tags such as {{contact.first_name}} are shown as written and are filled in when a message is sent.`);
body += p('Senders. Personal emails come from "Rachael at SprayIT Solutions". Confirmations, reminders and invoices come from "SprayIT Solutions". Every email replies to {{custom_values.business_email}}. Every SMS ends with the sign-off {{custom_values.sms_signoff}} ("Rachael, SprayIT Solutions"). Customer messages send between 8am and 8pm, Monday to Saturday, except confirmations, which send at once.');
body += p('Contents', { style: 'Heading1' });
const W = [1500, 3700, 900, 3260];
const tocRows = [[p('ID', { bold: true, after: 0 }), p('Template name', { bold: true, after: 0 }), p('Channel', { bold: true, after: 0 }), p('Sent when', { bold: true, after: 0 })]];
for (const id of ids) {
  const m = M[id];
  const when = [m.trigger, m.delay].filter(Boolean).join(' / ').replace(/\s+/g, ' ');
  tocRows.push([p(id, { after: 0, size: 18 }), p((names[id] || id).replace(/^[A-Z0-9-]+ · /, ''), { after: 0, size: 18 }), p(m.channel === 'email' ? 'Email' : 'SMS', { after: 0, size: 18 }), p(when, { after: 0, size: 18 })]);
}
body += table(tocRows, W, { borders: true });

let first = true;
for (const id of ids) {
  const m = M[id];
  body += `<w:p><w:r><w:br w:type="page"/></w:r></w:p>`;
  body += p(names[id] || id, { style: 'Heading2', keepNext: true });
  const meta = [['Channel', m.channel === 'email' ? 'Email' : 'SMS']];
  if (m.channel === 'email') {
    meta.push(['From', fromName[m.from] || m.from], ['Reply-to', '{{custom_values.business_email}}'], ['Subject', m.subject], ['Preview line', m.preheader]);
  }
  meta.push(['Sent when', m.trigger], ['Timing', (m.delay || '') + (m.window && m.window !== 'immediate' ? ' (waits for the send window: 8am to 8pm, Monday to Saturday)' : '')], ['Stops', m.stops], ['Type', m.type + (m.type === 'MKTG' ? ' (marketing: needs marketing consent and an unsubscribe link)' : '')]);
  body += table(meta.map(([k, v]) => [p(k, { bold: true, after: 20, size: 20, color: '555555' }), p(v, { after: 20, size: 20, bold: k === 'Subject' })]), [1700, 7660], { borders: true, shade: 'F2F2F2' });
  body += gap();
  if (m.channel === 'email') {
    let inner = bodyParas(m.body.replace(/\n\n/g, '\n\n'));
    if (m.sig) inner += withBreaks(m.sig.join('\n'), { after: 0 });
    body += table([[inner]], [9360], { borders: true });
  } else {
    body += table([[withBreaks(m.body, { after: 0 })]], [9360], { borders: true });
    body += p(`${m.body.length} characters before merge tags are filled in.`, { size: 18, color: '666666' });
  }
  if (m.note) body += p('Why it is written this way: ' + m.note, { italic: true, size: 20, color: '444444' });
  if (m.agencyNote) body += p('Build note: ' + m.agencyNote, { italic: true, size: 20, color: '444444' });
}

const sect = '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1273" w:bottom="1134" w:left="1273" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>';
const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}${sect}</w:body></w:document>`;
const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:sz w:val="22"/><w:lang w:val="en-AU"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="264" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="240"/></w:pPr><w:rPr><w:b/><w:sz w:val="48"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="120"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:sz w:val="32"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="120" w:after="120"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:sz w:val="28"/></w:rPr></w:style></w:styles>`;
const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`;
const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;
const docRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;

// ---- minimal zip writer (stored, no compression)
function zip(files) {
  const locals = [], centrals = [];
  let offset = 0;
  for (const [name, content] of files) {
    const data = Buffer.from(content, 'utf8');
    const nameBuf = Buffer.from(name, 'utf8');
    const crc = zlib.crc32(data) >>> 0;
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6); lh.writeUInt16LE(0, 8);
    lh.writeUInt16LE(0, 10); lh.writeUInt16LE(0x21, 12); lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(data.length, 18); lh.writeUInt32LE(data.length, 22);
    lh.writeUInt16LE(nameBuf.length, 26); lh.writeUInt16LE(0, 28);
    locals.push(lh, nameBuf, data);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0x0800, 8); ch.writeUInt16LE(0, 10);
    ch.writeUInt16LE(0, 12); ch.writeUInt16LE(0x21, 14); ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(data.length, 20); ch.writeUInt32LE(data.length, 24);
    ch.writeUInt16LE(nameBuf.length, 28); ch.writeUInt32LE(offset, 42);
    centrals.push(ch, nameBuf);
    offset += lh.length + nameBuf.length + data.length;
  }
  const cdSize = centrals.reduce((a, b) => a + b.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10); end.writeUInt32LE(cdSize, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, ...centrals, end]);
}
fs.writeFileSync(outPath, zip([
  ['[Content_Types].xml', contentTypes],
  ['_rels/.rels', rootRels],
  ['word/document.xml', documentXml],
  ['word/_rels/document.xml.rels', docRels],
  ['word/styles.xml', stylesXml],
]));
console.log('Wrote ' + outPath + ' with ' + ids.length + ' messages (' + emails + ' emails, ' + sms + ' SMS).');
