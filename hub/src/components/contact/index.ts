import { createElement, type ReactElement } from 'react'
import { ContactCompanySection } from './ContactCompanySection'
import { ContactComposerSection } from './ContactComposerSection'
import { ContactDetailsSection } from './ContactDetailsSection'
import { ContactDocumentsSection } from './ContactDocumentsSection'
import { ContactInvoicesSection } from './ContactInvoicesSection'
import { ContactJobsSection } from './ContactJobsSection'
import { ContactMessagesSection } from './ContactMessagesSection'
import { ContactNotesSection } from './ContactNotesSection'
import { ContactQuotesSection } from './ContactQuotesSection'
import { ContactTasksSection } from './ContactTasksSection'

export { ContactHeaderBar } from './ContactHeaderBar'
export { ContactCompanySection, ContactComposerSection, ContactDetailsSection, ContactDocumentsSection, ContactInvoicesSection }
export { ContactJobsSection, ContactMessagesSection, ContactNotesSection, ContactQuotesSection, ContactTasksSection }
export { ContactVisitsSection } from './ContactVisitsSection'
export { useContactData } from './useContactData'

export type ContactSectionId = 'details' | 'company' | 'composer' | 'messages' | 'jobs' | 'quotes' | 'invoices' | 'notes' | 'tasks' | 'documents'

export const CONTACT_SECTIONS: { id: ContactSectionId; label: string; anchor: string }[] = [
  { id: 'details', label: 'Details', anchor: 'contact-details-section' },
  { id: 'company', label: 'Company', anchor: 'contact-company-section' },
  { id: 'composer', label: 'Add to this contact', anchor: 'contact-composer-section' },
  { id: 'messages', label: 'Messages and activity', anchor: 'contact-messages-section' },
  { id: 'jobs', label: 'Jobs', anchor: 'contact-jobs-section' },
  { id: 'quotes', label: 'Quotes', anchor: 'contact-quotes-section' },
  { id: 'invoices', label: 'Invoices', anchor: 'contact-invoices-section' },
  { id: 'notes', label: 'Notes', anchor: 'contact-notes-section' },
  { id: 'tasks', label: 'Tasks', anchor: 'contact-tasks-section' },
  { id: 'documents', label: 'Documents', anchor: 'contact-documents-section' },
]

const BY_ID = {
  details: ContactDetailsSection,
  company: ContactCompanySection,
  composer: ContactComposerSection,
  messages: ContactMessagesSection,
  jobs: ContactJobsSection,
  quotes: ContactQuotesSection,
  invoices: ContactInvoicesSection,
  notes: ContactNotesSection,
  tasks: ContactTasksSection,
  documents: ContactDocumentsSection,
}

/** Draws one section by id (for a page that lets the user choose what goes in each panel). */
export function renderContactSection(id: ContactSectionId, contactId: string): ReactElement {
  return createElement(BY_ID[id], { key: id, contactId })
}
