import { gate } from '../lib/auth.js';
import { crmJson, guard } from '../lib/crm.js';
import { altBody, altQuery, getUsers, ID, mapInvoice } from '../lib/crm-extended.js';
import { jsonError, jsonOk } from '../lib/http.js';

// Served at /api/invoices/send (dev server alias, TanStack file invoices.send.tsx).
// POST /api/invoices/send?id= -> { invoice }. Sends by EMAIL ONLY, to the contact on the invoice (never SMS).
// Only a DRAFT can be sent (any other status answers 409 "Only drafts can be sent", no send call).
// Proven in Dev (step22): POST /invoices/{id}/send { altId, altType, userId, action: 'email', liveMode: true } makes the invoice status sent.
export async function POST(request: Request): Promise<Response> {
  const denied = await gate(request);
  if (denied) return denied;
  return guard(async () => {
    const id = new URL(request.url).searchParams.get('id') ?? '';
    if (!ID.test(id)) return jsonError(400, 'Bad id');
    const inv = (await crmJson('/invoices/' + id + '?' + altQuery())) as Record<string, unknown>;
    const status = String(inv.status ?? '');
    // Drafts only: a re-send of a sent, part paid, paid or void invoice would email the customer again.
    if (status !== 'draft') return jsonError(409, 'Only drafts can be sent');
    const contact = (inv.contactDetails ?? {}) as { email?: unknown };
    if (!contact.email) return jsonError(400, 'The invoice contact has no email');
    const users = await getUsers();
    const userId = users[0]?.id;
    if (!userId) return jsonError(502, 'CRM request failed (no sender user)');
    await crmJson('/invoices/' + id + '/send', { method: 'POST', body: JSON.stringify({ ...altBody(), userId, action: 'email', liveMode: true }) });
    const after = (await crmJson('/invoices/' + id + '?' + altQuery())) as Record<string, unknown>;
    return jsonOk({ invoice: mapInvoice(after) });
  });
}
