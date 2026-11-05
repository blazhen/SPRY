import { useEffect, useId, useRef, useState } from 'react'
import { Mail, Phone, Plus } from 'lucide-react'
import { InlineField } from '../InlineField'
import { JobFieldsEditor } from '../JobFieldsEditor'
import { toast } from '../ui'
import { AddressActions } from '../FollowUpBar'
import { Section, OPEN_SECTION } from './Section'
import { SameCompanyNotice } from './SameCompanyNotice'
import { PRODUCT_TYPES, type Contact, type Job, type ProductType } from '../../types'
import { actionText } from '../confirmText'
import { confirmAction, confirmEnabled, usePendingConfirm } from '../../lib/confirmActions'
import { fmtMoney } from '../../lib/format'
import { href } from '../../lib/router'
import { getContact, getJob, getOwners, updateContact, updateJob, useStore } from '../../lib/store'
import './jobFacts.css'
import './jobLeft.css'
import { scrollWithin } from '../../lib/scrollIn'

/** The contacts on a job: the main one first (or the first person), then the others in order. */
export function jobContacts(job: Job, s: ReturnType<typeof useStore>): { main?: Contact; others: Contact[] } {
  const all = job.participants.filter((p) => p.kind === 'contact').map((p) => ({ c: getContact(p.id, s), role: p.role }))
  const found = all.filter((x): x is { c: Contact; role: typeof x.role } => !!x.c)
  const main = found.find((x) => x.role === 'main') ?? found[0]
  return { main: main?.c, others: found.filter((x) => x.c.id !== main?.c.id).map((x) => x.c) }
}

/**
 * "Add a contact" lives in the People section on the right (the existing add-person flow). Open and jump to it. On a
 * phone that panel is on another tab, so switch to that tab first.
 */
export function goToPeople() {
  const jump = (tries: number) => {
    window.dispatchEvent(new CustomEvent(OPEN_SECTION, { detail: 'job-people-section' }))
    requestAnimationFrame(() => {
      const el = document.getElementById('job-people-section')
      if (!el) {
        if (tries > 0) window.setTimeout(() => jump(tries - 1), 80)
        else toast('Open the "Quotes and files" tab, then choose Add a person.')
        return
      }
      const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      scrollWithin(el, 'start', calm ? 'auto' : 'smooth')
      el.setAttribute('tabindex', '-1')
      el.focus({ preventScroll: true })
    })
  }
  if (!document.getElementById('job-people-section')) {
    const tab = Array.from(document.querySelectorAll<HTMLElement>('[role="tab"]')).find((t) => /Quotes and files/.test(t.textContent ?? ''))
    tab?.click()
  }
  jump(6)
}

export function NoContact() {
  return (
    <div className="jl-empty">
      <p className="t-body">No contact on this job yet. Add the person this job is for, so you can call or email them from here.</p>
      <button type="button" className="btn btn-add" onClick={goToPeople}>
        <Plus size={16} aria-hidden="true" />
        Add a contact
      </button>
    </div>
  )
}

/** Job site address, with Copy address and Open in maps. */
export function SiteAddress({ job }: { job: Job }) {
  const s = useStore()
  const { main } = jobContacts(job, s)
  const theirs = (main?.address ?? '').trim()
  return (
    <div className="jl-field">
      <InlineField
        label="Job site address"
        value={job.address}
        placeholder="No site address yet. Click to add it."
        autoComplete="off"
        onSave={(v) => updateJob(job.id, { address: v })}
      />
      <div className="jl-links">
        <AddressActions address={job.address} />
        {theirs && theirs !== job.address.trim() ? (
          <button type="button" className="btn btn-tint" onClick={() => updateJob(job.id, { address: theirs })}>
            Use {main?.name.split(' ')[0] || 'their'}'s address
          </button>
        ) : null}
      </div>
    </div>
  )
}

/** Job notes: one text, always true about the job (the CRM field access_notes). Not the dated notes in the history. */
export function JobNotes({ job }: { job: Job }) {
  return (
    <InlineField
      label="Job notes"
      value={job.notes}
      multiline
      rows={3}
      placeholder="No job notes yet. Click to add them."
      hint="Always true about this job. New quotes start with a copy of these notes."
      onSave={(v) => updateJob(job.id, { notes: v })}
    />
  )
}

