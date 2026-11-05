import { useEffect, useId, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { jobText } from '../lib/format'
import { useContactSearch } from '../lib/live'
import { go, href } from '../lib/router'
import { createContactAsync, createJobAsync, useStore } from '../lib/store'
import type { Contact } from '../types'
import { Dialog, Notice, toast } from './ui'
import { companyLabel, jobsOfSameCompany } from '../lib/sameCompany'
import './newJob.css'

const SHOWN = 3
const digits = (s: string) => s.replace(/\D/g, '')

/** Same phone number? Spaces, brackets and +61 / 0 at the front are ignored (the last 8 digits must match). */
function samePhone(a: string, b: string): boolean {
  const x = digits(a)
  const y = digits(b)
  if (x.length < 6 || y.length < 6) return false
  return x.slice(-8) === y.slice(-8)
}

type Errors = Partial<Record<'pName' | 'pEmail' | 'jobName' | 'value', string>>

/**
 * "New job" for when the phone rings: the caller is a new person about 99 percent of the time, so the default is typing
 * a new contact (name, phone, email), then the job (name, site address, notes), then Save once. A small
 * "Existing contact?" search above lets you use a saved person instead. One dialog, no second page.
 * Live mode: the person and the job are made in the CRM and the job shows in the list at once.
 */
export function NewJobDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useStore()
  const uid = useId()
  const [find, setFind] = useState('')
  const [pick, setPick] = useState<Contact | null>(null)
  const [pName, setPName] = useState('')
  const [pEmail, setPEmail] = useState('')
  const [pPhone, setPPhone] = useState('')
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [biz, setBiz] = useState('')
  const [value, setValue] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [failure, setFailure] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [notSame, setNotSame] = useState<string[]>([])
  const box = useRef<HTMLDivElement>(null)
  const keepBtn = useRef<HTMLButtonElement>(null)
  const found = useContactSearch(find, open)

  const term = find.trim().toLowerCase()
  const options = !term ? [] : (found.rows ?? s.contacts.filter((c) => [c.name, c.email, c.phone].some((x) => x.toLowerCase().includes(term)))).slice(0, SHOWN)

  const contactName = pick ? pick.name : pName.trim()
  const addrHead = address.split(',')[0].trim()
  const suggestion = contactName ? (addrHead ? `${contactName}, ${addrHead}` : contactName) : ''
  const jobName = name !== '' ? name : suggestion

  // A typed phone or email that is already saved: say so and offer that person.
  const dupe = pick
    ? undefined
    : s.contacts.find((c) => {
        if (notSame.includes(c.id)) return false
        const e = pEmail.trim().toLowerCase()
        if (e && c.email && c.email.toLowerCase() === e) return true
        return !!pPhone.trim() && [c.phone, c.mobile].some((p) => !!p && samePhone(p, pPhone))
      })
  const dupeBy = dupe && pEmail.trim() && dupe.email && dupe.email.toLowerCase() === pEmail.trim().toLowerCase() ? 'email address' : 'phone number'

  const dirty = !!(find || pick || pName || pEmail || pPhone || name || address || notes || biz || value)

  const reset = () => {
    setFind('')
    setPick(null)
    setPName('')
    setPEmail('')
    setPPhone('')
    setName('')
    setAddress('')
    setNotes('')
    setBiz('')
    setValue('')
    setErrors({})
    setFailure('')
    setConfirming(false)
    setNotSame([])
  }

  const discard = () => {
    reset()
    onClose()
  }

  // Escape, the X, the backdrop and Cancel all come here: ask first only when something was typed.
  const requestClose = () => {
    if (busy) return
    if (!dirty) return discard()
    setConfirming((c) => !c)
  }

  useEffect(() => {
    if (confirming) {
      keepBtn.current?.focus()
      keepBtn.current?.scrollIntoView({ block: 'nearest' })
    }
  }, [confirming])

  useEffect(() => {
    if (failure) box.current?.querySelector<HTMLElement>('[data-nj-failure]')?.scrollIntoView({ block: 'nearest' })
  }, [failure])

  const id = (k: string) => `${uid}-${k}`
  const focusId = (k: string) => {
    const el = document.getElementById(id(k))
    el?.focus()
    el?.scrollIntoView({ block: 'nearest' })
  }

  const save = async () => {
    if (busy) return
    const e: Errors = {}
    if (!pick && !pName.trim()) e.pName = 'Type the person’s name.'
    if (!pick && pEmail.trim() && !/^\S+@\S+\.\S+$/.test(pEmail.trim())) e.pEmail = 'That email address does not look right. Check it, or leave it empty.'
    if (!jobName.trim()) e.jobName = jobText('Give the %j a name.')
    const worth = value.trim() === '' ? 0 : Number(value.replace(/[$,\s]/g, ''))
    if (!Number.isFinite(worth) || worth < 0) e.value = 'The value must be a number, for example 4500.'
    setErrors(e)
    setFailure('')
    const first = (['pName', 'pEmail', 'jobName', 'value'] as const).find((k) => e[k])
    if (first) {
      setTimeout(() => focusId(first), 0)
      return
    }
    setBusy(true)
    let contactId = pick?.id ?? ''
    try {
      if (!pick) {
        const made = await createContactAsync({ name: pName.trim(), email: pEmail.trim(), phone: pPhone.trim() })
        contactId = made.id
        // If the job fails below, retrying reuses this person instead of making another.
        setPick(made)
      }
      const job = await createJobAsync({ contactId, name: jobName.trim(), value: worth, address: address.trim(), notes: notes.trim(), businessName: biz.trim() })
      reset()
      onClose()
      toast(jobText('%J made. Add a note or write the quote.'))
      go(href.job(job.id))
    } catch (err) {
      setFailure(err instanceof Error && err.message ? `Not saved: ${err.message}.` : 'Not saved. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  // Enter in the last field saves (Shift+Enter is a new line in the notes). Ctrl+Enter saves from any field.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter' || e.nativeEvent.isComposing) return
    const t = e.target as HTMLElement
    if (t.tagName === 'BUTTON' || t.tagName === 'A' || (t as HTMLInputElement).type === 'search') return
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      void save()
      return
    }
    const all = box.current?.querySelectorAll<HTMLElement>('[data-nj]')
    const last = all?.[all.length - 1]
    if (last && t === last && !e.shiftKey) {
      e.preventDefault()
      void save()
    }
  }

  const errProps = (k: keyof Errors, hintId?: string) => ({
    'aria-invalid': errors[k] ? (true as const) : undefined,
    'aria-describedby': [errors[k] ? id(k + '-e') : '', hintId ?? ''].filter(Boolean).join(' ') || undefined,
  })
  const fieldErr = (k: keyof Errors) =>
    errors[k] ? (
      <p id={id(k + '-e')} className="nj-field-err" role="alert">
        {errors[k]}
      </p>
    ) : null

  return (
    <Dialog
      open={open}
      onClose={requestClose}
      size="lg"
      title={jobText('New %j')}
      footer={
        <>
          <button type="button" className="btn btn-neutral" onClick={requestClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={() => void save()} disabled={busy}>
            <Plus size={18} aria-hidden="true" />
            {busy ? 'Saving' : jobText('Save %j')}
          </button>
        </>
      }
    >
      <div className="nj" ref={box} onKeyDown={onKeyDown}>
        {confirming && (
          <div className="nj-confirm" role="alertdialog" aria-label="Close without saving?">
            <p className="font-bold">Close without saving? What you typed will be lost.</p>
            <div className="nj-confirm-btns">
              <button ref={keepBtn} type="button" className="btn btn-primary" onClick={() => setConfirming(false)}>
                Keep editing
              </button>
              <button type="button" className="btn btn-neutral" onClick={discard}>
                Close and lose it
              </button>
            </div>
          </div>
        )}

        <div className="nj-find">
          <label className="label dg-lab dg-lab-sr" htmlFor={id('find')}>
            Existing contact?
          </label>
          <input id={id('find')} type="search" className="field" autoComplete="off" value={find} onChange={(e) => setFind(e.target.value)} placeholder="Existing contact? Search name, phone or email" />
          {term && found.loading && <p className="nj-hint">Searching</p>}
          {term && found.error && <p className="nj-field-err">{found.error}</p>}
          {term && (
            <div className="nj-pick" aria-label="Matching people">
              {options.map((c) => (
                <div key={c.id} className="nj-pick-row">
                  <span>
                    <span className="block font-bold">{c.name}</span>
                    <span className="block text-muted">{[c.phone, c.email].filter(Boolean).join(', ') || 'No phone or email saved'}</span>
                  </span>
                  <button
                    type="button"
                    className="btn btn-neutral"
                    onClick={() => {
                      setPick(c)
                      setFind('')
                      setErrors({})
                      setTimeout(() => focusId('jobName'), 0)
                    }}
                  >
                    Use {c.name.split(' ')[0] || 'them'}
                  </button>
                </div>
              ))}
              {options.length === 0 && !found.loading && <p className="nj-hint">Nobody saved with that. Type the new person below.</p>}
            </div>
          )}
        </div>
        {pick && jobsOfSameCompany(pick, s).length > 0 && (
          <Notice tone="warn" className="mb-3">
            <strong>{pick.name}</strong> works at {companyLabel(pick, s)}. Someone else from there is already on{' '}
            {jobsOfSameCompany(pick, s)
              .slice(0, 3)
              .map(({ job, who }, i) => (
                <span key={job.id}>
                  {i > 0 ? ', ' : ''}
                  <a className="cell-link" href={href.job(job.id)}>
                    {job.name}
                  </a>{' '}
                  ({who.name})
                </span>
              ))}
            . Check it is not the same work before you make a new one.
          </Notice>
        )}

        <fieldset className="nj-group">
          <legend className="nj-legend">Contact</legend>
          {pick ? (
            <div className="nj-chosen">
              <span>
                <span className="block font-bold">Using {pick.name}</span>
                <span className="block text-muted">{[pick.phone, pick.email].filter(Boolean).join(', ') || 'No phone or email saved'}</span>
              </span>
              <button type="button" className="btn btn-neutral" onClick={() => { setPick(null); setTimeout(() => focusId('pName'), 0) }}>
                Change
              </button>
            </div>
          ) : (
            <>
              <div className="dg-grid3">
              <div>
                <label className="label" htmlFor={id('pName')}>
                  Name
                </label>
                <input id={id('pName')} data-nj data-autofocus className="field" autoComplete="off" value={pName} onChange={(e) => { setPName(e.target.value); setErrors((x) => ({ ...x, pName: undefined })) }} {...errProps('pName')} />
                {fieldErr('pName')}
              </div>
                <div>
                  <label className="label" htmlFor={id('pPhone')}>
                    Phone
                  </label>
                  <input id={id('pPhone')} data-nj className="field" type="tel" autoComplete="off" value={pPhone} onChange={(e) => setPPhone(e.target.value)} />
                </div>
                <div>
                  <label className="label" htmlFor={id('pEmail')}>
                    Email
                  </label>
                  <input id={id('pEmail')} data-nj className="field" type="email" autoComplete="off" value={pEmail} onChange={(e) => { setPEmail(e.target.value); setErrors((x) => ({ ...x, pEmail: undefined })) }} {...errProps('pEmail')} />
                  {fieldErr('pEmail')}
                </div>
              </div>
              {dupe && (
                <div className="nj-dupe" role="status" data-testid="nj-dupe">
                  <p className="font-bold">
                    This {dupeBy} is already saved for {dupe.name}
                    {[dupe.phone, dupe.email].filter(Boolean).length ? ` (${[dupe.phone, dupe.email].filter(Boolean).join(', ')})` : ''}.
                  </p>
                  <div className="nj-dupe-btns">
                    <button type="button" className="btn btn-primary" onClick={() => { setPick(dupe); setErrors({}); setTimeout(() => focusId('jobName'), 0) }}>
                      Use {dupe.name}
                    </button>
                    <button type="button" className="btn btn-neutral" onClick={() => setNotSame((x) => [...x, dupe.id])}>
                      No, a different person
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </fieldset>

        <fieldset className="nj-group">
          <legend className="nj-legend">{jobText('%J')}</legend>
          <div className="dg-grid2">
          <div>
            <label className="label" htmlFor={id('jobName')}>
              {jobText('%J name')}
            </label>
            <input id={id('jobName')} data-nj className="field" autoComplete="off" value={jobName} onChange={(e) => { setName(e.target.value); setErrors((x) => ({ ...x, jobName: undefined })) }} placeholder="e.g. Roof insulation, 12 Smith St" {...errProps('jobName', name === '' && suggestion ? id('jobName-h') : undefined)} />
            {name === '' && suggestion && (
              <p id={id('jobName-h')} className="nj-hint">
                Suggested. Change it if you like.
              </p>
            )}
            {fieldErr('jobName')}
          </div>
          <div>
            <label className="label" htmlFor={id('addr')}>
              Job site address
            </label>
            <input id={id('addr')} data-nj className="field" autoComplete="off" value={address} onChange={(e) => setAddress(e.target.value)} aria-describedby={id('addr-h')} />
            {pick?.address && address.trim() !== pick.address.trim() && (
              <button type="button" className="btn btn-neutral btn-sm mt-1" onClick={() => setAddress(pick.address ?? '')}>
                Use {pick.name.split(' ')[0] || 'their'}'s address: {pick.address}
              </button>
            )}
            <p id={id('addr-h')} className="nj-hint">
              Where the work is done. Can wait.
            </p>
          </div>
          </div>
          <div>
            <label className="label" htmlFor={id('notes')}>
              Notes about the job
            </label>
            <textarea id={id('notes')} data-nj className="field" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div id={id('more')} className="dg-grid2">
            <div>
              <label className="label" htmlFor={id('biz')}>
                Business name (optional)
              </label>
              <input id={id('biz')} data-nj className="field" autoComplete="off" value={biz} onChange={(e) => setBiz(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor={id('value')}>
                Value before GST (optional)
              </label>
              <input id={id('value')} data-nj className="field" inputMode="decimal" value={value} onChange={(e) => { setValue(e.target.value); setErrors((x) => ({ ...x, value: undefined })) }} placeholder="e.g. 4500" {...errProps('value', id('value-h'))} />
              <p id={id('value-h')} className="nj-hint">
                A best guess. Change it in the quote.
              </p>
              {fieldErr('value')}
            </div>
          </div>
        </fieldset>

        {failure && (
          <p className="nj-field-err" role="alert" data-nj-failure>
            {failure}
          </p>
        )}
      </div>
    </Dialog>
  )
}
