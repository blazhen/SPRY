// CRM calendars in the Hub (Round 11 A). One place for: the calendars, the events (visits) read from the CRM, the sync (poll every few
// minutes, refresh on focus, "last synced"), free slots, and book, move and cancel. Every screen that shows a visit reads from here:
// the Calendar page, This week, the Site day sheet, the job Visits panel and the contact page.
// Live: the server routes /api/calendar hold the token. Mock: the same functions run on an in-memory calendar seeded from the mock jobs,
// so the screens and the proofs behave the same without a CRM. Nothing here ever sends a customer message: the CRM's own workflows do that.
import { useSyncExternalStore, useEffect } from 'react'
import { DATA_SOURCE } from '../config'
import { ApiError, AuthError, NetworkError, apiFetch } from './api'
import { addDaysISO, todayISO } from './format'
import { getTaskTimeZone, hubDay, zonedMoment } from './tasks'
import { seedJobs } from '../data/mock'
import type { Job } from '../types'

export type VisitKind = 'Inspection' | 'Install' | 'Call' | 'Other'

export interface CalendarInfo {
  id: string
  name: string
  kind: VisitKind
  color: string
  /** Length of one booking, minutes. */
  slotMinutes: number
}

export interface CalendarEvent {
  id: string
  calendarId: string
  calendarName: string
  kind: VisitKind
  color: string
  contactId: string
  /** The job the booking was made for ('' when it was made in the CRM app: then the contact's jobs show it). */
  jobId: string
  title: string
  /** ISO date-time with an offset. */
  start: string
  end: string
  /** confirmed, showed, noshow, cancelled, invalid, new ... as the CRM says. */
  status: string
  address: string
  assignedUserId: string
}

export const isCancelled = (e: Pick<CalendarEvent, 'status'>): boolean => /cancel/i.test(e.status)

// ---- Time helpers (everything is shown in the Hub time zone) ---------------------------------

const partsIn = (ms: number, tz: string) => {
  const f = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  const o: Record<string, string> = {}
  for (const p of f.formatToParts(new Date(ms))) if (p.type !== 'literal') o[p.type] = p.value
  return o
}
/** YYYY-MM-DD of a visit in the Hub time zone. */
export const eventDay = (e: Pick<CalendarEvent, 'start'>): string => hubDay(new Date(e.start))
/** 'HH:MM' (24 hour) of the start in the Hub time zone. */
export const eventTime = (e: Pick<CalendarEvent, 'start'>): string => {
  const p = partsIn(Date.parse(e.start), getTaskTimeZone())
  return `${p.hour}:${p.minute}`
}
export const eventEndTime = (e: Pick<CalendarEvent, 'end'>): string => {
  const p = partsIn(Date.parse(e.end), getTaskTimeZone())
  return `${p.hour}:${p.minute}`
}
export const slotTime = (iso: string): string => eventTime({ start: iso })
/** Days between two YYYY-MM-DD dates, from a to b. */
export const dayDiff = (a: string, b: string): number => Math.round((Date.parse(b) - Date.parse(a)) / 86400000)

// ---- State -------------------------------------------------------------------------------------

interface State {
  calendars: CalendarInfo[]
  events: CalendarEvent[]
  /** Time windows already read, in ms. */
  windows: { from: number; to: number }[]
  /** ms of the last good read. */
  syncedAt: number | null
  loading: boolean
  error: string
}
let state: State = { calendars: [], events: [], windows: [], syncedAt: null, loading: false, error: '' }
const listeners = new Set<() => void>()
const set = (patch: Partial<State>) => {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}
const subscribe = (l: () => void) => (listeners.add(l), () => void listeners.delete(l))
export const getCalendarState = (): State => state
export const useCalendar = (): State => useSyncExternalStore(subscribe, getCalendarState, getCalendarState)

