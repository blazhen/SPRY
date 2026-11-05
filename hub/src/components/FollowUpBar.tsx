import { useId } from 'react'
import { CalendarClock, Copy, MapPin } from 'lucide-react'
import { addDaysISO, fmtDate, todayISO } from '../lib/format'
import { followUpFor, setFollowUp, useNotesStore, type NoteTarget } from '../lib/notesStore'
import { toast } from './ui'

/** Next follow-up date with one-click buttons. Mock: saved in this browser only. */
export function FollowUpBar({ target }: { target: NoteTarget }) {
  const s = useNotesStore()
  const id = useId()
  const due = followUpFor(target, s)
  const today = todayISO()
  const overdue = !!due && due < today
  const quick: [string, number][] = [
    ['Tomorrow', 1],
    ['In 3 days', 3],
    ['Next week', 7],
    ['In 2 weeks', 14],
  ]
  return (
    <section className="card stack" aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`} className="t-section flex items-center gap-2">
        <CalendarClock size={22} aria-hidden="true" />
        Next follow-up
      </h2>
      <p className="t-body font-bold">
        {due ? (
          <>
            {fmtDate(due)}
            {overdue && <span className="badge st-hot ml-2">Overdue</span>}
          </>
        ) : (
          <span className="font-normal text-muted">Not set</span>
        )}
      </p>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Set the follow-up date">
        {quick.map(([label, days]) => (
          <button key={label} type="button" className="chip" onClick={() => { setFollowUp(target, addDaysISO(today, days)); toast('Follow-up set') }}>
            {label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="label" htmlFor={`${id}-d`}>
            Or pick a date
          </label>
          <input id={`${id}-d`} type="date" className="field" value={due ?? ''} min={today} onChange={(e) => setFollowUp(target, e.target.value || undefined)} />
        </div>
        {due && (
          <button type="button" className="btn btn-neutral" onClick={() => setFollowUp(target, undefined)}>
            Clear date
          </button>
        )}
      </div>
    </section>
  )
}

/** Copy the address and open it in maps. */
export function AddressActions({ address }: { address: string }) {
  if (!address.trim()) return null
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address)
      toast('Address copied')
    } catch {
      toast('Could not copy. Select the address and copy it.')
    }
  }
  return (
    <span className="inline-flex flex-wrap gap-2">
      <button type="button" className="btn btn-neutral" onClick={copy}>
        <Copy size={16} aria-hidden="true" />
        Copy address
      </button>
      <a className="btn btn-neutral" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`} target="_blank" rel="noreferrer">
        <MapPin size={16} aria-hidden="true" />
        Open in maps
      </a>
    </span>
  )
}
