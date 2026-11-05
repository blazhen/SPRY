// Task time rules. A task has a due DATE (YYYY-MM-DD) and an optional due TIME ('HH:MM', 24 hour, local time of the Hub
// time zone). No time means all day: it is due at the end of that day. Everything here is pure (no store, no React).
import type { JobTask } from '../types'

/** The Hub time zone (the business time zone; the server uses SPRY_TIMEZONE, default Australia/Melbourne). */
let hubZone = 'Australia/Melbourne'
export const setTaskTimeZone = (tz: string) => {
  try {
    new Intl.DateTimeFormat('en-AU', { timeZone: tz })
    hubZone = tz
  } catch {
    /* a bad zone name is ignored */
  }
}
export const getTaskTimeZone = () => hubZone

const DATE = /^(\d{4})-(\d{2})-(\d{2})/
const TIME = /^([01]?\d|2[0-3]):([0-5]\d)/

/** The title of a task (the one line shown in lists). */
export const taskTitle = (t: Pick<JobTask, 'title'>): string => (t.title ?? '').trim()

/** 'HH:MM' of the task, or '' when it is all day (or the time is not valid). */
export const taskTime = (t: Pick<JobTask, 'dueTime'>): string => {
  const m = TIME.exec((t.dueTime ?? '').trim())
  return m ? `${m[1].padStart(2, '0')}:${m[2]}` : ''
}

/** Wall clock parts of a moment in a time zone. */
function partsIn(ms: number, tz: string) {
  const f = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const o: Record<string, number> = {}
  for (const p of f.formatToParts(new Date(ms))) if (p.type !== 'literal') o[p.type] = Number(p.value)
  return o
}

/** Offset of the zone from UTC at a moment, in ms (positive east of UTC). */
function offsetAt(ms: number, tz: string): number {
  const p = partsIn(ms, tz)
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(ms / 1000) * 1000
}

/** The moment a wall clock time (y, m, d, h, min in the zone) happens. Works across daylight saving changes. */
export function zonedMoment(y: number, m: number, d: number, h: number, min: number, tz: string = hubZone): Date {
  const wall = Date.UTC(y, m - 1, d, h, min)
  let ms = wall - offsetAt(wall, tz)
  const off2 = offsetAt(ms, tz)
  if (wall - off2 !== ms) ms = wall - off2
  return new Date(ms)
}

/** Today (YYYY-MM-DD) in the Hub time zone. */
export const hubDay = (now: Date = new Date(), tz: string = hubZone): string => {
  const p = partsIn(now.getTime(), tz)
  return `${String(p.year).padStart(4, '0')}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`
}

/** The moment the task is due. All day means the end of that day (the last millisecond). null when it has no valid date. */
export function taskDueAt(t: JobTask): Date | null {
  const m = DATE.exec(t.dueDate ?? '')
  if (!m) return null
  const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3])
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null
  const time = taskTime(t)
  if (time) {
    const [h, mi] = time.split(':').map(Number)
    return zonedMoment(y, mo, d, h, mi)
  }
  // Start of the next day minus 1 ms (Date.UTC rolls over month ends).
  const next = new Date(Date.UTC(y, mo - 1, d + 1))
  return new Date(zonedMoment(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate(), 0, 0).getTime() - 1)
}

/** Late: not done and the due moment has passed. A 9 am task is overdue at 9:01; an all day task from the next day. */
export function isTaskOverdue(t: JobTask, now: Date = new Date()): boolean {
  if (t.done) return false
  const at = taskDueAt(t)
  return !!at && now.getTime() > at.getTime()
}

/** Due on today's date in the Hub time zone (not done). It may already be overdue by the clock if it has a time. */
export function isTaskDueToday(t: JobTask, now: Date = new Date()): boolean {
  if (t.done) return false
  const m = DATE.exec(t.dueDate ?? '')
  return !!m && m[0] === hubDay(now)
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** For example "Thu 5 Nov, 2:30 pm", or "Thu 5 Nov" when all day. Empty when there is no date. */
export function taskDueLabel(t: JobTask): string {
  const m = DATE.exec(t.dueDate ?? '')
  if (!m) return ''
  const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3])
  const day = `${DAYS[new Date(Date.UTC(y, mo - 1, d)).getUTCDay()]} ${d} ${MONTHS[mo - 1]}`
  const time = taskTime(t)
  if (!time) return day
  const [h, mi] = time.split(':').map(Number)
  return `${day}, ${h % 12 === 0 ? 12 : h % 12}:${String(mi).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`
}

/** Sort order: date, then time (all day first on the same date), then title. Tasks without a date go last. */
export function compareTasks(a: JobTask, b: JobTask): number {
  const da = DATE.exec(a.dueDate ?? '')?.[0] ?? '9999-99-99'
  const db = DATE.exec(b.dueDate ?? '')?.[0] ?? '9999-99-99'
  if (da !== db) return da < db ? -1 : 1
  const ta = taskTime(a), tb = taskTime(b)
  if (ta !== tb) return ta < tb ? -1 : 1
  return taskTitle(a).localeCompare(taskTitle(b), 'en-AU')
}
