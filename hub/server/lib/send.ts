// Checks and the rate limit for sending a text or email through the CRM (handlers/send.ts).
// The limit is kept in this process's memory only: it resets when the server restarts, and each server instance counts for itself.
// That is on purpose: a simple brake against a runaway client or a loop, not accounting.

export const LIMITS = { perMinute: 5, perHour: 30, perContactPerHour: 3 } as const;
export const MAX_SMS = 1000;
export const MAX_EMAIL = 20000;

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const all: number[] = [];
const perContact = new Map<string, number[]>();

function prune(list: number[], now: number, span: number): void {
  while (list.length && now - list[0] >= span) list.shift();
}

/**
 * Count one send now, or refuse. Returns true when it is allowed (and recorded), false when over a limit.
 * Counted when the send is attempted, before the CRM is called, so a burst of parallel requests cannot slip past.
 */
export function takeSendSlot(contactId: string, now = Date.now()): boolean {
  prune(all, now, HOUR);
  const mine = perContact.get(contactId) ?? [];
  prune(mine, now, HOUR);
  const lastMinute = all.filter((t) => now - t < MIN).length;
  if (lastMinute >= LIMITS.perMinute || all.length >= LIMITS.perHour || mine.length >= LIMITS.perContactPerHour) {
    if (mine.length) perContact.set(contactId, mine);
    return false;
  }
  all.push(now);
  mine.push(now);
  perContact.set(contactId, mine);
  if (perContact.size > 500) for (const [k, v] of perContact) if (!v.length || now - v[v.length - 1] >= HOUR) perContact.delete(k);
  return true;
}

/** Test helper: forget all counts. */
export function resetSendLimits(): void {
  all.length = 0;
  perContact.clear();
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** Plain text to simple HTML: escaped, newlines as <br>. */
export function textToHtml(s: string): string {
  return escapeHtml(s).replace(/\r\n|\r|\n/g, "<br>");
}

type Obj = Record<string, unknown>;

/**
 * Has this contact asked not to be contacted on this channel?
 * BEST EFFORT, field names UNPROVEN against the real CRM: contact.dnd === true (all channels), or
 * contact.dndSettings.SMS.status / .Email.status === "active". Verify in the Dev account before relying on it.
 */
export function isDnd(contact: Obj, channel: "sms" | "email"): boolean {
  if (contact.dnd === true) return true;
  const s = contact.dndSettings as Obj | undefined;
  const one = s?.[channel === "sms" ? "SMS" : "Email"] as Obj | undefined;
  return one?.status === "active";
}
