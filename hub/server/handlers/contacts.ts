import { gate } from "../lib/auth.js";
import { crmJson, guard } from "../lib/crm.js";
import { mapContactFull } from "../lib/contact-extra.js";
import { getConfig } from "../lib/env.js";
import { intParam, jsonOk } from "../lib/http.js";

const PAGE = 20;

// GET /api/contacts?q=&page= : search contacts, 20 per page.
export async function GET(request: Request): Promise<Response> {
  const denied = await gate(request);
  if (denied) return denied;
  return guard(async () => {
    const url = new URL(request.url);
    const page = intParam(url, "page", 1);
    const q = (url.searchParams.get("q") ?? "").trim().slice(0, 100);
    const body: Record<string, unknown> = {
      locationId: getConfig().locationId,
      pageLimit: PAGE,
      page,
    };
    if (q) body.query = q;
    const j = await crmJson("/contacts/search", { method: "POST", body: JSON.stringify(body) });
    const contacts = await Promise.all(
      ((j.contacts ?? []) as Record<string, unknown>[]).map(mapContactFull),
    );
    return jsonOk({ contacts, page, pageSize: PAGE, total: Number(j.total ?? contacts.length) });
  });
}