function CallEmailOpen({ c }: { c: Contact }) {
  const num = c.phone || c.mobile || ''
  return (
    <div className="jl-links">
      {num ? (
        <a className="btn btn-neutral" href={`tel:${num.replace(/[^+\d]/g, '')}`}>
          <Phone size={16} aria-hidden="true" />
          Call
        </a>
      ) : null}
      {c.email ? (
        <a className="btn btn-neutral" href={`mailto:${c.email}`}>
          <Mail size={16} aria-hidden="true" />
          Email
        </a>
      ) : null}
      <a className="btn btn-good" href={href.contact(c.id)}>
        Open contact
      </a>
    </div>
  )
}

/**
 * The job value. A real change asks first (it can start CRM automations). Cancel remounts the field, which puts the old
 * value back in it and saves nothing. Yes saves, and the field's own Saved/Undo stays.
 */
function JobValueField({ job }: { job: Job }) {
  const [round, setRound] = useState(0)
  const asked = useRef<number | null>(null)
  const seen = useRef(false)
  const pending = usePendingConfirm()
  useEffect(() => {
    if (asked.current === null) return
    if (pending) {
      seen.current = true
      return
    }
    if (!seen.current) return
    // The dialog closed. If the value was not saved (Cancel), remount so the old value is back in the field.
    const n = asked.current
    asked.current = null
    seen.current = false
    if ((getJob(job.id)?.value ?? 0) !== n) setRound((r) => r + 1)
  }, [pending, job.id])
  return (
    <InlineField
      key={round}
      label="Job value"
      inputMode="decimal"
      value={job.value ? String(job.value) : ''}
      placeholder="No value yet. Click to add it."
      hint="In dollars, before GST"
      onSave={(v) => {
        const clean = v.replace(/[$,\s]/g, '')
        const n = clean === '' ? 0 : Number(clean)
        if (!Number.isFinite(n) || n < 0) {
          toast('Type the value as a number, for example 4500.')
          return false
        }
        const cur = getJob(job.id)?.value ?? job.value
        if (n === cur) return
        const label = job.name || 'this job'
        const text = actionText('job-value', `Change the value of ${label} from ${fmtMoney(cur)} to ${fmtMoney(n)}?`, 'Yes, change it')
        asked.current = n
        seen.current = false
        confirmAction('job-value', text, () => updateJob(job.id, { value: n }))
        if (!confirmEnabled()) asked.current = null
        return
      }}
    />
  )
}

