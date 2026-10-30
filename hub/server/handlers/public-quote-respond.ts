import { jsonError, jsonOk, readJsonCapped } from '../lib/http.js';
import { publicGate, notFound } from '../lib/public-link.js';
import { ConflictError, getStore } from '../store/index.js';
import { acceptedTotalOf, isExpired, isViewable, loadContext, moveJobForAccept, toView, updateQuote, type Change } from '../lib/public-quote.js';

type Obj = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const PUBLIC_MAX_BODY = 64 * 1024;
const gone = () => jsonError(410, 'This quote has expired');
const wrongState = () => jsonError(409, 'This quote cannot be changed now');

// POST /api/public/quote/respond?id=&k= body { action: 'tick'|'accept'|'decline', upgradeId?, ticked?, reason? } -> same shape as GET
export async function POST(request: Request): Promise<Response> {
  const g = await publicGate(request);
  if (g instanceof Response) return g;
  // Streaming byte cap (64 KB, works without Content-Length). A POST with no Origin header is refused by publicGate (403).
  const read = await readJsonCapped(request, PUBLIC_MAX_BODY);
  if (!read.ok) return jsonError(read.status, read.error);
  const b = read.value;
  const action = b.action;
  if ((action !== 'tick' && action !== 'accept' && action !== 'decline')) return jsonError(400, 'Bad request');
  try {
    const store = await getStore();
    if (!store) return jsonError(503, 'Not configured');
    const out = await updateQuote(store, g.id, (q): Change => {
      const now = new Date().toISOString();
      if (!isViewable(q)) return { ok: false, res: notFound() };
      const stored = String(q.status);
      if (action === 'tick') {
        if (stored !== 'Sent' && stored !== 'Expired') return { ok: false, res: wrongState() };
        if (isExpired(q)) return { ok: false, res: gone() };
        const ups: Obj[] = Array.isArray(q.upgrades) ? q.upgrades : [];
        if (typeof b.upgradeId !== 'string' || typeof b.ticked !== 'boolean' || !ups.some((u) => u.id === b.upgradeId)) return { ok: false, res: jsonError(400, 'Bad request') };
        return { ok: true, data: { ...q, upgrades: ups.map((u) => (u.id === b.upgradeId ? { ...u, ticked: b.ticked } : u)), updatedAt: now } };
      }
      if (action === 'accept') {
        if (stored === 'Accepted') return { ok: true, data: q }; // idempotent: same result, nothing rewritten
        if (isExpired(q)) return { ok: false, res: gone() };
        if (stored !== 'Sent') return { ok: false, res: wrongState() };
        return { ok: true, data: { ...q, status: 'Accepted', acceptedVia: 'online', acceptedAt: now, acceptedTotal: acceptedTotalOf(q), acceptedPending: true, updatedAt: now } };
      }
      if (stored === 'Declined') return { ok: true, data: q };
      if (isExpired(q)) return { ok: false, res: gone() };
      if (stored !== 'Sent') return { ok: false, res: wrongState() };
      const reason = typeof b.reason === 'string' ? b.reason.trim().slice(0, 500) : '';
      return { ok: true, data: { ...q, status: 'Declined', declinedAt: now, declineReason: reason || undefined, updatedAt: now } };
    });
    if (out === null) return notFound();
    if (out instanceof Response) return out;
    // CRM follow-up on accept (also on a repeat while the staff side has not yet handled it: forward only, so safe to repeat). Add-ons never move the job.
    // Once a move succeeded the quote carries crmMoved: true and repeats skip the CRM; a failed move is retried on the next accept.
    let view = out.data;
    if (action === 'accept' && out.data.acceptedPending === true && out.data.kind !== 'addon' && out.data.crmMoved !== true) {
      if (await moveJobForAccept(String(out.data.jobId ?? ''))) {
        const marked = await updateQuote(store, g.id, (q): Change => (q.crmMoved === true ? { ok: true, data: q } : { ok: true, data: { ...q, crmMoved: true, updatedAt: new Date().toISOString() } }));
        if (marked && !(marked instanceof Response)) view = marked.data;
      }
    }
    return jsonOk(toView(view, await loadContext(view, store)));
  } catch (e) {
    if (e instanceof ConflictError) return jsonError(409, 'Please try again');
    return jsonError(503, 'Unavailable');
  }
}
