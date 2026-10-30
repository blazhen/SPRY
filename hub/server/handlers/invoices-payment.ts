import { gate } from '../lib/auth.js';
import { crmJson, CrmError, guard } from '../lib/crm.js';
import { altBody, getPlatformInvoice, ID, mapInvoice, PAY_MODE } from '../lib/crm-extended.js';
import type { PayMethod } from '../lib/crm-extended.js';
import { jsonError, jsonOk, readJson } from '../lib/http.js';

// Served at /api/invoices/payment (dev server alias, TanStack file invoices.payment.tsx).
// POST /api/invoices/payment?id= { amount (dollars inc GST, > 0), method: card|bank|cash|cheque, at?: ISO, note? } -> { invoice }.
// Records a MANUAL payment (no card provider is used). Proven in Dev (step22): mode cash or cheque, amount, notes; partial gives
// partially_paid, the rest gives paid. One call at a time (a second call within about 5 s is refused: answered 409 here).
// The platform keeps no per-payment list we read, so the returned invoice.payments is ONE synthetic row from amountPaid
// (the method, at and note of this call). A recorded payment cannot be undone through the API.
export async function POST(request: Request): Promise<Response> {
  const denied = await gate(request);
  if (denied) return denied;
  return guard(async () => {
    const id = new URL(request.url).searchParams.get('id') ?? '';
    if (!ID.test(id)) return jsonError(400, 'Bad id');
    const b = await readJson(request);
    if (!b) return jsonError(400, 'Bad request');
    const amount = Math.round(Number(b.amount) * 100) / 100;
    if (!Number.isFinite(amount) || amount <= 0) return jsonError(400, 'amount must be more than 0');
    const method = String(b.method ?? '') as PayMethod;
    if (!Object.prototype.hasOwnProperty.call(PAY_MODE, method)) return jsonError(400, 'Bad method');
    let at = '';
    if (b.at !== undefined && b.at !== '') {
      const d = new Date(String(b.at));
      if (Number.isNaN(d.getTime())) return jsonError(400, 'Bad at');
      at = d.toISOString();
    }
    const note = String(b.note ?? '').trim().slice(0, 500);
    const inv = await getPlatformInvoice(id);
    const status = String(inv.status ?? '');
    if (status === 'void') return jsonError(409, 'Invoice is void');
    if (status === 'paid') return jsonError(409, 'Invoice is already paid');
    const total = Number(inv.total ?? 0);
    const due = inv.amountDue !== undefined ? Number(inv.amountDue) : total - Number(inv.amountPaid ?? 0);
    if (amount > Math.round(due * 100) / 100) return jsonError(400, 'amount is more than the amount due');
    const body: Record<string, unknown> = { ...altBody(), mode: PAY_MODE[method], card: {}, cheque: method === 'cheque' ? { number: 'HUB' } : {}, notes: note || 'Recorded in the Hub', amount };
    if (at) body.fulfilledAt = at;
    try {
      await crmJson('/invoices/' + id + '/record-payment', { method: 'POST', body: JSON.stringify(body) });
    } catch (e) {
      if (e instanceof CrmError && (e.status === 400 || e.status === 409 || e.status === 422)) return jsonError(409, 'The payment was refused, wait a few seconds and check the invoice');
      throw e;
    }
    const after = await getPlatformInvoice(id);
    return jsonOk({ invoice: mapInvoice(after, { method, at: at || new Date().toISOString(), note: note || undefined }) });
  });
}