const DAY = 86400000
/** The default window: 60 days back to 120 days ahead, in one read. */
const defaultWindow = () => {
  const t = Date.parse(todayISO())
  return { from: t - 60 * DAY, to: t + 120 * DAY }
}
const covered = (from: number, to: number) => state.windows.some((w) => w.from <= from && w.to >= to)
const mergeEvents = (list: CalendarEvent[], fresh: CalendarEvent[], from: number, to: number): CalendarEvent[] => {
  // events inside the freshly read window come from the fresh read only (so a cancelled or moved one disappears or changes)
  const keep = list.filter((e) => {
    const s = Date.parse(e.start)
    return s < from || s >= to
  })
  return [...keep, ...fresh].sort((a, b) => Date.parse(a.start) - Date.parse(b.start))
}

// ---- Mock calendar (mock mode only) ----------------------------------------------------------

const MOCK_CALS: CalendarInfo[] = [
  { id: 'cal-insp', name: 'Site inspection', kind: 'Inspection', color: '#1d4ed8', slotMinutes: 60 },
  { id: 'cal-call', name: 'Phone call', kind: 'Call', color: '#6b7280', slotMinutes: 15 },
  { id: 'cal-van', name: 'Install: Van', kind: 'Install', color: '#047857', slotMinutes: 540 },
  { id: 'cal-fuso', name: 'Install: Fuso truck', kind: 'Install', color: '#b45309', slotMinutes: 540 },
  { id: 'cal-merc', name: 'Install: Mercedes rig', kind: 'Install', color: '#7c3aed', slotMinutes: 540 },
  { id: 'cal-inj', name: 'Install: InjectaCore rig', kind: 'Install', color: '#be123c', slotMinutes: 540 },
]
let mockEvents: CalendarEvent[] | null = null
const wall = (day: string, hhmm: string): Date => {
  const [y, m, d] = day.split('-').map(Number)
  const [h, mi] = hhmm.split(':').map(Number)
  return zonedMoment(y, m, d, h, mi)
}
const iso = (d: Date) => d.toISOString()
function mockSeed(): CalendarEvent[] {
  const out: CalendarEvent[] = []
  let rig = 0
  for (const j of seedJobs()) {
    for (const a of j.appointments) {
      const isInstall = a.kind === 'Install'
      const cal = isInstall ? MOCK_CALS[2 + (rig++ % 4)] : MOCK_CALS[0]
      const start = wall(a.date, a.time)
      const contact = j.participants.find((p) => p.kind === 'contact' && p.role === 'main') ?? j.participants.find((p) => p.kind === 'contact')
      out.push({
        id: `ev-${a.id}`, calendarId: cal.id, calendarName: cal.name, kind: cal.kind, color: cal.color, contactId: contact?.id ?? '', jobId: j.id,
        title: `${a.kind === 'Other' ? 'Visit' : a.kind}: ${j.name}`, start: iso(start), end: iso(new Date(start.getTime() + cal.slotMinutes * 60000)),
        status: 'confirmed', address: j.address, assignedUserId: '',
      })
    }
  }
  return out
}
const mockAll = (): CalendarEvent[] => (mockEvents ??= mockSeed())
const mockBusy = (calId: string, s: number, e: number) => mockAll().some((x) => x.calendarId === calId && !isCancelled(x) && Date.parse(x.start) < e && Date.parse(x.end) > s)
/** Free slots of a mock calendar: weekdays, inspection hourly 08:00 to 15:00, an install one 07:30 slot a day, calls 09:00 to 11:45 in 15 minutes. */
function mockSlots(cal: CalendarInfo, from: number, to: number): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  const now = Date.now()
  for (let t = from; t < to; t += DAY) {
    const day = hubDay(new Date(t))
    const dow = new Date(day + 'T12:00:00Z').getUTCDay()
    if (dow === 0 || dow === 6) continue
    const times = cal.kind === 'Install' ? ['07:30'] : cal.kind === 'Call' ? ['09:00', '09:15', '09:30', '09:45', '10:00'] : ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00']
    const slots = times.map((h) => wall(day, h)).filter((s) => s.getTime() > now && !mockBusy(cal.id, s.getTime(), s.getTime() + cal.slotMinutes * 60000)).map(iso)
    if (slots.length) out[day] = slots
  }
  return out
}

