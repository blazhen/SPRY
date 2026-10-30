import { crmJson, getPipelines } from './crm.js';
import { ID, stageIdForName } from './crm-extended.js';
import { quoteTotal } from './quote-calc.js';
import { ConflictError, type HubStore } from '../store/index.js';

// Shared logic for the public quote routes. The stored quote is the Hub's Quote shape (src/types.ts), kept field for field.
type Obj = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

/** Statuses a customer may see. Draft and Superseded are never shown. */
const VIEWABLE = new Set(['Sent', 'Accepted', 'Declined', 'Expired']);
export const isViewable = (q: Obj): boolean => VIEWABLE.has(String(q.status));

/** Today as YYYY-MM-DD in the business time zone (SPRY_TIMEZONE, default Australia/Melbourne). */
export function todayISO(now: Date = new Date()): string {
  const tz = (process.env.SPRY_TIMEZONE ?? '').trim() || 'Australia/Melbourne';
  try {
    return now.toLocaleDateString('en-CA', { timeZone: tz });
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

export const isExpired = (q: Obj): boolean => q.status === 'Expired' || (q.status === 'Sent' && !!q.validUntil && String(q.validUntil) < todayISO());

export const businessName = (): string => (process.env.SPRY_BUSINESS_NAME ?? '').trim() || 'Spray It Solutions';
const acceptedStageName = (): string => (process.env.SPRY_ACCEPTED_STAGE ?? '').trim() || 'Quote Accepted';

export interface Context { terms: string; recipientName: string; jobName: string; jobAddress: string }

async function firstNameOf(contactId: string): Promise<string> {
  if (!ID.test(contactId)) return '';
  const c = ((await crmJson('/contacts/' + contactId)).contact ?? {}) as Obj;
  const first = String(c.firstName ?? '').trim();
  return first || String(c.contactName ?? c.name ?? '').trim().split(/\s+/)[0] || '';
}

/** Terms text, recipient first name, job name and address. Each part fails soft to ''. */
export async function loadContext(q: Obj, store: HubStore): Promise<Context> {
  const ctx: Context = { terms: '', recipientName: '', jobName: '', jobAddress: '' };
  try {
    if (q.termsId === 'custom') ctx.terms = String(q.termsCustom ?? '');
    else if (q.termsId) ctx.terms = String(((await store.get('terms', String(q.termsId)))?.data as Obj | undefined)?.text ?? '');
  } catch { /* leave empty */ }
  try {
    if (ID.test(String(q.jobId ?? ''))) {
      const o = ((await crmJson('/opportunities/' + q.jobId)).opportunity ?? {}) as Obj;
      ctx.jobName = String(o.name ?? '');
      ctx.jobAddress = [o.contact?.address1, o.contact?.city].filter(Boolean).join(', ');
    }
  } catch { /* leave empty */ }
  try {
    const r = (q.recipient ?? {}) as Obj;
    if (r.kind === 'company') {
      const co = ((await store.get('companies', String(r.id ?? '')))?.data ?? {}) as Obj;
      ctx.recipientName = (co.attnContactId ? await firstNameOf(String(co.attnContactId)) : '') || String(co.name ?? '');
    } else ctx.recipientName = await firstNameOf(String(r.id ?? ''));
  } catch { /* leave empty */ }
  return ctx;
}

/** The only shape a customer ever receives. Whitelisted field by field; ids that point at the CRM are replaced. */
export function toView(q: Obj, ctx: Context): Obj {
  const arr = (v: unknown): Obj[] => (Array.isArray(v) ? (v as Obj[]) : []);
  const view: Obj = {
    id: q.id, jobId: 'job', recipient: { kind: 'contact', id: 'recipient' },
    number: q.number, title: q.title, revision: q.revision, kind: q.kind, productType: q.productType,
    status: isExpired(q) ? 'Expired' : q.status,
    gstApplies: q.gstApplies, validDays: q.validDays, sentAt: q.sentAt, validUntil: q.validUntil,
    notes: q.notes ?? '',
    lines: arr(q.lines).map((l) => ({ id: l.id, section: l.section ?? '', name: l.name ?? '', description: l.description ?? '', qty: l.qty, unit: l.unit, unitPrice: l.unitPrice ?? null })),
    upgrades: arr(q.upgrades).map((u) => ({ id: u.id, lineId: u.lineId, name: u.name ?? '', description: u.description ?? '', unitPrice: u.unitPrice ?? null, ticked: !!u.ticked })),
    payments: arr(q.payments).map((p) => ({ id: p.id, label: p.label ?? '', kind: p.kind, value: p.value, dueRule: p.dueRule })),
    paymentPreset: q.paymentPreset ?? 'custom',
    termsId: 'custom', termsCustom: ctx.terms,
    acceptedVia: q.acceptedVia, acceptedAt: q.acceptedAt, acceptedTotal: q.acceptedTotal, declinedAt: q.declinedAt,
    createdAt: q.createdAt, updatedAt: q.updatedAt, placeholder: true,
  };
  return {
    quote: view,
    businessName: businessName(),
    recipientName: ctx.recipientName,
    jobName: ctx.jobName,
    jobAddress: ctx.jobAddress,
  };
}

export type Change = { ok: true; data: Obj } | { ok: false; res: Response };

/** Read, change and write one stored quote with ifUpdatedAt, retrying once on a conflict. Returns null when the quote does not exist. */
export async function updateQuote(store: HubStore, id: string, fn: (q: Obj) => Change): Promise<{ data: Obj } | Response | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const rec = await store.get('quotes', id);
    if (!rec || !rec.data || typeof rec.data !== 'object') return null;
    const c = fn(rec.data as Obj);
    if (!c.ok) return c.res;
    if (c.data === rec.data) return { data: c.data };
    try {
      const saved = await store.put('quotes', id, c.data, rec.updatedAt);
      return { data: saved.data as Obj };
    } catch (e) {
      if (!(e instanceof ConflictError) || attempt === 1) throw e;
    }
  }
  return null;
}

export const acceptedTotalOf = (q: Obj): number =>
  quoteTotal(Array.isArray(q.lines) ? q.lines : [], Array.isArray(q.upgrades) ? q.upgrades : [], q.gstApplies !== false);

/** After an accept: move the job to Quote Accepted only if it is earlier in its pipeline, and mark it won (unless staff set it lost or abandoned). Returns false on any CRM failure. */
export async function moveJobForAccept(jobId: string): Promise<boolean> {
  try {
    if (!ID.test(jobId)) return false;
    const o = ((await crmJson('/opportunities/' + jobId)).opportunity ?? {}) as Obj;
    const pipelines = await getPipelines();
    const pipe = pipelines.find((p) => p.id === o.pipelineId);
    const target = stageIdForName(pipelines, String(o.pipelineId ?? ''), acceptedStageName());
    if (pipe && target) {
      const cur = pipe.stages.findIndex((s) => s.id === o.pipelineStageId);
      const to = pipe.stages.findIndex((s) => s.id === target);
      if (cur < to) await crmJson('/opportunities/' + jobId, { method: 'PUT', body: JSON.stringify({ pipelineStageId: target }) });
    }
    // Never reopen a decision staff made: a job they set to lost or abandoned keeps its status (the stage may still move forward).
    if (o.status !== 'won' && o.status !== 'lost' && o.status !== 'abandoned') await crmJson('/opportunities/' + jobId + '/status', { method: 'PUT', body: JSON.stringify({ status: 'won' }) });
    return true;
  } catch {
    return false;
  }
}
