import { useMemo, type ReactNode } from 'react'
import { boxesIn, useContactLayout, type BoxId, type BoxState, type JobLayout, type PanelId } from '../../lib/jobLayout'
import { useLayoutSession } from '../../lib/layoutDraft'
import { getCompany, getContact, jobsForContact, useStore } from '../../lib/store'
import { BoxFrame } from '../live/BoxFrame'
import { JobFacts } from '../job/JobFacts'
import {
  ContactCompanySection,
  ContactComposerSection,
  ContactDetailsSection,
  ContactDocumentsSection,
  ContactInvoicesSection,
  ContactJobsSection,
  ContactMessagesSection,
  ContactNotesSection,
  ContactQuotesSection,
  ContactTasksSection,
  ContactVisitsSection,
} from './index'

/** The companies of this person: their own, then any on their jobs. */
export function useContactCompanies(contactId: string): { id: string; name: string }[] {
  const s = useStore()
  const contact = getContact(contactId, s)
  const out: { id: string; name: string }[] = []
  const add = (id?: string) => {
    const c = id ? getCompany(id, s) : undefined
    if (c && !out.some((x) => x.id === c.id)) out.push({ id: c.id, name: c.name })
  }
  if (contact?.companyId) add(contact.companyId)
  jobsForContact(contactId, s).forEach((j) => j.participants.filter((p) => p.kind === 'company').forEach((p) => add(p.id)))
  return out
}

/** The contact layout to draw: the draft while this page is being edited, the saved one otherwise. */
export function useContactPageLayout(): JobLayout {
  const session = useLayoutSession()
  const saved = useContactLayout()
  return session.editing && session.kind === 'contact' ? session.layout : saved
}

/** Most recent job first. */
export function useContactJobs(contactId: string) {
  const s = useStore()
  return useMemo(
    () => [...jobsForContact(contactId, s)].sort((a, b) => String((b as { createdAt?: string }).createdAt ?? '').localeCompare(String((a as { createdAt?: string }).createdAt ?? ''))),
    [contactId, s],
  )
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="t-small text-muted" data-box-empty>{children}</p>
}

/** One contact box by id. Boxes with nothing to show draw nothing, except while editing, where a short line keeps the frame visible. */
function ContactBox({ id, contactId, editing }: { id: BoxId; contactId: string; editing: boolean }) {
  const companies = useContactCompanies(contactId)
  const jobs = useContactJobs(contactId)
  switch (id) {
    case 'c_details': return <ContactDetailsSection contactId={contactId} />
    case 'c_job':
      if (jobs.length === 0) return editing ? <Empty>This contact has no job yet. The latest job shows here.</Empty> : null
      return (
        <section className="cw-stack" data-left-job>
          <h3 className="jl-h">{jobs.length > 1 ? 'Latest job' : 'Job'}</h3>
          <JobFacts key={jobs[0].id} jobId={jobs[0].id} only="job" />
        </section>
      )
    case 'c_company':
      if (companies.length === 0) return editing ? <Empty>No company is linked to this contact. It shows here when there is one.</Empty> : null
      return <ContactCompanySection contactId={contactId} companyId={companies[0].id} />
    case 'c_compose': return <ContactComposerSection key="all" contactId={contactId} />
    case 'c_messages': return <ContactMessagesSection contactId={contactId} />
    case 'c_jobs': return <ContactJobsSection contactId={contactId} />
    case 'c_quotes': return <ContactQuotesSection contactId={contactId} />
    case 'c_invoices': return <ContactInvoicesSection contactId={contactId} />
    case 'c_notes': return <ContactNotesSection contactId={contactId} />
    case 'c_tasks': return <ContactTasksSection contactId={contactId} />
    case 'c_documents': return editing ? <><ContactDocumentsSection contactId={contactId} /><Empty>Documents draw nothing until this contact has files.</Empty></> : <ContactDocumentsSection contactId={contactId} />
    case 'c_visits': return <ContactVisitsSection contactId={contactId} />
    default: return null
  }
}

/** A box in a panel: the box itself, or inside its edit frame while Edit layout is on. */
export function ContactBoxSlot({ id, contactId, state }: { id: BoxId; contactId: string; state: BoxState }) {
  const { editing, kind } = useLayoutSession()
  const on = editing && kind === 'contact'
  const body = <ContactBox id={id} contactId={contactId} editing={on} />
  if (!on) return body
  return (
    <BoxFrame id={id} state={state}>
      {body}
    </BoxFrame>
  )
}

/** The boxes the layout puts in one panel, in order. */
export function ContactPanelBoxes({ panel, contactId }: { panel: PanelId; contactId: string }) {
  const layout = useContactPageLayout()
  return (
    <div className="cw-stack" data-contact-boxes={panel}>
      {boxesIn(layout, panel).map((b) => (
        <ContactBoxSlot key={b.id} id={b.id} contactId={contactId} state={b} />
      ))}
    </div>
  )
}