// ---- Reading ----------------------------------------------------------------------------------------

type Row = Record<string, unknown>
const s = (v: unknown, d = '') => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : d)
const asEvent = (r: Row): CalendarEvent => ({
  id: s(r.id), calendarId: s(r.calendarId), calendarName: s(r.calendarName, 'Calendar'), kind: (['Inspection', 'Install', 'Call'].includes(s(r.kind)) ? s(r.kind) : 'Other') as VisitKind,
  color: s(r.color, '#1d4ed8'), contactId: s(r.contactId), jobId: s(r.jobId), title: s(r.title), start: s(r.start), end: s(r.end), status: s(r.status, 'confirmed'),
  address: s(r.address), assignedUserId: s(r.assignedUserId),
})
const asCalendar = (r: Row): CalendarInfo => ({
  id: s(r.id), name: s(r.name, 'Calendar'), kind: (['Inspection', 'Install', 'Call'].includes(s(r.kind)) ? s(r.kind) : 'Other') as VisitKind, color: s(r.color, '#1d4ed8'), slotMinutes: Number(r.slotMinutes) || 60,
})

async function readCalendars(): Promise<CalendarInfo[]> {
  if (DATA_SOURCE === 'mock') return MOCK_CALS
  const j = (await apiFetch('/api/calendar', { query: { view: 'calendars' } })) as { calendars?: Row[] } | null
  const list = (j?.calendars ?? []).map(asCalendar)
  if (list.length === 0) throw new Error(NOT_SET_UP + 'the CRM has no active calendars for this location')
  return list
}

/** The calendars come from the CRM (nothing is typed into the Hub), so "not set up" means the CRM side: the connection, the access key's permissions or no calendars. */
const NOT_SET_UP = 'Calendar is not set up: '
/** A short reason for staff. The server already words CRM and connection problems; this words the rest. */
export function calendarErrorText(e: unknown): string {
  if (e instanceof NetworkError) return 'The Hub server could not be reached. Check the connection and try again'
  if (e instanceof AuthError) return 'Your Hub sign-in has run out. Open the Hub again from the CRM'
  if (e instanceof ApiError && e.status === 404) return NOT_SET_UP + 'the calendar part of the Hub server is not installed (route /api/calendar not found)'
  if (e instanceof ApiError && /^Only HTML requests/.test(e.message)) return 'The published Hub server does not answer the calendar address (/api/calendar). It needs the latest build: publish again, and if it stays, ask the host about the server routes'
  if (e instanceof ApiError && e.status >= 500 && /^Request failed|^Server error/.test(e.message)) return 'The Hub server had a problem reading the calendar (' + e.status + ')'
  return e instanceof Error && e.message ? e.message : 'Could not read the calendars'
}
/** True when the reason is a set-up problem (so the screen links to Settings). */
export const isCalendarSetupProblem = (msg: string): boolean => msg.startsWith(NOT_SET_UP)
async function readEvents(from: number, to: number): Promise<CalendarEvent[]> {
  if (DATA_SOURCE === 'mock') return mockAll().filter((e) => { const t = Date.parse(e.start); return t >= from && t < to && !isCancelled(e) })
  const j = (await apiFetch('/api/calendar', { query: { view: 'events', from: new Date(from).toISOString(), to: new Date(to).toISOString() } })) as { events?: Row[] } | null
  return (j?.events ?? []).map(asEvent)
}

