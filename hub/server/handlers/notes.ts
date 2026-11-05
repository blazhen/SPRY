import { gate } from "../lib/auth.js";
import { crmJson, guard } from "../lib/crm.js";
import { ID, mapNote } from "../lib/crm-extended.js";
import { getConfig } from "../lib/env.js";
import { jsonError, jsonOk, readJson } from "../lib/http.js";

// Notes live on the contact (the platform has no job notes). Contact notes endpoints were exercised in the Dev matrix (step21).
// When ?conversations=1 is requested, also queries conversations/messages for this contact if allowed by the token.

export async function GET(request: Request): Promise<Response> {
  const denied = await gate(request);
  if (denied) return denied;
  return guard(async () => {
    const url = new URL(request.url);
    const contactId = url.searchParams.get("contactId") ?? "";
    if (!ID.test(contactId)) return jsonError(400, "Bad contactId");

    const wantConversations = url.searchParams.get("conversations") === "1";
    if (wantConversations) {
      const L = getConfig().locationId;
      try {
        const search = await crmJson(
          `/conversations/search?locationId=${L}&contactId=${contactId}&limit=5`,
        );
        const convList = (search.conversations ?? []) as Record<string, unknown>[];
        const messages: Record<string, unknown>[] = [];
        for (const conv of convList.slice(0, 2)) {
          const convId = String(conv.id ?? conv._id ?? "");
          if (!convId) continue;
          try {
            const msgRes = await crmJson(`/conversations/${convId}/messages?limit=50`);
            const raw = (msgRes.messages?.messages ?? msgRes.messages ?? []) as Record<
              string,
              unknown
            >[];
            for (const m of raw) {
              const type = String(m.messageType ?? m.type ?? "").toLowerCase();
              const channel = type.includes("email")
                ? "email"
                : type.includes("call")
                  ? "call"
                  : "sms";
              const dir = String(m.direction ?? "")
                .toLowerCase()
                .includes("in")
                ? "in"
                : "out";
              const dateStr = String(m.dateAdded ?? m.createdAt ?? "");
              messages.push({
                id: String(m.id ?? m._id ?? ""),
                contactId,
                channel,
                direction: dir,
                at:
                  dateStr && !Number.isNaN(Date.parse(dateStr))
                    ? new Date(dateStr).toISOString()
                    : new Date().toISOString(),
                subject: m.subject ? String(m.subject) : undefined,
                body: String(m.body ?? m.message ?? ""),
                automated: m.automated === true || m.source === "workflow",
                callMinutes:
                  typeof m.duration === "number" ? Math.round(m.duration / 60) : undefined,
              });
            }
          } catch {
            // continue
          }
        }
        messages.sort((a, b) => (String(a.at) < String(b.at) ? 1 : -1));
        return jsonOk({ messages, conversations: convList, ok: true });
      } catch (err: any) {
        return jsonOk({ messages: [], conversations: [], error: err.message ?? "Not available" });
      }
    }

    const j = await crmJson("/contacts/" + contactId + "/notes");
    return jsonOk({ notes: ((j.notes ?? []) as Record<string, unknown>[]).map(mapNote) });
  });
}

// POST /api/notes { contactId, body } -> 201 { note }
export async function POST(request: Request): Promise<Response> {
  const denied = await gate(request);
  if (denied) return denied;
  return guard(async () => {
    const b = await readJson(request);
    if (!b) return jsonError(400, "Bad request");
    const contactId = String(b.contactId ?? "");
    const body = String(b.body ?? "")
      .trim()
      .slice(0, 5000);
    if (!ID.test(contactId) || !body) return jsonError(400, "contactId and body are required");
    const j = await crmJson("/contacts/" + contactId + "/notes", {
      method: "POST",
      body: JSON.stringify({ body }),
    });
    return jsonOk({ note: mapNote((j.note ?? j) as Record<string, unknown>) }, 201);
  });
}

// DELETE /api/notes?contactId=&id= -> { ok: true }
export async function DELETE(request: Request): Promise<Response> {
  const denied = await gate(request);
  if (denied) return denied;
  return guard(async () => {
    const q = new URL(request.url).searchParams;
    const contactId = q.get("contactId") ?? "";
    const id = q.get("id") ?? "";
    if (!ID.test(contactId) || !ID.test(id)) return jsonError(400, "contactId and id are required");
    await crmJson("/contacts/" + contactId + "/notes/" + id, { method: "DELETE" });
    return jsonOk({ ok: true });
  });
}
