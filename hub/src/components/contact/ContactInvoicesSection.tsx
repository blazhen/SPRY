import { todayISO } from '../../lib/format'
import { invoiceTotals, statusLabel } from '../../lib/invoices'
import { href } from '../../lib/router'
import { MoneyText } from '../ui'
import { CSection, type ContactSectionProps } from './CSection'
import { useContactData } from './useContactData'

/** The invoices for this person. */
export function ContactInvoicesSection({ contactId, compact = false }: ContactSectionProps) {
  const { contact, contactInvoices } = useContactData(contactId)
  if (!contact) return null
  return (
    <CSection
      id="contact-invoices-section"
      title="Invoices"
      count={contactInvoices.length}
      summary={`${contactInvoices.length} ${contactInvoices.length === 1 ? 'invoice' : 'invoices'}`}
      compact={compact}
    >
      {contactInvoices.length === 0 ? (
        <p className="t-body text-muted">No invoices yet.</p>
      ) : (
        <ul className="stack" aria-label="Invoices">
          {contactInvoices.map((inv) => (
            <li key={inv.id} className="card flex flex-wrap items-center gap-x-3 gap-y-1">
              <a className="t-body font-bold text-navy underline" href={href.invoice(inv.id)}>
                {inv.number}
              </a>
              <span className="t-body">{statusLabel(inv, todayISO())}</span>
              <span className="t-body">
                <MoneyText value={invoiceTotals(inv).due} /> <span className="text-muted">still to pay</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </CSection>
  )
}
