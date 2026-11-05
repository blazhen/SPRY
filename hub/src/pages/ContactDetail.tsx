import { ArrowLeft } from 'lucide-react'
import { ContactWorkspace } from '../components/contact/ContactWorkspace'
import { href, useRoute } from '../lib/router'
import { getContact, isContactPending, useStore } from '../lib/store'

/** The contact page: a three-panel workspace like the job page (see ContactWorkspace). Route #/contacts/<id>[/<view>]. */
export default function ContactDetail() {
  const route = useRoute()
  const s = useStore()
  const contact = route.name === 'contact' ? getContact(route.id, s) : undefined

  if (contact && route.name === 'contact') return <ContactWorkspace contactId={contact.id} view={route.view} />
  return (
    <div className="stack-lg jf-missing">
      <nav aria-label="Breadcrumb">
        <a href={href.contacts()} className="inline-flex min-h-[44px] items-center gap-2 text-base font-semibold text-navy hover:underline">
          <ArrowLeft size={18} aria-hidden="true" /> Back to contacts
        </a>
      </nav>
      {route.name === 'contact' && isContactPending(route.id) ? (
        <p className="t-small text-muted">Loading contact from CRM...</p>
      ) : (
        <p className="t-body text-muted">Contact not found.</p>
      )}
    </div>
  )
}
