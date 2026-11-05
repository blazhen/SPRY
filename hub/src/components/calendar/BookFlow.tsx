// "Book a visit" from the Calendar page, all in dialogs on the same page: find a contact (or make a new one, then optionally a new job),
// then the booking step. The new contact and job go through the same store calls as the New job dialog (createContactAsync,
// createJobAsync), which add them to the lists at once, so nothing waits for the CRM search to catch up.
import { useId, useState } from 'react'
import { jobText } from '../../lib/format'
import { createContactAsync, createJobAsync, useStore } from '../../lib/store'
import type { Contact, Job } from '../../types'
import { Dialog, toast } from '../ui'
import { BookVisitDialog } from './VisitDialogs'

type Step = 'pick' | 'contact' | 'job' | 'book'
const digits = (s: string) => s.replace(/\D/g, '')
const samePhone = (a: string, b: string) => digits(a).length >= 6 && digits(b).length >= 6 && digits(a).slice(-8) === digits(b).slice(-8)

function Steps({ step, withJob }: { step: Step; withJob: boolean }) {
  const list: [Step, string][] = [['contact', 'New contact'], ...(withJob ? ([['job', jobText('New %j')]] as [Step, string][]) : []), ['book', 'Book the visit']]
  return (
    <ol className="cal-flow-steps" aria-label="Steps" data-flow-steps>
      {list.map(([k, label], i) => <li key={k} aria-current={k === step ? 'step' : undefined}>{i + 1}. {label}</li>)}
    </ol>
  )
}

function PickStep({ onClose, onPick, onNew }: { onClose: () => void; onPick: (contactId: string, jobId: string, address: string) => void; onNew: () => void }) {
  const s = useStore()
  const [q, setQ] = useState('')
  const [contactId, setContactId] = useState('')
  const [jobId, setJobId] = useState('')
  const needle = q.trim().toLowerCase()
  const matches = s.contacts.filter((c) => !needle || `${c.name} ${c.email} ${c.phone}`.toLowerCase().includes(needle)).slice(0, 8)
  const jobs = contactId ? s.jobs.filter((j) => j.participants.some((p) => p.kind === 'contact' && p.id === contactId)) : []
  const job = jobs.find((j) => j.id === jobId)
  return (
    <Dialog
      open
      onClose={onClose}
      title="Book a visit: who is it for?"
      footer={
        <>
          <button type="button" className="btn btn-neutral" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-primary" disabled={!contactId} onClick={() => onPick(contactId, jobId, job?.address ?? '')}>Next</button>
        </>
      }
    >
      <div className="stack">
        <button type="button" className="btn btn-neutral" data-flow-new-contact onClick={onNew}>Create new contact</button>
        <label htmlFor="cal-contact-search" className="t-small font-bold">Or find a contact</label>
        <input id="cal-contact-search" type="search" className="field" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, email or phone" />
        {matches.length === 0 ? (
          <p className="t-small">No contact matches. Use Create new contact above.</p>
        ) : (
          <ul className="cal-people" aria-label="Contacts">
            {matches.map((c) => (
              <li key={c.id}>
                <button type="button" className="cal-person" aria-pressed={c.id === contactId} onClick={() => { setContactId(c.id); setJobId('') }}>
                  {c.name || 'No name'}{c.phone ? `, ${c.phone}` : ''}{c.id === contactId ? ' (chosen)' : ''}
                </button>
              </li>
            ))}
          </ul>
        )}
        {contactId && (
          <>
            <label htmlFor="cal-job-pick" className="t-small font-bold">Which {jobText('%j')} is it for?</label>
            <select id="cal-job-pick" className="field" value={jobId} onChange={(e) => setJobId(e.target.value)}>
              <option value="">No {jobText('%j')} yet</option>
              {jobs.map((j) => <option key={j.id} value={j.id}>{j.name}</option>)}
            </select>
          </>
        )}
      </div>
    </Dialog>
  )
}

