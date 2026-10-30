import { CalendarPlus, Check } from 'lucide-react'
import { useState } from 'react'
import { todayISO } from '../../lib/format'
import { addAppointment, getJob, setReminder, useStore } from '../../lib/store'
import type { AppointmentKind, JobAppointment } from '../../types'
import { Dialog, EmptyState, Section, toast } from '../ui'

const KINDS: AppointmentKind[] = ['Inspection', 'Install', 'Other']

function dayWords(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
}

function timeWords(t: string): string {
  const [h, m] = t.split(':').map(Number)
  if (Number.isNaN(h)) return t
  const d = new Date(2000, 0, 1, h, m || 0)
  return d.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })
}

export function AppointmentsPanel({ jobId }: { jobId: string }) {
  const s = useStore()
  const job = getJob(jobId, s)
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<AppointmentKind>('Inspection')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('09:00')
  const [error, setError] = useState('')
  if (!job) return null

  const today = todayISO()
  const sorted: JobAppointment[] = [...job.appointments].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
  const nextId = sorted.find((a) => a.date >= today)?.id

  const close = () => {
    setOpen(false)
    setError('')
  }
  const save = () => {
    if (!date || !time) {
      setError('Please choose a day and a time.')
      return
    }
    addAppointment(jobId, { title: kind === 'Other' ? 'Visit' : kind, kind, date, time })
    toast('Visit added')
    setDate('')
    close()
  }

  return (
    <Section
      title="Visits"
      action={
        <button type="button" className="btn btn-quiet" onClick={() => setOpen(true)}>
          <CalendarPlus size={18} aria-hidden="true" />
          Add a visit
        </button>
      }
    >
      {sorted.length === 0 ? (
        <EmptyState title="No visits booked yet" />
      ) : (
        <div className="tbl-wrap">
          <table className="tbl tbl-stack">
            <thead>
              <tr>
                <th scope="col">What</th>
                <th scope="col">Day</th>
                <th scope="col">Time</th>
                <th scope="col">Reminder</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((a) => {
                const past = a.date < today
                const next = a.id === nextId
                return (
                  <tr key={a.id} className={next ? 'bg-navy-wash' : ''}>
                    <th scope="row" data-label="What">
                      {a.title}
                      {past && (
                        <span className="badge st-green ml-2">
                          <Check size={16} strokeWidth={3} aria-hidden="true" />
                          Done
                        </span>
                      )}
                      {next && <span className="badge st-blue ml-2">Next up</span>}
                    </th>
                    <td data-label="Day">{dayWords(a.date)}</td>
                    <td data-label="Time">{timeWords(a.time)}</td>
                    <td data-label="Reminder">
                      {past ? (
                        <span className="text-muted">Not needed</span>
                      ) : (
                        <button
                          type="button"
                          role="switch"
                          aria-checked={a.reminderOn}
                          className="btn btn-quiet btn-sm"
                          onClick={() => setReminder(jobId, a.id, !a.reminderOn)}
                        >
                          {a.reminderOn && <Check size={18} strokeWidth={3} aria-hidden="true" />}
                          Reminder text to customer: {a.reminderOn ? 'On' : 'Off'}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog
        open={open}
        onClose={close}
        title="Add a visit"
        footer={
          <>
            <button type="button" className="btn btn-quiet" onClick={close}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={save}>
              Add visit
            </button>
          </>
        }
      >
        <div className="stack">
          <div>
            <label className="label" htmlFor="ap-kind">
              What kind of visit
            </label>
            <select id="ap-kind" className="field" value={kind} onChange={(e) => setKind(e.target.value as AppointmentKind)}>
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="ap-date">
              Day
            </label>
            <input id="ap-date" className="field" type="date" value={date} onChange={(e) => { setDate(e.target.value); setError('') }} />
          </div>
          <div>
            <label className="label" htmlFor="ap-time">
              Time
            </label>
            <input id="ap-time" className="field" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
          {error && (
            <p className="err" role="alert">
              {error}
            </p>
          )}
        </div>
      </Dialog>
    </Section>
  )
}

export default AppointmentsPanel
