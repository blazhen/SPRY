import { useId, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Dialog, Notice, toast } from '../ui'
import { calcTotals, quoteLinesFrom, type CalcLine, type Qtys } from '../../lib/calcEngine'
import { countUses, saveCalcToJob } from '../../lib/calcItems'
import { fmtDate, fmtMoney, jobText, uid } from '../../lib/format'
import { go, quoteOnJob } from '../../lib/router'
import { createQuote, customerName, getJob, getQuote, listJobs, quotesForJob, saveQuote, useStore } from '../../lib/store'

export type CalcStepMode = 'quote' | 'save'

/**
 * The steps after the sum is ready. With no job given it first asks which job (a search and big rows). Then:
 * 'quote' adds the lines to a Draft quote or starts a new one (never overwrites, only appends; Sent or Accepted quotes are
 * never offered), 'save' keeps the sum with the job. Prices are copied into the lines at that moment.
 */
export function CalcStepDialog({
  open,
  onClose,
  mode,
  jobId,
  lines,
  qtys,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  mode: CalcStepMode
  /** Fixed job (the job box). Missing = ask which job first. */
  jobId?: string
  lines: CalcLine[]
  qtys: Qtys
  /** Called after a sum was saved with a job. */
  onSaved: (jobId: string, at: string) => void
}) {
  return (
    <Dialog open={open} onClose={onClose} title={mode === 'quote' ? 'Add to a quote' : 'Save this sum with a job'} size="lg">
      <Steps onClose={onClose} mode={mode} fixedJob={jobId} lines={lines} qtys={qtys} onSaved={onSaved} />
    </Dialog>
  )
}

function Steps({ onClose, mode, fixedJob, lines, qtys, onSaved }: { onClose: () => void; mode: CalcStepMode; fixedJob?: string; lines: CalcLine[]; qtys: Qtys; onSaved: (jobId: string, at: string) => void }) {
  const s = useStore()
  const id = useId()
  const [search, setSearch] = useState('')
  const [picked, setPicked] = useState<string | undefined>(fixedJob)
  const [choice, setChoice] = useState('')
  const [error, setError] = useState('')

  const jobs = useMemo(() => listJobs({ search }, s).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 40), [s, search])
  const job = picked ? getJob(picked, s) : undefined

  if (!job) {
    return (
      <div className="calc-form" data-calc-step="job">
        <div>
          <label htmlFor={`${id}-s`} className="label">
            {jobText('Which %j is this for?')}
          </label>
          <div className="relative">
            <Search size={20} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input id={`${id}-s`} type="search" className="field pl-10" placeholder={jobText('Find a customer, %j or address')} value={search} onChange={(e) => setSearch(e.target.value)} autoComplete="off" data-autofocus />
          </div>
        </div>
        <p className="hint" role="status">
          {jobs.length === 0 ? 'Nothing found.' : `${jobs.length} shown`}
        </p>
        <ul className="calc-jobs">
          {jobs.map((j) => (
            <li key={j.id}>
              <button type="button" className="btn calc-jobrow" data-calc-job={j.id} onClick={() => setPicked(j.id)}>
                <strong>{j.name}</strong>
                <span className="calc-sub">{[customerName(j, s), j.address].filter(Boolean).join(', ')}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  const drafts = quotesForJob(job.id, s).filter((q) => q.status === 'Draft')
  const mainRef = job.participants.find((p) => p.role === 'main') ?? job.participants[0]
  const sel = choice || (drafts[0]?.id ?? 'new')

  const finish = () => {
    setError('')
    if (mode === 'save') {
      const t = calcTotals(lines)
      saveCalcToJob(job.id, qtys, lines, t)
      onSaved(job.id, new Date().toISOString())
      onClose()
      return
    }
    const newLines = quoteLinesFrom(lines, () => uid('li'))
    let quote = sel === 'new' ? undefined : getQuote(sel)
    if (quote && quote.status !== 'Draft') return setError('That quote has been sent, so it cannot be changed. Start a new quote instead.')
    if (!quote) {
      if (!mainRef) return setError('Add a person to the job first (People tab), then try again.')
      quote = createQuote(job.id, mainRef)
      if (!quote) return setError('The new quote could not be made.')
    }
    saveQuote({ ...quote, lines: [...quote.lines, ...newLines] })
    countUses(lines.map((l) => l.itemId))
    toast(`Added ${newLines.length} ${newLines.length === 1 ? 'line' : 'lines'} to quote ${quote.number}`)
    onClose()
    go(quoteOnJob(job.id, quote.id))
  }

  return (
    <div className="calc-form" data-calc-step="choose">
      <p>
        <strong>{job.name}</strong>
        {!fixedJob && (
          <>
            {' '}
            <button type="button" className="btn btn-quiet" onClick={() => setPicked(undefined)}>
              Choose a different {jobText('%j')}
            </button>
          </>
        )}
      </p>
      {mode === 'quote' ? (
        <fieldset className="calc-choices">
          <legend className="label">What do you want to do?</legend>
          {drafts.map((q) => (
            <label key={q.id} className="calc-choice">
              <input type="radio" name={`${id}-c`} checked={sel === q.id} onChange={() => setChoice(q.id)} data-calc-choice="draft" />
              <span>
                Add to the draft quote {q.number}
                <span className="calc-sub">{q.lines.length} {q.lines.length === 1 ? 'line' : 'lines'} so far, the new lines go at the end</span>
              </span>
            </label>
          ))}
          <label className="calc-choice">
            <input type="radio" name={`${id}-c`} checked={sel === 'new'} onChange={() => setChoice('new')} data-calc-choice="new" />
            <span>Start a new quote</span>
          </label>
        </fieldset>
      ) : (
        <p>
          Keep this sum with the {jobText('%j')}. It will show "Last saved {fmtDate(new Date().toISOString())}" next time.
        </p>
      )}
      <p className="hint">
        {lines.length} {lines.length === 1 ? 'line' : 'lines'}, {fmtMoney(calcTotals(lines).total)} with GST. The prices are copied in now, so they stay the same later.
      </p>
      {error && (
        <Notice tone="bad" className="calc-note">
          <span role="alert">{error}</span>
        </Notice>
      )}
      <div className="calc-actions">
        <button type="button" className="btn btn-quiet" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="btn btn-primary" data-calc-confirm onClick={finish}>
          {mode === 'quote' ? 'Add to quote' : 'Save with this job'}
        </button>
      </div>
    </div>
  )
}
