import { crmJson, CrmError, getPipelines } from './crm.js';
import type { Pipeline } from './crm.js';
import { getConfig } from './env.js';
import { roundHalfUp } from './quote-calc.js';

type Obj = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export const ID = /^[A-Za-z0-9]{6,64}$/;

// ---------- Hub shapes (see src/types.ts for Invoice) ----------
export interface Note { id: string; body: string; createdAt: string; createdBy?: string }
export interface Task { id: string; title: string; dueDate?: string; completed: boolean }
export interface Participant { kind: 'contact' | 'company'; id: string; role: 'main' | 'extra' | 'company'; name: string }
export interface UserRef { id: string; name: string }

export type PayMethod = 'card' | 'bank' | 'cash' | 'cheque';
export interface HubPayment { id: string; amount: number; method: PayMethod; at: string; note?: string }
export interface HubInvoiceLine { id: string; description: string; qty: number; unit: 'each' | 'm2' | 'hour'; unitPrice: number; gst: boolean }
export interface HubInvoice {
  id: string; number: string; jobId: string; contactId?: string; kind: 'deposit' | 'final' | 'other';
  status: 'draft' | 'sent' | 'part' | 'paid' | 'void'; items: HubInvoiceLine[]; discount: number;
  issueDate: string; dueDate: string; notes: string; payments: HubPayment[]; voidReason?: string;
  sentAt?: string; sentTo?: string; viewedAt?: string; quoteId?: string; label: string; amount: number; paidAt?: string;
}

/** Location query used by invoice endpoints. */
export function altQuery(): string {
  return 'altId=' + getConfig().locationId + '&altType=location';
}
export function altBody(): { altId: string; altType: string } {
  return { altId: getConfig().locationId, altType: 'location' };
}

// ---------- stage name to stage id ----------
/** Hub stage NAME to the pipeline stage id (case-insensitive, trimmed). Returns undefined when not found. */
export function stageIdForName(pipelines: Pipeline[], pipelineId: string, name: string): string | undefined {
  const pipe = pipelines.find((p) => p.id === pipelineId);
  const want = name.trim().toLowerCase();
  return pipe?.stages.find((s) => s.name.trim().toLowerCase() === want)?.id;
}

// ---------- contacts ----------
/** "Jo Ann Smith" becomes first "Jo Ann", last "Smith". One word is a first name only. */
export function splitName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { firstName: parts[0] ?? '', lastName: '' };
  return { firstName: parts.slice(0, -1).join(' '), lastName: parts[parts.length - 1] };
}

// ---------- notes, tasks, users ----------
export function mapNote(n: Obj): Note {
  const out: Note = { id: String(n.id ?? n._id ?? ''), body: String(n.body ?? n.bodyText ?? ''), createdAt: String(n.dateAdded ?? '') };
  if (n.userId) out.createdBy = String(n.userId);
  return out;
}

export function mapTask(t: Obj): Task {
  const out: Task = { id: String(t.id ?? t._id ?? ''), title: String(t.title ?? ''), completed: t.completed === true };
  if (t.dueDate) out.dueDate = String(t.dueDate);
  return out;
}

