import { gate } from "../lib/auth.js";
import { CrmError, crmJson, guard } from "../lib/crm.js";
import { ID } from "../lib/crm-extended.js";
import { jsonError, jsonOk, readJson } from "../lib/http.js";
import { isDnd, LIMITS, MAX_EMAIL, MAX_SMS, takeSendSlot, textToHtml } from "../lib/send.js";
import { getStore } from "../store/index.js";

// Send one text or email to one contact through the CRM. Guarded three ways: the server owner must allow it
// (env HUB_SEND_ALLOWED=1), staff must switch it on in Settings (store hubsettings/send), and a rate limit applies.
// The message text is never stored by the Hub (the CRM keeps it in the conversation); the log holds no text.
const SETTINGS = "hubsettings";
const LOG = "sendlog";

interface State {
  allowed: boolean;
  enabled: boolean;
  canSend: boolean;
  emailFrom: string;
  limits: { perMinute: number; perHour: number };
}

async function readEnabled(): Promise<boolean> {
  try {
    const store = await getStore();
    if (!store) return false;
    const r = await store.get(SETTINGS, "send");
    return (r?.data as { enabled?: unknown } | undefined)?.enabled === true;
  } catch {
    return false;
  }
}

async function state(): Promise<State> {
  const allowed = process.env.HUB_SEND_ALLOWED === "1";
  const enabled = await readEnabled();
  return {
    allowed,
    enabled,
    canSend: allowed && enabled,
    emailFrom: (process.env.HUB_EMAIL_FROM ?? "").trim(),
    limits: { perMinute: LIMITS.perMinute, perHour: LIMITS.perHour },
  };
}

export async function GET(request: Request): Promise<Response> {
  const denied = await gate(request);
  if (denied) return denied;
  return jsonOk(await state());
}

// PUT /api/send { enabled, by? } -> the same shape as GET. Refused unless the server owner allowed sending.
export async function PUT(request: Request): Promise<Response> {
  const denied = await gate(request);
  if (denied) return denied;
  if (process.env.HUB_SEND_ALLOWED !== "1") return jsonError(403, "Sending is locked on the server. Only the server owner can unlock it.");
  const b = await readJson(request);
  if (!b || typeof b.enabled !== "boolean") return jsonError(400, "enabled must be true or false");
  const store = await getStore();
  if (!store) return jsonError(503, "Settings cannot be saved: the Hub storage is not available");
  try {
    await store.put(SETTINGS, "send", { enabled: b.enabled, by: String(b.by ?? "").slice(0, 80), at: new Date().toISOString() });
  } catch {
    return jsonError(500, "Settings could not be saved");
  }
  return jsonOk(await state());
}

const reason = (e: CrmError): string => String(e.message ?? "").replace(/\s+/g, " ").slice(0, 200);

// POST /api/send { contactId, channel, body, subject?, jobId?, sentBy? } -> 201 { ok, messageId, conversationId, to, channel, at }
export async function POST(request: Request): Promise<Response> {
  const denied = await gate(request);
  if (denied) return denied;
  const st = await state();
  if (!st.canSend) return jsonError(403, "Sending is switched off. Turn on 'Send texts and emails from the Hub' in Settings (the server must also allow it).");
  return guard(async () => {
    const b = await readJson(request);
    if (!b) return jsonError(400, "Bad request");
    const contactId = typeof b.contactId === "string" ? b.contactId : "";
    const jobId = typeof b.jobId === "string" ? b.jobId : "";
    const channel = b.channel === "sms" || b.channel === "email" ? b.channel : null;
    const body = typeof b.body === "string" ? b.body : "";
    const subject = typeof b.subject === "string" ? b.subject.trim() : "";
    const sentBy = typeof b.sentBy === "string" ? b.sentBy.trim().slice(0, 80) : "";
    if (!ID.test(contactId)) return jsonError(400, "Pick one contact to send to");
    if (jobId && !ID.test(jobId)) return jsonError(400, "Bad jobId");
    if (!channel) return jsonError(400, "Channel must be sms or email");
    if (!body.trim()) return jsonError(400, "The message is empty");
    if (channel === "sms" && body.length > MAX_SMS) return jsonError(400, "The text is too long (" + MAX_SMS + " characters at most)");
    if (channel === "email" && body.length > MAX_EMAIL) return jsonError(400, "The email is too long (" + MAX_EMAIL + " characters at most)");
    if (channel === "email" && !subject) return jsonError(400, "An email needs a subject");
    if (channel === "email" && subject.length > 300) return jsonError(400, "The subject is too long (300 characters at most)");

    let contact: Record<string, unknown>;
    try {
      contact = ((await crmJson("/contacts/" + contactId)).contact ?? {}) as Record<string, unknown>;
    } catch (e) {
      if (e instanceof CrmError && e.status === 404) return jsonError(404, "That contact was not found");
      if (e instanceof CrmError) return jsonError(502, "The CRM did not answer when looking up the contact: " + reason(e));
      if (e instanceof TypeError) return jsonError(502, "The Hub server could not reach the CRM");
      throw e;
    }
    const first = String(contact.firstName ?? "");
    const last = String(contact.lastName ?? "");
    const name = String(contact.contactName ?? (`${first} ${last}`.trim() || contact.name || "This contact"));
    const phone = String(contact.phone ?? "").trim();
    const email = String(contact.email ?? "").trim();
    if (channel === "sms" && !phone) return jsonError(409, name + " has no phone number on file");
    if (channel === "email" && !email) return jsonError(409, name + " has no email on file");
    if (isDnd(contact, channel)) return jsonError(409, name + " has asked not to receive " + (channel === "sms" ? "texts" : "emails"));
    if (!takeSendSlot(contactId)) return jsonError(429, "Too many messages just now. Wait a minute and try again.");

    // Request shape from the CRM's published endpoint list (POST /conversations/messages). UNPROVEN against the live CRM until
    // tested in Dev: type "SMS" | "Email", contactId, message, and for email subject, html, emailFrom.
    const payload: Record<string, unknown> =
      channel === "sms"
        ? { type: "SMS", contactId, message: body }
        : { type: "Email", contactId, subject, html: textToHtml(body), message: body };
    if (channel === "email" && st.emailFrom) payload.emailFrom = st.emailFrom;

    let sent: Record<string, unknown>;
    try {
      sent = await crmJson("/conversations/messages", { method: "POST", body: JSON.stringify(payload) }); // never retried
    } catch (e) {
      if (e instanceof CrmError) return jsonError(502, "The CRM did not send it: " + reason(e));
      if (e instanceof TypeError) return jsonError(502, "The Hub server could not reach the CRM");
      throw e;
    }
    const messageId = String(sent.messageId ?? sent.id ?? "");
    const conversationId = String(sent.conversationId ?? "");
    const at = new Date().toISOString();
    const address = channel === "sms" ? phone : email;
    try {
      const store = await getStore();
      if (store) {
        await store.put(LOG, globalThis.crypto.randomUUID(), {
          at,
          by: sentBy || "unknown",
          contactId,
          channel,
          to: address,
          length: body.length,
          jobId,
          messageId,
        });
      }
    } catch {
      /* the message is already sent: a failed log write does not undo it */
    }
    return jsonOk({ ok: true, messageId, conversationId, to: { name, address }, channel, at }, 201);
  });
}
