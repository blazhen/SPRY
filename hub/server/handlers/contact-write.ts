import { gate } from "../lib/auth.js";
import { crmJson, guard, mapContact } from "../lib/crm.js";
import { EXTRA_FIELDS, ensureExtraFields, mapContactFull } from "../lib/contact-extra.js";
import { ID, splitName } from "../lib/crm-extended.js";
import { getConfig } from "../lib/env.js";
import { jsonError, jsonOk, readJson } from "../lib/http.js";

// Served at /api/contact together with GET in contact.ts (the dev server merges methods of files that share a path).

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const s = (v: unknown, max: number): string =>
  String(v ?? "")
    .trim()
    .slice(0, max);

// POST /api/contact { name, email?, phone?, companyName? } : create or match a contact (no duplicates). 201 { contact }.
// Proven in the Dev matrix (step21): POST /contacts/upsert matches an existing contact by email or phone.
export async function POST(request: Request): Promise<Response> {
  const denied = await gate(request);
  if (denied) return denied;
  return guard(async () => {
    const b = await readJson(request);
    if (!b) return jsonError(400, "Bad request");
    const name = s(b.name, 200);
    const email = s(b.email, 200);
    const phone = s(b.phone, 40);
    if (!name) return jsonError(400, "name is required");
    if (email && !EMAIL.test(email)) return jsonError(400, "Bad email");
    const body: Record<string, unknown> = {
      locationId: getConfig().locationId,
      ...splitName(name),
    };
    if (email) body.email = email;
    if (phone) body.phone = phone;
    const company = s(b.companyName, 200);
    if (company) body.companyName = company;
    const j = await crmJson("/contacts/upsert", { method: "POST", body: JSON.stringify(body) });
    if (!j.contact) return jsonError(502, "CRM request failed (no contact)");
    return jsonOk({ contact: mapContact(j.contact as Record<string, unknown>) }, 201);
  });
}

// PUT /api/contact?id= { name?, email?, phone?, mobile?, homeAddress?, privateNote? } : update. UNTESTED against the CRM until run on Dev (PUT /contacts/{id}).
export async function PUT(request: Request): Promise<Response> {
  const denied = await gate(request);
  if (denied) return denied;
  return guard(async () => {
    const id = new URL(request.url).searchParams.get("id") ?? "";
    if (!ID.test(id)) return jsonError(400, "Bad id");
    const b = await readJson(request);
    if (!b) return jsonError(400, "Bad request");
    const body: Record<string, unknown> = {};
    if (b.name !== undefined) {
      const name = s(b.name, 200);
      if (!name) return jsonError(400, "Bad name");
      Object.assign(body, splitName(name));
    }
    if (b.email !== undefined) {
      const email = s(b.email, 200);
      if (email && !EMAIL.test(email)) return jsonError(400, "Bad email");
      body.email = email;
    }
    if (b.phone !== undefined) body.phone = s(b.phone, 40);
    // mobile, homeAddress and privateNote are contact custom fields (created in the CRM on the first write).
    const wanted = EXTRA_FIELDS.filter((w) => b[w.prop] !== undefined);
    for (const w of wanted) if (typeof b[w.prop] !== "string") return jsonError(400, "Bad " + w.prop);
    if (Object.keys(body).length === 0 && wanted.length === 0)
      return jsonError(400, "Nothing to update");
    if (wanted.length > 0) {
      const ids = await ensureExtraFields();
      body.customFields = wanted.map((w) => ({
        id: ids[w.prop],
        field_value: (b[w.prop] as string).slice(0, w.max),
      }));
    }
    const j = await crmJson("/contacts/" + id, { method: "PUT", body: JSON.stringify(body) });
    const c = (wanted.length > 0 || !j.contact ? (await crmJson("/contacts/" + id)).contact : j.contact) as
      Record<string, unknown> | undefined;
    if (!c) return jsonError(404, "Not found");
    return jsonOk({ contact: await mapContactFull(c) });
  });
}
