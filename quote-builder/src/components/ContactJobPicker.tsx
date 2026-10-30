import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Plus, Search, X } from 'lucide-react'
import { contacts } from '../data/mock'
import { createJob, useStore } from '../lib/store'
import type { Contact } from '../types'

export interface ContactJobValue {
  contactId: string
  jobId: string
  isAddOn: boolean
  isOption: boolean
}

const NEW_JOB = '__new__'

function matches(c: Contact, q: string) {
  const s = q.trim().toLowerCase()
  if (!s) return true
  return [c.name, c.email, c.phone, c.suburb].some((v) => v.toLowerCase().includes(s))
}

/**
 * Contact combobox (ARIA 1.2 list autocomplete pattern), then the job for that
 * contact, with the add-on checkbox. Reports changes as a partial value.
 */
export function ContactJobPicker({
  quoteId,
  value,
  onChange,
  disabled,
  defaultAddOn = false,
  defaultOption = false,
}: {
  quoteId: string
  value: ContactJobValue
  onChange: (patch: Partial<ContactJobValue>) => void
  disabled?: boolean
  /** Pre-tick the add-on box when a job with other quotes is first chosen. */
  defaultAddOn?: boolean
  /** Pre-select "alternative option" when a job with other quotes is first chosen. */
  defaultOption?: boolean
}) {
  const { jobs, quotes } = useStore()
  const contact = contacts.find((c) => c.id === value.contactId)
  const uid = useId()
  const listId = `${uid}-list`

  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const results = useMemo(() => contacts.filter((c) => matches(c, query)), [query])
  const optId = (i: number) => `${uid}-opt-${i}`

  const [newJob, setNewJob] = useState(false)
  const [jobTitle, setJobTitle] = useState('')
  const [jobAddress, setJobAddress] = useState('')
  const [jobErr, setJobErr] = useState('')

  const contactJobs = jobs.filter((j) => j.contactId === value.contactId)
  const job = jobs.find((j) => j.id === value.jobId)
  const otherQuotes = job ? quotes.filter((q) => q.jobId === job.id && q.id !== quoteId).length : 0

  function choose(c: Contact) {
    setOpen(false)
    setQuery('')
    setNewJob(false)
    // Changing contact clears a job that belongs to someone else.
    const keep = !!job && job.contactId === c.id
    onChange({ contactId: c.id, jobId: keep ? job.id : '', isAddOn: keep ? value.isAddOn : false, isOption: keep ? value.isOption : false })
  }

  function clearContact() {
    setQuery('')
    setNewJob(false)
    onChange({ contactId: '', jobId: '', isAddOn: false, isOption: false })
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    const last = results.length - 1
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        if (!open) setOpen(true)
        else setActive((a) => (a >= last ? 0 : a + 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        if (!open) setOpen(true)
        else setActive((a) => (a <= 0 ? last : a - 1))
        break
      case 'Home':
        if (open) {
          e.preventDefault()
          setActive(0)
        }
        break
      case 'End':
        if (open) {
          e.preventDefault()
          setActive(Math.max(0, last))
        }
        break
      case 'Enter':
        if (open && results[active]) {
          e.preventDefault()
          choose(results[active])
        }
        break
      case 'Escape':
        if (open) {
          e.preventDefault()
          e.stopPropagation()
          setOpen(false)
        } else if (query) {
          setQuery('')
        }
        break
    }
  }

  function onJobSelect(v: string) {
    if (v === NEW_JOB) {
      setNewJob(true)
      onChange({ jobId: '', isAddOn: false, isOption: false })
      return
    }
    setNewJob(false)
    const others = quotes.filter((q) => q.jobId === v && q.id !== quoteId).length
    const option = others > 0 && (defaultOption || value.isOption)
    onChange({ jobId: v, isOption: option, isAddOn: others > 0 && !option ? defaultAddOn || value.isAddOn : false })
  }

  function makeJob() {
    if (!jobTitle.trim() || !jobAddress.trim()) {
      setJobErr('Enter both a job title and the site address.')
      return
    }
    const j = createJob({ contactId: value.contactId, title: jobTitle.trim(), address: jobAddress.trim() })
    setJobTitle('')
    setJobAddress('')
    setJobErr('')
    setNewJob(false)
    onChange({ jobId: j.id, isAddOn: false, isOption: false })
  }

  const selectValue = newJob ? NEW_JOB : value.jobId

  return (
    <div className="space-y-5">
      {/* Contact */}
      <div>
        <label className="label" htmlFor={`${uid}-contact`}>
          Contact
        </label>
        {contact ? (
          <div className="flex items-start gap-3 rounded-md bg-raise p-3" style={{ border: '1px solid rgb(var(--c-control))' }}>
            <div className="min-w-0 flex-1">
              <p id={`${uid}-contact`} className="break-words font-bold">
                {contact.name}
              </p>
              <p className="break-words text-sm text-muted">
                {contact.suburb} | {contact.email} | {contact.phone}
              </p>
            </div>
            {!disabled && (
              <button type="button" className="btn btn-quiet btn-sm shrink-0" onClick={clearContact}>
                Change
                <span className="sr-only"> contact</span>
              </button>
            )}
          </div>
        ) : (
          <div className="relative">
            <Search size={18} className="pointer-events-none absolute left-3 top-[13px] text-muted" aria-hidden="true" />
            <input
              ref={inputRef}
              id={`${uid}-contact`}
              type="text"
              role="combobox"
              className="field pl-10 pr-11"
              placeholder="Search by name, email, phone or suburb"
              autoComplete="off"
              spellCheck={false}
              disabled={disabled}
              aria-expanded={open}
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={open && results[active] ? optId(active) : undefined}
              aria-describedby={`${uid}-hint`}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setActive(0)
                setOpen(true)
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => setOpen(false)}
              onKeyDown={onKey}
            />
            {query && (
              <button
                type="button"
                className="btn btn-ghost absolute right-0 top-0 min-h-[44px] min-w-[44px] px-0"
                aria-label="Clear search"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setQuery('')
                  setActive(0)
                  inputRef.current?.focus()
                }}
              >
                <X size={18} aria-hidden="true" />
              </button>
            )}
            <ul
              id={listId}
              role="listbox"
              aria-label="Matching contacts"
              hidden={!open}
              className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-md bg-surface py-1 shadow-pop"
              style={{ border: '1px solid rgb(var(--c-control))' }}
            >
              {results.length === 0 && (
                <li role="presentation" className="px-3 py-3 text-sm text-muted">
                  No contact matches. Check the spelling or try a suburb.
                </li>
              )}
              {results.map((c, i) => (
                <li
                  key={c.id}
                  id={optId(i)}
                  role="option"
                  aria-selected={i === active}
                  className={`cursor-pointer px-3 py-2.5 ${i === active ? 'bg-navy-wash' : ''}`}
                  // mousedown (not click) so the input keeps focus and touch taps register before blur closes the list
                  onMouseDown={(e) => {
                    e.preventDefault()
                    choose(c)
                  }}
                  onMouseEnter={() => setActive(i)}
                >
                  <span className="block break-words font-bold">{c.name}</span>
                  <span className="block break-words text-sm text-muted">
                    {c.suburb} | {c.email}
                  </span>
                </li>
              ))}
            </ul>
            <p id={`${uid}-hint`} className="hint">
              {open ? `${results.length} ${results.length === 1 ? 'contact' : 'contacts'} found. Use the arrow keys, then Enter.` : 'Choose who this quote is for.'}
            </p>
          </div>
        )}
        <p className="sr-only" role="status" aria-live="polite">
          {contact ? `Contact chosen: ${contact.name}` : ''}
        </p>
      </div>

      {/* Job */}
      {contact && (
        <div>
          <label className="label" htmlFor={`${uid}-job`}>
            Job
          </label>
          <select id={`${uid}-job`} className="field" value={selectValue} onChange={(e) => onJobSelect(e.target.value)} disabled={disabled}>
            <option value="">Choose a job</option>
            {contactJobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title} ({j.address})
              </option>
            ))}
            <option value={NEW_JOB}>New job for this contact</option>
          </select>

          {newJob && !disabled && (
            <div className="mt-4 space-y-4 rounded-md bg-raise p-4" style={{ border: '1px solid rgb(var(--c-line))' }}>
              <div>
                <label className="label" htmlFor={`${uid}-jt`}>
                  Job title
                </label>
                <input
                  id={`${uid}-jt`}
                  className="field"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  aria-invalid={!!jobErr && !jobTitle.trim()}
                  aria-describedby={jobErr ? `${uid}-je` : undefined}
                  placeholder="e.g. Roof and wall insulation"
                />
              </div>
              <div>
                <label className="label" htmlFor={`${uid}-ja`}>
                  Site address
                </label>
                <input
                  id={`${uid}-ja`}
                  className="field"
                  value={jobAddress}
                  onChange={(e) => setJobAddress(e.target.value)}
                  aria-invalid={!!jobErr && !jobAddress.trim()}
                  aria-describedby={jobErr ? `${uid}-je` : undefined}
                  autoComplete="off"
                />
              </div>
              {jobErr && (
                <p id={`${uid}-je`} className="err" role="alert">
                  {jobErr}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn btn-primary" onClick={makeJob}>
                  <Plus size={18} aria-hidden="true" />
                  Create job
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setNewJob(false)
                    setJobErr('')
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {job && (
            <div className="mt-3">
              <p className="text-sm text-muted">
                {job.address} | Stage: {job.stage} |{' '}
                {otherQuotes === 0 ? 'No other quotes on this job yet.' : `${otherQuotes} other ${otherQuotes === 1 ? 'quote' : 'quotes'} on this job.`}
              </p>
              {otherQuotes > 0 && (
                <fieldset className="mt-3 min-w-0 border-0 p-0" disabled={disabled}>
                  <legend className="label">How does this quote relate to the other quotes on this job?</legend>
                  <div className="space-y-1">
                    {(
                      [
                        { id: 'main', label: 'A separate quote', hint: 'Stands on its own.' },
                        { id: 'option', label: 'An alternative option', hint: 'The customer accepts only one option. Accepting one closes the other sent options on this job.' },
                        { id: 'addon', label: 'An add-on quote', hint: 'Extra work on a job that is already accepted. Add-on quotes do not restart the welcome messages.' },
                      ] as const
                    ).map((o) => {
                      const current = value.isOption ? 'option' : value.isAddOn ? 'addon' : 'main'
                      return (
                        <label key={o.id} className="flex min-h-[44px] cursor-pointer items-start gap-3 py-1" htmlFor={`${uid}-kind-${o.id}`}>
                          <input
                            id={`${uid}-kind-${o.id}`}
                            type="radio"
                            name={`${uid}-kind`}
                            className="mt-1.5 h-5 w-5 shrink-0 accent-[rgb(var(--c-navy))]"
                            checked={current === o.id}
                            onChange={() => onChange({ isOption: o.id === 'option', isAddOn: o.id === 'addon' })}
                            aria-describedby={`${uid}-kind-${o.id}-h`}
                          />
                          <span>
                            <span className="block font-bold">{o.label}</span>
                            <span id={`${uid}-kind-${o.id}-h`} className="hint !mt-0 block">
                              {o.hint}
                            </span>
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </fieldset>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
