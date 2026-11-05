import '../pages/listsPages.css'
import {
  ContactCompanySection,
  ContactDetailsSection,
  ContactHeaderBar,
  ContactInvoicesSection,
  ContactJobsSection,
  ContactMessagesSection,
  ContactNotesSection,
  ContactQuotesSection,
  ContactTasksSection,
  ContactVisitsSection,
  useContactData,
} from './contact'

/**
 * Everything about a contact in one column set: the header bar, then the sections in this order per layout. The sections
 * themselves live in src/components/contact/ so the contact page can draw them one by one in its panels.
 * `compact` is the side pane next to a quote or invoice: plain blocks, one column.
 */
export function ContactCard({ contactId, compact = false }: { contactId: string; compact?: boolean }) {
  const { contact } = useContactData(contactId)
  if (!contact) return <p className="t-body">This contact could not be found.</p>
  const id = contact.id
  const side = compact

  return (
    <div className="stack-lg">
      <ContactHeaderBar contactId={id} />

      {side ? (
        <div className="grid gap-6">
          <ContactDetailsSection contactId={id} compact bare withCompany />
          <div className="stack-lg min-w-0">
            <ContactMessagesSection contactId={id} compact />
            <ContactJobsSection contactId={id} compact />
            <ContactNotesSection contactId={id} compact />
            <ContactCompanySection contactId={id} compact always />
            <ContactQuotesSection contactId={id} compact />
            <ContactInvoicesSection contactId={id} compact />
            <ContactVisitsSection contactId={id} compact />
            <ContactTasksSection contactId={id} compact />
          </div>
        </div>
      ) : (
        <div className="cp-cols">
          <div className="cp-col">
            <ContactDetailsSection contactId={id} bare withCompany />
            <ContactCompanySection contactId={id} always />
          </div>
          <div className="cp-col">
            <ContactJobsSection contactId={id} />
            <ContactMessagesSection contactId={id} />
            <ContactQuotesSection contactId={id} />
            <ContactNotesSection contactId={id} />
            <ContactTasksSection contactId={id} />
            <ContactInvoicesSection contactId={id} />
            <ContactVisitsSection contactId={id} />
          </div>
        </div>
      )}
    </div>
  )
}

export default ContactCard
