import { Building2, Plus, UserMinus, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { DATA_SOURCE, MAX_COMPANIES } from '../../config'
import { useContactSearch } from '../../lib/live'
import { href } from '../../lib/router'
import { addParticipant, companyCount, createCompany, createContactAsync, getCompany, getContact, getJob, participantName, removeParticipant, useStore } from '../../lib/store'
import type { ParticipantRef, ParticipantRole } from '../../types'
import { Dialog, Section, toast } from '../ui'

const ROLE_WORDS: Record<ParticipantRole, string> = { main: 'Main contact', extra: 'Also on this job', company: 'Company' }

export function ContactsPanel({ jobId }: { jobId: string }) {
  const s = useStore()
  const job = getJob(jobId, s)
  const [adding, setAdding] = useState<'contact' | 'company' | null>(null)
  const [pick, setPick] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [find, setFind] = useState('')
  const [busy, setBusy] = useState(false)
  // Live: the person list comes from a search of the CRM, not from what is loaded.
  const found = useContactSearch(find, adding === 'contact')

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
      setError('That email address does not look right.')
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
      setError(res.error)
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

  return (
    <Section
      title="People and companies"
      action={
        <div className="flex flex-wrap gap-3">
          <button type="button" className="btn btn-quiet" onClick={() => setAdding('contact')}>
            <UserPlus size={18} aria-hidden="true" />
            Add a person
          </button>
          <button type="button" className="btn btn-quiet" onClick={() => setAdding('company')} disabled={full}>
            <Building2 size={18} aria-hidden="true" />
            Add a company
          </button>
        </div>
      }
    >
      {full && <p className="t-small text-muted">Up to {MAX_COMPANIES} companies can be on one job.</p>}
      {job.participants.length === 0 ? (
        <p className="t-body text-muted">Nobody has been added to this job yet.</p>
      ) : (
        <div className="tbl-wrap">
          <table className="tbl tbl-stack">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Role on this job</th>
                <th scope="col">Phone</th>
                <th scope="col">Email</th>
                <th scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {job.participants.map((p) => {
                const c = p.kind === 'contact' ? getContact(p.id, s) : undefined
                const k = p.kind === 'company' ? getCompany(p.id, s) : undefined
                const phoneNo = c?.phone || k?.phone || ''
                const mail = c?.email || k?.email || ''
                const attn = k?.attnContactId
                return (
                  <tr key={`${p.kind}-${p.id}`}>
                    <th scope="row" data-label="Name">
                      {c ? (
                        <a className="font-bold text-navy underline" href={href.contact(c.id)}>
                          {c.name}
                        </a>
                      ) : (
                        <span className="font-bold">{participantName(p, s)}</span>
                      )}
                      {c && (
                        <div>
                          <a className="t-small text-navy underline" href={href.contact(c.id)}>
                            Open full contact
                          </a>
                        </div>
                      )}
                      {attn && (
                        <div className="t-small text-muted">
                          Quotes go to{' '}
                          <a className="text-navy underline" href={href.contact(attn)}>
                            {getContact(attn, s)?.name ?? 'this person'}
                          </a>
                        </div>
                      )}
                    </th>
                    <td data-label="Role on this job">{ROLE_WORDS[p.role]}</td>
                    <td data-label="Phone">{phoneNo ? <a className="text-navy underline" href={`tel:${phoneNo}`}>{phoneNo}</a> : <span className="text-muted">None</span>}</td>
                    <td data-label="Email" className="break-words">
                      {mail ? <a className="text-navy underline" href={`mailto:${mail}`}>{mail}</a> : <span className="text-muted">None</span>}
                    </td>
                    <td data-label="Actions">
                      {p.role !== 'main' && (
                        <button
                          type="button"
                          className="btn btn-quiet btn-sm"
                          aria-label={`Take ${participantName(p, s)} off this job`}
                          onClick={() => {
                            const res = removeParticipant(job.id, p)
                            toast(res.ok ? 'Taken off this job' : res.error)
                          }}
                        >
                          <UserMinus size={16} aria-hidden="true" />
                          Remove
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
        open={adding !== null}
        onClose={close}
        title={adding === 'company' ? 'Add a company' : 'Add a person'}
        footer={
          <>
            <button type="button" className="btn btn-quiet" onClick={close}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={() => void save()} disabled={busy}>
              <Plus size={18} aria-hidden="true" />
              Add
            </button>
          </>
        }
      >
        <div className="stack">
          {adding === 'contact' && DATA_SOURCE === 'live' && (
            <div>
              <label className="label" htmlFor="cp-find">
                Search saved people
              </label>
              <input id="cp-find" type="search" className="field" value={find} onChange={(e) => setFind(e.target.value)} placeholder="Name, phone or email" />
              {found.loading && <p className="t-small text-muted">Searching</p>}
              {found.error && <p className="t-small err">{found.error}</p>}
            </div>
          )}
          <div>
            <label className="label" htmlFor="cp-pick">
              Choose someone already saved
            </label>
            <select id="cp-pick" className="field" value={pick} onChange={(e) => { setPick(e.target.value); setError('') }}>
              <option value="">Choose one</option>
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          {!pick && (
            <>
              <p className="t-small text-muted">Or add someone new.</p>
              <div>
                <label className="label" htmlFor="cp-name">
                  Name
                </label>
                <input id="cp-name" className="field" value={name} onChange={(e) => { setName(e.target.value); setError('') }} />
              </div>
              {adding === 'contact' && (
                <>
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
                    <input id="cp-email" className="field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                </>
              )}
            </>
          )}
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

export default ContactsPanel
