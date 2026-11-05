// Tiny dependency-free PDF writer (A4, built-in Helvetica, JPEG images).
// Pure functions, no DOM: runs in the browser and in node.
// The API uses top-left origin (y grows down); we convert to PDF coordinates.

export type Rgb = [number, number, number];
export interface TextOpts { size?: number; bold?: boolean; color?: Rgb; align?: 'left' | 'center' | 'right'; maxWidth?: number }
export interface LineOpts { width?: number; color?: Rgb }
export interface RectOpts { stroke?: Rgb; fill?: Rgb; lineWidth?: number }

const PAGE_W = 595.28;
const PAGE_H = 841.89;

// Glyph widths per 1000 em for ASCII 32..126 (Helvetica and Helvetica-Bold).
const W_REG = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
  1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
  333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556,
  556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584];
const W_BOLD = [278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611,
  975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556,
  333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611,
  611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584];

// Unicode chars outside Latin-1 that WinAnsi can hold, mapped to its byte.
const WIN_MAP: Record<number, number> = {
  0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87,
  0x02c6: 0x88, 0x2030: 0x89, 0x0160: 0x8a, 0x2039: 0x8b, 0x0152: 0x8c, 0x017d: 0x8e,
  0x2018: 0x91, 0x2019: 0x92, 0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x2d, 0x2014: 0x2d,
  0x02dc: 0x98, 0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b, 0x0153: 0x9c, 0x017e: 0x9e, 0x0178: 0x9f,
  0x00a0: 0x20, 0x2212: 0x2d,
};

// Convert text to a WinAnsi byte string (one char per byte). Dashes become hyphens.
function toWin(s: string): string {
  let out = '';
  for (const ch of s) {
    const c = ch.codePointAt(0) as number;
    let b = -1;
    if (c === 9 || c === 10 || c === 13) b = 0x20;
    else if (c >= 32 && c <= 126) b = c;
    else if (WIN_MAP[c] !== undefined) b = WIN_MAP[c];
    else if (c >= 0xa1 && c <= 0xff) b = c;
    out += String.fromCharCode(b < 0 ? 63 : b);
  }
  return out;
}

function esc(s: string): string {
  return s.replace(/[\\()]/g, (m) => '\\' + m);
}

function num(n: number): string {
  const r = Math.round(n * 100) / 100;
  return Object.is(r, -0) ? '0' : String(r);
}

function col(c: Rgb, stroke: boolean): string {
  return `${num(c[0])} ${num(c[1])} ${num(c[2])} ${stroke ? 'RG' : 'rg'}`;
}

function glyphWidth(code: number, bold: boolean): number {
  if (code >= 32 && code <= 126) return (bold ? W_BOLD : W_REG)[code - 32];
  return bold ? 611 : 556; // rough width for accented and symbol chars
}

// Width in points of a string at a given size.
function measure(str: string, size: number, bold = false): number {
  const w = toWin(str);
  let t = 0;
  for (let i = 0; i < w.length; i++) t += glyphWidth(w.charCodeAt(i), bold);
  return (t * size) / 1000;
}

