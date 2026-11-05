import { useId, useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { ContactFieldsEditor } from '../ContactFieldsEditor'
import { InlineField } from '../InlineField'
import { AddressActions } from '../FollowUpBar'
import { fmtDate } from '../../lib/format'
import { getOwner, updateContact } from '../../lib/store'
import { CSection, type ContactSectionProps } from './CSection'
import { useContactData } from './useContactData'

const none = <span className="font-normal text-muted">None</span>
const yn = (b: boolean) => (b ? 'Yes' : 'No')

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="t-small text-muted">{label}</dt>
      <dd className="t-body break-words font-bold">{children}</dd>
    </div>
  )
}

/** A collapsible group of details, like the platform's contact page. */
function Fold({ title, defaultOpen = false, plain = false, children }: { title: string; defaultOpen?: boolean; plain?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen)
  const id = useId()
  return (
    <section className="card" aria-labelledby={`${id}-h`}>
      <h3 id={`${id}-h`} className="t-section">
        <button type="button" className="flex min-h-[48px] w-full items-center justify-between gap-3 text-left font-display" aria-expanded={open} aria-controls={`${id}-b`} onClick={() => setOpen((o) => !o)}>
          {title}
          <ChevronDown size={24} aria-hidden="true" className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </h3>
      {open &&
        (plain ? (
          <div id={`${id}-b`} className="mt-3 grid gap-4">
            {children}
          </div>
        ) : (
          <dl id={`${id}-b`} className="mt-3 grid gap-4">
            {children}
          </dl>
        ))}
    </section>
  )
}

/**
 * The person's own fields (name is in the header bar): phone, mobile, email, address, private note, and the CRM custom
 * fields. `bare` draws the fields with no section box (the contact card's own columns do that). `withCompany` adds the
 * one-line company row the card has always had; leave it off when a Company section is on the page.
 */
export function ContactDetailsSection({ contactId, compact = false, bare = false, withCompany = false }: ContactSectionProps & { bare?: boolean; withCompany?: boolean }) {
  const { LIVE, contact, extra, companies, phone } = useContactData(contactId)
  if (!contact || !extra) return null

  const body = (
    <div className="stack min-w-0" data-block="details">
      <Fold title="Contact" defaultOpen plain>
        <InlineField label="Phone" type="tel" inputMode="tel" autoComplete="tel" value={contact.phone ?? ''} onSave={(v) => updateContact(contact.id, { phone: v })} />
        <InlineField label="Mobile" type="tel" inputMode="tel" autoComplete="tel" value={contact.mobile ?? ''} onSave={(v) => updateContact(contact.id, { mobile: v })} />
        <InlineField label="Email" type="email" inputMode="email" autoComplete="email" value={contact.email ?? ''} onSave={(v) => updateContact(contact.id, { email: v })} />
        <div>
          <InlineField label="Home or office address" multiline rows={2} autoComplete="street-address" value={contact.address ?? ''} onSave={(v) => updateContact(contact.id, { address: v })} />
          <p className="t-small text-muted">Not the job site. Each job has its own site address.</p>
          {contact.address && (
            <span className="mt-2 block font-normal">
              <AddressActions address={contact.address} />
            </span>
          )}
        </div>
        {withCompany && (
          <div>
            <p className="inline-field-label">Company</p>
            <p className="t-body break-words font-bold">{companies.length ? companies.map((c) => c.name).join(', ') : none}</p>
          </div>
        )}
        <InlineField label="Private note" multiline rows={3} value={contact.note ?? ''} onSave={(v) => updateContact(contact.id, { note: v })} />
      </Fold>
      {LIVE ? (
        <ContactFieldsEditor contactId={contact.id} embedded />
      ) : (
        <>
          <Fold title="General info">
            <Row label="Contact type">{extra.contactType}</Row>
            <Row label="Looked after by">{getOwner(extra.ownerId)}</Row>
            <Row label="Tags">{extra.tags.length ? extra.tags.join(', ') : none}</Row>
            <Row label="Contact since">{fmtDate(extra.contactSince)}</Row>
            <Row label="Do not disturb: texts">{yn(extra.dnd.sms)}</Row>
            <Row label="Do not disturb: emails">{yn(extra.dnd.email)}</Row>
            <Row label="Do not disturb: calls">{yn(extra.dnd.call)}</Row>
          </Fold>
          <Fold title="Property details">
            <Row label="Kind of building">{extra.property.type}</Row>
            <Row label="Storeys">{extra.property.storeys}</Row>
            <Row label="Roof">{extra.property.roofType}</Row>
            <Row label="Size">{extra.property.areaNote}</Row>
          </Fold>
          <Fold title="Consent">
            <Row label="Happy to get texts">{yn(extra.consent.sms)}</Row>
            <Row label="Happy to get emails">{yn(extra.consent.email)}</Row>
            <Row label="Happy to get marketing">{yn(extra.consent.marketing)}</Row>
            <Row label="Consent given on">{extra.consent.givenOn ? fmtDate(extra.consent.givenOn) : none}</Row>
          </Fold>
          <Fold title="Lead source">
            <Row label="Where they came from">{extra.source}</Row>
          </Fold>
          <p className="t-small text-muted">Tags, consent and do-not-disturb are a Hub mock for now and cannot be changed here.</p>
        </>
      )}
    </div>
  )

  if (bare) return <div id="contact-details-section">{body}</div>
  return (
    <CSection id="contact-details-section" title="Contact details" summary={[phone, contact.email].filter(Boolean).join(', ') || 'Add a phone or email'} compact={compact}>
      {body}
    </CSection>
  )
}