function ContactStep({ onClose, onBack, onSaved }: { onClose: () => void; onBack: () => void; onSaved: (c: Contact) => void }) {
  const s = useStore()
  const uid = useId()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [err, setErr] = useState<{ name?: string; email?: string }>({})
  const [failure, setFailure] = useState('')
  const [busy, setBusy] = useState(false)
  const [notSame, setNotSame] = useState<string[]>([])
  const [confirming, setConfirming] = useState(false)
  const dupe = s.contacts.find((c) => {
    if (notSame.includes(c.id)) return false
    const e = email.trim().toLowerCase()
    if (e && c.email && c.email.toLowerCase() === e) return true
    return !!phone.trim() && [c.phone, c.mobile].some((p) => !!p && samePhone(p, phone))
  })
  const dirty = !!(name || phone || email)
  const close = () => { if (busy) return; if (dirty && !confirming) setConfirming(true); else onClose() }

  const save = async () => {
    if (busy) return
    const e: typeof err = {}
    if (!name.trim()) e.name = 'Type the person’s name.'
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) e.email = 'That email address does not look right. Check it, or leave it empty.'
    setErr(e)
    setFailure('')
    if (e.name || e.email) { document.getElementById(`${uid}-${e.name ? 'name' : 'email'}`)?.focus(); return }
    setBusy(true)
    try {
      onSaved(await createContactAsync({ name: name.trim(), email: email.trim(), phone: phone.trim() }))
    } catch (x) {
      setFailure(x instanceof Error && x.message ? `Not saved: ${x.message}.` : 'Not saved. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open
      onClose={close}
      title="New contact"
      footer={
        <>
          <button type="button" className="btn btn-neutral" onClick={onBack} disabled={busy}>Back</button>
          <button type="button" className="btn btn-neutral" onClick={close} disabled={busy}>Cancel</button>
          <button type="button" className="btn btn-primary" data-flow-save-contact onClick={() => void save()} disabled={busy}>{busy ? 'Saving' : 'Save contact and continue'}</button>
        </>
      }
    >
      <div className="stack" onKeyDown={(e) => { if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') { e.preventDefault(); void save() } }}>
        <Steps step="contact" withJob />
        {confirming && (
          <div role="alertdialog" aria-label="Close without saving?" className="stack">
            <p className="font-bold">Close without saving? What you typed will be lost.</p>
            <div className="flex gap-2">
              <button type="button" className="btn btn-primary" onClick={() => setConfirming(false)}>Keep editing</button>
              <button type="button" className="btn btn-neutral" onClick={onClose}>Close and lose it</button>
            </div>
          </div>
        )}
        <div>
          <label className="label" htmlFor={`${uid}-name`}>Name</label>
          <input id={`${uid}-name`} data-autofocus className="field" autoComplete="off" value={name} onChange={(e) => { setName(e.target.value); setErr((x) => ({ ...x, name: undefined })) }} aria-invalid={err.name ? true : undefined} aria-describedby={err.name ? `${uid}-name-e` : undefined} />
          {err.name && <p id={`${uid}-name-e`} className="err" role="alert">{err.name}</p>}
        </div>
        <div>
          <label className="label" htmlFor={`${uid}-phone`}>Phone</label>
          <input id={`${uid}-phone`} className="field" type="tel" autoComplete="off" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor={`${uid}-email`}>Email</label>
          <input id={`${uid}-email`} className="field" type="email" autoComplete="off" value={email} onChange={(e) => { setEmail(e.target.value); setErr((x) => ({ ...x, email: undefined })) }} aria-invalid={err.email ? true : undefined} aria-describedby={err.email ? `${uid}-email-e` : undefined} />
          {err.email && <p id={`${uid}-email-e`} className="err" role="alert">{err.email}</p>}
        </div>
        {dupe && (
          <div role="status" className="stack" data-flow-dupe>
            <p className="font-bold">This {email.trim() && dupe.email && dupe.email.toLowerCase() === email.trim().toLowerCase() ? 'email address' : 'phone number'} is already saved for {dupe.name}.</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn btn-primary" data-flow-use-dupe onClick={() => onSaved(dupe)}>Use {dupe.name}</button>
              <button type="button" className="btn btn-neutral" onClick={() => setNotSame((x) => [...x, dupe.id])}>No, a different person</button>
            </div>
          </div>
        )}
        {failure && <p className="err" role="alert">{failure}</p>}
      </div>
    </Dialog>
  )
}

function JobStep({ contact, onClose, onSkip, onSaved }: { contact: Contact; onClose: () => void; onSkip: () => void; onSaved: (j: Job) => void }) {
  const uid = useId()
  const [name, setName] = useState('')
  const [address, setAddress] = useState(contact.address ?? '')
  const [notes, setNotes] = useState('')
  const [err, setErr] = useState('')
  const [failure, setFailure] = useState('')
  const [busy, setBusy] = useState(false)
  const head = address.split(',')[0].trim()
  const suggestion = head ? `${contact.name}, ${head}` : contact.name
  const jobName = name !== '' ? name : suggestion

  const save = async () => {
    if (busy) return
    if (!jobName.trim()) { setErr(jobText('Give the %j a name.')); document.getElementById(`${uid}-name`)?.focus(); return }
    setErr('')
    setFailure('')
    setBusy(true)
    try {
      onSaved(await createJobAsync({ contactId: contact.id, name: jobName.trim(), address: address.trim(), notes: notes.trim() }))
    } catch (x) {
      setFailure(x instanceof Error && x.message ? `Not saved: ${x.message}.` : 'Not saved. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open
      onClose={busy ? () => {} : onClose}
      title={jobText('New %j')}
      footer={
        <>
          <button type="button" className="btn btn-neutral" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" className="btn btn-neutral" data-flow-skip-job onClick={onSkip} disabled={busy}>Skip, no {jobText('%j')} now</button>
          <button type="button" className="btn btn-primary" data-flow-save-job onClick={() => void save()} disabled={busy}>{busy ? 'Saving' : jobText('Save %j and continue')}</button>
        </>
      }
    >
      <div className="stack">
        <Steps step="job" withJob />
        <p className="t-small" data-flow-contact-saved>{contact.name} is saved.</p>
        <div>
          <label className="label" htmlFor={`${uid}-name`}>{jobText('%J name')}</label>
          <input id={`${uid}-name`} data-autofocus className="field" autoComplete="off" value={jobName} onChange={(e) => { setName(e.target.value); setErr('') }} placeholder="e.g. Roof insulation, 12 Smith St" aria-invalid={err ? true : undefined} aria-describedby={err ? `${uid}-name-e` : undefined} />
          {err && <p id={`${uid}-name-e`} className="err" role="alert">{err}</p>}
        </div>
        <div>
          <label className="label" htmlFor={`${uid}-addr`}>Job site address</label>
          <input id={`${uid}-addr`} className="field" autoComplete="off" value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor={`${uid}-notes`}>Notes about the {jobText('%j')}</label>
          <textarea id={`${uid}-notes`} className="field" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        {failure && <p className="err" role="alert">{failure}</p>}
      </div>
    </Dialog>
  )
}

/** The whole flow. Closes itself (onClose) when cancelled or when the visit is booked. */
export function BookFlow({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<Step>('pick')
  const [contact, setContact] = useState<Contact | null>(null)
  const [target, setTarget] = useState<{ contactId: string; jobId: string; address: string }>({ contactId: '', jobId: '', address: '' })

  if (step === 'pick') return <PickStep onClose={onClose} onNew={() => setStep('contact')} onPick={(contactId, jobId, address) => { setTarget({ contactId, jobId, address }); setStep('book') }} />
  if (step === 'contact') {
    return <ContactStep onClose={onClose} onBack={() => setStep('pick')} onSaved={(c) => { setContact(c); toast('Contact saved'); setStep('job') }} />
  }
  if (step === 'job' && contact) {
    return (
      <JobStep
        contact={contact}
        onClose={onClose}
        onSkip={() => { setTarget({ contactId: contact.id, jobId: '', address: contact.address ?? '' }); setStep('book') }}
        onSaved={(j) => { toast(jobText('%J saved')); setTarget({ contactId: contact.id, jobId: j.id, address: j.address ?? '' }); setStep('book') }}
      />
    )
  }
  return <BookVisitDialog open onClose={onClose} contactId={target.contactId} jobId={target.jobId} address={target.address} />
}
