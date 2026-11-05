import { useId, useMemo, useState } from 'react'
import { AlertTriangle, Mic, Plus, Search } from 'lucide-react'
import { Notice, PageHead, toast } from '../components/ui'
import { findDuplicates, sameCompanyHint, type PersonRow } from '../lib/extras'
import { jobText } from '../lib/format'
import { useContactSearch } from '../lib/live'
import { go, href } from '../lib/router'
import { createContactAsync, createJobAsync, getContact, updateJob, useStore } from '../lib/store'
import { useExtra, useExtraSettings } from '../lib/useExtras'
import type { Contact } from '../types'

const REASON_WORDS = { phone: 'same phone number', email: 'same email', address: 'same address' } as const

/**
 * New enquiry (Advanced extra): the quick form for a phone call. As you type, it checks the people you already have by
 * phone, email and address, and hints at the same company. It then makes the contact and the job with the same flows as
 * the New job dialog. Address autocomplete and call transcription are slots only ("later").
 */
export default function Enquiry() {
  const on = useExtra('enquiry')
  const s = useStore()
  const { leadSources } = useExtraSettings()
  const base = useId()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [lead, setLead] = useState('')
  const [useId_, setUseId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // Live: also ask the CRM, because only some people are loaded. Mock: everyone is loaded.
  const term = email.trim() || (phone.replace(/\D/g, '').length >= 6 ? phone.trim() : '')
  const found = useContactSearch(term, on && term !== '')

  const people: PersonRow[] = useMemo(() => {
    const byId = new Map<string, Contact>()
    for (const c of s.contacts) byId.set(c.id, c)
    for (const c of found.rows ?? []) if (!byId.has(c.id)) byId.set(c.id, c)
    return [...byId.values()].map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      mobile: c.mobile,
      email: c.email,
      address: c.address,
      jobAddresses: s.jobs.filter((j) => j.participants.some((p) => p.kind === 'contact' && p.id === c.id)).map((j) => j.address).filter(Boolean),
    }))
  }, [s.contacts, s.jobs, found.rows])

  if (!on) {
    return (
      <div className="stack-lg">
        <PageHead title="New enquiry" />
        <Notice tone="info">The quick enquiry screen is part of the Advanced layout. It is off or hidden here. Use New {jobText('%j')} on the Jobs page instead.</Notice>
        <p>
          <a className="btn btn-neutral" href={href.jobs()}>
            Go to {jobText('%js')}
          </a>
        </p>
      </div>
    )
  }

  const dupes = findDuplicates({ phone, email, address }, people)
  const company = sameCompanyHint(email, people).filter((p) => !dupes.some((d) => d.id === p.id))
  const chosen = useId_ ? getContact(useId_, s) : undefined

  const save = async () => {
    if (busy) return
    setError('')
    if (!chosen && !name.trim()) return setError('Type the person’s name.')
    if (!chosen && !phone.trim() && !email.trim()) return setError('Add a phone number or an email, so you can reach them.')
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) return setError('That email address does not look right. Check it, or leave it empty.')
    setBusy(true)
    try {
      const contactId = chosen ? chosen.id : (await createContactAsync({ name: name.trim(), email: email.trim(), phone: phone.trim() })).id
      const who = chosen ? chosen.name : name.trim()
      const head = address.split(',')[0].trim()
      const job = await createJobAsync({ contactId, name: head ? `${who}, ${head}` : who, address: address.trim(), notes: notes.trim() })
      if (lead) updateJob(job.id, { leadSource: lead })
      toast(jobText('%J made from the enquiry.'))
      go(href.job(job.id))
    } catch (e) {
      setError(e instanceof Error && e.message ? `Not saved: ${e.message}.` : 'Not saved. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const field = (id: string, label: string, el: React.ReactNode) => (
    <div>
      <label className="label" htmlFor={`${base}-${id}`}>
        {label}
      </label>
      {el}
    </div>
  )

  return (
    <div className="stack-lg" data-extra="enquiry">
      <PageHead title="New enquiry" subtitle={jobText('Type what the caller says. It makes the person and the %j together.')} />
      <div className="grid gap-6 lg:grid-cols-2">
        <form
          className="card stack"
          onSubmit={(e) => {
            e.preventDefault()
            void save()
          }}
          aria-label="Enquiry"
        >
          {chosen ? (
            <Notice tone="info">
              Using the saved person <strong>{chosen.name}</strong>.{' '}
              <button type="button" className="btn btn-neutral btn-sm" onClick={() => setUseId('')}>
                Make a new person instead
              </button>
            </Notice>
          ) : (
            field('name', 'Name', <input id={`${base}-name`} className="field" autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} />)
          )}
          {field('phone', 'Phone', <input id={`${base}-phone`} className="field" type="tel" inputMode="tel" autoComplete="off" value={phone} onChange={(e) => setPhone(e.target.value)} />)}
          {field('email', 'Email', <input id={`${base}-email`} className="field" type="email" inputMode="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} />)}
          {field(
            'addr',
            'Job site address',
            <>
              <input id={`${base}-addr`} className="field" autoComplete="off" value={address} onChange={(e) => setAddress(e.target.value)} />
              <p className="hint">Where the work will be done.</p>
            </>,
          )}
          {field(
            'lead',
            'Where did they hear about us?',
            <select id={`${base}-lead`} className="field" value={lead} onChange={(e) => setLead(e.target.value)}>
              <option value="">Not asked</option>
              {leadSources.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>,
          )}
          {field('notes', 'Notes', <textarea id={`${base}-notes`} className="field" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />)}
          {error && (
            <p className="err" role="alert">
              {error}
            </p>
          )}
          <div>
            <button type="submit" className="btn btn-primary btn-lg" disabled={busy}>
              <Plus size={18} aria-hidden="true" />
              {busy ? 'Saving' : jobText('Make the person and the %j')}
            </button>
          </div>

          <div className="stack" aria-label="Coming later">
            <p className="t-small font-bold">Coming later</p>
            <label className="flex items-center gap-2 opacity-70">
              <Search size={16} aria-hidden="true" />
              <span>Address autocomplete (later)</span>
              <input className="field" disabled placeholder="Not available yet" aria-label="Address autocomplete, later" />
            </label>
            <button type="button" className="btn btn-neutral" disabled aria-label="Call transcription, later">
              <Mic size={16} aria-hidden="true" />
              Call transcription (later)
            </button>
          </div>
        </form>

        <section className="card stack" aria-live="polite" aria-labelledby={`${base}-dup`} data-dupes>
          <h2 id={`${base}-dup`} className="t-section">
            Already in the Hub?
          </h2>
          {found.loading && term && <p className="t-small text-muted">Checking the CRM</p>}
          {dupes.length === 0 && company.length === 0 ? (
            <p className="t-body text-muted">{phone || email || address ? 'Nobody matches yet.' : 'Type a phone, email or address. Matches show here as you type.'}</p>
          ) : null}
          {dupes.length > 0 && (
            <div className="stack">
              <p className="t-body font-bold">
                <AlertTriangle size={18} aria-hidden="true" className="mr-1 inline align-text-bottom" />
                {dupes.length === 1 ? 'This looks like someone you already have:' : 'These look like people you already have:'}
              </p>
              <ul className="stack list-none p-0">
                {dupes.map((d) => (
                  <li key={d.id} className="card" data-dupe={d.id}>
                    <a className="cell-link font-bold" href={href.contact(d.id)}>
                      {d.name}
                    </a>
                    <span className="block text-muted">{d.reasons.map((r) => REASON_WORDS[r]).join(', ')}</span>
                    <button type="button" className="btn btn-neutral btn-sm mt-2" onClick={() => setUseId(d.id)}>
                      Use this person
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {company.length > 0 && (
            <div className="stack" data-company-hint>
              <p className="t-body font-bold">Maybe the same company (same email domain):</p>
              <ul className="list-none p-0">
                {company.map((p) => (
                  <li key={p.id}>
                    <a className="cell-link" href={href.contact(p.id)}>
                      {p.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
