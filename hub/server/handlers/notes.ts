import { gate } from '../lib/auth.js';
import { crmJson, guard } from '../lib/crm.js';
import { ID, mapNote } from '../lib/crm-extended.js';
import { jsonError, jsonOk, readJson } from '../lib/http.js';

// Notes live on the contact (the platform has no job notes). Contact notes endpoints were exercised in the Dev matrix (step21);
// the Hub routes themselves are UNTESTED against the CRM until run on Dev.

export async function GET(request: Request): Promise<Response> {
  const denied = await gate(request);
  if (denied) return denied;
  return guard(async () => {
    const contactId = new URL(request.url).searchParams.get('contactId') ?? '';
    if (!ID.test(contactId)) return jsonError(400, 'Bad contactId');
    const j = await crmJson('/contacts/' + contactId + '/notes');
    return jsonOk({ notes: ((j.notes ?? []) as Record<string, unknown>[]).map(mapNote) });
  });
}

// POST /api/notes { contactId, body } -> 201 { note }
export async function POST(request: Request): Promise<Response> {
  const denied = await gate(request);
  if (denied) return denied;
  return guard(async () => {
    const b = await readJson(request);
    if (!b) return jsonError(400, 'Bad request');
    const contactId = String(b.contactId ?? '');
    const body = String(b.body ?? '').trim().slice(0, 5000);
    if (!ID.test(contactId) || !body) return jsonError(400, 'contactId and body are required');
    const j = await crmJson('/contacts/' + contactId + '/notes', { method: 'POST', body: JSON.stringify({ body }) });
    return jsonOk({ note: mapNote((j.note ?? j) as Record<string, unknown>) }, 201);
  });
}

// DELETE /api/notes?contactId=&id= -> { ok: true }
export async function DELETE(request: Request): Promise<Response> {
  const denied = await gate(request);
  if (denied) return denied;
  return guard(async () => {
    const q = new URL(request.url).searchParams;
    const contactId = q.get('contactId') ?? '';
    const id = q.get('id') ?? '';
    if (!ID.test(contactId) || !ID.test(id)) return jsonError(400, 'contactId and id are required');
    await crmJson('/contacts/' + contactId + '/notes/' + id, { method: 'DELETE' });
    return jsonOk({ ok: true });
  });
}
