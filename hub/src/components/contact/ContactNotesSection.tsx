import { fmtDate } from '../../lib/format'
import { FollowUpBar } from '../FollowUpBar'
import { NotesPanel } from '../NotesPanel'
import { CSection, type ContactSectionProps } from './CSection'
import { useContactData } from './useContactData'

/** The pinned notes and the notes list of this person, and their next follow-up. */
export function ContactNotesSection({ contactId, compact = false }: ContactSectionProps) {
  const { contact, nextFollow } = useContactData(contactId)
  if (!contact) return null
  return (
    <CSection id="contact-notes-section" title="Notes and follow-up" summary={nextFollow ? `Follow up ${fmtDate(nextFollow)}` : 'Add a note or set a follow-up'} compact={compact}>
      <div id="contact-notes">
        <NotesPanel target={{ kind: 'contact', id: contact.id }} />
      </div>
      <FollowUpBar target={{ kind: 'contact', id: contact.id }} />
    </CSection>
  )
}
