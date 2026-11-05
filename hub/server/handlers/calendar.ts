import { gate } from "../lib/auth.js";
import {
  dropCalendarCache,
  freeSlots,
  listCalendars,
  listEvents,
  mapEvent,
  notifyCustomer,
  type CalendarEvent,
} from "../lib/calendar.js";
import { CrmError, crmJson, guard } from "../lib/crm.js";
import { ID } from "../lib/crm-extended.js";
import { ConfigError, getConfig } from "../lib/env.js";
import { jsonError, jsonOk, readJson } from "../lib/http.js";
import { getStore } from "../store/index.js";

// CRM calendars (Round 11 A). GET ?view=calendars | events | slots, POST book, PUT move or cancel.
// The Hub keeps one small record per booking it made (collection bookinglinks: event id -> job id) so an event can be shown on its job.
// An event with no link is shown on the contact's jobs by the screens (same contact). The customer messages come from the CRM, never from here.
const LINKS = "bookinglinks";

/** guard() with plain reasons for the calendar, so staff are told what is wrong (no secrets, no raw bodies). The client shows these words. */
function calGuard(fn: () => Promise<Response>): Promise<Response> {
  return guard(async () => {
    try {
      return await fn();
    } catch (e) {
      if (e instanceof ConfigError)
        return jsonError(503, "Calendar is not set up: the Hub server is missing its CRM connection settings (access key, address or location)");
      if (e instanceof CrmError) {
        if (e.status === 401 || e.status === 403)
          return jsonError(502, "Calendar is not set up: the CRM refused calendar access. The access key needs the calendars and calendar events permissions (CRM said " + e.status + ")");
        if (e.status === 429) return jsonError(502, "The CRM is busy. Try again in a minute");
        if (e.status >= 500) return jsonError(502, "The CRM is not answering right now (" + e.status + ")");
      }
      if (e instanceof TypeError) return jsonError(502, "The Hub server could not reach the CRM. Check the CRM address setting");
      throw e;
    }
  });
}
const DAY = 86400000;
const MAX_RANGE = 190 * DAY;

async function links(): Promise<Map<string, string>> {
  const m = new Map<string, string>();
  try {
    const store = await getStore();
    if (store) for (const r of await store.list(LINKS)) m.set(r.id, String((r.data as { jobId?: string })?.jobId ?? ""));
  } catch {
    /* the links are a convenience: events still show without them */
  }
  return m;
}

const msOf = (v: string | null, fallback: number): number => {
  if (!v) return fallback;
  const n = /^\d+$/.test(v) ? Number(v) : Date.parse(v);
  return Number.isNaN(n) ? fallback : n;
};

export async function GET(request: Request): Promise<Response> {
  const denied = await gate(request);
  if (denied) return denied;
  return calGuard(async () => {
    const q = new URL(request.url).searchParams;
    const view = q.get("view") ?? "events";
    if (view === "calendars") {
      if (q.get("fresh") === "1") dropCalendarCache();
      return jsonOk({ calendars: await listCalendars() });
    }
    const now = Date.now();
    if (view === "slots") {
      const calendarId = q.get("calendarId") ?? "";
      if (!ID.test(calendarId)) return jsonError(400, "Bad calendarId");
      const from = msOf(q.get("from"), now);
      const to = msOf(q.get("to"), from + 14 * DAY);
      if (to <= from || to - from > 31 * DAY) return jsonError(400, "Ask for 31 days or fewer");
      const cal = (await listCalendars()).find((c) => c.id === calendarId);
      if (!cal) return jsonError(404, "Not found");
      return jsonOk({ calendar: cal, days: await freeSlots(calendarId, from, to) });
    }
    if (view !== "events") return jsonError(400, "Bad view");
    const from = msOf(q.get("from"), now - DAY);
    const to = msOf(q.get("to"), from + 7 * DAY);
    if (to <= from || to - from > MAX_RANGE) return jsonError(400, "Ask for 190 days or fewer");
    const only = q.get("calendarId") ?? "";
    if (only && !ID.test(only)) return jsonError(400, "Bad calendarId");
    const includeCancelled = q.get("cancelled") === "1";
    const cals = (await listCalendars()).filter((c) => !only || c.id === only);
    const link = await links();
    const rows = await Promise.all(cals.map(async (c) => (await listEvents(c, from, to, includeCancelled)).map((e) => mapEvent(e, c, link.get(String(e.id)) ?? ""))));
    const events: CalendarEvent[] = rows.flat().sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
    return jsonOk({ events, syncedAt: new Date().toISOString() });
  });
}

