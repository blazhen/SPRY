import { quoteTotals } from '../../lib/calc'
import { href } from '../../lib/router'
import { getJob } from '../../lib/store'
import { MoneyText, StatusBadge } from '../ui'
import { CSection, type ContactSectionProps } from './CSection'
import { useContactData } from './useContactData'

/** The quotes for this person. Each links to the quote editor. */
export function ContactQuotesSection({ contactId, compact = false }: ContactSectionProps) {
  const { s, contact, contactQuotes } = useContactData(contactId)
  if (!contact) return null
  return (
    <CSection
      id="contact-quotes-section"
      title="Quotes"
      count={contactQuotes.length}
      summary={contactQuotes.length ? `${contactQuotes.length} ${contactQuotes.length === 1 ? 'quote' : 'quotes'}` : 'No quotes yet'}
      compact={compact}
    >
      {contactQuotes.length === 0 ? (
        <p className="t-body text-muted">No quote for this person yet.</p>
      ) : (
        <ul className="stack" aria-label="Quotes for this person">
          {contactQuotes.map((q) => (
            <li key={q.id} className="card flex flex-wrap items-center gap-x-3 gap-y-1">
              <a className="t-body font-bold text-navy underline" href={href.edit(q.id)}>
                {q.number} (Rev {q.revision})
              </a>
              <StatusBadge status={q.status} />
              <span className="t-body">
                <MoneyText value={quoteTotals(q).total} /> <span className="text-muted">with GST</span>
              </span>
              {getJob(q.jobId, s) && (
                <a className="t-small text-muted underline" href={href.job(q.jobId)}>
                  {getJob(q.jobId, s)?.name}
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </CSection>
  )
}