let inflight: Promise<void> | null = null
/** Read the default window (and any extra windows asked for) again. Safe to call often: one read at a time. */
export function refreshCalendar(): Promise<void> {
  if (inflight) return inflight
  set({ loading: true })
  inflight = (async () => {
    try {
      const calendars = state.calendars.length ? state.calendars : await readCalendars()
      const wins = state.windows.length ? state.windows : [defaultWindow()]
      let events = state.events
      for (const w of wins) events = mergeEvents(events, await readEvents(w.from, w.to), w.from, w.to)
      set({ calendars, events, windows: wins, syncedAt: Date.now(), error: '', loading: false })
    } catch (e) {
      set({ loading: false, error: calendarErrorText(e) })
    } finally {
      inflight = null
    }
  })()
  return inflight
}

/** Make sure a time range is loaded (the Calendar page asks for the month it shows). */
export async function ensureCalendarRange(from: number, to: number): Promise<void> {
  if (covered(from, to)) return
  const w = { from: Math.min(from, defaultWindow().from), to: Math.max(to, defaultWindow().to) }
  // keep it simple: one wider window that holds the default one and the new range
  set({ windows: [w] })
  await refreshCalendar()
}

/** Polls every few minutes while the tab is visible, and reads again when the window gets focus. Use once in the shell. */
export function useCalendarSync(everyMs = 3 * 60 * 1000): void {
  useEffect(() => {
    void refreshCalendar()
    const tick = () => { if (document.visibilityState === 'visible') void refreshCalendar() }
    const timer = window.setInterval(tick, everyMs)
    const onFocus = () => { if (!state.syncedAt || Date.now() - state.syncedAt > 20000) tick() }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => { window.clearInterval(timer); window.removeEventListener('focus', onFocus); document.removeEventListener('visibilitychange', onFocus) }
  }, [everyMs])
}

// ---- Free slots, book, move, cancel ----------------------------------------------------------

/** Free slots of one calendar: { 'YYYY-MM-DD': [iso, ...] }. */
export async function loadSlots(calendarId: string, from: number, to: number): Promise<Record<string, string[]>> {
  if (DATA_SOURCE === 'mock') {
    const cal = MOCK_CALS.find((c) => c.id === calendarId)
    return cal ? mockSlots(cal, from, to) : {}
  }
  const j = (await apiFetch('/api/calendar', { query: { view: 'slots', calendarId, from: new Date(from).toISOString(), to: new Date(to).toISOString() } })) as { days?: Record<string, string[]> } | null
  return j?.days ?? {}
}

export interface BookInput { calendarId: string; contactId: string; jobId: string; startIso: string; title: string; address?: string; assignedUserId?: string }

/** Book a visit in the CRM calendar. Throws an Error with a plain message when the time is no longer free. */
export async function bookVisit(b: BookInput): Promise<CalendarEvent> {
  let ev: CalendarEvent
  if (DATA_SOURCE === 'mock') {
    const cal = MOCK_CALS.find((c) => c.id === b.calendarId)
    if (!cal) throw new Error('Pick a calendar')
    const st = Date.parse(b.startIso)
    if (mockBusy(cal.id, st, st + cal.slotMinutes * 60000)) throw new Error('That time is no longer free')
    ev = { id: `ev-${Math.random().toString(36).slice(2, 10)}`, calendarId: cal.id, calendarName: cal.name, kind: cal.kind, color: cal.color, contactId: b.contactId, jobId: b.jobId, title: b.title, start: b.startIso, end: iso(new Date(st + cal.slotMinutes * 60000)), status: 'confirmed', address: b.address ?? '', assignedUserId: b.assignedUserId ?? '' }
    mockAll().push(ev)
  } else {
    const r = (await apiFetch('/api/calendar', { method: 'POST', body: { calendarId: b.calendarId, contactId: b.contactId, jobId: b.jobId, startTime: b.startIso, title: b.title, address: b.address, assignedUserId: b.assignedUserId } })) as { event?: Row } | null
    if (!r?.event) throw new Error('The booking was not confirmed')
    ev = asEvent(r.event)
  }
  set({ events: [...state.events.filter((e) => e.id !== ev.id), ev].sort((a, c) => Date.parse(a.start) - Date.parse(c.start)) })
  return ev
}