/** One job field by its box field id (used by the Job box): name, address, notes, stage, value, owner, kind, source, business. */
export function JobField({ job, id }: { job: Job; id: string }) {
  const uid = useId()
  switch (id) {
    case 'name':
      return <InlineField label="Job name" value={job.name} placeholder="No job name yet. Click to add it." onSave={(v) => updateJob(job.id, { name: v })} />
    case 'address':
      return <SiteAddress job={job} />
    case 'notes':
      return <JobNotes job={job} />
    case 'stage':
      return (
        <div className="jl-static">
          <span className="inline-field-label">Stage</span>
          <p className="jl-static-text">{job.stage}</p>
          <p className="hint">To change the stage, use the "Move to" button at the top of the page.</p>
        </div>
      )
    case 'value':
      return <JobValueField job={job} />
    case 'owner':
      return (
        <div>
          <label className="inline-field-label" htmlFor={`${uid}-owner`}>
            Looked after by
          </label>
          <select id={`${uid}-owner`} className="field" value={job.ownerId} onChange={(e) => updateJob(job.id, { ownerId: e.target.value })}>
            {job.ownerId === '' && <option value="">Unassigned</option>}
            {getOwners().map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
      )
    case 'kind':
      return (
        <div>
          <label className="inline-field-label" htmlFor={`${uid}-product`}>
            Kind of job
          </label>
          <select
            id={`${uid}-product`}
            className="field"
            value={job.productType}
            aria-describedby={`${uid}-product-h`}
            onChange={(e) => {
              const p = PRODUCT_TYPES.find((x): x is ProductType => x === e.target.value)
              if (p) updateJob(job.id, { productType: p })
            }}
          >
            {PRODUCT_TYPES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <p id={`${uid}-product-h`} className="hint">
            Decides which terms new quotes use
          </p>
        </div>
      )
    case 'source':
      return (
        <div className="jl-static">
          <span className="inline-field-label">Where it came from</span>
          <p className="jl-static-text">{job.source || 'Not noted'}</p>
        </div>
      )
    case 'business':
      return <InlineField label="Business name (if any)" value={job.businessName ?? ''} placeholder="No business name. Click to add one." onSave={(v) => updateJob(job.id, { businessName: v })} />
    default:
      return null
  }
}

/** One contact field by its box field id (used by the Contact box): name, phone, mobile, email, actions, address, note. */
export function ContactField({ c, id }: { c: Contact; id: string }) {
  switch (id) {
    case 'name':
      return <InlineField label="Contact name" value={c.name} placeholder="No name yet. Click to add it." autoComplete="name" onSave={(v) => updateContact(c.id, { name: v })} />
    case 'phone':
      return <InlineField label="Phone" type="tel" inputMode="tel" autoComplete="tel" value={c.phone} placeholder="No phone yet. Click to add it." onSave={(v) => updateContact(c.id, { phone: v })} />
    case 'mobile':
      return <InlineField label="Mobile" type="tel" inputMode="tel" autoComplete="tel" value={c.mobile ?? ''} placeholder="No mobile yet. Click to add it." onSave={(v) => updateContact(c.id, { mobile: v })} />
    case 'email':
      return <InlineField label="Email" type="email" inputMode="email" autoComplete="email" value={c.email} placeholder="No email yet. Click to add it." onSave={(v) => updateContact(c.id, { email: v })} />
    case 'actions':
      return <CallEmailOpen c={c} />
    case 'address':
      return (
        <InlineField
          label="Home or office address"
          autoComplete="off"
          value={c.address ?? ''}
          placeholder="No address yet. Click to add it."
          hint="Not the job site"
          onSave={(v) => updateContact(c.id, { address: v })}
        />
      )
    case 'note':
      return <InlineField label="Private note" multiline rows={3} value={c.note ?? ''} placeholder="No private note yet. Click to add one." onSave={(v) => updateContact(c.id, { note: v })} />
    default:
      return null
  }
}

/** The main contact. `part` key: name, phone, email and the buttons. rest: mobile and their own address. all: everything. */
export function MainContact({ c, part }: { c: Contact; part: 'key' | 'rest' | 'all' }) {
  const key = part !== 'rest'
  const rest = part !== 'key'
  return (
    <div className="jl-group-body">
      {key && <InlineField label="Contact name" value={c.name} placeholder="No name yet. Click to add it." autoComplete="name" onSave={(v) => updateContact(c.id, { name: v })} />}
      {key && <InlineField label="Phone" type="tel" inputMode="tel" autoComplete="tel" value={c.phone} placeholder="No phone yet. Click to add it." onSave={(v) => updateContact(c.id, { phone: v })} />}
      {rest && <InlineField label="Mobile" type="tel" inputMode="tel" autoComplete="tel" value={c.mobile ?? ''} placeholder="No mobile yet. Click to add it." onSave={(v) => updateContact(c.id, { mobile: v })} />}
      {key && <InlineField label="Email" type="email" inputMode="email" autoComplete="email" value={c.email} placeholder="No email yet. Click to add it." onSave={(v) => updateContact(c.id, { email: v })} />}
      {key && <CallEmailOpen c={c} />}
      {rest && (
        <InlineField
          label="Home or office address"
          autoComplete="off"
          value={c.address ?? ''}
          placeholder="No address yet. Click to add it."
          hint="Not the job site"
          onSave={(v) => updateContact(c.id, { address: v })}
        />
      )}
    </div>
  )
}

/** The other people on the job, one line each. */
export function OtherContacts({ others }: { others: Contact[] }) {
  if (others.length === 0) return null
  return (
    <ul className="jl-others" aria-label="Others on this job">
      {others.map((c) => (
        <li key={c.id} className="jl-other">
          <span className="jl-other-name">{c.name || 'No name'}</span>
          <span className="jl-other-phone">{c.phone || c.mobile || 'No phone'}</span>
          <a className="jl-other-open" href={href.contact(c.id)} aria-label={`Open ${c.name || 'this contact'}`}>
            Open
          </a>
        </li>
      ))}
    </ul>
  )
}

/** How many of the details behind "More about this job" are filled in. */
export function moreCount(job: Job, contact?: Contact, others = 0): number {
  const filled = [job.name, job.businessName, job.source, job.value ? 'v' : '', job.ownerId, contact?.mobile, contact?.address]
  return filled.filter((x) => !!x).length + others
}

/**
 * The left pane. Advanced: everything, in two groups (Job, Contacts) and a More details section, all open.
 * `rest` (inside "More about this job"): the same, minus what the key facts card already shows.
 */
export function JobFacts({ jobId, rest, only }: { jobId: string; rest?: boolean; only?: 'job' | 'contact' }) {
  const s = useStore()
  const uid = useId()
  const job = getJob(jobId, s)
  if (!job) return null
  const { main, others } = jobContacts(job, s)

  const jobBody = (
    <div className="jl-group-body">
      <InlineField label="Job name" value={job.name} placeholder="No job name yet. Click to add it." onSave={(v) => updateJob(job.id, { name: v })} />
      {!rest && <SiteAddress job={job} />}
      <div className="jl-pair">
        <div className="jl-static">
          <span className="inline-field-label">Stage</span>
          <p className="jl-static-text">{job.stage}</p>
          <p className="hint">To change the stage, use the "Move to" button at the top of the page.</p>
        </div>
        <JobValueField job={job} />
      </div>
      <div className="jl-pair">
        <div>
          <label className="inline-field-label" htmlFor={`${uid}-owner`}>
            Looked after by
          </label>
          <select id={`${uid}-owner`} className="field" value={job.ownerId} onChange={(e) => updateJob(job.id, { ownerId: e.target.value })}>
            {job.ownerId === '' && <option value="">Unassigned</option>}
            {getOwners().map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="inline-field-label" htmlFor={`${uid}-product`}>
            Kind of job
          </label>
          <select
            id={`${uid}-product`}
            className="field"
            value={job.productType}
            aria-describedby={`${uid}-product-h`}
            onChange={(e) => {
              const p = PRODUCT_TYPES.find((x): x is ProductType => x === e.target.value)
              if (p) updateJob(job.id, { productType: p })
            }}
          >
            {PRODUCT_TYPES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <p id={`${uid}-product-h`} className="hint">
            Decides which terms new quotes use
          </p>
        </div>
      </div>
      <div className="jl-static">
        <span className="inline-field-label">Where it came from</span>
        <p className="jl-static-text">{job.source || 'Not noted'}</p>
      </div>
      <InlineField label="Business name (if any)" value={job.businessName ?? ''} placeholder="No business name. Click to add one." onSave={(v) => updateJob(job.id, { businessName: v })} />
      {!rest && <JobNotes job={job} />}
    </div>
  )

  const contactBody = main ? (
    <>
      <SameCompanyNotice jobId={job.id} />
      <MainContact c={main} part={rest ? 'rest' : 'all'} />
      <OtherContacts others={others} />
    </>
  ) : (
    <NoContact />
  )

  // The left panel's Job and Contact views show one half each, flat, in both layouts.
  if (only === 'job') {
    return (
      <>
        {jobBody}
        <Section id="job-more-details" title="More details">
          <JobFieldsEditor jobId={job.id} embedded />
        </Section>
      </>
    )
  }
  if (only === 'contact') return contactBody

  if (rest) {
    return (
      <div className="jl-flat">
        <h3 className="jl-h">Job</h3>
        {jobBody}
        {(main || !rest) && <h3 className="jl-h">{others.length ? `Contacts (${others.length + 1})` : 'Contact'}</h3>}
        {(main || !rest) && contactBody}
        <Section id="job-more-details" title="More details">
          <JobFieldsEditor jobId={job.id} embedded />
        </Section>
      </div>
    )
  }

  return (
    <div className="jl-stack">
      <Section title="Job">{jobBody}</Section>
      <Section title="Contacts" count={(main ? 1 : 0) + others.length}>
        {contactBody}
      </Section>
      <Section id="job-more-details" title="More details">
        <JobFieldsEditor jobId={job.id} embedded />
      </Section>
    </div>
  )
}
