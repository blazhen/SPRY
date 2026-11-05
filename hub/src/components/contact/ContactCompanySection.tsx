import { Building2 } from 'lucide-react'
import { href } from '../../lib/router'
import { getContact } from '../../lib/store'
import { CSection, type ContactSectionProps } from './CSection'
import { useContactData } from './useContactData'

/**
 * The company (or companies) of this person: name, phone, email and who quotes go to. Nothing when there is no company.
 * `companyId` shows one company only, when the page has several. There is no same-company warning for a person on their
 * own (that one belongs to a job: see SameCompanyNotice).
 */
export function ContactCompanySection({ contactId, compact = false, companyId, always = false }: ContactSectionProps & { companyId?: string; always?: boolean }) {
  const { s, contact, companies: all } = useContactData(contactId)
  if (!contact) return null
  const companies = companyId ? all.filter((c) => c.id === companyId) : all
  // `always` keeps the box with "No company." (the contact card's own look); by default there is nothing to draw.
  if (companies.length === 0 && !always) return null
  return (
    <CSection
      id="contact-company-section"
      title={companyId ? 'Company' : 'Companies'}
      count={companies.length}
      summary={companies.map((c) => c.name).join(', ')}
      compact={compact}
    >
      {companies.length === 0 ? (
        <p className="t-body text-muted">No company.</p>
      ) : (
        <ul className="stack" aria-label="Companies">
          {companies.map((c) => (
            <li key={c.id} className="card">
              <p className="t-body flex items-center gap-2 font-bold">
                <Building2 size={20} aria-hidden="true" />
                {c.name}
              </p>
              {c.phone && (
                <p className="t-small">
                  <a className="text-navy underline" href={`tel:${c.phone}`}>
                    {c.phone}
                  </a>
                </p>
              )}
              {c.email && (
                <p className="t-small break-words">
                  <a className="text-navy underline" href={`mailto:${c.email}`}>
                    {c.email}
                  </a>
                </p>
              )}
              {c.attnContactId && c.attnContactId !== contact.id && (
                <p className="t-small text-muted">
                  Quotes go to{' '}
                  <a className="text-navy underline" href={href.contact(c.attnContactId)}>
                    {getContact(c.attnContactId, s)?.name ?? 'this person'}
                  </a>
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </CSection>
  )
}
