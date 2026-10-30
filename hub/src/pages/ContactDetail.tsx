import { ArrowLeft } from 'lucide-react'
import { ContactCard } from '../components/ContactCard'
import { href, useRoute } from '../lib/router'
import { getContact, isContactPending, useStore } from '../lib/store'

export default function ContactDetail() {
  const route = useRoute()
  const s = useStore()
  const contact = route.name === 'contact' ? getContact(route.id, s) : undefined

  return (
    <div className="stack">
      <p>
        <a className="inline-flex min-h-[44px] items-center gap-2 font-bold text-navy underline" href={href.contacts()}>
          <ArrowLeft size={18} aria-hidden="true" />
          Back to contacts
        </a>
      </p>
      {contact ? <ContactCard contactId={contact.id} /> : route.name === 'contact' && isContactPending(route.id) ? <p className="t-body text-muted" role="status">Loading this contact</p> : <h1 className="t-page">Contact not found</h1>}
    </div>
  )
}
