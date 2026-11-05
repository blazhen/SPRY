import { useEffect, useMemo, useState } from 'react'
import { CalendarPlus, Check, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import '../components/calendar/calendar.css'
import { BookFlow } from '../components/calendar/BookFlow'
import { CancelVisitDialog, MoveVisitDialog } from '../components/calendar/VisitDialogs'
import { Dialog, EmptyState, Notice, PageHead } from '../components/ui'
import {
  addDaysISO, dayDiff, ensureCalendarRange, eventDay, eventEndTime, eventTime, isCancelled, refreshCalendar, syncedText, useCalendar, useCalendarSync,
  type CalendarEvent,
} from '../lib/calendar'
import { CalendarError } from '../components/calendar/CalendarError'
import { todayISO } from '../lib/format'
import { go, href } from '../lib/router'
import { getContact, getJob, useStore } from '../lib/store'

type View = 'week' | 'month' | 'day' | 'list'
const VIEWS: { id: View; label: string }[] = [
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'day', label: 'Day' },
  { id: 'list', label: 'List' },
]
const MONTH_SHOWN = 3
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const monthStart = (day: string) => day.slice(0, 7) + '-01'
const monthEnd = (day: string) => {
  const d = new Date(monthStart(day) + 'T12:00:00Z')
  d.setUTCMonth(d.getUTCMonth() + 1, 0)
  return d.toISOString().slice(0, 10)
}
/** The first day of the month n months from the one holding `day`. */
const addMonthsISO = (day: string, n: number) => {
  const d = new Date(monthStart(day) + 'T12:00:00Z')
  d.setUTCMonth(d.getUTCMonth() + n, 1)
  return d.toISOString().slice(0, 10)
}
const DAY_MS = 86400000
const LIST_DAYS = 14

const dayLabel = (day: string, o: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }) =>
  new Intl.DateTimeFormat('en-AU', { timeZone: 'UTC', ...o }).format(new Date(day + 'T12:00:00Z'))
const mondayOf = (day: string) => addDaysISO(day, -((new Date(day + 'T12:00:00Z').getUTCDay() + 6) % 7))
const cap = (t: string) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : t)
const statusText = (e: CalendarEvent) => (isCancelled(e) ? 'Cancelled' : cap(e.status))

function rangeOf(view: View, anchor: string): { from: string; to: string } {
  if (view === 'day') return { from: anchor, to: anchor }
  if (view === 'month') {
    // Whole weeks, Monday to Sunday, covering the month.
    const first = mondayOf(monthStart(anchor))
    return { from: first, to: addDaysISO(mondayOf(monthEnd(anchor)), 6) }
  }
  const from = mondayOf(anchor)
  return { from, to: addDaysISO(from, view === 'week' ? 6 : LIST_DAYS - 1) }
}

function EventButton({ ev, onOpen, showDay }: { ev: CalendarEvent; onOpen: (e: CalendarEvent, from: HTMLElement) => void; showDay?: boolean }) {
  const cancelled = isCancelled(ev)
  return (
    <button
      type="button"
      className={`cal-ev${cancelled ? ' is-cancelled' : ''}`}
      style={{ borderLeftColor: ev.color }}
      data-cal-event={ev.id}
      onClick={(e) => onOpen(ev, e.currentTarget)}
    >
      <span className="cal-ev-time">{showDay ? `${dayLabel(eventDay(ev))}, ` : ''}{eventTime(ev)} to {eventEndTime(ev)}</span>
      <span className="cal-ev-title">{ev.title || 'Visit'}</span>
      <span className="cal-ev-meta">{ev.calendarName} | {statusText(ev)}</span>
    </button>
  )
}

