import { gate } from "../lib/auth.js";
import { crmJson, guard } from "../lib/crm.js";
import { mapContactFull } from "../lib/contact-extra.js";
import { jsonError, jsonOk } from "../lib/http.js";

// GET /api/contact?id= : one contact.
export async function GET(request: Request): Promise<Response> {
  const denied = await gate(request);
  if (denied) return denied;
  return guard(async () => {
    const id = new URL(request.url).searchParams.get("id") ?? "";
    if (!/^[A-Za-z0-9]{6,64}$/.test(id)) return jsonError(400, "Bad id");
    const j = await crmJson("/contacts/" + id);
    if (!j.contact) return jsonError(404, "Not found");
    return jsonOk({ contact: await mapContactFull(j.contact as Record<string, unknown>) });
  });
}
