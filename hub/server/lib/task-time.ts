// Task due date and time <-> the CRM's single ISO date-time, in the business time zone (SPRY_TIMEZONE, default
// Australia/Melbourne). The CRM keeps one dueDate date-time and has no all-day flag, so:
//   - all day is sent as midnight UTC of the date (what the Hub always sent) and read back as that UTC date;
//   - a timed task is sent as the real moment, and read back by converting to the business zone.
// A timed task whose real moment happens to be exactly midnight UTC is nudged by 1 ms so it never reads as all day.

export const taskZone = (): string => (process.env.SPRY_TIMEZONE ?? "").trim() || "Australia/Melbourne";

function parts(ms: number, tz: string): Record<string, number> {
  const f = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const o: Record<string, number> = {};
  for (const p of f.formatToParts(new Date(ms))) if (p.type !== "literal") o[p.type] = Number(p.value);
  return o;
}

function offsetAt(ms: number, tz: string): number {
  const p = parts(ms, tz);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(ms / 1000) * 1000;
}

/** The moment a wall clock time happens in the zone. Correct across daylight saving changes. */
export function zonedMoment(date: string, time: string, tz = taskZone()): Date {
  const [y, m, d] = date.slice(0, 10).split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  const wall = Date.UTC(y, m - 1, d, h, mi);
  let ms = wall - offsetAt(wall, tz);
  const off2 = offsetAt(ms, tz);
  if (wall - off2 !== ms) ms = wall - off2;
  return new Date(ms);
}

export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** ISO date-time for the CRM from a date (YYYY-MM-DD) and an optional time (HH:MM, business zone). */
export function dueToIso(date: string, time?: string): string {
  const day = date.slice(0, 10);
  if (!time) return new Date(day).toISOString();
  const at = zonedMoment(day, time);
  if (at.getTime() % 86400000 === 0) return new Date(at.getTime() + 1).toISOString();
  return at.toISOString();
}

/** The CRM's ISO date-time back to the Hub's { dueDate: YYYY-MM-DD, dueTime?: HH:MM } without shifting the day. */
export function isoToDue(iso: string, tz = taskZone()): { dueDate?: string; dueTime?: string } {
  const ms = new Date(iso).getTime();
  if (Number.isNaN(ms)) return {};
  if (ms % 86400000 === 0) return { dueDate: new Date(ms).toISOString().slice(0, 10) }; // all day
  const p = parts(ms, tz);
  const two = (n: number) => String(n).padStart(2, "0");
  return { dueDate: `${p.year}-${two(p.month)}-${two(p.day)}`, dueTime: `${two(p.hour)}:${two(p.minute)}` };
}
