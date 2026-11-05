// Unit check for src/lib/pdfDoc.ts: node scripts/check-pdfdoc-unit.mjs (run from the hub folder).
// Compiles the TypeScript with the local typescript package into the OS temp dir, then imports it.
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const ts = require('typescript');

const src = readFileSync(new URL('../src/lib/pdfDoc.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(src, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } }).outputText;
const dir = mkdtempSync(join(tmpdir(), 'pdfdoc-'));
const file = join(dir, 'pdfDoc.mjs');
writeFileSync(file, js);
const { PdfDoc, jpegSize } = await import(pathToFileURL(file).href);

let failed = 0;
function check(name, ok, extra = '') {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${!ok && extra ? ' (' + extra + ')' : ''}`);
}
const latin = (u8) => Buffer.from(u8).toString('latin1');

// Minimal baseline JPEG structure: SOI, SOF0 (3 components, 16x8), SOS, a few data bytes, EOI.
const jpeg = Uint8Array.from([
  0xff, 0xd8,
  0xff, 0xc0, 0x00, 0x11, 0x08, 0x00, 0x08, 0x00, 0x10, 0x03, 0x01, 0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
  0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00, 0x12, 0x34,
  0xff, 0xd9,
]);

const doc = new PdfDoc({ title: 'Test', author: 'Me' });
const p1 = doc.addPage();
p1.text('Hello (world)', 50, 50);
const yShort = p1.text('Short line', 50, 80, { maxWidth: 400 });
const sentence = 'The quick brown fox jumps over the lazy dog and keeps running across the field';
const yWrap = p1.text(sentence, 50, 80, { maxWidth: 120 });
p1.text('A — B – C', 50, 200);
p1.line(10, 10, 100, 10);
p1.rect(10, 20, 50, 20, { fill: [0.9, 0.9, 0.9], stroke: [0, 0, 0] });
p1.image(jpeg, 50, 300, 100, 50);
const p2 = doc.addPage();
p2.image(jpeg, 50, 50, 100, 50);
p2.text('Page two', 50, 50);
const bytes = doc.build();
const s = latin(bytes);

check('starts with %PDF-1.4', s.startsWith('%PDF-1.4'));
check('ends with %%EOF', s.endsWith('%%EOF'));

const sx = s.lastIndexOf('startxref');
const xrefPos = Number(s.slice(sx + 9).trim().split(/\s+/)[0]);
check('startxref points at xref', s.slice(xrefPos, xrefPos + 4) === 'xref');

const rows = s.slice(xrefPos).split('\n');
const count = Number(rows[1].split(' ')[1]);
let offsOk = true;
for (let n = 1; n < count; n++) {
  const off = Number(rows[2 + n].slice(0, 10));
  if (s.slice(off, off + `${n} 0 obj`.length) !== `${n} 0 obj`) { offsOk = false; console.log('bad offset for obj', n); }
}
check('xref offsets point at obj markers', offsOk && count > 5);
check('page count is 2', /\/Type \/Pages \/Kids \[[^\]]*\] \/Count 2/.test(s));
check('text escaped', s.includes('(Hello \\(world\\)) Tj'));
check('Info has title and author', s.includes('/Title (Test)') && s.includes('/Author (Me)'));

const w = p1.measure('Hello', 10, false);
// H722 e556 l222 l222 o556 = 2278 per 1000 em = 22.78 at 10pt
check('width of Hello at 10pt is 22.78', Math.abs(w - 22.78) < 0.01, String(w));
check('bold is wider than regular', p1.measure('Hello', 10, true) > w);

const nLines = (yWrap - 80) / (10 * 1.25);
check('wrapping gives several lines and larger y', nLines >= 3 && yWrap > yShort, `lines ${nLines}`);

const info = jpegSize(jpeg);
check('jpegSize reads header', info.width === 16 && info.height === 8 && info.components === 3, JSON.stringify(info));
check('output has /DCTDecode', s.includes('/DCTDecode'));
check('same JPEG embedded once', s.split('/Subtype /Image').length === 2);

let msg = '';
try { p1.image(Uint8Array.from([1, 2, 3, 4, 5]), 0, 0, 10, 10); } catch (e) { msg = e.message; }
check('non-JPEG throws Not a JPEG', msg === 'Not a JPEG', msg);

check('dashes become hyphens', s.includes('(A - B - C)'));
check('no dash characters in output', !/[–—]/.test(s));

console.log(failed ? `${failed} FAILED` : 'ALL PASSED');
process.exit(failed ? 1 : 0);