export async function getUsers(): Promise<UserRef[]> {
  const j = await crmJson('/users/?locationId=' + getConfig().locationId);
  return ((j.users ?? []) as Obj[]).map((u) => ({
    id: String(u.id ?? u._id ?? ''),
    name: String(u.name ?? (`${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email || '')),
  }));
}

// ---------- associations (participants) ----------
export interface AssocIds { contactJob: string; companyJob: string }
const assocCache = new Map<string, { at: number; v: AssocIds }>();

/** Ids of the two association definitions the Hub uses. Cached 5 minutes. */
export async function getAssocIds(): Promise<AssocIds> {
  const L = getConfig().locationId;
  const hit = assocCache.get(L);
  if (hit && Date.now() - hit.at < 5 * 60 * 1000) return hit.v;
  const j = await crmJson('/associations/?locationId=' + L);
  const list = (j.associations ?? []) as Obj[];
  const contactJob = list.find((a) => a.key === 'OPPORTUNITIES_CONTACTS_ADDITIONAL_ASSOCIATION')?.id;
  const companyJob = list.find((a) => a.key === 'BUSINESSES_OPPORTUNITIES_ASSOCIATION')?.id;
  if (!contactJob || !companyJob) throw new CrmError(502, 'Association definitions missing');
  const v = { contactJob: String(contactJob), companyJob: String(companyJob) };
  assocCache.set(L, { at: Date.now(), v });
  return v;
}

export interface RelationRef { relationId: string; kind: 'contact' | 'company'; id: string }

/** Pure: pick the Hub relations out of a CRM relations list. Contact and company are the "first" record, the job the "second". */
export function relationRefs(rels: Obj[], assoc: AssocIds, jobId: string): RelationRef[] {
  const out: RelationRef[] = [];
  for (const r of rels) {
    const kind = r.associationId === assoc.contactJob ? 'contact' : r.associationId === assoc.companyJob ? 'company' : null;
    if (!kind) continue;
    const other = r.firstRecordId === jobId ? r.secondRecordId : r.firstRecordId;
    out.push({ relationId: String(r.id ?? r._id ?? ''), kind, id: String(other ?? '') });
  }
  return out;
}

export async function getRelationRefs(jobId: string): Promise<RelationRef[]> {
  const L = getConfig().locationId;
  const [assoc, j] = await Promise.all([getAssocIds(), crmJson('/associations/relations/' + jobId + '?locationId=' + L + '&skip=0&limit=100')]);
  return relationRefs((j.relations ?? []) as Obj[], assoc, jobId);
}

async function nameOf(kind: 'contact' | 'company', id: string): Promise<string> {
  try {
    if (kind === 'contact') {
      const c = ((await crmJson('/contacts/' + id)).contact ?? {}) as Obj;
      return String(c.contactName ?? (`${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() || c.name || ''));
    }
    const b = await crmJson('/businesses/' + id);
    return String((b.business ?? b).name ?? '');
  } catch {
    return '';
  }
}

export async function listParticipants(jobId: string): Promise<Participant[]> {
  const opp = ((await crmJson('/opportunities/' + jobId)).opportunity ?? {}) as Obj;
  const mainId = String(opp.contactId ?? opp.contact?.id ?? '');
  const refs = await getRelationRefs(jobId);
  const rows: { kind: 'contact' | 'company'; id: string; role: Participant['role'] }[] = [];
  if (mainId) rows.push({ kind: 'contact', id: mainId, role: 'main' });
  for (const r of refs) if (!(r.kind === 'contact' && r.id === mainId)) rows.push({ kind: r.kind, id: r.id, role: r.kind === 'company' ? 'company' : 'extra' });
  return Promise.all(rows.map(async (r) => ({ ...r, name: await nameOf(r.kind, r.id) })));
}

// ---------- invoices ----------
/** Hub extras that the platform invoice has no field for. Carried inside termsNotes as an HTML comment (UNTESTED that the platform keeps it). */
interface Marker { jobId: string; kind: string; quoteId?: string; discount: number; adj?: boolean; lines: { unit: string; gst: boolean; unitPrice: number }[] }
const MARK = /<!--hub:([A-Za-z0-9_-]+)-->/;
const b64 = (s: string): string => Buffer.from(s, 'utf8').toString('base64url');
const unb64 = (s: string): string => Buffer.from(s, 'base64url').toString('utf8');
const r2 = (n: number): number => Math.round(n * 100) / 100;
const escHtml = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export interface InvoiceDraft {
  contactId: string; jobId: string; kind?: string; quoteId?: string; items: { description: string; qty: number; unit?: string; unitPrice: number; gst?: boolean }[];
  discount?: number; issueDate?: string; dueDate?: string; notes?: string;
}

/** Pure input check for POST /api/invoices. Returns an error message or null. */
export function validateInvoiceDraft(b: Obj): string | null {
  if (!ID.test(String(b.contactId ?? ''))) return 'contactId is required';
  if (!ID.test(String(b.jobId ?? ''))) return 'jobId is required';
  return validateInvoiceFields(b, true);
}

/** Pure input check for PUT /api/invoices (every field optional). Returns an error message or null. */
export function validateInvoiceEdit(b: Obj): string | null {
  if (b.contactId !== undefined && !ID.test(String(b.contactId))) return 'Bad contactId';
  return validateInvoiceFields(b, false);
}

function validateInvoiceFields(b: Obj, itemsRequired: boolean): string | null {
  if (b.items === undefined && !itemsRequired) { /* items unchanged */ } else {
    if (!Array.isArray(b.items) || b.items.length === 0 || b.items.length > 100) return 'items are required';
    const e = validateItems(b.items as Obj[]);
    if (e) return e;
  }
  if (b.discount !== undefined && (!Number.isFinite(Number(b.discount)) || Number(b.discount) < 0)) return 'Bad discount';
  for (const k of ['issueDate', 'dueDate']) if (b[k] !== undefined && b[k] !== '' && !/^\d{4}-\d{2}-\d{2}/.test(String(b[k]))) return 'Bad ' + k;
  return null;
}

function validateItems(items: Obj[]): string | null {
  for (const it of items) {
    if (!it || typeof it !== 'object' || !String(it.description ?? '').trim()) return 'Every item needs a description';
    if (!Number.isFinite(Number(it.qty)) || Number(it.qty) <= 0) return 'Bad item qty';
    if (!Number.isFinite(Number(it.unitPrice)) || Number(it.unitPrice) < 0) return 'Bad item unitPrice';
  }
  return null;
}

/** Hub payment method to the platform record-payment mode. 'bank_transfer' is the documented platform value (UNTESTED live unless the live group says so). */
export const PAY_MODE: Record<PayMethod, string> = { card: 'card', bank: 'bank_transfer', cash: 'cash', cheque: 'cheque' };

/** Whole cents of a dollar amount (half up, same rounding as the Hub). */
const toCents = (n: number): number => Math.round(roundHalfUp(n) * 100);

/**
 * Hub draft to a platform draft invoice body.
 * LOSSY, in order of importance:
 * - GST: the platform line has no per-line GST flag here (tax ids not wired), so GST is baked into the line amounts.
 *   The platform total is made equal to the Hub total inc GST to the cent (Hub rule: invoiceTotals in src/lib/invoices.ts,
 *   GST is 10% of the gst lines after the discount is shared out, rounded half up ONCE). How:
 *   1. Each line gets its own gross, ex x 1.1 for a gst line, rounded half up per line, sent as qty x unit amount
 *      (unit amount = line gross / qty to the cent).
 *   2. preGross is what the lines should add up to with no discount: sum ex + 10% of the gst lines ex (GST rounded once, as the Hub does).
 *      Any cent difference between the line sum and preGross goes on the LAST line that can take it exactly
 *      (last gst line first, then earlier lines; a line takes it when qty x unit amount can move by exactly that many cents).
 *      When no line can (for example qty 7 and a 1 cent difference) a one-cent style "Rounding adjustment" line (qty 1, may be
 *      negative) is added at the end and flagged in the marker so the reverse mapping drops it.
 *   3. Discount: the platform discount is a separate fixed value = preGross minus the Hub total, so platform lines
 *      minus platform discount equals the Hub total exactly. With no discount the line amounts alone sum to the Hub total.
 *   The platform shows no separate GST line.
 * - unit (each, m2, hour) is not sent. Kept only in the hidden marker.
 * - kind, jobId, quoteId and the original unitPrice/gst/discount live in the marker inside termsNotes (UNTESTED that it survives).
 * - number is ignored: the platform issues its own invoice number.
 * - payments, voidReason, viewedAt, paidAt are never written by this route (payments are recorded in the platform).
 */
export function invoiceToPlatform(d: InvoiceDraft, contact: { id: string; name: string; email: string }, businessName: string, today: string): Obj {
  const exs = d.items.map((i) => roundHalfUp((Number(i.qty) || 0) * (Number(i.unitPrice) || 0)));
  const sum = exs.reduce((a, b) => a + b, 0);
  const discount = Math.max(0, Number(d.discount ?? 0));
  const cappedDiscount = Math.min(discount, sum);
  const gstBase = d.items.reduce((a, l, i) => a + (l.gst ? exs[i] : 0), 0);
  const gstAfter = sum > 0 ? gstBase * (1 - cappedDiscount / sum) : 0;
  const hubTotalC = toCents(toCents(sum - cappedDiscount) / 100 + roundHalfUp(gstAfter * 0.1));
  const preGrossC = toCents(toCents(sum) / 100 + roundHalfUp(gstBase * 0.1)); // the Hub rule with no discount: GST rounded once
  // Per line: gross cents, then unit amount in cents (qty 1 is exact).
  const unitC: number[] = d.items.map((i, n) => {
    const grossC = toCents(exs[n] * (i.gst ? 1.1 : 1));
    const q = Number(i.qty) || 1;
    return Math.round(grossC / q);
  });
  const lineC = (n: number): number => Math.round(d.items[n].qty * unitC[n]);
  let residual = preGrossC - d.items.reduce((a, _i, n) => a + lineC(n), 0);
  let rounding = 0;
  if (residual !== 0) {
    const gstIdx = d.items.map((i, n) => (i.gst ? n : -1)).filter((n) => n >= 0).reverse();
    const order = [...gstIdx, ...d.items.map((_i, n) => n).reverse().filter((n) => !gstIdx.includes(n))];
    for (const n of order) {
      const q = Number(d.items[n].qty) || 1;
      const step = Math.round(residual / q);
      if (Math.round(q * (unitC[n] + step)) - Math.round(q * unitC[n]) === residual && unitC[n] + step >= 0) {
        unitC[n] += step;
        residual = 0;
        break;
      }
    }
    if (residual !== 0) { rounding = residual; residual = 0; }
  }
  const items: Obj[] = d.items.map((i, n) => ({ name: i.description, description: '', currency: 'AUD', amount: unitC[n] / 100, qty: i.qty }));
  if (rounding !== 0) items.push({ name: 'Rounding adjustment', description: '', currency: 'AUD', amount: rounding / 100, qty: 1 });
  const lineSumC = items.reduce((a, it) => a + Math.round(it.qty * Math.round(it.amount * 100)), 0);
  const marker: Marker = { jobId: d.jobId, kind: d.kind ?? 'other', quoteId: d.quoteId, discount, lines: d.items.map((i) => ({ unit: i.unit ?? 'each', gst: !!i.gst, unitPrice: i.unitPrice })) };
  if (rounding !== 0) marker.adj = true;
  const notes = (d.notes ?? '').trim();
  const body: Obj = {
    ...altBody(),
    name: d.kind === 'deposit' ? 'Deposit invoice' : d.kind === 'final' ? 'Final invoice' : 'Invoice',
    currency: 'AUD',
    issueDate: d.issueDate || today,
    businessDetails: { name: businessName },
    contactDetails: { id: contact.id, name: contact.name, email: contact.email },
    items,
    // lines (qty x amount) minus this discount = the Hub total inc GST, to the cent.
    discount: { value: Math.max(0, lineSumC - hubTotalC) / 100, type: 'fixed' },
    termsNotes: (notes ? '<p>' + escHtml(notes) + '</p>' : '') + '<!--hub:' + b64(JSON.stringify(marker)) + '-->',
  };
  if (d.dueDate) body.dueDate = d.dueDate;
  return body;
}

const STATUS: Record<string, HubInvoice['status']> = {
  draft: 'draft', sent: 'sent', viewed: 'sent', overdue: 'sent', payment_processing: 'sent', partially_paid: 'part', paid: 'paid', void: 'void',
};

const METHOD_BACK: Record<string, PayMethod> = { card: 'card', cash: 'cash', cheque: 'cheque', check: 'cheque', bank_transfer: 'bank', bank: 'bank' };

function mapPayments(i: Obj, hint?: { method?: PayMethod; at?: string; note?: string }): HubPayment[] {
  if (Array.isArray(i.payments) && i.payments.length > 0) {
    return (i.payments as Obj[]).map((p, n) => {
      const row: HubPayment = { id: String(p._id ?? p.id ?? 'p' + (n + 1)), amount: Number(p.amount ?? 0), method: METHOD_BACK[String(p.mode ?? p.method ?? '')] ?? 'bank', at: String(p.createdAt ?? p.at ?? p.paidAt ?? '') };
      if (p.notes ?? p.note) row.note = String(p.notes ?? p.note);
      return row;
    });
  }
  const paid = r2(Number(i.amountPaid ?? 0));
  if (!(paid > 0)) return [];
  const row: HubPayment = { id: 'paid', amount: paid, method: hint?.method ?? 'bank', at: hint?.at ?? String(i.paidAt ?? i.updatedAt ?? '') };
  if (hint?.note) row.note = hint.note;
  return [row];
}

/**
 * Platform invoice to the Hub Invoice shape. LOSSY: when the hidden marker is missing (invoice not made by the Hub)
 * jobId is '', kind is 'other', every line is unit 'each' with gst false and unitPrice the platform amount, and discount is the platform value.
 * payments: if the platform invoice carries a payments array it is mapped one row per payment; otherwise (the case seen in Dev)
 * ONE synthetic row is made from amountPaid (id 'paid', method from the hint or 'bank', at from the hint, paidAt or updatedAt).
 * With no money received it is []. voidReason is never stored by the platform; it is set only on the response of the void route.
 * viewedAt is not mapped.
 */
export function mapInvoice(i: Obj, hint?: { method?: PayMethod; at?: string; note?: string }): HubInvoice {
  const rawNotes = String(i.termsNotes ?? '');
  const m = MARK.exec(rawNotes);
  let marker: Marker | null = null;
  if (m) { try { marker = JSON.parse(unb64(m[1])) as Marker; } catch { marker = null; } }
  let src = (i.invoiceItems ?? i.items ?? []) as Obj[];
  if (marker?.adj && src.length === marker.lines.length + 1) src = src.slice(0, -1); // drop the "Rounding adjustment" line
  const useMarker = !!marker && marker.lines.length === src.length;
  const items: HubInvoiceLine[] = src.map((it, n) => ({
    id: String(it._id ?? it.id ?? n + 1),
    description: String(it.name ?? ''),
    qty: Number(it.qty ?? 1),
    unit: useMarker ? (marker!.lines[n].unit as HubInvoiceLine['unit']) : 'each',
    unitPrice: useMarker ? marker!.lines[n].unitPrice : Number(it.amount ?? 0),
    gst: useMarker ? marker!.lines[n].gst : false,
  }));
  const notes = rawNotes.replace(MARK, '').replace(/^<p>([\s\S]*)<\/p>$/, '$1').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').trim();
  const sentEmail = Array.isArray(i.sentTo?.email) ? i.sentTo.email[0] : undefined;
  const out: HubInvoice = {
    id: String(i._id ?? i.id ?? ''),
    number: String(i.invoiceNumber ?? ''),
    jobId: marker?.jobId ?? '',
    kind: (marker?.kind === 'deposit' || marker?.kind === 'final' ? marker.kind : 'other'),
    status: STATUS[String(i.status ?? 'draft')] ?? 'draft',
    items,
    discount: useMarker ? marker!.discount : Number(i.discount?.value ?? 0),
    issueDate: String(i.issueDate ?? '').slice(0, 10),
    dueDate: String(i.dueDate ?? '').slice(0, 10),
    notes,
    payments: mapPayments(i, hint),
    label: String(i.name ?? ''),
    amount: Number(i.total ?? 0),
  };
  const cid = i.contactDetails?.id ?? i.contactId;
  if (cid) out.contactId = String(cid);
  if (marker?.quoteId) out.quoteId = marker.quoteId;
  if (i.sentAt) out.sentAt = String(i.sentAt);
  if (sentEmail) out.sentTo = String(sentEmail);
  return out;
}

/** Read one platform invoice (raw). Throws CrmError 404 when it does not exist (voided invoices also read 404). */
export async function getPlatformInvoice(id: string): Promise<Obj> {
  return (await crmJson('/invoices/' + id + '?' + altQuery())) as Obj;
}

/** Business name printed on invoices. Env SPRY_INVOICE_BUSINESS_NAME, default "Spray It Solutions". */
export function businessName(): string {
  return (process.env.SPRY_INVOICE_BUSINESS_NAME ?? '').trim() || 'Spray It Solutions';
}
