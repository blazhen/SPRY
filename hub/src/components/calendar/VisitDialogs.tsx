// Book, move and cancel a visit in the CRM calendar (Round 11 A). Each one asks first (ConfirmDialog with an action key), then calls
// the calendar module. What the customer is sent is decided by the CRM, so the text here says only what the Hub does.
import { Check, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { bookVisit, cancelVisit, eventDay, eventTime, isCancelled, loadSlots, moveVisit, slotTime, useCalendar } from '../../lib/calendar'
import type { CalendarEvent, CalendarInfo, VisitKind } from '../../lib/calendar'
import { todayISO } from '../../lib/format'
import { getJob } from '../../lib/store'
import { ConfirmDialog, Dialog, toast } from '../ui'

const DAY_MS = 86400000

export function visitDayWords(day: string): string {
  const d = new Date(day + 'T00:00:00')
  return Number.isNaN(d.getTime()) ? day : d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
}
export function visitTimeWords(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  if (Number.isNaN(h)) return hhmm
  return new Date(2000, 0, 1, h, m || 0).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })
}

/** The status in words, with a colour that is only extra. */
export function VisitStatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase()
  const [label, cls] = /cancel/.test(s) ? ['Cancelled', 'st-slate'] : /noshow|no-show/.test(s) ? ['No show', 'st-hot'] : /showed/.test(s) ? ['Showed', 'st-green'] : /confirm/.test(s) ? ['Confirmed', 'st-green'] : /invalid/.test(s) ? ['Invalid', 'st-hot'] : [status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Booked', 'st-blue']
  return <span className={`badge ${cls}`}>{label}</span>
}

/** A failed call in plain words. */
export function visitErrorText(e: unknown): string {
  const m = e instanceof Error ? e.message : ''
  if (/400|no longer free|taken|not free|not available/i.test(m)) return 'That time was just taken. Pick another.'
  return m ? `The calendar did not accept that: ${m}` : 'The calendar did not accept that. Try again.'
}

const KINDS: VisitKind[] = ['Inspection', 'Install', 'Call']

