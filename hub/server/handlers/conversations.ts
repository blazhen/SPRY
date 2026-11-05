import { gate } from "../lib/auth.js";
import { crmJson, guard } from "../lib/crm.js";
import { ID } from "../lib/crm-extended.js";
import { getConfig } from "../lib/env.js";
import { jsonError, jsonOk } from "../lib/http.js";

// Conversation messages for a contact.
// In the CRM:
// 1. GET /conversations/search?locationId=...&contactId=...
// 2. For each conversation, GET /conversations/{conversationId}/messages?limit=50
// Map into Hub Message shape: { id, jobId, contactId, channel, direction, at, subject, body, automated }

export async function GET(request: Request): Promise<Response> {
  const denied = await gate(request);
  if (denied) return denied;
  return guard(async () => {
    const url = new URL(request.url);
    const contactId = url.searchParams.get("contactId") ?? "";
    const jobId = url.searchParams.get("jobId") ?? "";
    if (!ID.test(contactId) && !ID.test(jobId)) {
      return jsonError(400, "contactId or jobId is required");
    }

    let targetContactId = contactId;
    if (!targetContactId && jobId) {
      try {
        const opp = ((await crmJson("/opportunities/" + jobId)).opportunity ?? {}) as Record<
          string,
          unknown
        >;
        const contactRaw = opp.contact as Record<string, unknown> | undefined;
        targetContactId = String(opp.contactId ?? contactRaw?.id ?? "");
      } catch {
        // Opp not found or failed
      }
    }

    if (!targetContactId) {
      return jsonOk({ messages: [], conversations: [] });
    }

    const L = getConfig().locationId;
    let convList: Record<string, unknown>[] = [];
    try {
      const searchRes = await crmJson(
        `/conversations/search?locationId=${L}&contactId=${targetContactId}&limit=10`,
      );
      convList = (searchRes.conversations ?? []) as Record<string, unknown>[];
    } catch {
      // conversations scope may not be granted or endpoint returned error
      return jsonOk({ messages: [], conversations: [], unconfigured: true });
    }

    const messages: Record<string, unknown>[] = [];
    for (const conv of convList.slice(0, 3)) {
      const convId = String(conv.id ?? conv._id ?? "");
      if (!convId) continue;
      try {
        const msgRes = await crmJson(`/conversations/${convId}/messages?limit=50`);
        const rawMsgs = (msgRes.messages?.messages ?? msgRes.messages ?? []) as Record<
          string,
          unknown
        >[];
        for (const m of rawMsgs) {
          const type = String(m.messageType ?? m.type ?? "").toLowerCase();
          const channel = type.includes("email") ? "email" : type.includes("call") ? "call" : "sms";
          const dir = String(m.direction ?? "")
            .toLowerCase()
            .includes("in")
            ? "in"
            : "out";
          const dateStr = String(m.dateAdded ?? m.createdAt ?? "");
          messages.push({
            id: String(m.id ?? m._id ?? ""),
            jobId: jobId || "",
            contactId: targetContactId,
            channel,
            direction: dir,
            at:
              dateStr && !Number.isNaN(Date.parse(dateStr))
                ? new Date(dateStr).toISOString()
                : new Date().toISOString(),
            subject: m.subject ? String(m.subject) : undefined,
            body: String(m.body ?? m.message ?? ""),
            automated: m.automated === true || m.source === "workflow",
            callMinutes: typeof m.duration === "number" ? Math.round(m.duration / 60) : undefined,
          });
        }
      } catch {
        // continue
      }
    }

    messages.sort((a, b) => (String(a.at) < String(b.at) ? 1 : -1));
    return jsonOk({ messages, conversations: convList });
  });
}
