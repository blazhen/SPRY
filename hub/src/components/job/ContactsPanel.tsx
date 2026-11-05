import { Plus, UserMinus } from 'lucide-react'
import { useState } from 'react'
import { DATA_SOURCE, MAX_COMPANIES } from '../../config'
import { useContactSearch } from '../../lib/live'
import { href } from '../../lib/router'
import { addParticipant, companyCount, createCompany, createContactAsync, getCompany, getContact, getJob, participantName, removeParticipant, useStore } from '../../lib/store'
import type { ParticipantRef, ParticipantRole } from '../../types'
import { Dialog, Notice, toast } from '../ui'
import { useLimited } from './PinnedNotes'
import { SameCompanyNotice } from './SameCompanyNotice'
import { companyLabel, sameCompanyAs } from '../../lib/sameCompany'
import { Section } from './Section'
import './jobRight.css'
import '../dialogs2.css'

const ROLE_WORDS: Record<ParticipantRole, string> = { main: 'Main contact', extra: 'Also on this job', company: 'Company' }

export function ContactsPanel({ jobId }: { jobId: string }) {
  const s = useStore()
  const job = getJob(jobId, s)
  const [adding, setAdding] = useState<'contact' | 'company' | null>(null)
  const [pick, setPick] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setErrorText] = useState('')
  const [errAt, setErrAt] = useState<'pick' | 'name' | 'email'>('name')
  const setError = (msg: string, at: 'pick' | 'name' | 'email' = 'name') => {
    setErrorText(msg)
    setErrAt(at)
  }
  const [find, setFind] = useState('')
  const [busy, setBusy] = useState(false)
  // Live: the person list comes from a search of the CRM, not from what is loaded.
  const found = useContactSearch(find, adding === 'contact')

  const { shown, toggle } = useLimited(job?.participants ?? [])
  if (!job) return null
  const nCompanies = companyCount(job)
  const full = nCompanies >= MAX_COMPANIES

  const close = () => {
    setAdding(null)
    setPick('')
    setName('')
    setEmail('')
    setPhone('')
    setError('')
    setFind('')
  }

  const save = async () => {
    if (!adding) return
    if (!pick && !name.trim()) {
      setError('Choose one from the list, or type a new name.')
      return
    }
    // Validate before creating anything, so a failed add leaves no orphan record.
    if (adding === 'company' && !pick && companyCount(job) >= MAX_COMPANIES) {
      setError(`Up to ${MAX_COMPANIES} companies can be on one job.`)
      return
    }
    if (adding === 'contact' && !pick && email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('That email address does not look right.', 'email')
      return
    }
    let ref: ParticipantRef
    if (pick) {
      ref = { kind: adding, id: pick }
    } else if (adding === 'contact') {
      setBusy(true)
      try {
        ref = { kind: 'contact', id: (await createContactAsync({ name: name.trim(), email: email.trim(), phone: phone.trim() })).id }
      } catch (e) {
        setError(e instanceof Error && e.message ? `The person could not be saved: ${e.message}` : 'The person could not be saved.')
        return
      } finally {
        setBusy(false)
      }
    } else {
      ref = { kind: 'company', id: createCompany({ name: name.trim() }).id }
    }
    const res = addParticipant(job.id, ref)
    if (!res.ok) {
      setError(res.error, pick ? 'pick' : 'name')
      return
    }
    toast('Added')
    close()
  }

  const onJob = (r: ParticipantRef) => job.participants.some((p) => p.kind === r.kind && p.id === r.id)
  const options =
    adding === 'contact'
      ? (found.rows ?? s.contacts).filter((c) => !onJob({ kind: 'contact', id: c.id })).map((c) => ({ id: c.id, label: c.name }))
      : s.companies.filter((c) => !onJob({ kind: 'company', id: c.id })).map((c) => ({ id: c.id, label: c.name }))

  const names = job.participants.map((p) => participantName(p, s))
  const summary = names.length ? names.slice(0, 2).join(', ') + (names.length > 2 ? ` and ${names.length - 2} more` : '') : 'Nobody added yet'

  // The dialog sits next to the section, not inside it: a collapsed section hides its children.
  return (
    <>
    <Section
      id="job-people-section"
      title="People and companies"
      count={job.participants.length}
      summary={summary}
      action={
        <div className="jr-head-actions">
          <button type="button" className="btn btn-add btn-sm" onClick={() => setAdding('contact')}>
            <Plus size={16} aria-hidden="true" />
            Add person
          </button>
          <button type="button" className="btn btn-add btn-sm" onClick={() => setAdding('company')} disabled={full} title={full ? `Up to ${MAX_COMPANIES} companies can be on one job` : undefined}>
            <Plus size={16} aria-hidden="true" />
            Add company
          </button>
        </div>
      }
    >
      <SameCompanyNotice jobId={job.id} />
      {full && <p className="hint">Up to {MAX_COMPANIES} companies can be on one job.</p>}
      {job.participants.length === 0 ? (
        <p className="jr-empty">Nobody has been added to this job yet. Use Add person above.</p>
      ) : (
        <>
          <ul className="jr-list" aria-label="People and companies on this job">
            {shown.map((p) => {
              const c = p.kind === 'contact' ? getContact(p.id, s) : undefined
              const k = p.kind === 'company' ? getCompany(p.id, s) : undefined
              const phoneNo = c?.phone || k?.phone || ''
              const mail = c?.email || k?.email || ''
              const attn = k?.attnContactId
              return (
                <li key={`${p.kind}-${p.id}`} className="jr-card">
                  <div className="jr-row">
                    {c ? (
                      <a className="jr-title jr-link" href={href.contact(c.id)} aria-label={`Open contact ${c.name}`}>
                        {c.name}
                      </a>
                    ) : (
                      <p className="jr-title">{participantName(p, s)}</p>
                    )}
                    <span className="jr-tag">{ROLE_WORDS[p.role]}</span>
                  </div>
                  <div className="jr-row jr-meta">
                    {phoneNo ? (
                      <a className="jr-link" href={`tel:${phoneNo}`}>
                        {phoneNo}
                      </a>
                    ) : (
                      <span>No phone</span>
                    )}
                    {mail ? (
                      <a className="jr-link jr-wrap" href={`mailto:${mail}`}>
                        {mail}
                      </a>
                    ) : (
                      <span>No email</span>
                    )}
                  </div>
                  {attn && (
                    <p className="jr-meta jr-rich">
                      Quotes go to{' '}
                      <a className="jr-link" href={href.contact(attn)}>
                        {getContact(attn, s)?.name ?? 'this person'}
                      </a>
                    </p>
                  )}
                  {p.role !== 'main' && (
                    <div className="jr-actions">
                      <button
                        type="button"
                        className="btn btn-warn btn-sm"
                        aria-label={`Take ${participantName(p, s)} off this job`}
                        onClick={() => {
                          const res = removeParticipant(job.id, p)
                          toast(res.ok ? 'Taken off this job' : res.error)
                        }}
                      >
                        <UserMinus size={16} aria-hidden="true" />
                        Remove
                      </button>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
          {toggle}
        </>
      )}

      </Section>
      <Dialog
        open={adding !== null}
        onClose={close}
        title={adding === 'company' ? 'Add a company' : 'Add a person'}
        footer={
          <>
            <button type="button" className="btn btn-neutral" onClick={close}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={() => void save()} disabled={busy}>
              <Plus size={18} aria-hidden="true" />
              Add
            </button>
          </>
        }
      >
        <form
          className="dh-form"
          onSubmit={(e) => {
            e.preventDefault()
            void save()
          }}
        >
          {adding === 'contact' && DATA_SOURCE === 'live' && (
            <div>
              <label className="label" htmlFor="cp-find">
                Search saved people
              </label>
              <input id="cp-find" type="search" className="field" value={find} onChange={(e) => setFind(e.target.value)} placeholder="Name, phone or email" />
              {found.loading && <p className="dh-note">Searching</p>}
              {found.error && <p className="dh-note err">{found.error}</p>}
            </div>
          )}
          <div>
            <label className="label" htmlFor="cp-pick">
              {adding === 'company' ? 'Saved company' : 'Saved person'}
              <span className="sr-only">: choose someone already saved</span>
            </label>
            <select id="cp-pick" className="field" value={pick} onChange={(e) => { setPick(e.target.value); setError('') }} aria-describedby={error && errAt === 'pick' ? 'cp-err' : undefined}>
              <option value="">{adding === 'company' ? 'Or add a new one below' : 'Or add someone new below'}</option>
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
            {error && errAt === 'pick' && (
              <p id="cp-err" className="dh-err err" role="alert">
                {error}
              </p>
            )}
          </div>
          {!pick && (
            <>
              <div>
                <label className="label" htmlFor="cp-name">
                  Name
                </label>
                <input id="cp-name" className="field" value={name} onChange={(e) => { setName(e.target.value); setError('') }} aria-invalid={!!error && errAt === 'name'} aria-describedby={error && errAt === 'name' ? 'cp-err' : undefined} />
                {error && errAt === 'name' && (
                  <p id="cp-err" className="dh-err err" role="alert">
                    {error}
                  </p>
                )}
              </div>
              {adding === 'contact' && (
                <div className="dh-pair">
                  <div>
                    <label className="label" htmlFor="cp-phone">
                      Phone
                    </label>
                    <input id="cp-phone" className="field" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                  <div>
                    <label className="label" htmlFor="cp-email">
                      Email
                    </label>
                    <input id="cp-email" className="field" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError('') }} aria-invalid={!!error && errAt === 'email'} aria-describedby={error && errAt === 'email' ? 'cp-err' : undefined} />
                    {error && errAt === 'email' && (
                      <p id="cp-err" className="dh-err err" role="alert">
                        {error}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
          {adding === 'contact' && pick && (() => {
            const picked = getContact(pick, s)
            const twins = picked ? sameCompanyAs(picked, job, s) : []
            if (!picked || twins.length === 0) return null
            return (
              <Notice tone="warn">
                <strong>{picked.name}</strong> works at {companyLabel(picked, s)}, like{' '}
                {twins.map((t, i) => (
                  <span key={t.id}>
                    {i > 0 ? ', ' : ''}
                    <a className="cell-link" href={href.contact(t.id)}>
                      {t.name}
                    </a>
                  </span>
                ))}
                , who is already on this job. You can still add them. Check who is asking and who the quote is for.
              </Notice>
            )
          })()}
          <button type="submit" hidden tabIndex={-1} aria-hidden="true" />
        </form>
      </Dialog>
    </>
  )
}

export default ContactsPanel
