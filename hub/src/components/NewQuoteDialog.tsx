import { useEffect, useId, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Dialog, toast } from './ui'
import { jobText } from '../lib/format'
import { go, href } from '../lib/router'
import { createQuote, customerName, listJobs, useStore } from '../lib/store'
import type { ParticipantRef } from '../types'

/** Pick a job, then make a quote exactly as the job page does (createQuote) and open the editor. */
export function NewQuoteDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useStore()
  const id = useId()
  const [search, setSearch] = useState('')
  const [sel, setSel] = useState('')

  useEffect(() => {
    if (open) {
      setSearch('')
      setSel('')
    }
  }, [open])

  const jobs = useMemo(() => listJobs({ search }, s).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [s, search])
  const chosen = sel ? s.jobs.find((j) => j.id === sel) : undefined
  const mainRef: ParticipantRef | undefined = chosen ? (chosen.participants.find((p) => p.role === 'main') ?? chosen.participants[0]) : undefined

  function make() {
    if (!chosen || !mainRef) return
    const q = createQuote(chosen.id, mainRef)
    if (q) {
      onClose()
      go(href.edit(q.id))
    } else {
      toast('The new quote could not be made.')
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="New quote"
      size="lg"
      footer={
        <>
          <button type="button" className="btn btn-quiet btn-lg" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary btn-lg" disabled={!chosen || !mainRef} onClick={make}>
            Start the quote
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label htmlFor={`${id}-s`} className="label">
            {jobText('Which %j is the quote for?')}
          </label>
          <div className="relative">
            <Search size={20} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              id={`${id}-s`}
              type="search"
              className="field pl-11"
              placeholder={jobText('Type a customer, %j or address')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-autofocus
              autoComplete="off"
            />
          </div>
        </div>
        <p className="sr-only" role="status">
          {jobs.length} found
        </p>
        <fieldset className="min-w-0 border-0 p-0">
          <legend className="sr-only">{jobText('Choose a %j')}</legend>
          <div className="max-h-[45vh] space-y-1 overflow-y-auto pr-1">
            {jobs.length === 0 && <p className="t-body text-muted">{jobText('No %j matches. Try a different word.')}</p>}
            {jobs.map((j) => (
              <label
                key={j.id}
                htmlFor={`${id}-${j.id}`}
                className={`flex min-h-[56px] cursor-pointer items-center gap-3 rounded-md border px-3 py-2 ${sel === j.id ? 'bg-navy-wash' : ''}`}
                style={{ borderColor: 'rgb(var(--c-control))' }}
              >
                <input
                  id={`${id}-${j.id}`}
                  type="radio"
                  name={`${id}-job`}
                  className="h-5 w-5 shrink-0 accent-[rgb(var(--c-navy))]"
                  checked={sel === j.id}
                  onChange={() => setSel(j.id)}
                />
                <span className="min-w-0 break-words">
                  <span className="block font-bold">{j.name}</span>
                  <span className="t-small block text-muted">
                    {customerName(j, s)}
                    {j.address ? `, ${j.address}` : ''}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        {chosen && !mainRef && <p className="err">{jobText('This %j has no customer yet. Add someone on the %j first.')}</p>}
        <p className="hint">{jobText('To add a brand new %j, ask in the office. It is not in this version yet.')}</p>
      </div>
    </Dialog>
  )
}

export default NewQuoteDialog
