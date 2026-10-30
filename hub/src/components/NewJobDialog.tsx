import { useId, useState } from 'react'
import { Plus } from 'lucide-react'
import { jobText } from '../lib/format'
import { useContactSearch } from '../lib/live'
import { go, href } from '../lib/router'
import { createContactAsync, createJobAsync, useStore } from '../lib/store'
import { Dialog, toast } from './ui'

const SHOWN = 8

/**
 * "New job": pick a saved person (or add a new one), give the job a name and an optional value.
 * Live mode: the person and the job are made in the CRM and the job shows in the list at once.
 */
export function NewJobDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useStore()
  const uid = useId()
  const [find, setFind] = useState('')
  const [pick, setPick] = useState('')
  const [adding, setAdding] = useState(false)
  const [pName, setPName] = useState('')
  const [pEmail, setPEmail] = useState('')
  const [pPhone, setPPhone] = useState('')
  const [name, setName] = useState('')
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const found = useContactSearch(find, open)

  const term = find.trim().toLowerCase()
  const options = (found.rows ?? s.contacts.filter((c) => !term || [c.name, c.email, c.phone].some((x) => x.toLowerCase().includes(term)))).slice(0, SHOWN)

  const close = () => {
    setFind('')
    setPick('')
    setAdding(false)
    setPName('')
    setPEmail('')
    setPPhone('')
    setName('')
    setValue('')
    setError('')
    onClose()
  }

  const save = async () => {
    if (busy) return
    if (adding ? !pName.trim() : !pick) {
      setError(adding ? 'Type the person’s name.' : 'Choose a person, or add a new one.')
      return
    }
    if (adding && pEmail.trim() && !/^\S+@\S+\.\S+$/.test(pEmail.trim())) {
      setError('That email address does not look right.')
      return
    }
    if (!name.trim()) {
      setError(jobText('Give the %j a name.'))
      return
    }
    const worth = value.trim() === '' ? 0 : Number(value.replace(/[$,\s]/g, ''))
    if (!Number.isFinite(worth) || worth < 0) {
      setError('The value must be a number, for example 4500.')
      return
    }
    setBusy(true)
    setError('')
    let contactId = pick
    try {
      if (adding) {
        contactId = (await createContactAsync({ name: pName.trim(), email: pEmail.trim(), phone: pPhone.trim() })).id
        // If the job fails below, retrying reuses this person instead of making another.
        setPick(contactId)
        setAdding(false)
      }
      const job = await createJobAsync({ contactId, name: name.trim(), value: worth })
      toast(jobText('%J created'))
      close()
      go(href.job(job.id))
    } catch (e) {
      setError(e instanceof Error && e.message ? `Not saved: ${e.message}.` : 'Not saved. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      title={jobText('New %j')}
      footer={
        <>
          <button type="button" className="btn btn-quiet" onClick={close}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={() => void save()} disabled={busy}>
            <Plus size={18} aria-hidden="true" />
            {busy ? 'Saving' : jobText('Make the %j')}
          </button>
        </>
      }
    >
      <div className="stack">
        {!adding ? (
          <fieldset className="min-w-0 border-0 p-0">
            <legend className="label">Who is it for?</legend>
            <input id={`${uid}-find`} type="search" className="field" aria-label="Search saved people" value={find} onChange={(e) => setFind(e.target.value)} placeholder="Search by name, phone or email" />
            {found.loading && <p className="t-small text-muted">Searching</p>}
            {found.error && <p className="t-small err">{found.error}</p>}
            <div className="stack mt-2">
              {options.map((c) => (
                <label key={c.id} className={`flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 ${pick === c.id ? 'border-navy bg-navy-wash' : 'rule'}`}>
                  <input type="radio" name={`${uid}-who`} className="h-5 w-5 shrink-0 accent-[rgb(var(--c-navy))]" checked={pick === c.id} onChange={() => { setPick(c.id); setError('') }} />
                  <span>
                    <span className="block font-bold">{c.name}</span>
                    <span className="t-small block text-muted">{[c.email, c.phone].filter(Boolean).join(', ')}</span>
                  </span>
                </label>
              ))}
              {options.length === 0 && !found.loading && <p className="t-small text-muted">Nobody found.</p>}
            </div>
            <button type="button" className="btn btn-quiet mt-2" onClick={() => { setAdding(true); setPick(''); setError('') }}>
              Add a new person
            </button>
          </fieldset>
        ) : (
          <fieldset className="min-w-0 border-0 p-0">
            <legend className="label">New person</legend>
            <div className="stack">
              <div>
                <label className="label" htmlFor={`${uid}-pn`}>
                  Name
                </label>
                <input id={`${uid}-pn`} className="field" value={pName} onChange={(e) => { setPName(e.target.value); setError('') }} />
              </div>
              <div>
                <label className="label" htmlFor={`${uid}-pp`}>
                  Phone
                </label>
                <input id={`${uid}-pp`} className="field" type="tel" value={pPhone} onChange={(e) => setPPhone(e.target.value)} />
              </div>
              <div>
                <label className="label" htmlFor={`${uid}-pe`}>
                  Email
                </label>
                <input id={`${uid}-pe`} className="field" type="email" value={pEmail} onChange={(e) => setPEmail(e.target.value)} />
              </div>
              <button type="button" className="btn btn-quiet" onClick={() => { setAdding(false); setError('') }}>
                Choose a saved person instead
              </button>
            </div>
          </fieldset>
        )}
        <div>
          <label className="label" htmlFor={`${uid}-name`}>
            {jobText('%J name')}
          </label>
          <input id={`${uid}-name`} className="field" value={name} onChange={(e) => { setName(e.target.value); setError('') }} placeholder="e.g. Roof insulation, 12 Smith St" />
        </div>
        <div>
          <label className="label" htmlFor={`${uid}-value`}>
            Value before GST (optional)
          </label>
          <input id={`${uid}-value`} className="field" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} placeholder="e.g. 4500" />
        </div>
        {error && (
          <p className="err" role="alert">
            {error}
          </p>
        )}
      </div>
    </Dialog>
  )
}