// Read width, height and component count from a JPEG's SOF marker.
export function jpegSize(bytes: Uint8Array): { width: number; height: number; components: number } {
  if (!bytes || bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error('Not a JPEG');
  let i = 2;
  while (i + 4 < bytes.length) {
    if (bytes[i] !== 0xff) { i++; continue; }
    const m = bytes[i + 1];
    if (m === 0xff) { i++; continue; }
    if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { i += 2; continue; }
    const len = (bytes[i + 2] << 8) | bytes[i + 3];
    if (m === 0xc0 || m === 0xc1 || m === 0xc2) {
      if (i + 9 >= bytes.length) break;
      const height = (bytes[i + 5] << 8) | bytes[i + 6];
      const width = (bytes[i + 7] << 8) | bytes[i + 8];
      const components = bytes[i + 9];
      if (!width || !height || (components !== 1 && components !== 3)) throw new Error('Not a JPEG');
      return { width, height, components };
    }
    i += 2 + len;
  }
  throw new Error('Not a JPEG');
}

interface ImageRec { bytes: Uint8Array; width: number; height: number; components: number }

export class PdfPage {
  readonly width = PAGE_W;
  readonly height = PAGE_H;
  /** @internal */ ops: string[] = [];
  /** @internal */ imgs: number[] = []; // indexes into doc images used on this page
  constructor(private doc: PdfDoc) {}

  measure(str: string, size = 10, bold = false): number {
    return measure(str, size, bold);
  }

  // Draw text with its top at y. Returns the y after the last line.
  text(str: string, x: number, y: number, o: TextOpts = {}): number {
    const size = o.size ?? 10;
    const bold = !!o.bold;
    const lead = size * 1.25;
    const align = o.align ?? 'left';
    const lines: string[] = [];
    for (const para of String(str).split('\n')) lines.push(...this.wrap(toWin(para), size, bold, o.maxWidth));
    let cy = y;
    for (const ln of lines) {
      const w = measure(ln, size, bold);
      const lx = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
      if (ln) {
        const base = PAGE_H - (cy + size * 0.9);
        this.ops.push(`BT ${col(o.color ?? [0, 0, 0], false)} /${bold ? 'F2' : 'F1'} ${num(size)} Tf ${num(lx)} ${num(base)} Td (${esc(ln)}) Tj ET`);
      }
      cy += lead;
    }
    return cy;
  }

  // Greedy word wrap; words wider than maxWidth are left on their own line.
  private wrap(s: string, size: number, bold: boolean, maxWidth?: number): string[] {
    if (!maxWidth) return [s];
    const out: string[] = [];
    let cur = '';
    for (const word of s.split(' ')) {
      const t = cur ? cur + ' ' + word : word;
      if (cur && measure(t, size, bold) > maxWidth) { out.push(cur); cur = word; } else cur = t;
    }
    out.push(cur);
    return out;
  }

  line(x1: number, y1: number, x2: number, y2: number, o: LineOpts = {}): void {
    this.ops.push(`${col(o.color ?? [0, 0, 0], true)} ${num(o.width ?? 1)} w ${num(x1)} ${num(PAGE_H - y1)} m ${num(x2)} ${num(PAGE_H - y2)} l S`);
  }

  rect(x: number, y: number, w: number, h: number, o: RectOpts = {}): void {
    const parts: string[] = [];
    if (o.fill) parts.push(col(o.fill, false));
    if (o.stroke) parts.push(col(o.stroke, true), `${num(o.lineWidth ?? 1)} w`);
    parts.push(`${num(x)} ${num(PAGE_H - y - h)} ${num(w)} ${num(h)} re`);
    parts.push(o.fill && o.stroke ? 'B' : o.fill ? 'f' : o.stroke ? 'S' : 'n');
    this.ops.push(parts.join(' '));
  }

  // Draw a baseline JPEG in the box (x, y, w, h). The same bytes object is embedded once.
  image(jpegBytes: Uint8Array, x: number, y: number, w: number, h: number): void {
    const idx = this.doc.addImage(jpegBytes);
    if (!this.imgs.includes(idx)) this.imgs.push(idx);
    this.ops.push(`q ${num(w)} 0 0 ${num(h)} ${num(x)} ${num(PAGE_H - y - h)} cm /Im${idx + 1} Do Q`);
  }
}

export class PdfDoc {
  private pages: PdfPage[] = [];
  private images: ImageRec[] = [];
  private imageIndex = new Map<Uint8Array, number>();
  private title: string;
  private author: string;

  constructor(opts: { title?: string; author?: string } = {}) {
    this.title = opts.title ?? '';
    this.author = opts.author ?? '';
  }

  addPage(): PdfPage {
    const p = new PdfPage(this);
    this.pages.push(p);
    return p;
  }

  /** @internal */
  addImage(bytes: Uint8Array): number {
    const have = this.imageIndex.get(bytes);
    if (have !== undefined) return have;
    const info = jpegSize(bytes);
    this.images.push({ bytes, ...info });
    this.imageIndex.set(bytes, this.images.length - 1);
    return this.images.length - 1;
  }

  build(): Uint8Array {
    const chunks: Uint8Array[] = [];
    const offsets: number[] = [];
    let pos = 0;
    const put = (s: string | Uint8Array) => {
      const b = typeof s === 'string' ? Uint8Array.from(s, (c) => c.charCodeAt(0) & 0xff) : s;
      chunks.push(b);
      pos += b.length;
    };
    const obj = (n: number, body: string | Uint8Array[]) => {
      offsets[n] = pos;
      put(`${n} 0 obj\n`);
      if (typeof body === 'string') put(body);
      else body.forEach((b) => put(b));
      put('\nendobj\n');
    };
    const str = (s: string) => Uint8Array.from(s, (c) => c.charCodeAt(0) & 0xff);

    // Object numbers: 1 catalog, 2 pages, 3-4 fonts, 5 info, images, then page+content pairs.
    const imgBase = 6;
    const pageBase = imgBase + this.images.length;
    const total = pageBase + this.pages.length * 2 - 1;

    put('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n');
    obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
    const kids = this.pages.map((_, i) => `${pageBase + i * 2} 0 R`).join(' ');
    obj(2, `<< /Type /Pages /Kids [${kids}] /Count ${this.pages.length} >>`);
    obj(3, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    obj(4, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    obj(5, `<< /Title (${esc(toWin(this.title))}) /Author (${esc(toWin(this.author))}) /Producer (Systemations) >>`);

    this.images.forEach((im, i) => {
      const cs = im.components === 1 ? '/DeviceGray' : '/DeviceRGB';
      obj(imgBase + i, [
        str(`<< /Type /XObject /Subtype /Image /Width ${im.width} /Height ${im.height} /ColorSpace ${cs} /BitsPerComponent 8 /Filter /DCTDecode /Length ${im.bytes.length} >>\nstream\n`),
        im.bytes,
        str('\nendstream'),
      ]);
    });

    this.pages.forEach((p, i) => {
      const pn = pageBase + i * 2;
      const content = p.ops.join('\n');
      const xo = p.imgs.map((k) => `/Im${k + 1} ${imgBase + k} 0 R`).join(' ');
      obj(pn, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> /XObject << ${xo} >> >> /Contents ${pn + 1} 0 R >>`);
      obj(pn + 1, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
    });

    const xrefAt = pos;
    let x = `xref\n0 ${total + 1}\n0000000000 65535 f \n`;
    for (let n = 1; n <= total; n++) x += String(offsets[n]).padStart(10, '0') + ' 00000 n \n';
    put(x);
    put(`trailer\n<< /Size ${total + 1} /Root 1 0 R /Info 5 0 R >>\nstartxref\n${xrefAt}\n%%EOF`);

    const out = new Uint8Array(pos);
    let o = 0;
    for (const c of chunks) { out.set(c, o); o += c.length; }
    return out;
  }
}
