import { gate } from "../lib/auth.js";
import { crmJson, guard } from "../lib/crm.js";
import { ID } from "../lib/crm-extended.js";
import { jsonError, jsonOk, readJson } from "../lib/http.js";

// Contact tags. Proven in Dev (step20): POST /contacts/{id}/tags {tags} and DELETE /contacts/{id}/tags {tags}.
const tagList = async (contactId: string): Promise<string[]> => {
  const c = ((await crmJson("/contacts/" + contactId)).contact ?? {}) as { tags?: unknown };
  return Array.isArray(c.tags) ? c.tags.map(String) : [];
};

// POST /api/tags { contactId, tags: string[] } -> { tags } (the contact's tags after the change)
export async function POST(request: Request): Promise<Response> {
  const denied = await gate(request);
  if (denied) return denied;
  return guard(async () => {
    const b = await readJson(request);
    if (!b) return jsonError(400, "Bad request");
    const contactId = String(b.contactId ?? "");
    const tags = Array.isArray(b.tags) ? b.tags.map((t) => String(t).trim()).filter(Boolean) : [];
    if (
      !ID.test(contactId) ||
      tags.length === 0 ||
      tags.length > 20 ||
      tags.some((t) => t.length > 60)
    )
      return jsonError(400, "contactId and tags are required");
    await crmJson("/contacts/" + contactId + "/tags", {
      method: "POST",
      body: JSON.stringify({ tags }),
    });
    return jsonOk({ tags: await tagList(contactId) });
  });
}

// DELETE /api/tags?contactId=&tag= -> { tags }
export async function DELETE(request: Request): Promise<Response> {
  const denied = await gate(request);
  if (denied) return denied;
  return guard(async () => {
    const q = new URL(request.url).searchParams;
    const contactId = q.get("contactId") ?? "";
    const tag = (q.get("tag") ?? "").trim();
    if (!ID.test(contactId) || !tag || tag.length > 60)
      return jsonError(400, "contactId and tag are required");
    await crmJson("/contacts/" + contactId + "/tags", {
      method: "DELETE",
      body: JSON.stringify({ tags: [tag] }),
    });
    return jsonOk({ tags: await tagList(contactId) });
  });
}
