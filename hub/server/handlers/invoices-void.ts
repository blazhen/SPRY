import { gate } from '../lib/auth.js';
import { crmJson, guard } from '../lib/crm.js';
import { altBody, getPlatformInvoice, ID, mapInvoice } from '../lib/crm-extended.js';
import { jsonError, jsonOk, readJson } from '../lib/http.js';

// Served at /api/invoices/void (dev server alias, TanStack file invoices.void.tsx).
// POST /api/invoices/void?id= { reason? } -> { invoice } with status void and voidReason (the platform does not store the reason).
// Proven in Dev (step22): void on a SENT unpaid invoice works (it then reads 404). The platform refuses a DRAFT ("delete it
// instead") and a paid or part paid one ("refund first"): all answered 409 here, with no platform void call.
export async function POST(request: Request): Promise<Response> {
  const denied = await gate(request);
  if (denied) return denied;
  return guard(async () => {
    const id = new URL(request.url).searchParams.get('id') ?? '';
    if (!ID.test(id)) return jsonError(400, 'Bad id');
    const b = (await readJson(request)) ?? {};
    const reason = String(b.reason ?? '').trim().slice(0, 500);
    const inv = await getPlatformInvoice(id);
    const status = String(inv.status ?? '');
    if (status === 'paid' || status === 'partially_paid') return jsonError(409, 'A paid or part paid invoice cannot be voided');
    if (status === 'draft') return jsonError(409, 'Drafts are deleted, not voided');
    await crmJson('/invoices/' + id + '/void', { method: 'POST', body: JSON.stringify(altBody()) });
    const out = mapInvoice({ ...inv, status: 'void' });
    if (reason) out.voidReason = reason;
    return jsonOk({ invoice: out });
  });
}