/** Move a visit to another time (and optionally another calendar, for example another vehicle). */
export async function moveVisit(id: string, startIso: string, calendarId?: string): Promise<CalendarEvent> {
  let ev: CalendarEvent
  if (DATA_SOURCE === 'mock') {
    const cur = mockAll().find((e) => e.id === id)
    if (!cur) throw new Error('Visit not found')
    const cal = MOCK_CALS.find((c) => c.id === (calendarId ?? cur.calendarId)) ?? MOCK_CALS[0]
    const st = Date.parse(startIso)
    if (mockAll().some((x) => x.id !== id && x.calendarId === cal.id && !isCancelled(x) && Date.parse(x.start) < st + cal.slotMinutes * 60000 && Date.parse(x.end) > st)) throw new Error('That time is no longer free')
    Object.assign(cur, { calendarId: cal.id, calendarName: cal.name, kind: cal.kind, color: cal.color, start: startIso, end: iso(new Date(st + cal.slotMinutes * 60000)) })
    ev = { ...cur }
  } else {
    const r = (await apiFetch('/api/calendar', { method: 'PUT', query: { id }, body: { startTime: startIso, calendarId } })) as { event?: Row } | null
    if (!r?.event) throw new Error('The change was not confirmed')
    ev = asEvent(r.event)
  }
  set({ events: [...state.events.filter((e) => e.id !== id), ev].sort((a, c) => Date.parse(a.start) - Date.parse(c.start)) })
  return ev
}

/** Cancel a visit. The CRM keeps it with the status cancelled; the Hub stops showing it. */
export async function cancelVisit(id: string): Promise<void> {
  if (DATA_SOURCE === 'mock') {
    const cur = mockAll().find((e) => e.id === id)
    if (!cur) throw new Error('Visit not found')
    cur.status = 'cancelled'
  } else {
    await apiFetch('/api/calendar', { method: 'PUT', query: { id }, body: { cancel: true } })
  }
  set({ events: state.events.filter((e) => e.id !== id) })
}

// ---- Selectors (pure: pass the events) -------------------------------------------------------

const mainContactIds = (job: Pick<Job, 'participants'>): string[] => job.participants.filter((p) => p.kind === 'contact').map((p) => p.id)

/** The visits of a job: the ones booked for it, plus ones made in the CRM app for the same contact that no job claims. */
export function visitsForJob(events: CalendarEvent[], job: Pick<Job, 'id' | 'participants'>): CalendarEvent[] {
  const people = new Set(mainContactIds(job))
  return events.filter((e) => !isCancelled(e) && e.kind !== 'Call' && (e.jobId === job.id || (!e.jobId && people.has(e.contactId))))
}
export const visitsForContact = (events: CalendarEvent[], contactId: string): CalendarEvent[] => events.filter((e) => !isCancelled(e) && e.contactId === contactId)
/** Visits whose day (Hub time zone) is between two YYYY-MM-DD dates, inclusive. */
export const visitsBetween = (events: CalendarEvent[], fromDay: string, toDay: string): CalendarEvent[] =>
  events.filter((e) => !isCancelled(e) && eventDay(e) >= fromDay && eventDay(e) <= toDay)
/** The next install of a job (a date), or undefined. */
export const nextInstall = (events: CalendarEvent[], job: Pick<Job, 'id' | 'participants'>): CalendarEvent | undefined =>
  visitsForJob(events, job).filter((e) => e.kind === 'Install').sort((a, b) => Date.parse(a.start) - Date.parse(b.start))[0]

/** "Last synced" in words: "just now", "3 minutes ago", or a time. */
export function syncedText(at: number | null, now = Date.now()): string {
  if (!at) return 'not synced yet'
  const m = Math.floor((now - at) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m} minute${m === 1 ? '' : 's'} ago`
  return new Date(at).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })
}

/** A test hook: the mock calendar back to its seed (mock mode only). */
export function resetMockCalendar(): void {
  mockEvents = null
  set({ events: [], windows: [], syncedAt: null })
}
export { addDaysISO }
