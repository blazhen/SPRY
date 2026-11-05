// CRM calendars for the Hub (Round 11 A). The CRM is the source of truth for visits: the inspection calendar, the four install vehicle
// calendars and the phone call calendar. The Hub reads events, asks for free slots and books, moves and cancels. Dev tests: HUB-CALENDAR-DEV-TESTS.md.
//
// What the API gave on Dev (5 Nov): events need one of userId, calendarId or groupId (so "all calendars" is one call per calendar);
// free slots come per calendar with a time zone we choose; a booking made outside a free slot is refused (HTTP 400); a booking
// cancelled by status stays in the list with status "cancelled"; 100 calls per 10 seconds, 200000 per day.
import { crmJson } from "./crm.js";
import { getConfig } from "./env.js";
import { taskZone } from "./task-time.js";

type Obj = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export type VisitKind = "Inspection" | "Install" | "Call" | "Other";

export interface CalendarInfo {
  id: string;
  name: string;
  kind: VisitKind;
  /** Colour of the calendar (the CRM event colour when it has one, else from a fixed palette). */
  color: string;
  /** Length of one booking in minutes. */
  slotMinutes: number;
  active: boolean;
}

export interface CalendarEvent {
  id: string;
  calendarId: string;
  calendarName: string;
  kind: VisitKind;
  color: string;
  contactId: string;
  /** The job this booking was made for (kept by the Hub), or "". */
  jobId: string;
  title: string;
  /** ISO date-time with the offset the CRM gave. */
  start: string;
  end: string;
  status: string;
  address: string;
  assignedUserId: string;
}

const PALETTE = ["#1d4ed8", "#b45309", "#047857", "#7c3aed", "#be123c", "#0e7490"];

export const kindOf = (name: string): VisitKind =>
  /inspection/i.test(name) ? "Inspection" : /install|rig|van|truck|vehicle/i.test(name) ? "Install" : /phone|call/i.test(name) ? "Call" : "Other";

/** Booking notifications: the Hub never asks the CRM to notify the customer itself. The CRM workflows do that. Set HUB_BOOKING_NOTIFY=1 to change it. */
export const notifyCustomer = (): boolean => (process.env.HUB_BOOKING_NOTIFY ?? "").trim() === "1";

let calCache: { at: number; v: CalendarInfo[] } | null = null;

export function mapCalendar(c: Obj, index: number): CalendarInfo {
  const unit = String(c.slotDurationUnit ?? "mins");
  const n = Number(c.slotDuration ?? 60) || 60;
  const color = typeof c.eventColor === "string" && /^#[0-9a-f]{6}$/i.test(c.eventColor) ? c.eventColor : PALETTE[index % PALETTE.length];
  return {
    id: String(c.id),
    name: String(c.name ?? "Calendar"),
    kind: kindOf(String(c.name ?? "")),
    color,
    slotMinutes: /hour/i.test(unit) ? n * 60 : n,
    active: c.isActive !== false,
  };
}

export async function listCalendars(): Promise<CalendarInfo[]> {
  if (calCache && Date.now() - calCache.at < 10 * 60 * 1000) return calCache.v;
  const j = await crmJson("/calendars/?locationId=" + getConfig().locationId);
  const v = ((j.calendars ?? []) as Obj[]).map(mapCalendar).filter((c) => c.active);
  calCache = { at: Date.now(), v };
  return v;
}

export function dropCalendarCache(): void {
  calCache = null;
}

export function mapEvent(e: Obj, cal: CalendarInfo | undefined, jobId: string): CalendarEvent {
  const status = String(e.appointmentStatus ?? e.appoinmentStatus ?? e.status ?? "confirmed");
  return {
    id: String(e.id),
    calendarId: String(e.calendarId ?? cal?.id ?? ""),
    calendarName: cal?.name ?? "Calendar",
    kind: cal?.kind ?? "Other",
    color: cal?.color ?? PALETTE[0],
    contactId: String(e.contactId ?? ""),
    jobId,
    title: String(e.title ?? ""),
    start: String(e.startTime ?? ""),
    end: String(e.endTime ?? ""),
    status,
    address: String(e.address ?? ""),
    assignedUserId: String(e.assignedUserId ?? ""),
  };
}

/** Events of one calendar in a range (ISO dates or date-times). Cancelled ones are dropped unless asked for. */
export async function listEvents(cal: CalendarInfo, fromMs: number, toMs: number, includeCancelled: boolean): Promise<Obj[]> {
  const q = "?locationId=" + getConfig().locationId + "&calendarId=" + cal.id + "&startTime=" + fromMs + "&endTime=" + toMs;
  const j = await crmJson("/calendars/events" + q);
  const all = (j.events ?? []) as Obj[];
  return all.filter((e) => !e.deleted && (includeCancelled || String(e.appointmentStatus ?? e.status ?? "") !== "cancelled"));
}

/** Free slots of a calendar: { "2026-11-09": ["2026-11-09T09:00:00+11:00", ...] } in the business time zone. */
export async function freeSlots(calendarId: string, fromMs: number, toMs: number): Promise<Record<string, string[]>> {
  const j = await crmJson("/calendars/" + calendarId + "/free-slots?startDate=" + fromMs + "&endDate=" + toMs + "&timezone=" + encodeURIComponent(taskZone()));
  const out: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(j)) if (/^\d{4}-\d{2}-\d{2}$/.test(k) && Array.isArray((v as Obj)?.slots)) out[k] = (v as Obj).slots as string[];
  return out;
}
