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
          <button type="button" className="btn btn-neutral" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" disabled={!chosen || !mainRef} onClick={make}>
            Start the quote
          </button>
        </>
      }
    >
      <div className="dg-stack">
        <div>
          <label htmlFor={`${id}-s`} className="label dg-lab dg-lab-sr">
            {jobText('Which %j is the quote for?')}
          </label>
          <div className="relative">
            <Search size={18} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              id={`${id}-s`}
              type="search"
              className="field pl-10"
              placeholder={jobText('Find a customer, %j or address')}
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
        <fieldset className="dg-fs">
          <legend className="sr-only">{jobText('Choose a %j')}</legend>
          <div className="dg-list dg-scroll">
            {jobs.length === 0 && <p className="dg-muted">{jobText('No %j matches. Try a different word.')}</p>}
            {jobs.map((j) => {
              const who = `${customerName(j, s)}${j.address ? `, ${j.address}` : ''}`
              return (
                <label key={j.id} htmlFor={`${id}-${j.id}`} className="dg-row" title={`${j.name}, ${who}`}>
                  <input id={`${id}-${j.id}`} type="radio" name={`${id}-job`} checked={sel === j.id} onChange={() => setSel(j.id)} />
                  <span className="dg-name">{j.name}</span>
                  <span className="dg-sub">{who}</span>
                </label>
              )
            })}
          </div>
        </fieldset>
        {chosen && !mainRef && <p className="err">{jobText('This %j has no customer yet. Add someone on the %j first.')}</p>}
        <p className="dg-muted dg-adv">{jobText('To add a brand new %j, ask in the office. It is not in this version yet.')}</p>
      </div>
    </Dialog>
  )
}

export default NewQuoteDialog