export default function Calendar() {
  useCalendarSync()
  const cal = useCalendar()
  const s = useStore()
  const [view, setView] = useState<View>('week')
  const [anchor, setAnchor] = useState(todayISO())
  const [off, setOff] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<CalendarEvent | null>(null)
  const [moving, setMoving] = useState<CalendarEvent | null>(null)
  const [cancelling, setCancelling] = useState<CalendarEvent | null>(null)
  const [picking, setPicking] = useState(false)
  const [, tick] = useState(0)
  const [rangeError, setRangeError] = useState('')

  const { from, to } = rangeOf(view, anchor)
  const today = todayISO()

  useEffect(() => {
    let live = true
    setRangeError('')
    ensureCalendarRange(Date.parse(from), Date.parse(to) + DAY_MS).catch((e) => { if (live) setRangeError(e instanceof Error ? e.message : 'Could not read that range') })
    return () => { live = false }
  }, [from, to])
  useEffect(() => {
    const t = window.setInterval(() => tick((n) => n + 1), 30000)
    return () => window.clearInterval(t)
  }, [])

  const inRange = useMemo(
    () => cal.events.filter((e) => !off.has(e.calendarId) && eventDay(e) >= from && eventDay(e) <= to),
    [cal.events, off, from, to],
  )
  const byDay = (day: string) => inRange.filter((e) => eventDay(e) === day)
  const days = Array.from({ length: dayDiff(from, to) + 1 }, (_, i) => addDaysISO(from, i))

  const step = view === 'day' ? 1 : view === 'week' ? 7 : LIST_DAYS
  const move = (n: number) => setAnchor((a) => (view === 'month' ? addMonthsISO(a, n) : addDaysISO(a, n * step)))
  const open = (e: CalendarEvent) => setSelected(e)
  const unit = view === 'day' ? 'day' : view === 'week' ? 'week' : view === 'month' ? 'month' : 'fortnight'
  const monthOf = monthStart(anchor)
  const title = view === 'month' ? dayLabel(anchor, { month: 'long', year: 'numeric' }) : view === 'day' ? dayLabel(anchor, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : `${dayLabel(from, { day: 'numeric', month: 'short' })} to ${dayLabel(to, { day: 'numeric', month: 'short', year: 'numeric' })}`
  const toggle = (id: string) => setOff((o) => { const n = new Set(o); if (n.has(id)) n.delete(id); else n.add(id); return n })

  const hours = useMemo(() => {
    if (view !== 'day') return []
    const evs = byDay(anchor)
    const set = new Set<number>()
    for (let h = 6; h <= 18; h++) set.add(h)
    for (const e of evs) set.add(Number(eventTime(e).slice(0, 2)))
    return [...set].sort((a, b) => a - b)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, anchor, inRange])

  // Close the dialog first, then go to the page (a plain click only; Ctrl or Shift click keeps the browser's own behaviour).
  const openLink = (e: React.MouseEvent, to: string) => {
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return
    e.preventDefault()
    setSelected(null)
    go(to)
  }
  const sel = selected
  const selJob = sel?.jobId ? getJob(sel.jobId, s) : undefined
  const selContact = sel?.contactId ? getContact(sel.contactId, s) : undefined

  return (
    <div className="stack-lg cal-page" data-calendar-page>
      <PageHead
        title="Calendar"
        subtitle="Every inspection, call and install, read from the Systemations calendars."
        action={
          <button type="button" className="btn btn-primary btn-lg" onClick={() => setPicking(true)}>
            <CalendarPlus size={20} aria-hidden="true" />
            Book a visit
          </button>
        }
      />

      <div className="card stack">
        <div className="cal-bar">
          <div className="cal-seg" role="group" aria-label="Calendar view">
            {VIEWS.map((v) => (
              <button key={v.id} type="button" aria-pressed={view === v.id} onClick={() => setView(v.id)} data-cal-view={v.id}>{v.label}</button>
            ))}
          </div>
          <div className="cal-nav">
            <button type="button" className="btn btn-neutral btn-icon" aria-label={`Previous ${unit}`} onClick={() => move(-1)} data-cal-prev>
              <ChevronLeft size={20} aria-hidden="true" />
            </button>
            <button type="button" className="btn btn-neutral" onClick={() => setAnchor(todayISO())} data-cal-today>Today</button>
            <button type="button" className="btn btn-neutral btn-icon" aria-label={`Next ${unit}`} onClick={() => move(1)} data-cal-next>
              <ChevronRight size={20} aria-hidden="true" />
            </button>
          </div>
          <h2 className="cal-range" aria-live="polite" data-cal-range>{title}</h2>
        </div>

        <div className="cal-sync">
          <span data-cal-synced>Last synced {syncedText(cal.syncedAt)}</span>
          <button type="button" className="btn btn-neutral" onClick={() => void refreshCalendar()} disabled={cal.loading} data-cal-refresh>
            <RefreshCw size={18} aria-hidden="true" />
            {cal.loading ? 'Reading...' : 'Refresh'}
          </button>
        </div>

        {cal.calendars.length > 0 && (
          <div className="cal-chips" role="group" aria-label="Show these calendars">
            {cal.calendars.map((c) => {
              const on = !off.has(c.id)
              return (
                <button key={c.id} type="button" className="cal-chip" aria-pressed={on} onClick={() => toggle(c.id)} data-cal-chip={c.id}>
                  <span className="cal-dot" style={{ background: c.color }} aria-hidden="true" />
                  {c.name}
                  <span className="cal-chip-state">{on ? <Check size={16} aria-label="shown" /> : '(hidden)'}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {(cal.error || rangeError) && (
        <Notice tone="bad">
          <div className="stack">
            {cal.error ? (
              <CalendarError error={cal.error} />
            ) : (
              <>
                <span>The calendar could not be read: {rangeError}. What you see may be out of date.</span>
                <button type="button" className="btn btn-neutral" onClick={() => void refreshCalendar()}>Try again</button>
              </>
            )}
          </div>
        </Notice>
      )}

      {!cal.syncedAt && !cal.error ? (
        <EmptyState title="Reading the calendars..." />
      ) : view === 'week' ? (
        <div className="cal-week" data-cal-grid="week">
          {days.map((d) => (
            <section key={d} className={`cal-col${d === today ? ' is-today' : ''}`} aria-label={dayLabel(d, { weekday: 'long', day: 'numeric', month: 'long' })} data-cal-day={d}>
              <button type="button" className="cal-colhead" onClick={() => { setAnchor(d); setView('day') }} aria-label={`Open ${dayLabel(d, { weekday: 'long', day: 'numeric', month: 'long' })} in the day view`}>
                <span>{dayLabel(d)}</span>
                {d === today && <span className="badge st-blue">Today</span>}
              </button>
              {byDay(d).length === 0 ? (
                <p className="cal-none">Nothing booked</p>
              ) : (
                <ul className="cal-list">
                  {byDay(d).map((e) => <li key={e.id}><EventButton ev={e} onOpen={open} /></li>)}
                </ul>
              )}
            </section>
          ))}
        </div>
      ) : view === 'month' ? (
        <div className="cal-month" data-cal-grid="month">
          {WEEKDAYS.map((w) => <span key={w} className="cal-month-wd" aria-hidden="true">{w}</span>)}
          {days.map((d) => {
            const evs = byDay(d)
            const inMonth = d.slice(0, 7) === monthOf.slice(0, 7)
            const full = dayLabel(d, { weekday: 'long', day: 'numeric', month: 'long' })
            return (
              <button
                key={d}
                type="button"
                className={`cal-mday${d === today ? ' is-today' : ''}${inMonth ? '' : ' is-out'}`}
                data-cal-day={d}
                data-cal-count={evs.length}
                aria-label={`${full}, ${evs.length === 0 ? 'nothing booked' : evs.length === 1 ? '1 visit' : `${evs.length} visits`}. Open the day view.`}
                onClick={() => { setAnchor(d); setView('day') }}
              >
                <span className="cal-mnum">{Number(d.slice(8))}{d === today ? <span className="cal-mtoday"> Today</span> : null}</span>
                {evs.length > 0 && <span className="cal-mcount" aria-hidden="true">{evs.length}</span>}
                <span className="cal-mevs" aria-hidden="true">
                  {evs.slice(0, MONTH_SHOWN).map((e) => (
                    <span key={e.id} className={`cal-mev${isCancelled(e) ? ' is-cancelled' : ''}`} style={{ borderLeftColor: e.color }} data-cal-mev={e.id}>{eventTime(e)} {e.title || 'Visit'}</span>
                  ))}
                  {evs.length > MONTH_SHOWN && <span className="cal-mmore">+{evs.length - MONTH_SHOWN} more</span>}
                </span>
              </button>
            )
          })}
        </div>
      ) : view === 'day' ? (
        <div className="cal-hours" data-cal-grid="day">
          {hours.map((h) => {
            const here = byDay(anchor).filter((e) => Number(eventTime(e).slice(0, 2)) === h)
            return (
              <div key={h} className="cal-hour">
                <span className="cal-hour-label">{String(h).padStart(2, '0')}:00</span>
                {here.length > 0 ? <ul className="cal-list">{here.map((e) => <li key={e.id}><EventButton ev={e} onOpen={open} /></li>)}</ul> : <span />}
              </div>
            )
          })}
          {byDay(anchor).length === 0 && <p className="cal-none" style={{ padding: '0.75rem' }}>Nothing booked on this day.</p>}
        </div>
      ) : (
        <div className="stack" data-cal-grid="list">
          {inRange.length === 0 ? (
            <EmptyState title="Nothing booked in these two weeks.">
              <p className="t-small">Use Book a visit to add one, or page forward.</p>
            </EmptyState>
          ) : (
            days.filter((d) => byDay(d).length > 0).map((d) => (
              <section key={d} aria-label={dayLabel(d, { weekday: 'long', day: 'numeric', month: 'long' })} data-cal-day={d}>
                <h3 className="cal-agenda-day">{dayLabel(d, { weekday: 'long', day: 'numeric', month: 'long' })}{d === today ? ' (today)' : ''}</h3>
                <ul className="cal-list">
                  {byDay(d).map((e) => <li key={e.id}><EventButton ev={e} onOpen={open} /></li>)}
                </ul>
              </section>
            ))
          )}
        </div>
      )}

      {sel && (
        <Dialog
          open
          onClose={() => setSelected(null)}
          title={sel.title || 'Visit'}
          footer={
            <>
              <button type="button" className="btn btn-neutral" onClick={() => setSelected(null)}>Close</button>
              {!isCancelled(sel) && (
                <>
                  <button type="button" className="btn btn-neutral" data-cal-move onClick={() => { setMoving(sel); setSelected(null) }}>Move</button>
                  <button type="button" className="btn btn-danger" data-cal-cancel onClick={() => { setCancelling(sel); setSelected(null) }}>Cancel visit</button>
                </>
              )}
            </>
          }
        >
          <div className="cal-detail" data-cal-detail>
            <dl>
              <dt>When</dt>
              <dd>{dayLabel(eventDay(sel), { weekday: 'long', day: 'numeric', month: 'long' })}, {eventTime(sel)} to {eventEndTime(sel)}</dd>
              <dt>Calendar</dt>
              <dd><span className="cal-dot" style={{ background: sel.color, display: 'inline-block', marginRight: 6 }} aria-hidden="true" />{sel.calendarName}</dd>
              <dt>Status</dt>
              <dd>{statusText(sel)}</dd>
              {sel.address && (<><dt>Address</dt><dd>{sel.address}</dd></>)}
              <dt>Job</dt>
              <dd>{sel.jobId ? <a className="cell-link" href={href.job(sel.jobId)} data-cal-job-link onClick={(e) => openLink(e, href.job(sel.jobId!))}>{selJob?.name ?? 'Open the job'}</a> : 'No job linked'}</dd>
              <dt>Contact</dt>
              <dd>{sel.contactId ? <a className="cell-link" href={href.contact(sel.contactId)} data-cal-contact-link onClick={(e) => openLink(e, href.contact(sel.contactId!))}>{selContact?.name ?? 'Open the contact'}</a> : 'No contact linked'}</dd>
            </dl>
          </div>
        </Dialog>
      )}
      {moving && <MoveVisitDialog event={moving} onClose={() => setMoving(null)} />}
      {cancelling && <CancelVisitDialog event={cancelling} onClose={() => setCancelling(null)} />}
      {picking && <BookFlow onClose={() => setPicking(false)} />}
    </div>
  )
}