// POST /api/calendar { calendarId, contactId, startTime, jobId?, title?, address?, assignedUserId? } -> 201 { event }
// The CRM refuses a time that is not a free slot (HTTP 400): that comes back as 409 "That time is no longer free".
export async function POST(request: Request): Promise<Response> {
  const denied = await gate(request);
  if (denied) return denied;
  return calGuard(async () => {
    const b = await readJson(request);
    if (!b) return jsonError(400, "Bad request");
    const calendarId = String(b.calendarId ?? "");
    const contactId = String(b.contactId ?? "");
    const jobId = String(b.jobId ?? "");
    const start = String(b.startTime ?? "");
    if (!ID.test(calendarId) || !ID.test(contactId)) return jsonError(400, "calendarId and contactId are required");
    if (jobId && !ID.test(jobId)) return jsonError(400, "Bad jobId");
    if (Number.isNaN(Date.parse(start))) return jsonError(400, "Bad startTime");
    if (b.assignedUserId && !ID.test(String(b.assignedUserId))) return jsonError(400, "Bad assignedUserId");
    const cal = (await listCalendars()).find((c) => c.id === calendarId);
    if (!cal) return jsonError(404, "Not found");
    const body: Record<string, unknown> = {
      calendarId,
      locationId: getConfig().locationId,
      contactId,
      startTime: start,
      title: String(b.title ?? "").trim().slice(0, 200) || cal.name,
      toNotify: notifyCustomer(),
      ignoreDateRange: false,
    };
    if (b.address) body.address = String(b.address).trim().slice(0, 300);
    if (b.assignedUserId) body.assignedUserId = String(b.assignedUserId);
    let j;
    try {
      j = await crmJson("/calendars/events/appointments", { method: "POST", body: JSON.stringify(body) });
    } catch (e) {
      if (e && typeof e === "object" && (e as { status?: number }).status === 400) return jsonError(409, "That time is no longer free");
      throw e;
    }
    const id = String(j.id ?? "");
    if (jobId && id) {
      try {
        const store = await getStore();
        if (store) await store.put(LINKS, id, { jobId });
      } catch {
        /* the booking exists in the CRM; the link is only a convenience */
      }
    }
    const got = await crmJson("/calendars/events/appointments/" + id);
    return jsonOk({ event: mapEvent({ ...(got.appointment ?? got), id }, cal, jobId) }, 201);
  });
}

// PUT /api/calendar?id= { startTime?, calendarId?, cancel?: true } -> { event }
// Cancel sets the status to cancelled (the booking stays in the CRM, and the CRM's own cancel workflows see it). It is not a delete.
export async function PUT(request: Request): Promise<Response> {
  const denied = await gate(request);
  if (denied) return denied;
  return calGuard(async () => {
    const id = new URL(request.url).searchParams.get("id") ?? "";
    if (!ID.test(id)) return jsonError(400, "Bad id");
    const b = await readJson(request);
    if (!b) return jsonError(400, "Bad request");
    const body: Record<string, unknown> = { toNotify: notifyCustomer() };
    if (b.cancel === true) body.appointmentStatus = "cancelled";
    else {
      if (b.startTime === undefined && b.calendarId === undefined) return jsonError(400, "Nothing to update");
      if (b.startTime !== undefined) {
        if (Number.isNaN(Date.parse(String(b.startTime)))) return jsonError(400, "Bad startTime");
        body.startTime = String(b.startTime);
      }
      if (b.calendarId !== undefined) {
        if (!ID.test(String(b.calendarId))) return jsonError(400, "Bad calendarId");
        body.calendarId = String(b.calendarId);
      }
    }
    try {
      await crmJson("/calendars/events/appointments/" + id, { method: "PUT", body: JSON.stringify(body) });
    } catch (e) {
      if (e && typeof e === "object" && (e as { status?: number }).status === 400) return jsonError(409, "That time is no longer free");
      throw e;
    }
    const got = (await crmJson("/calendars/events/appointments/" + id)).appointment ?? {};
    const cals = await listCalendars();
    const cal = cals.find((c) => c.id === String(got.calendarId ?? ""));
    const link = await links();
    return jsonOk({ event: mapEvent({ ...got, id }, cal, link.get(id) ?? "") });
  });
}