/** Calendar, day and free slot. Reports the picked calendar and slot (ISO, or '' when none). */
function SlotPicker({ calendars, calendarId, onCalendar, slot, onSlot, initialDay }: { calendars: CalendarInfo[]; calendarId: string; onCalendar: (id: string) => void; slot: string; onSlot: (iso: string) => void; initialDay?: string }) {
  const [day, setDay] = useState(initialDay && initialDay >= todayISO() ? initialDay : '')
  const [slots, setSlots] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  useEffect(() => {
    onSlot('')
    setSlots([])
    setErr('')
    if (!calendarId || !day) return
    let live = true
    setLoading(true)
    const from = Date.parse(day) - DAY_MS
    loadSlots(calendarId, from, from + 3 * DAY_MS)
      .then((r) => { if (live) setSlots(r[day] ?? []) })
      .catch((e) => { if (live) setErr(e instanceof Error ? e.message : 'Could not read the free times') })
      .finally(() => { if (live) setLoading(false) })
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calendarId, day])
  return (
    <>
      <div>
        <label className="label" htmlFor="vd-cal">Calendar</label>
        <select id="vd-cal" className="field" value={calendarId} onChange={(e) => onCalendar(e.target.value)}>
          {calendars.length === 0 && <option value="">No calendars</option>}
          {calendars.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="vd-day">Day</label>
        <input id="vd-day" className="field" type="date" min={todayISO()} value={day} onChange={(e) => setDay(e.target.value)} />
      </div>
      {day && (
        <div>
          <p className="label" id="vd-times">Free times</p>
          {loading ? (
            <p className="t-body text-muted flex items-center gap-2" role="status"><Loader2 size={16} className="animate-spin" aria-hidden="true" />Looking for free times</p>
          ) : err ? (
            <p className="err" role="alert">{err}</p>
          ) : slots.length === 0 ? (
            <p className="t-body text-muted">No free times that day</p>
          ) : (
            <div className="flex flex-wrap gap-2" role="group" aria-labelledby="vd-times">
              {slots.map((iso) => (
                <button key={iso} type="button" aria-pressed={slot === iso} className={`btn ${slot === iso ? 'btn-primary' : 'btn-neutral'}`} onClick={() => onSlot(iso)}>
                  {slot === iso && <Check size={16} strokeWidth={3} aria-hidden="true" />}
                  {visitTimeWords(slotTime(iso))}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )
}

export function BookVisitDialog({ open, onClose, contactId, jobId, defaultKind = 'Inspection', address }: { open: boolean; onClose: () => void; contactId: string; jobId: string; defaultKind?: VisitKind; address?: string }) {
  return (
    <Dialog open={open} onClose={onClose} title="Book a visit" footer={null}>
      {open && <BookBody onClose={onClose} contactId={contactId} jobId={jobId} defaultKind={defaultKind} address={address} />}
    </Dialog>
  )
}

function BookBody({ onClose, contactId, jobId, defaultKind, address }: { onClose: () => void; contactId: string; jobId: string; defaultKind: VisitKind; address?: string }) {
  const { calendars } = useCalendar()
  const [kind, setKind] = useState<VisitKind>(KINDS.includes(defaultKind) ? defaultKind : 'Inspection')
  const ofKind = calendars.filter((c) => c.kind === kind)
  const [calId, setCalId] = useState('')
  const [slot, setSlot] = useState('')
  const [ask, setAsk] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const calendarId = ofKind.some((c) => c.id === calId) ? calId : ofKind[0]?.id ?? ''
  const job = jobId ? getJob(jobId) : undefined

  const book = async () => {
    setAsk(false)
    setBusy(true)
    setError('')
    try {
      await bookVisit({ calendarId, contactId, jobId, startIso: slot, title: job ? `${kind}: ${job.name}` : kind, address: address ?? job?.address })
      toast('Visit booked')
      onClose()
    } catch (e) {
      setError(visitErrorText(e))
      setSlot('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="stack">
      <div>
        <label className="label" htmlFor="vd-kind">What kind of visit</label>
        <select id="vd-kind" className="field" value={kind} onChange={(e) => { setKind(e.target.value as VisitKind); setCalId(''); setError('') }}>
          {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
      </div>
      <SlotPicker calendars={ofKind} calendarId={calendarId} onCalendar={(id) => { setCalId(id); setError('') }} slot={slot} onSlot={(s) => { setSlot(s); if (s) setError('') }} />
      {error && <p className="err" role="alert">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" className="btn btn-quiet" onClick={onClose}>Cancel</button>
        <button type="button" className="btn btn-primary" disabled={!slot || !calendarId || busy} onClick={() => setAsk(true)}>Book</button>
      </div>
      <ConfirmDialog open={ask} title="Book this visit?" confirmLabel="Book visit" action="visit-book" onConfirm={() => void book()} onClose={() => setAsk(false)}>
        <p className="t-body">{kind}, {slot ? `${visitDayWords(eventDay({ start: slot }))} at ${visitTimeWords(eventTime({ start: slot }))}` : ''}.</p>
      </ConfirmDialog>
    </div>
  )
}

export function MoveVisitDialog({ event, onClose }: { event: CalendarEvent | null; onClose: () => void }) {
  return (
    <Dialog open={!!event} onClose={onClose} title="Move this visit" footer={null}>
      {event && <MoveBody key={event.id} event={event} onClose={onClose} />}
    </Dialog>
  )
}

function MoveBody({ event, onClose }: { event: CalendarEvent; onClose: () => void }) {
  const { calendars } = useCalendar()
  const ofKind = calendars.filter((c) => c.kind === event.kind)
  const [calId, setCalId] = useState(event.calendarId)
  const [slot, setSlot] = useState('')
  const [ask, setAsk] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const calendarId = ofKind.some((c) => c.id === calId) ? calId : ofKind[0]?.id ?? ''

  const move = async () => {
    setAsk(false)
    setBusy(true)
    setError('')
    try {
      await moveVisit(event.id, slot, calendarId !== event.calendarId ? calendarId : undefined)
      toast('Visit moved')
      onClose()
    } catch (e) {
      setError(visitErrorText(e))
      setSlot('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="stack">
      <p className="t-body text-muted">Now: {visitDayWords(eventDay(event))} at {visitTimeWords(eventTime(event))}, {event.calendarName}</p>
      <SlotPicker calendars={ofKind} calendarId={calendarId} onCalendar={(id) => { setCalId(id); setError('') }} slot={slot} onSlot={(s) => { setSlot(s); if (s) setError('') }} />
      {error && <p className="err" role="alert">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" className="btn btn-quiet" onClick={onClose}>Cancel</button>
        <button type="button" className="btn btn-primary" disabled={!slot || !calendarId || busy} onClick={() => setAsk(true)}>Move</button>
      </div>
      <ConfirmDialog open={ask} title="Move this visit?" confirmLabel="Move visit" action="visit-move" onConfirm={() => void move()} onClose={() => setAsk(false)}>
        <p className="t-body">{slot ? `To ${visitDayWords(eventDay({ start: slot }))} at ${visitTimeWords(eventTime({ start: slot }))}.` : ''}</p>
      </ConfirmDialog>
    </div>
  )
}

export function CancelVisitDialog({ event, onClose }: { event: CalendarEvent | null; onClose: () => void }) {
  const run = async () => {
    if (!event) return
    try {
      await cancelVisit(event.id)
      toast('Visit cancelled')
    } catch (e) {
      toast(visitErrorText(e))
    }
    onClose()
  }
  return (
    <ConfirmDialog open={!!event} title="Cancel this visit?" confirmLabel="Cancel visit" tone="danger" action="visit-cancel" onConfirm={() => void run()} onClose={onClose}>
      {event && <p className="t-body">{event.kind}, {visitDayWords(eventDay(event))} at {visitTimeWords(eventTime(event))}, {event.calendarName}.</p>}
    </ConfirmDialog>
  )
}

/** Move and Cancel buttons for one visit, with their dialogs. Used by the job panel and the contact page. */
export function VisitActions({ event }: { event: CalendarEvent }) {
  const [moving, setMoving] = useState<CalendarEvent | null>(null)
  const [cancelling, setCancelling] = useState<CalendarEvent | null>(null)
  if (isCancelled(event)) return null
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" className="btn btn-neutral btn-sm" onClick={() => setMoving(event)}>Move</button>
      <button type="button" className="btn btn-danger btn-sm" onClick={() => setCancelling(event)}>Cancel</button>
      <MoveVisitDialog event={moving} onClose={() => setMoving(null)} />
      <CancelVisitDialog event={cancelling} onClose={() => setCancelling(null)} />
    </div>
  )
}
